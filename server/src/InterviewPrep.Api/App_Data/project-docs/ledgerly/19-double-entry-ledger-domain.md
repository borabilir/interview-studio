# Double-entry Ledger: İlk Domain Modeli

**Durum (2026-09-15):** JournalEntry, Posting ve PostingDirection domain seviyesinde uygulandı. Ledger database tabloları, deposit ve transfer henüz yok.

## Hangi problemi çözüyoruz?

Wallet bakiyesini değiştirmek yalnızca son durumu gösterir. “Bu 100 TRY hangi hesabın karşılığında geldi?” sorusunu cevaplayacak hareket kaydı da gerekir. Get Wallet sonrasında finansal çekirdeğin ilk adımı olarak bu kaydın modelini kurduk.

Henüz çalışan bir transfer endpoint'inde para kaybı reproduce etmedik. Testleri önce yazdık; tipler olmadığı için ilk koşu derlenemedi. Ardından model oluşturuldu ve geçersiz kayıtları reddeden testler geçti. Bu çalışmanın kanıtı domain kurallarıdır; database veya distributed transaction garantisi değildir.

## Journal ile posting ilişkisi

JournalEntry olayın bütünü, Posting ise bir hesabı etkileyen satırdır. Örneğin bir journal bir debit ve iki credit içerebilir:

```text
Debit    100 TRY
Credit    60 TRY
Credit    40 TRY
----------------
Debit toplamı = Credit toplamı = 100 TRY
```

Dengeyi Posting tek başına bilemez; diğer satırları görmesi gerekir. Bu nedenle denge kuralı JournalEntry aggregate root'unda durur. Posting hesap ID'si, yön ve tutar içeren immutable value object'tir.

## Debit para eksiltmek mi?

Her zaman değil. Hesap türü önemlidir. Asset hesabı debit ile, liability hesabı credit ile artar. Platformun müşteri bakiyelerini müşteriye borç olarak modellediğini varsayarsak Alice'ten Bob'a transferde Alice müşteri hesabı debit, Bob müşteri hesabı credit olur. [TigerBeetle muhasebe açıklaması](https://docs.tigerbeetle.com/coding/financial-accounting/) bu ayrımı örneklerle anlatır.

Bu hesap türleri henüz kodlanmadı. Şu anda AccountId sadece boş olmayan bir referans; gerçek LedgerAccount kaydı veya WalletId ile eşlemesi yok. Modelin rastgele bir hesabı kabul edebilmesi bu aşamanın açık sınırıdır.

## Neden bu tasarım?

| Alternatif | Fayda | Bedel |
|---|---|---|
| Yalnızca Balance | Küçük model | Hareketin karşılığı ve geçmişi yok |
| From/To/Amount transfer kaydı | İki hesaplı akış basit | Çok satırlı muhasebe ve ücretler için genişletme gerekir |
| Journal ve posting'ler | Dengeli çok satırlı hareket tek yerde doğrulanır | Daha fazla kavram; ileride atomik kayıt gerekir |

Üçüncü seçeneği seçtik. Yeni servis veya broker gerektirmiyor. Daha hızlı olduğuna ilişkin benchmark iddiamız yok. Event sourcing veya tam bir muhasebe ürünü kurmuş olmadık.

## Korunan kurallar

- Posting'in AccountId'si boş olamaz; yön Debit veya Credit olmalıdır.
- Amount pozitif olmalıdır; yön için negatif tutar kullanılmaz.
- En fazla dört ondalık basamakla kayıpsız temsil edilebilen, `999999999999999.9999` üst sınırındaki tutarlar kabul edilir. Bu mevcut numeric(19,4) kapasitesiyle uyumlu ilk politikadır; TRY için dört alt birim tanımı değildir.
- Journal en az iki posting ve iki farklı hesap içerir.
- Debit ve credit toplamları tam eşit olmalıdır; 0.0001 fark bile reddedilir.
- Journal tek currency taşır; mevcut Currency yalnızca TRY destekler.
- ID üretilir, zaman UTC olur.

## IReadOnlyList yazmak yeterli mi?

Tek başına yeterli değil. Dışarıdan gelen mutable array'i doğrudan saklarsak çağıran kod onu değiştirebilir ve denge bozulur. Biz array'in kopyasını alıp read-only görünümünü sunuyoruz. Posting alanları da değiştirilemiyor.

Test, journal oluşturulduktan sonra çağıranın array'ini değiştirdiğinde journal'ın aynı kaldığını kontrol ediyor. Dışarı açılan liste üzerinden değiştirme/silme denemeleri de reddediliyor. Bu normal domain API'sinde immutability; database update/delete engeli değil.

## Denge varsa işlem doğru mu?

Denge gerekli ama yeterli değil. Yanlış iki hesaba 100/100 yazmak yine dengelidir. Aynı journal'ı iki kere işlemek de dengeyi bozmaz. Hesap varlığı, hesap currency uyumu, yetki, bakiye yeterliliği, idempotency ve atomik persistence henüz gelecek.

Wallet.Balance şu anda ledger'dan hesaplanmıyor. Yeni domain sınıflarını oluşturmak gerçek para yatırmaz ve API davranışını değiştirmez.

## Test sonucu

Yeni 29 domain case'i eklendi. Tüm solution gerçek ledgerly_tests PostgreSQL ortamıyla çalıştırıldı:

```text
Domain             41 passed
Application         4 passed
IntegrationTests   17 passed
Toplam             62 passed, 0 failed, 0 skipped
```

IntegrationTests içindeki 3 case önceki exception injection kontrolleridir. Yeni ledger testleri bellek içinde çalışır; Docker gerektirmez:

```bash
dotnet test tests/Ledgerly.Domain.Tests/Ledgerly.Domain.Tests.csproj --filter 'FullyQualifiedName~Ledgerly.Domain.Tests.Ledger'
```

## Mülakatta kısa anlatım

> Para hareketini yalnızca balance güncellemesiyle temsil etmek istemedim. JournalEntry altında pozitif tutarlı debit/credit posting'leri modelledim; toplamların eşitliğini aggregate oluşturulurken zorunlu tuttum. Satırları immutable yapıp koleksiyonu kopyaladım; böylece validasyon sonrası dışarıdan denge bozulamıyor. Bu aşamada kanıtladığım domain kurallarıdır. Kalıcı kayıt, hesap uyumu, idempotency ve concurrency garantilerini sonraki use-case'lerde ayrıca kuracağım.

## Sıradaki adım

LedgerAccount modelini ve journal/posting persistence'ını kurmak, ardından test bakiyesi yatırma use-case'inde bütün satırları tek transaction içinde kaydetmek. Roadmap Aşama 1 devam ediyor; double-spending veya idempotency tamamlanmadı.

Kanonik kaynaklar Ledgerly repository'sinde: `docs/domain/03-double-entry-ledger.md`, `docs/adr/0004-journal-entry-and-postings.md`, `docs/journey/04-ledger-domain.md`.
