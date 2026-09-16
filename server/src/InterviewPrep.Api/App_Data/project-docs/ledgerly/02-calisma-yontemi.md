# Çalışma Yöntemi

## Interview OS'ta bir konuyu nasıl öğreneceğiz?

Her yeni kavramda ilk soru “Bu nedir?” olacak. İlk açıklama, o kelimeyi daha önce duymamış birinin anlayacağı bir veya iki cümleyle başlayacak. Ardından gündelik ya da wallet üzerinden küçük bir örnek gelecek.

Bölümlerin anlatım sırası:

1. **Nedir?** Kavramı başka açıklanmamış terimlere yaslanmadan tanımla.
2. **Ne için kullanılır?** Hangi ihtiyaca cevap verdiğini göster.
3. **Basit örnek.** Önce iki hesap ve küçük tutarlar gibi takip edilebilir bir senaryo kur.
4. **Nasıl çalışır?** Parçaları tek tek tanıt; gerekirse kısa kodla bağla.
5. **Ledgerly'de nasıl kullandık?** Kararı ve alternatiflerin bedelini kavram anlaşıldıktan sonra anlat.
6. **Nasıl doğruladık?** Testin neyi kontrol ettiğini ve neyi kanıtlamadığını açıkla.
7. **Mülakatta nasıl anlatırım?** Anlaşılan konunun kısa cevabını en sona koy.

“Liability kullandık” demeden önce liability'nin yükümlülük olduğunu ve platformun müşteriye borcuyla ilişkisini anlatacağız. “Aggregate root” tanımını da açıklanmamış başka bir İngilizce ifadeyle geçiştirmeyeceğiz. Kod gösterirken hangi girdinin verildiğini ve sonunda ne değiştiğini söyleyeceğiz.

İlk sayfayı commit, test sayısı veya uygulanmayan özellik listesiyle açmayacağız. Tarihsel sonuçları ve mevcut sınırları ilgili açıklamanın ardından koruyacağız. Her başlıkta aynı uzunluk şart değil; amaç kavramı öğrenip örneği kendi cümlelerinle anlatabilmek.

Ledgerly repository'sindeki lab ve ADR dosyaları teknik kanıtın ayrıntısını saklar. ADR, bir mimari kararın neden alındığını kaydeden belgedir. Interview OS aynı çalışmayı öğrenme sırasıyla anlatır; sadece değişiklik özeti olarak kullanılmaz.

## Geliştirme döngüsündeki kelimeler

Baseline değişiklik öncesi başlangıç durumudur. Reproduce problemi yeniden oluşturmaktır. Root cause gözlenen sorunun temel nedenidir. Trade-off bir seçeneğin kazandırdıkları ile bedelidir. Örneğin daha hızlı okuma için ikinci veri kopyası tutmak, kopyayı güncel tutma sorumluluğu getirir.

Aşağıdaki süreç kodu nasıl geliştireceğimizi anlatır. Yukarıdaki sıra ise o çalışmayı okuyana nasıl öğreteceğimizi belirler.

## Senaryo bazlı gelişim

Her mimari yetenek aynı öğrenme döngüsüyle ele alınır:

```text
Baseline
  -> Problem
  -> Problemi reproduce et
  -> Gözlem ve kanıt
  -> Root cause
  -> Alternatif çözümler
  -> Trade-off
  -> Karar
  -> Implementasyon
  -> Test ve doğrulama
  -> Dokümantasyon
```

## 1. Baseline

Değişiklikten önce sistemin davranışı kaydedilir:

- Mevcut mimari ve Git commit'i
- Veri miktarı ve test ortamı
- Normal throughput ve latency
- Korunması beklenen invariant
- Başlangıç test sonuçları

## 2. Problem ve reproduce

Problem yalnızca metinle tarif edilmez. Mümkün olduğunda script veya otomatik test ile tekrar oluşturulur.

Örneğin aynı transfer isteğini eşzamanlı göndermek için aşağıdaki gibi bir komut kullanılabilir. Bu planlanan bir örnektir; ilgili k6 script'inin repository'de hazır olduğu anlamına gelmez:

```bash
k6 run tests/load/concurrent-duplicate-transfer.js
```

Reproduce adımı deterministik değilse kaç çalıştırmada kaç kez hata görüldüğü kaydedilir.

## 3. Gözlem ve root cause

Root cause, ilk akla gelen açıklama değildir. Aşağıdaki kanıtlardan biriyle desteklenir:

- Distributed trace
- Structured log
- Metric
- Database kaydı
- Execution plan
- Lock/wait bilgisi
- Network veya broker gözlemi

> “Sorgu yavaş, index ekleyelim” root cause değildir. Sorgunun nerede zaman harcadığı ve optimizer'ın neden o planı seçtiği gösterilmelidir.

## 4. Alternatifler ve trade-off

Her alternatif şu açılardan değerlendirilir:

| Boyut | Soru |
|---|---|
| Correctness | Hangi failure mode'larda yanlış sonuç üretebilir? |
| Latency | Request süresini nasıl etkiler? |
| Throughput | Paralel işlem kapasitesini sınırlar mı? |
| Operasyon | Yeni bir bileşen işletmek gerekiyor mu? |
| Karmaşıklık | Ekibin anlaması ve değiştirmesi ne kadar zor? |
| Geri dönüş | Karar güvenli biçimde geri alınabilir mi? |

Her alternatifin implement edilmesi gerekmez. Belirsizliği yüksek seçenekler küçük bir spike ile denenebilir.

## 5. Karar ve implementasyon

Kalıcı mimari kararlar ADR olarak kaydedilir. Karar metni yalnızca neyin seçildiğini değil, neden seçildiğini ve hangi koşullarda yeniden değerlendirileceğini de açıklar.

## 6. Test ve doğrulama

Implementasyon sonrası başlangıçtaki reproduce adımı değiştirilmeden tekrar çalıştırılır:

- Invariant korunuyor mu?
- Regression testleri geçiyor mu?
- Yeni bir failure mode oluştu mu?
- Önce/sonra metrikleri nasıl değişti?

## 7. Dokümantasyon çıktıları

Her tamamlanan senaryo mümkün olduğunca dört çıktı üretir:

1. Tekrar çalıştırılabilir lab
2. Gerekliyse ADR
3. Test ve ölçüm sonucu
4. Interview OS için 60–90 saniyelik mülakat özeti

Başarısız deneyler silinmez. Karar değişirse eski ADR `Superseded` olarak işaretlenir.
