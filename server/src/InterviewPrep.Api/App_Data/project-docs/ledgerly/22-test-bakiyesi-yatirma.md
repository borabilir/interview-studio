# Test Bakiyesi Yatırmak Nedir? Bakiye ile Para Hareketini Birlikte Kaydetmek

## Test bakiyesi yatırmak nedir?

Bir cüzdana, gerçek bankadan para gelmeden deneme amaçlı bakiye eklemektir. Örneğin boş bir cüzdana 100 TL test bakiyesi koyarız. Sonra bu parayla transfer gibi senaryoları deneyebiliriz.

Gerçek ödeme sisteminde banka veya ödeme sağlayıcısı paranın geldiğini doğrular. Biz bu adımda o dış sistemi kurmuyoruz. “100 TL geldiğini varsayalım; kendi kayıtlarımızı doğru tutabiliyor muyuz?” sorusunu inceliyoruz.

## Yalnızca bakiyeyi artırmak neden yetmiyor?

Bakiye “şu anda ne kadar var?” sorusunu cevaplar. Para hareketi ise “bu tutar nereden geldi?” sorusunu cevaplar.

```text
Önce: Wallet bakiyesi 0 TL
İşlem: 100 TL test yatırması
Sonra: Wallet bakiyesi 100 TL
Açıklayan kayıt: 100 TL'lik yatırma journal'ı
```

Journal, tek para hareketine ait muhasebe fişidir. Posting, bu fişin bir hesap üzerindeki etkisini gösteren satırıdır. Bizim yatırma fişimizde iki satır var: fon hesabına debit 100, wallet hesabına credit 100. İkisi aynı para hareketinin iki tarafını gösterir; toplam 200 TL yatırdığımız anlamına gelmez.

Fon hesabı, platformun tuttuğu parayı temsil eden kayıttır. Wallet hesabı müşteriye karşı yükümlülüğün kaydıdır. Bu yüzden ikisi birlikte artar. Muhasebedeki debit/credit kelimeleri her hesapta doğrudan eksi/artı anlamına gelmez; [hesap türleri bölümünde](20-ledger-account-domain.md) bu ayrımı anlattık.

## Hesap açmakla para yatırmak aynı şey mi?

Hayır. Hesap açmak, hareket yazabileceğimiz bir kimlik oluşturmaktır. Boş defter açmaya benzer. Para yatırmak ise o deftere hareket kaydetmektir.

Önceden oluşturulmuş bir wallet'ın ledger hesabı olmayabilir. Bu nedenle ilk yatırmada “bu wallet'ın muhasebe hesabı var mı?” diye bakıyoruz. Yoksa açıyoruz. Aynı şekilde TRY test fon hesabını buluyor, yoksa oluşturuyoruz. İkinci yatırmada var olan hesapları kullanıyoruz.

Bu yaklaşıma bazen lazy initialization denir: bir şeyi ilk ihtiyaç duyulduğunda hazırlamak. Kelimeyi bilmekten önemli olan davranış budur.

Alternatif olarak wallet oluşturulurken hesabını da açabilirdik. Ancak eski wallet'ları ayrıca hazırlamak gerekirdi. Önceden çalışan bir hazırlık komutu da yazabilirdik; bu kez o komutun ne zaman çalıştırılacağını yönetirdik. İlk yatırmada hazırlama, bu küçük projede eski ve yeni wallet'ları tek akışta destekliyor.

Bedeli şu: İki istek aynı anda “hesap yok” diyebilir. Database'deki unique constraint, yani aynı anahtarla ikinci kaydı engelleyen kural, iki hesap açılmasını önler. Kaybeden istek 409 alır ve onun diğer değişiklikleri de kaydedilmez.

## Tracked nesne nedir? Neden GET'te farklı okuyoruz?

Tracked, EF'nin okuduğu nesneyi ve ilk değerlerini takip etmesi demektir. Nesnenin bakiyesi değişirse SaveChanges sırasında bu farkı database'e yazar.

```csharp
var wallet = await wallets.GetForUpdateAsync(walletId);
wallet.Credit(100m);
await unitOfWork.SaveChangesAsync();
```

İlk satır wallet'ı getirir. İkinci satır bellekteki bakiyeyi artırır. Son satır database'e kaydeder. `Credit` tek başına SQL çalıştırmaz.

Mevcut GET wallet sorgusunda yalnızca bilgi gösteriyoruz. Bu yüzden AsNoTracking ile takip etmeden okuyoruz. Yeni GetForUpdateAsync ise değişiklik yapmak için takip edilen wallet'ı getiriyor. Buradaki “ForUpdate” isimlendirmesi bir satır kilidi alındığı anlamına gelmiyor.

