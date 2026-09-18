# Hesabın Amacı Nedir? Type ve Purpose Arasındaki Fark

## Bir hesabın türüyle amacı aynı şey mi?

Hayır. Tür, bir şeyi hangi sınıfa koyduğumuzu; amaç, ne için kullandığımızı söyler.

Günlük bir örnek: İki ayrı telefonun olabilir. İkisi de telefon türündedir; birini iş, diğerini kişisel kullanım için ayırmış olabilirsin. Türleri aynıyken amaçları farklı olabilir.

Muhasebe hesabında da benzer iki soru var:

- **Type:** Muhasebede hangi tür hesap? Asset veya Liability.
- **Purpose:** Bu hesabı uygulamamızda ne için açtık? Wallet hesabı veya test fonu hesabı.

Şu anki iki örneğimiz:

| Hesap | Type | Purpose |
|---|---|---|
| Bora'nın cüzdanına bağlı muhasebe hesabı | Liability | Wallet |
| Ortak TRY test fon hesabı | Asset | TestFunding |

Asset demek “test hesabı” demek değildir. Asset muhasebe türünü söyler. TestFunding ise bu hesabı test yatırmalarının fon tarafını temsil etmek için açtığımızı söyler.

## Önceki modelde sorun neydi?

Metodumuzun adı GetTestFundingAsync idi. Ama içinde yaptığı kontrol şuydu:

```csharp
account.WalletId == null
    && account.Type == LedgerAccountType.Asset
    && account.Currency == currency
```

Yani “wallet'a bağlı olmayan Asset hesabını getir” diyordu. Modelde test fonu olduğunu söyleyen bir alan yoktu.

Şimdiki iki hesap rolüyle bu doğru hesabı buluyordu. Ancak bunun test fonu olduğunu bilgiden değil, varsayımdan çıkarıyorduk. İleride başka bir amaçla Asset hesabı açıldığında bu çıkarımı yeniden düşünmek gerekecekti.

## Şimdi nasıl ifade ediyoruz?

Enum, izin verdiğimiz isimli seçenekler listesidir. LedgerAccountPurpose listemiz şu:

```csharp
public enum LedgerAccountPurpose
{
    Wallet = 1,
    TestFunding = 2,
}
```

Şimdilik yalnızca gerçekten kullandığımız iki rol var. Gerçek banka hesabı gibi üçüncü bir rol henüz eklemedik.

Factory, doğru başlangıç değerleriyle nesne oluşturan metottur. Bizim iki factory'miz amacı da seçiyor:

```csharp
CreateForWallet(...)
// Type: Liability
// Purpose: Wallet
// WalletId: ilgili wallet

CreateTestFunding(...)
// Type: Asset
// Purpose: TestFunding
// WalletId: null
```

Dışarıdan rastgele Type ve Purpose gönderilmesine izin veren bir oluşturma metodu eklemedik. Purpose sonradan public setter ile değiştirilemiyor.

Artık fon sorgusu gerçekten rolü kontrol ediyor:

```csharp
account.Purpose == LedgerAccountPurpose.TestFunding
    && account.Currency == currency
```

Metodun adıyla modelde ifade edilen bilgi birbirini karşılıyor.

## IsTest deseydik olmaz mıydı?

Olurdu; fakat IsTest=false yalnızca “test değil” derdi. Hesabın ne için kullanıldığını açıklamazdı. Ayrıca “bu kayıt test ortamında mı?” ile “bu hesabın muhasebedeki rolü test fonu mu?” sorularını karıştırabilirdik.

Purpose bir ortam veya güvenlik izni değildir. Wallet'ın müşterisi hâlâ Wallet.OwnerId ile belirlenir; Purpose müşteriyi belirtmez. Test yatırmasının yalnızca izin verilen ortamlarda çalışması controller'ın sorumluluğu olarak devam eder.

## Yanlış birleşimler oluşabilir mi?

