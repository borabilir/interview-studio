# Çalışma Yöntemi

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

Örneğin aynı transfer isteğini eşzamanlı göndermek:

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
