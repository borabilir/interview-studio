# LedgerAccount: Wallet ve Muhasebe Hesabı

**Durum (2026-09-16):** LedgerAccount domain modeli uygulandı; hesap persistence'ı ve otomatik hesap açan use-case henüz yok.

## Neden yeni kavram?

Posting.AccountId boş olmayan bir GUID olabiliyordu. Journal dengeyi kontrol ediyordu, fakat hesabın neyi temsil ettiğini bilmiyorduk. LedgerAccount ile hesap kimliği, türü, currency ve wallet ilişkisini tanımladık. Bu, ID'nin database'de gerçekten var olduğunu tek başına kanıtlamaz.

Wallet kullanıcının gördüğü üründür. Muhasebe hesabı ise hareketlerin işaret ettiği kayıttır. Wallet'a bağlı olmayan platform hesaplarını da temsil etmek istediğimiz için bu iki kimliği ayırdık.

## Test yatırma örneği

100 TRY test bakiyesi için düşünce örneği:

| Hesap | Tür | Yön | Tutar |
|---|---|---|---|
| Simüle edilmiş fon hesabı | Asset | Debit | 100 TRY |
| Müşteri wallet hesabı | Liability | Credit | 100 TRY |

Platform açısından müşteri bakiyesi müşteriye olan borçtur. Asset debit ile, liability credit ile artar; [muhasebe açıklaması](https://docs.tigerbeetle.com/coding/financial-accounting/). Test fonu gerçek banka entegrasyonu veya doğrulanmış varlık değildir; test yatırmanın karşılığını simüle eder. Burada gelir/ücret modeli kurmadık.

## Kodda ne var?

```csharp
var customerAccount = LedgerAccount.CreateForWallet(wallet.Id, wallet.Currency, now);
var fundingAccount = LedgerAccount.CreateTestFunding(wallet.Currency, now);
```

CreateForWallet dolu bir WalletId ister, hesabı Liability oluşturur. CreateTestFunding wallet referansı almaz; WalletId null, Type Asset olur. İki metot da null Currency'yi reddeder. Kimlik üretilir, zaman UTC'ye çevrilir. Alanlar get-only'dir.

```text
Wallet.Id
    ↑ LedgerAccount.WalletId
LedgerAccount.Id
    ↑ Posting.AccountId
JournalEntry.Postings
```

Oklar mantıksal referansları gösterir; bu ilişkilerin foreign key'leri henüz kurulmadı. LedgerAccount.Id ve WalletId aynı kavram değildir.

## Neden genel Create veya iki alt sınıf yok?

Genel Create(type, walletId, ...) çağırana yanlış kombinasyon kurma imkânı verir, sonra bunları guard'larla reddetmek gerekir. İki ayrı sınıf ise bugün aynı alanları tekrar eder. Tek sınıf ve iki anlamlı factory ile geçerli başlangıç kombinasyonlarını açık tuttuk. Yeni hesap rolleri geldiğinde bu kararı yeniden değerlendireceğiz; şimdiden bütün muhasebe türlerini eklemedik.

## Nesne oluşturmak kayıt oluşturmak mı?

Hayır. Factory yalnızca bellekte nesne üretir. Aynı wallet için iki çağrı iki ayrı hesap nesnesi üretir; metot idempotent değildir ve database'den hesap aramaz. Mevcut POST /api/wallets ledger hesabı açmaz.

Wallet'ın varlığı, wallet/account currency eşleşmesi, wallet başına tek hesap ve currency başına tek test fon hesabı hedefleri persistence aşamasına kalır. Posting.Create rastgele dolu bir GUID'yi hâlâ kabul eder. Bakiye güncellemesi ve event sourcing de eklenmedi.

## Testte neyi kanıtladık?

Önce 5 test yazıldı; tipler henüz olmadığı için ilk çalışma CS0103 ile derlenemedi. Bu compile-time Red'dir; çalışan deposit API'sinde hata reproduce edilmedi. Model eklendikten sonra tüm solution geçti:

```text
Domain             46 passed
Application         4 passed
IntegrationTests   17 passed
Toplam             67 passed
```

Yeni testler iki hesabın doğru tür/ilişki/currency/UTC zamanla oluşturulmasını ve boş WalletId/null Currency reddini doğrular. IntegrationTests içindeki 3 case önceki hata-enjeksiyon kontrolleridir. Yeni account testleri database kullanmaz.

## Mülakat anlatımı

> Wallet ile muhasebe hesabını ayırdım; çünkü para hareketinde wallet'a bağlı olmayan karşı hesaplara da ihtiyacım var. Müşteri hesabını liability, test fon hesabını asset olarak modelledim. İki anlamlı factory ile geçersiz tür/wallet kombinasyonlarının normal oluşturma yolunu kapattım. Ancak domain factory'si veritabanındaki varlık veya tekillik garantisi vermez; bunları persistence adımında ayrıca doğrulayacağım.

Sonraki adım: hesap/journal/posting mapping ve constraint'leri, ardından bir satır başarısız olduğunda bütün journal'ın rollback edilmesi. Test yatırma use-case'i bunun üzerine kurulacak.

Kanonik Ledgerly kaynakları: `docs/domain/04-ledger-account.md`, `docs/adr/0005-ledger-account-factories.md`, `docs/journey/05-ledger-account-domain.md`.
