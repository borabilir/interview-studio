# Ledger, Journal Entry ve Posting Nedir?

## Ledger nedir?

Ledger, para hareketlerini tuttuğumuz kayıt defteridir. Bir hesapta yalnızca ne kadar para olduğunu değil, bu tutara hangi hareketlerle ulaşıldığını görmemizi sağlar.

Telefonunda cüzdan bakiyesinin **400 TRY** yazdığını düşün. Bu sayı şu anki durumu söyler. Ama “Dün 500 vardı, neden 400 oldu?” sorusunu tek başına cevaplamaz.

Hareketleri de saklarsak hikâye görünür:

```text
Başlangıç bakiyesi          0 TRY
Yatırılan tutar          +500 TRY
Ayşe'ye gönderilen tutar -100 TRY
Son bakiye               400 TRY
```

Bu liste, hareket geçmişinin ne işe yaradığını gösteren basit bir örnek. Birazdan aynı hareketin karşı hesabını da kayda ekleyeceğiz.

## Ledger ne için kullanılır?

Bir tutarın neden değiştiğini açıklamak, işlemin hangi hesapları etkilediğini görmek ve hesap hareketlerini kontrol etmek için kullanılır. Kullanıcıya gösterilen bakiyeyi bu kayıtlardan hesaplayacak bir tasarım da kurulabilir.

Ledgerly'de bunu adım adım yapıyoruz. Şu an wallet oluşturup okuyabiliyoruz; wallet bakiyesi henüz ledger kayıtlarından hesaplanmıyor. Bu bölüm hareketin bellekteki modelini öğretiyor.

## Double-entry ne demek?

Double-entry, bir finansal olayı karşılıklı muhasebe etkileriyle kaydetmektir. Bir hareketin yalnızca bir tarafını yazmakla yetinmeyiz.

Senin Ayşe'ye 100 TRY gönderdiğini düşün:

```text
Senin müşteri hesabındaki tutar   100 azalır.
Ayşe'nin müşteri hesabındaki tutar 100 artar.
```

İki değişiklik aynı olayın parçalarıdır. Birinden 100 düşüp diğerine 90 ekleseydik aradaki 10'un nereye gittiğini açıklayacak başka bir satır gerekirdi. Böyle bir satır yoksa kayıt dengeli değildir.

Muhasebede bu karşılıklı kayıtları **debit** ve **credit** yönleriyle ifade ediyoruz. Temel denge kuralı:

```text
Debit tutarlarının toplamı = Credit tutarlarının toplamı
```

“Double” kelimesi her olayın tam iki satırı olacağı anlamına gelmez. 100 debit karşısında 60 credit ve 40 credit de dengelidir.

## Debit ve credit nedir?

Debit ve credit, muhasebe satırının iki yönünün adıdır. Her hesap için “debit eksi, credit artı” diye ezberlememeliyiz; etkileri hesabın türüne bağlıdır.

Şimdilik yalnızca şu bakış açısını kullanalım: senin wallet'ında görünen para, platformun sana olan borcudur. Sen Ayşe'ye 100 gönderdiğinde platformun sana borcu azalır, Ayşe'ye borcu artar.

| Hesap | Yön | Tutar | Bu örnekteki anlamı |
|---|---|---|---|
| Senin müşteri hesabın | Debit | 100 TRY | Platformun sana borcu azalır |
| Ayşe'nin müşteri hesabı | Credit | 100 TRY | Platformun Ayşe'ye borcu artar |