DbContext üzerindeki Wallets, LedgerAccounts, JournalEntries ve Postings property'leri DbSet döndürür. DbSet ilgili kayıtları sorgulamak veya eklemek için kullanılan EF nesnesidir. `db.LedgerAccounts` ile `db.Set<LedgerAccountRecord>()` aynı sete erişir. Ledger satır sınıfları Infrastructure'ın internal detayları olduğu için ilgili property'ler de internal tanımlıdır.

## Transaction nedir ve burada neyi birlikte tutuyor?

Transaction, bir grup database değişikliğinin birlikte tamamlanması veya birlikte geri alınmasıdır. Geri alma işlemine rollback denir.

Bu yatırmada şu işler aynı SaveChanges içinde:

```text
Eksik hesapları oluştur
Wallet bakiyesini artır
Journal başlığını kaydet
İki posting'i kaydet
           ↓
Hepsini birlikte tamamla
```

Örneğin ikinci posting olmayan bir hesaba işaret ediyorsa database onu reddeder. Bu yatırmanın bakiye artışı, yeni hesapları ve journal'ı da kalmamalıdır.

Repositories burada yalnızca kaydedilecek değişiklikleri hazırlar. Handler sonunda tek Unit of Work çağrısı yapar. Unit of Work, bu çalışma birikimini birlikte kaydettiğimiz sınırdır. EF, tek SaveChanges içindeki değişiklikleri transaction ile korur; ayrı ayrı SaveChanges çağırmak aynı güvenceyi otomatik olarak vermez.

Bir ayrıntı: Rollback database'i geri alır. Bellekteki `wallet.Balance` alanını otomatik olarak eski hâline çevirmiş sayılmaz. Başarısız isteğin DbContext'i atılır; testler sonucu yeni bir bağlantıyla okur.

## Transaction varsa iki yatırma neden hâlâ sorun çıkarabilir?

Transaction “bu isteğin parçaları birlikte kaydedilsin” der. “İsteğin okuduğu bakiye hiç değişmedi” demek değildir.

Gerçek PostgreSQL'de önce şu deneyi yaptık:

```text
A: bakiyeyi 0 okudu, 10 ekledi → 10 hesapladı
B: bakiyeyi 0 okudu, 20 ekledi → 20 hesapladı
A: 10 yazdı
B: 20 yazdı
Son bakiye: 20
```

A'nın 10 TL artışı kayboldu. Bu probleme lost update, yani kaybolan güncelleme denir. İki okuma da ilk yazmadan önce tamamlatıldığı için deney tesadüfi zamanlamaya bağlı değildi.

## Optimistic concurrency nedir?

Okuduğumuz veri değişmemişse kaydetmek; başka biri değiştirmişse işlemi reddetmektir. Okuma boyunca herkesi bekletmek yerine, kayıt anında varsayımımızı kontrol ederiz.

Bizde kontrol edilen değer bakiyedir. EF ayarında `IsConcurrencyToken()` dedik. Concurrency token, bu karşılaştırmada kullanılacak değerdir.

B isteği artık kabaca şunu söyler:

```sql
UPDATE wallets SET balance = 20
WHERE id = @walletId AND balance = 0;
```

Yani “bakiye hâlâ okuduğum 0 ise 20 yap”. A bakiyeyi 10 yaptığı için B'nin koşulu tutmaz. EF bunu concurrency hatası olarak bildirir. API 409 döndürür, B'nin bütün kayıtları geri alınır.

Son bakiye bu kez 10'dur. “Neden 30 değil?” Çünkü yalnızca A başarılı oldu. B'nin 20 TL yatırması kabul edilmiş gibi davranmıyoruz.

## Başka nasıl çözebilirdik?

| Yaklaşım | Basit mantığı | Bedeli |
|---|---|---|
| Eski değer kontrolü | “Okuduğum bakiye aynıysa yaz” | Çakışan isteği reddederiz |
| Satır kilidi | “Ben bitene kadar bu bakiyeyi başkası değiştirmesin” | İstekler bekler; transaction uzun sürerse bekleme artar |
| SQL ile doğrudan artırma | “Bakiyeyi okuduğum değere eşitleme, database'deki mevcut değere 100 ekle” | Bakiye üst sınırı ve journal ile ortak kayıt akışını buna göre kurarız |
| Serializable | “Sonuç, işlemler sırayla yapılmış gibi olsun” | Database bazı işlemleri iptal edebilir; güvenli tekrar davranışı gerekir |

Bu aşamada eski değer kontrolünü seçtik. Ek servis kurmadan mevcut tracked Wallet ve tek SaveChanges akışına uyuyor. Çok yoğun bir wallet'ta ne kadar çakışma olacağını henüz yük testiyle ölçmedik; performans kazancı iddia etmiyoruz.