Normal domain metotları doğru birleşimi kurar. Ancak database'e doğrudan SQL yazılırsa bu metotlar atlanabilir. Bu nedenle database'e de kural ekledik:

```text
Purpose Wallet      → Liability olmalı, WalletId dolu olmalı.
Purpose TestFunding → Asset olmalı, WalletId boş olmalı.
```

Bu kurala check constraint denir: Database bir satırı kaydetmeden önce koşulu kontrol eder; yanlışsa reddeder. Tanımadığımız purpose değeri, örneğin 3, şu an reddedilir. Purpose tamamen unutulursa da kayıt kabul edilmez; otomatik TestFunding varsayılmaz.

Bir başka kuralımız da currency başına tek test fon hesabıdır. Unique index bunun ikinci kopyasını engeller. Önceden bu index wallet_id boş satırlara bakıyordu; şimdi açıkça purpose = TestFunding satırlarına bakıyor.

İleride yeni bir amaç gerekirse yalnızca enum'a isim eklemek yetmez. Onu oluşturan metodu ve database'in izin verdiği birleşimleri de güncelleriz.

## Mevcut hesaplar ne oldu?

Migration, database'in yapısını ve gerektiğinde mevcut veriyi yeni modele taşıyan adımdır. Purpose sütununu eklemek tek başına yeterli değil; eski hesapların amacı da doldurulmalı.

Eski şema yalnızca iki rolü kabul ettiği için eşleme belli:

```text
Wallet'a bağlı Liability → Purpose Wallet
Wallet'a bağlı olmayan Asset → Purpose TestFunding
```

Önce sütunu boş kalabilir şekilde ekledik, eski satırların amaçlarını doldurduk, sonra zorunlu hâle getirdik. Mevcut account ID'leri değişmedi. Bu nedenle önceki posting'lerin hesap bağlantıları da korunuyor.

Bu, “bütün Asset hesapları her zaman testtir” şeklinde genel bir kural değil; yalnızca eski şemanın izin verdiği iki rol için yapılan bir veri taşımasıdır.

## Nasıl doğruladık?

Factory testleri Type ile Purpose eşleşmesini kontrol ediyor. Repository testleri alanın kaydedilip okunmasını ve fon yokken sorgunun null dönmesini doğruluyor. Doğrudan SQL deneyleri yanlış birleşimlerin ve eksik amacın PostgreSQL tarafından reddedildiğini gösteriyor.

Migration testinde ayrı bir schema kullandık. Schema, aynı database içinde tabloları ayrı bir ad alanında tutmamıza yarar. Test kendi rastgele isimli schema'sında önceki sürümü kuruyor; hesaplar, wallet ve para hareketi ekliyor. Sonra migration'ı uygulayıp kimliklerin, tutarların ve yeni amaçların doğru kaldığını kontrol ediyor. Eski sürüme geri dönüp tekrar yükseltme de aynı verilerle doğrulanıyor. Paylaşılan test tablolarını eski sürüme indirmiyoruz.

Toplam 124 test geçti: 53 Domain, 9 Application, 62 Integration. Bu adımda 9 yeni integration case eklendi. Mevcut domain testlerine eklenen assert'ler yeni test sayılmıyor.

## Mülakatta nasıl anlatırım?

> Hesabın muhasebe türüyle kullanım amacını ayırdım. Asset olması tek başına test fonu olduğunu söylemediği için Purpose alanı ekledim. Fon sorgusu artık açık rolü arıyor. Factory doğru başlangıç birleşimini kuruyor; database check constraint doğrudan SQL'de de bu kuralı koruyor. Migration eski hesapları yeni kimlik üretmeden doğru amaçla dolduruyor. Veri içeren eski şemadan geçişi gerçek PostgreSQL'de doğruladım.

Kanonik kaynaklar: Ledgerly `docs/domain/05-ledger-account-purpose.md`, `docs/adr/0008-explicit-ledger-account-purpose.md`, `docs/journey/08-ledger-account-purpose.md`.