Hesap türlerini ve bu bakış açısını [sonraki bölümde](20-ledger-account-domain.md) ayrıca açıyoruz. Genel muhasebe açıklaması için [TigerBeetle Financial Accounting](https://docs.tigerbeetle.com/coding/financial-accounting/) kaynağına bakılabilir.

Kodda tutarı iki satırda da pozitif tutuyoruz. Yönü ayrı bir alanla belirtiyoruz; bir satıra hem negatif tutar hem yön vererek iki farklı işaret sistemi kurmuyoruz.

## Posting nedir?

Posting, olayın **bir hesabı etkileyen tek satırıdır**. Üç soruyu cevaplar:

| Soru | Alan | Örnek |
|---|---|---|
| Hangi hesap? | AccountId | Senin muhasebe hesabının kimliği |
| Hangi yönde? | Direction | Debit |
| Ne kadar? | Amount | 100 |

```csharp
var senderPosting = Posting.Create(
    senderAccountId,
    PostingDirection.Debit,
    100m
);
```

Bu satır hesabından para düşürmez. Bellekte, hareketin o parçasını temsil eden bir nesne oluşturur. `100m`, C#'ta decimal türündeki 100 değeridir.

`PostingDirection` ise izin verilen iki yönü isimlendiren enum'dur: Debit ve Credit. Enum, burada sayılar yerine okunabilir seçenek adları kullanmamızı sağlar.

## Journal entry nedir?

Journal entry, **aynı finansal olaya ait posting'leri birlikte tutan kayıttır**. Yukarıdaki gönderen ve alıcı satırlarının aynı işleme ait olduğunu bu kayıtla ifade ederiz.

```text
JournalEntry: bir transferin muhasebe kaydı
  ├── Posting: senin hesabına Debit 100
  └── Posting: Ayşe'nin hesabına Credit 100
```

Ledger bütün kayıt defteri, journal entry bu defterdeki bir olayın kaydı, posting ise o kaydın tek satırıdır.

Ledgerly'deki kullanım örneği:

```csharp
var journal = JournalEntry.Create(
    Currency.FromCode("TRY"),
    [
        Posting.Create(senderAccountId, PostingDirection.Debit, 100m),
        Posting.Create(receiverAccountId, PostingDirection.Credit, 100m)
    ],
    DateTimeOffset.UtcNow
);
```

`Currency` para birimini temsil eder. Bu journal'ın bütün tutarları TRY cinsindedir. Journal ayrıca kendi kimliğini ve oluşturulma zamanını tutar. Bu örnekteki hesap kimlikleri daha önce belirlenmiş kabul edilir; gerçek transfer endpoint'i henüz yoktur.

## Dengeyi neden journal kontrol ediyor?

Tek posting kendi hesabını ve tutarını bilir. Debit 100 satırı, karşısında 100 mü 90 mı credit olduğunu tek başına göremez. Journal bütün satırları gördüğü için toplamları karşılaştırabilir.

```csharp
if (debits != credits)
{
    throw new ArgumentException("Total debits must equal total credits.");
}
```

100 debit / 90 credit verirsek oluşturma işlemi hata verir; dışarıya geçerliymiş gibi bir journal dönmez.

DDD'deki **aggregate**, birlikte kuralları korunan nesneler grubudur. **Aggregate root**, bu grubun kurallarına giriş noktası olan nesnedir. Bu örnekte JournalEntry, posting'lerin birlikte dengeli olmasını sağladığı için bu görevi üstlenir. Bu kavram tek başına database transaction'ı açmaz.

## Immutable ne demek, neden burada istiyoruz?

Immutable, oluşturulduktan sonra değiştirilemeyen demektir. Journal oluşturulurken kontrol ettiğimiz dengenin dışarıdaki kod tarafından sonradan bozulmasını istemiyoruz.

Bu yüzden üç ayrı korumamız var:

| Koruma | Neyi engeller? |
|---|---|
| Posting alanlarında yalnızca get bulunması | Tutarın, hesabın veya yönün sonradan değiştirilmesini |
| Giriş koleksiyonunun ToArray ile kopyalanması | Çağıranın kendi listesini değiştirip journal'ı etkilemesini |
| Array.AsReadOnly ile dışarı açılması | Journal'ın listesine dışarıdan satır atamayı veya listeyi temizlemeyi |

`ToArray()` yeni bir array oluşturur; Posting nesnelerinin referanslarını kopyalar. Posting'ler zaten değiştirilemediği için nesneleri ayrıca kopyalamamız gerekmez.

```text
Başlangıç:
Çağıranın array'i [0] → P1: Debit 1
Journal'ın array'i [0] → P1: Debit 1

Çağıran kendi [0] kutusuna yeni P2 nesnesini koyarsa:
Çağıranın array'i [0] → P2: Debit 999
Journal'ın array'i [0] → P1: Debit 1
```

`IReadOnlyList` üzerinden değiştirme metotları sunulmaz. Ancak yalnızca bu interface'i kullanmak alttaki nesneyi değiştirilemez yapmaz. Biz `Array.AsReadOnly` kullandığımız için başka bir interface üzerinden değiştirme girişimi de reddedilir. Bu ayrımın testi aşağıdadır.

## Kopyalama testi neyi deniyor?

`Create_WhenCallerChangesInputCollection_ShouldKeepOriginalBalancedPostings` testinin hikâyesi şu:

1. Debit 1 / Credit 1 satırları hazırlanır; ilk posting `originalDebit` değişkeninde saklanır.
2. Bunlardan journal oluşturulur.
3. Çağıranın array'indeki ilk eleman yeni bir Debit 999 posting'iyle değiştirilir.
4. Journal'ın ilk satırının hâlâ başlangıçtaki posting olduğu kontrol edilir.
5. Journal'ın kendi listesi üzerinden değiştirme ve silme denenir; ikisinin de reddedilmesi beklenir.

```csharp
Assert.Equal(originalDebit, entry.Postings[0]);

var exposedList = Assert.IsAssignableFrom<IList<Posting>>(entry.Postings);
Assert.Throws<NotSupportedException>(() => exposedList[0] = postings[0]);
Assert.Throws<NotSupportedException>(() => exposedList.Clear());
```

`Equal` beklenen ve gerçek değeri karşılaştırır. `IsAssignableFrom`, aynı koleksiyona IList olarak erişilebildiğini kontrol eder; kopya üretmez. `Throws`, verilen işlemi çalıştırıp belirtilen exception'ı bekler. Burada exception'ın gelmesi testin geçmesi demektir: değiştirme girişimi engellenmiştir.

Bu koruma bellekteki nesne içindir. Database'de kayıt silme veya güncelleme engeli henüz kurulmadı.

## Diğer oluşturma kuralları neler?

Boş hesap kimliği, tanımsız yön ve pozitif olmayan tutar reddedilir. En az iki posting ve iki farklı hesap gerekir. Bu projede tek hesaba hem debit hem credit yazan kayıt kabul edilmez.

Tutar en fazla `999999999999999.9999` olabilir ve dört ondalık basamakla kayıpsız temsil edilmelidir. Bu mevcut database hassasiyetiyle uyumlu ilk seçimimizdir. `1.00001` sessizce yuvarlanmaz; reddedilir. `1.00000` sayısal olarak 1 olduğu için kabul edilir. TRY'nin alt birimleri hakkında yeni bir kural tanımlamış olmuyoruz.

## Dengeli olması her şeyin doğru olduğu anlamına gelir mi?

Hayır. Yanlış iki hesaba 100/100 yazmak da dengelidir. Aynı kaydı iki kez işlemek de dengeyi bozmaz. Hesapların varlığı, doğru currency, yeterli bakiye ve aynı işlemin tekrar uygulanmaması ayrıca korunmalıdır.

Hareketleri değiştirmeden saklamak event sourcing'e benzer bir özellik taşır. **Event sourcing**, durumun asıl kaynağını olay geçmişi olarak saklayıp mevcut durumu bu olayları yeniden uygulayarak üretmektir. Sadece immutable sınıflar eklemek bunu kurmaz; Ledgerly'de henüz böyle bir mekanizma yok. [Event Sourcing açıklaması](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)

## Ledgerly'de neden bu modeli seçtik?

Yalnızca Balance son durumu tutardı. From/To/Amount içeren tek bir transfer satırı basit iki hesaplı akışa yeterdi. Journal ve posting'leri seçerek çok satırlı hareketi de ifade ediyor, dengeyi tek yerde kontrol ediyoruz. Bedeli daha fazla kavram ve ileride bütün satırları birlikte kaydetme zorunluluğu.

## Uygulama ve doğrulama kaydı

15 Eylül 2026'da bu domain adımına 29 test eklendi. İlk test çalışması sınıflar henüz olmadığı için derlenemedi; bu aşamada çalışan bir API'de para kaybı gösterilmedi. Sınıflar eklendikten sonra 41 Domain, 4 Application ve 17 IntegrationTests case'i, toplam 62 test geçti. IntegrationTests içindeki 3 case önceki hata-enjeksiyon kontrolleriydi.

Bu sayı bu milestone'a aittir. Hesap modeliyle güncel toplam 67 oldu; [20. bölüm](20-ledger-account-domain.md). Yeni ledger testleri bellekte çalışır:

```bash
dotnet test tests/Ledgerly.Domain.Tests/Ledgerly.Domain.Tests.csproj --filter 'FullyQualifiedName~Ledgerly.Domain.Tests.Ledger'
```

Kod: `src/Ledgerly.Domain/Ledger/JournalEntry.cs`, `Posting.cs`, `PostingDirection.cs`. Kanonik karar ve test kayıtları Ledgerly'deki `docs/domain/03-double-entry-ledger.md`, `docs/adr/0004-journal-entry-and-postings.md`, `docs/journey/04-ledger-domain.md` dosyalarındadır.

## Mülakatta nasıl anlatırım?

> Ledger para hareketlerinin kayıt defteri; journal bir olayın bütünü, posting onun bir hesabı etkileyen satırıdır. Ledgerly'de aynı olaya ait debit ve credit toplamlarını journal oluşturulurken eşit olmak zorunda tuttum. Satırları ve koleksiyonu değiştirilemez hâle getirerek bu dengenin dışarıdan bozulmasını engelledim. Şu an doğruladığım bellekteki domain kuralları; kalıcı kayıt ve bakiye kontrolü sonraki adımlar.