Şu an yalnızca pozitif yatırma var; bakiye eski değerine dönmüyor. İleride para çıkışı eklenince bakiye 10 → 20 → 10 olabilir. Başlangıç ve son değeri karşılaştırmak aradaki değişimi göstermez. Buna ABA problemi denir. Transfer aşamasında ayrı sürüm değeri ve korunacak iş kuralları yeniden değerlendirilecek.

## Endpoint nasıl kullanılır?

Development ortamında Scalar üzerinden önce wallet oluştur, ardından dönen walletId ile:

```http
POST /api/wallets/{walletId}/test-deposits
Content-Type: application/json

{ "amount": 100 }
```

200 yanıtı walletId, journalEntryId, currencyCode, amount ve işlem sonucundaki balance değerini verir. Currency istekte seçilmez; wallet'tan gelir. GET wallet ile yeni bakiyeyi okuyabilirsin. Journal ID döner ama journal okuma endpoint'i henüz yoktur.

Tutar pozitif, en fazla dört ondalık basamaklı olmalı; bakiye numeric(19,4) sınırını aşamaz. Geçersiz tutar 400; bulunamayan wallet 404; bakiye veya hesap açma çakışması 409. Beklenmeyen database hatası 500 olur. Production ve diğer ortamlarda bu endpoint işlem yapmadan 404 döner.

Bu ortam kontrolü gerçek para işlemleri için kimlik doğrulama veya yetkilendirmenin yerine geçmez; endpoint test parası içindir.

## Neyi test ettik?

Domain testleri tutar ve bakiye sınırlarını kontrol eder. Application testleri doğru hesapların kullanıldığını, journal'ın iki doğru satırla hazırlandığını ve tek save yapıldığını kontrol eder. Application'daki fake repository rollback kanıtı değildir.

HTTP integration testleri gerçek PostgreSQL'de normal yatırmayı, tekrar yatırmada hesapların kullanımını, bakiyenin GET ile okunmasını, üç farklı eşzamanlı yarışta bir başarılı/bir çakışan isteği ve database hatasında rollback'i doğrular. İki denenen journal'dan yalnızca biri ve iki posting kalır. Production ortamındaki 404 davranışı da test edilir.

Lab'da kontrolsüz yazma örneği bilerek tutulur. Bu case'in geçmesi yanlış sonucu tekrar üretebildiğimizi gösterir. Yanındaki kontrollü case, kaybolan artış yerine açık conflict oluştuğunu gösterir.

115 test geçti: 53 Domain, 9 Application, 53 Integration. EF model kontrolü ve migration doğrulaması da yapıldı. Yeni migration yeni sütun eklemez; EF'nin balance'ı karşılaştırma değeri olarak kullanacağını model snapshot'ına kaydeder.

## Aynı isteği tekrar gönderirsem ne olur?

Şu an iki başarılı gönderim iki ayrı yatırmadır. Concurrency kontrolü, aynı eski bakiyeden yapılan çelişkili yazmaları engeller; aynı iş isteğini tanımaz.

Örneğin server parayı yatırdı ama yanıt ulaşmadı. İstemci tekrar yollarsa aynı para ikinci kez yatırılabilir. Sıradaki öğrenme konusu idempotency: aynı işleme ait tekrarları tanıyıp yalnızca bir finansal etki oluşturmak. Bu yüzden timeout veya belirsiz 500 sonucundan sonra körlemesine otomatik retry eklemedik.

## Mülakatta nasıl anlatırım?

> Test yatırmasında wallet bakiyesiyle muhasebe kaydını tek transaction'da değiştirdim. İki işlemin aynı eski bakiyeyi okumasıyla bir artışın kaybolduğunu gerçek PostgreSQL üzerinde gösterdim. Eski bakiyeyi UPDATE koşuluna ekleyerek çakışan yazmayı reddettim. İlk kullanımda açılan hesapları da aynı kayıt sınırına aldım. HTTP testlerinde başarılı işlemin tüm kayıtlarının kaldığını, kaybeden veya hata alan işlemin kayıtlarının kalmadığını doğruladım. Bunun idempotency olmadığını; aynı başarılı isteğin tekrarının ayrı bir problem olduğunu ayırıyorum.

Kanonik kayıtlar: Ledgerly `docs/labs/003-test-deposit/README.md`, `docs/adr/0007-test-deposit-and-balance-concurrency.md`, `docs/journey/07-test-deposit.md`.

## Sonraki model adımı

Bu bölümdeki 115 test, test yatırması adımının sonucudur. [23. bölüm](23-ledger-account-purpose.md) Type ve Purpose ayrımını, amaca göre fon sorgusunu ve mevcut hesapların migration ile taşınmasını anlatır.
