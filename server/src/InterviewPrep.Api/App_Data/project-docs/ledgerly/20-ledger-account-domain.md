# Ledger Account Nedir, Wallet'tan Farkı Ne?

## Ledger account nedir?

Ledger account, belirli bir şeye ait para hareketlerini topladığımız muhasebe hesabıdır. Bir kayıt defterinde “Bora'ya ait hareketler” için ayrılmış sayfa gibi düşünebilirsin. Hareketin hangi hesaba ait olduğunu bu hesabın kimliğiyle belirtiriz.

Örneğin iki müşteriye ait iki ayrı hesap düşün:

```text
Bora'nın hesabına ait hareketler
  500 TRY yatırma
  100 TRY Ayşe'ye gönderme

Ayşe'nin hesabına ait hareketler
  Bora'dan 100 TRY alma
```

Bu örnek yalnızca hesapların hareketleri nasıl ayırdığını gösterir. Kodda hesabın içinde böyle bir liste tutmuyoruz; hareket satırları hesabın kimliğine işaret ediyor.

## Ne için kullanılır?

Bir hareketin kime veya neye ait olduğunu, hangi para biriminde tutulduğunu ve muhasebede nasıl yorumlanacağını belirlemek için kullanılır. Her hesabın bir müşteriye ait olması gerekmez. Platformun test fonunu temsil eden bir hesap da olabilir.

[Önceki bölümde](19-double-entry-ledger-domain.md) posting'i “bir hesabı etkileyen satır” diye tanımladık. LedgerAccount, o satırın işaret ettiği hesabı tanımlar.

## Wallet ile aynı şey mi?

Wallet, kullanıcının uygulamada gördüğü cüzdandır. Kime ait olduğu, kullanılabilir olup olmadığı ve gösterilen bakiye ürünün konusudur. Ledger account ise para hareketlerini muhasebede hangi hesapta izleyeceğimizi belirler.

Bir wallet'ı bir müşteri muhasebe hesabına bağlayabiliriz. Ama platformun test fon hesabı için sahte bir müşteri wallet'ı açmak istemeyiz. Kavramları ayırmak bu ikinci hesabı da ifade etmemizi sağlar.

Ledgerly'de ilişkiyi şöyle kuruyoruz:

```text
Wallet
  Id: W1

LedgerAccount
  Id: A1
  WalletId: W1

Posting
  AccountId: A1
```

Posting muhasebe hesabı A1'e aittir. A1'in hangi wallet'la ilişkili olduğunu WalletId alanından anlarız. `A1` ve `W1` örnek etiketlerdir; kodda bu kimlikler GUID türündedir.

## Asset ve liability nedir?

**Asset**, varlık demektir: hesabını tuttuğumuz kişi veya kuruluşun sahip olduğu ekonomik değer. **Liability**, yükümlülük demektir: başkasına olan borcu veya yerine getirmesi gereken ödeme yükümlülüğü.

Burada platformun gözünden bakıyoruz. Senin wallet'ında 100 TRY varsa, sen bu parayı platformdan talep edebilirsin. Bu yüzden müşteriye ait tutarı platformun müşteriye borcu olarak düşünürüz: müşteri hesabı **Liability** olur.

Test yatırmada dışarıdan fon geldiğini simüle ettiğimiz karşı hesap ise **Asset** olur. Bu test hesabı gerçek bir bankada para bulunduğunun kanıtı değildir. Gerçek para veya banka bağlantısı kurmadan muhasebe akışını öğrenmemizi sağlar. [Muhasebe türleri ve bakış açısı](https://docs.tigerbeetle.com/coding/financial-accounting/)

## Debit ve credit bu hesaplarda ne yapar?

Debit ve credit, hareketin muhasebe yönleridir. Bu iki hesap türünde etkileri şöyle:

| Hesap türü | Debit | Credit |
|---|---|---|
| Asset — varlık | Artırır | Azaltır |
| Liability — yükümlülük | Azaltır | Artırır |

Bu nedenle “debit her zaman para eksiltir” diyemeyiz. Bu yönlerin anlamı hesabın türüyle birlikte okunur. [Debit/credit açıklaması](https://docs.tigerbeetle.com/coding/financial-accounting/)

100 TRY test yatırmayı adım adım düşünelim:

1. Dışarıdan 100 TRY fon gelmiş gibi bir örnek kuruyoruz.
2. Test fon varlığımızı 100 artırıyoruz: Asset hesabına Debit 100.
3. Müşteriye borcumuzu 100 artırıyoruz: Liability hesabına Credit 100.
4. İki satırı aynı journal'a koyuyoruz; toplam debit ve credit 100 oluyor.

İki hesabın da artması müşteriye 200 TRY vermek değildir. Bir hesap simüle edilen fonu, diğeri müşteriye karşı borcu anlatır.

## Ledgerly'de hesabı nasıl oluşturuyoruz?

İlk yol, mevcut bir wallet'a ait muhasebe hesabı oluşturmak:

```csharp
var customerAccount = LedgerAccount.CreateForWallet(
    wallet.Id,
    wallet.Currency,
    now
);
```

Burada `wallet` daha önce oluşturulmuş bir Wallet nesnesi, `now` ise oluşturulma zamanı. Sonuçta yeni bir LedgerAccount nesnesi elde ederiz:

```text
Id           → Yeni muhasebe hesabı kimliği
WalletId     → Verdiğimiz wallet'ın kimliği
Type         → Liability
Currency     → Verdiğimiz para birimi
CreatedAtUtc → UTC'ye çevrilmiş zaman
```

İkinci yol, test fon hesabı oluşturmak:

```csharp
var fundingAccount = LedgerAccount.CreateTestFunding(
    wallet.Currency,
    now
);
```

Bu hesapta Type Asset, WalletId null olur. Null burada “wallet ilişkisi yok” demektir. Mevcut Currency modeli yalnızca TRY kabul eder.

UTC, zamanları ortak bir referansla saklamamızı sağlar. Örneğin +03:00 saat dilimindeki 15:00, aynı anın UTC gösteriminde 12:00 olur.

## Factory metodu nedir?

Factory metodu, bir nesneyi geçerli başlangıç durumuyla oluşturan metottur. Buradaki CreateForWallet ve CreateTestFunding bunun örnekleri.

Çağıran kod “müşteri hesabı istiyorum” der. Factory doğru türü kendisi seçer. Böylece çağıranın ayrıca Type seçip yanlış kombinasyon göndermesine gerek kalmaz.

CreateForWallet boş WalletId'yi ve null Currency'yi reddeder. CreateTestFunding de null Currency'yi reddeder. Constructor private olduğu için dış kod oluşturma kurallarını atlayarak doğrudan `new LedgerAccount(...)` çağıramaz. Alanların yalnızca get olması da hesap türünün veya ilişkisinin sonradan atanmasını engeller.

## Nesne oluşturmak database'e kaydetmek mi?

Hayır. Şimdiye kadarki kod yalnızca bellekte nesne oluşturuyor. Uygulama kapanınca bu nesnenin database'de kalması için ayrıca kayıt işlemi gerekir. Buna **persistence**, yani kalıcı saklama diyoruz.

Factory database'e bakmadığı için gönderdiğimiz WalletId gerçekten var mı bilemez. Aynı wallet için iki kere çağırırsak iki ayrı hesap nesnesi oluşturur. “Bir wallet'ın yalnızca bir müşteri hesabı olsun” hedefini database tarafında ayrıca koruyacağız.

Benzer şekilde hesap ile wallet'ın para birimlerinin aynı olmasını ve posting'in gerçekten var olan hesaba bağlanmasını da henüz garanti etmedik. Mevcut POST /api/wallets kendiliğinden ledger hesabı açmıyor.

## Ne için bu tasarımı seçtik?

WalletId'yi doğrudan bütün hesapların kimliği saysaydık, wallet'ı olmayan test fon hesabını modellemek zorlaşırdı. Her hesap rolü için ayrı sınıf açsaydık bugün aynı alanları tekrar edecektik. Tek LedgerAccount ve iki factory ile başlangıçtaki iki ihtiyacı karşılıyoruz.

Bu bütün muhasebe hesapları için değişmez bir tasarım kararı değil. Yeni roller ortaya çıktığında hesap türü ve hesabın amacı arasındaki ayrımı yeniden değerlendireceğiz. Hesapta ayrıca bir Balance alanı veya bakiye hesaplama metodu henüz yok.

## Testler hangi sorulara cevap veriyor?

Test, belirli girdilerle kodu çalıştırıp beklenen sonucu otomatik kontrol eder. Burada beş soru sorduk:

- Geçerli wallet bilgisiyle Liability hesabı, doğru ilişki ve UTC zaman oluşuyor mu?
- Boş WalletId reddediliyor mu?
- Wallet hesabında null Currency reddediliyor mu?
- Test fon hesabı wallet bağlantısı olmadan Asset olarak oluşuyor mu?
- Test fon hesabında null Currency reddediliyor mu?

Bu testler database açmıyor. Nesnelerin oluşturulma davranışını kontrol ediyor. Database ilişkilerinin doğruluğu ayrı testlerin konusu olacak.

## Uygulama ve doğrulama kaydı

16 Eylül 2026'da önce bu beş test yazıldı. Sınıflar henüz olmadığı için ilk çalıştırma derlenemedi. Model eklendikten sonra tüm çözümde **46 Domain + 4 Application + 17 IntegrationTests = 67 test** geçti. IntegrationTests içindeki 3 case önceki hata-enjeksiyon kontrolleridir. Bu belge düzenlemesi yeni bir test çalıştırması değildir.

Kod: `src/Ledgerly.Domain/Ledger/LedgerAccount.cs`, `LedgerAccountType.cs`. Test: `tests/Ledgerly.Domain.Tests/Ledger/LedgerAccountTests.cs`.

Kanonik karar ve test kayıtları Ledgerly'deki `docs/domain/04-ledger-account.md`, `docs/adr/0005-ledger-account-factories.md`, `docs/journey/05-ledger-account-domain.md` dosyalarındadır.

## Mülakatta nasıl anlatırım?

> Ledger account, para hareketlerini belirli bir hesap altında izlememizi sağlar. Wallet kullanıcıya sunulan cüzdan, ledger account ise hareketlerin muhasebe tarafındaki hesabıdır. Müşteri hesabını platformun müşteriye borcu olarak Liability, test fon hesabını Asset modelledim. Oluşturma kurallarını iki factory'de topladım. Bu domain modeli; database'de hesap varlığı ve tekillik garantilerini sonraki adımda kuracağım.

Sırada hesapları ve journal satırlarını kalıcı saklamak var. Birden fazla satırın ya birlikte kaydedilmesi ya da hiçbirinin kalmaması gerekir. Buna **atomik kayıt** diyoruz; bir satır başarısız olduğunda diğerlerinin geri alınmasını gerçek database testiyle inceleyeceğiz.

## Sonraki milestone

Bu bölüm domain adımının anlatımıdır. 16 Eylül 2026'da [ledger persistence ve atomik kayıt](21-ledger-persistence-ve-atomiklik.md) tamamlandı; hesaplar ve journal artık repository üzerinden saklanabiliyor. Otomatik hesap oluşturma ve para yatırma API'si hâlâ yok. Güncel toplam 90 test; yukarıdaki test sayısı bu bölümün tamamlandığı adıma aittir.
