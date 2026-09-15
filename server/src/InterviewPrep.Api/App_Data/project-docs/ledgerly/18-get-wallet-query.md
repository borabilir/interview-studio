# Get Wallet — İlk Query ve Aynı Veritabanında CQRS

**Durum:** Uygulandı ve gerçek PostgreSQL ile doğrulandı

**Tarih:** 2026-09-15

**Ledgerly commit:** `bacc9ec` — `feat(wallets): add get wallet query and resource location`

**Kanonik kaynak:** Ledgerly `docs/journey/03-get-wallet-query.md` ve `docs/architecture/02-cqrs-ve-application-katmani.md`

**Önceki bölüm:** [Concurrent Create Wallet çözümü](17-concurrency-lab-solution.md)

## 1. Neden bu adımı yaptık?

Wallet oluşturabiliyorduk, fakat dönen ID ile wallet'ı okuyacak endpoint yoktu. Bu nedenle POST'un 201 yanıtında gerçek bir kaynak adresi sunmuyorduk.

Yeni akış:

```text
POST /api/wallets
  -> 201 Created
  -> body: walletId
  -> Location: /api/wallets/{walletId} adresinin mutlak URL'i

GET Location
  -> 200 OK
  -> wallet detayları
```

Kayıt yoksa GET, 404 ProblemDetails döner. Bu aşamada deposit, transfer veya ledger eklenmedi.

## 2. Query nedir?

Command sisteme bir değişiklik yaptırma niyetidir. Query bilgi istemektir.

```csharp
public sealed record CreateWalletCommand(Guid OwnerId, string CurrencyCode);
public sealed record GetWalletQuery(Guid WalletId);
```

Create yeni wallet oluşturur ve save çağırır. Get yalnızca ID ile kayıt okur; yeni wallet veya yeni oluşturma zamanı üretmez.

## 3. CQRS için ayrı veritabanı gerekiyor mu?

Hayır. Bu aşamadaki ayrım şöyledir:

```text
CreateWalletCommand -> CreateWalletHandler -> INSERT
                                              |
                                   PostgreSQL / wallets
                                              |
GetWalletQuery      -> GetWalletHandler     -> SELECT
```

Command/query ve handler/result modelleri ayrıdır. Repository, DbContext tipi ve database ortaktır. `ledgerly` development database'i, `ledgerly_tests` ise integration testlerinin database'idir. Test database'i CQRS read database'i değildir.

MongoDB read projection, event ile senkronizasyon ve eventual consistency roadmap'in ileri aşamalarındadır. Basit bir ID sorgusu için bunları şimdi eklemek veri kopyalama ve gecikme problemleri getirirdi.

Mülakat cümlesi:

> CQRS'i önce uygulama seviyesinde command ve query sorumluluklarını ayırarak kullandım. Ayrı database bir zorunluluk değil; farklı read model ve ölçekleme ihtiyacı ortaya çıktığında değerlendirilecek bir adımdır.

## 4. GetWalletHandler ne yapıyor?

```csharp
var wallet = await _walletRepository.GetByIdAsync(query.WalletId, cancellationToken);
```

Wallet bulunursa alanları GetWalletResult'a aktarır; bulunamazsa null döner.

```text
GetWalletResult
  WalletId
  OwnerId
  CurrencyCode
  Status
  Balance
  CreatedAtUtc
```

Handler'ın `IUnitOfWork` bağımlılığı yoktur. `SaveChangesAsync` çağırmaz. `TimeProvider` da gerekmez; mevcut kaydın zamanını okur. CancellationToken repository sorgusuna kadar iletilir.

## 5. Neden ayrı bir read repository yazmadık?

Mevcut `IWalletRepository`ye tek bir metot ekledik:

```csharp
Task<Wallet?> GetByIdAsync(Guid walletId, CancellationToken cancellationToken = default);
```

Üç seçeneği değerlendirdik:

| Seçenek | Avantaj | Bedel |
|---|---|---|
| Controller'dan EF sorgusu | En kısa yol | HTTP katmanına persistence bilgisi sızar |
| Mevcut repository + query handler | Küçük değişiklik, use-case sınırı açık | Read/write aynı portta; fake ve decorator'lar yeni metodu karşılamalı |
| Ayrı read portu + DTO projection | Read model bağımsız gelişebilir | Yeni interface ve adapter; bu aşamada gerekliliği henüz yok |

İkinci seçeneği kullandık. Bu evrensel bir zorunluluk değildir. Listeleme, raporlama veya join ihtiyacı büyürse read portu ve doğrudan DTO projection yeniden değerlendirilir.

Handler sayısı ikiye çıktı; controller bunları `_createWalletHandler` ve `_getWalletHandler` olarak alır. Şimdilik açık constructor injection kullanıyoruz. MediatR için otomatik bir sayı eşiği yok; dispatch ve ortak pipeline ihtiyacı doğarsa değerlendirilecek.

## 6. AsNoTracking neden var?

Infrastructure sorgusu:

```csharp
return _dbContext.Wallets
    .AsNoTracking()
    .SingleOrDefaultAsync(wallet => wallet.Id == walletId, cancellationToken);
```

EF normal tracked sorguda okuduğu entity'nin değişikliklerini takip edebilir. Bu query'de nesneyi değiştirmek ve kaydetmek istemiyoruz; mevcut veriyi bir sonuç modeline taşıyoruz.

AsNoTracking ile dönen entity change tracker'a eklenmez. Okuma snapshot'ını değiştirmenin sonraki bir save ile kendiliğinden database'e yazılmaması persistence testinde doğrulandı.

Bu bir database kilidi veya bütün sistemi salt okunur yapan koruma değildir. Başka request aynı kaydı değiştirebilir. Gelecekte transfer handler'ı bu metodu kullanıp nesnenin otomatik tracked olduğunu varsaymamalıdır. Yazma amaçlı yükleme ihtiyacı ayrıca tasarlanacak.

## 7. Neden bulunamayınca exception yerine null dönüyoruz?

Bu query'nin beklenen sonuçları basittir: Wallet var veya yok. Application null ile yokluğu temsil eder; HTTP karşılığını controller belirler:

```csharp
if (result is null)
{
    return Problem(
        statusCode: StatusCodes.Status404NotFound,
        title: "Wallet not found",
        detail: $"Wallet '{walletId}' was not found."
    );
}
```

Yeni bir WalletNotFoundException veya genel Result kütüphanesi eklemedik. Duplicate command'ın mevcut exception sözleşmesini de değiştirmedik. Query'nin kayıt bulamaması normal sonuç, beklenmeyen database arızası ise hata olarak yukarı çıkar.

Route `{walletId:guid}` kullanır. GUID olmayan değer route'a eşleşmez; burada anlatılan 404 ProblemDetails, geçerli GUID olup kaydı bulunamayan isteğe aittir. Guid.Empty de bulunamayan ID'dir.

## 8. API neden Wallet entity'sini dönmüyor?

API'nin dış sözleşmesi GetWalletResponse'tur. Application sonucu ile HTTP modeli ayrı kalır:

```json
{
  "walletId": "7d8ea830-5bd0-4f5f-bdc8-9d3c413ea55e",
  "ownerId": "d860e2a1-b80f-43d9-bfe0-21aa5ab7a1c7",
  "currencyCode": "TRY",
  "status": "Active",
  "balance": 0,
  "createdAtUtc": "2026-09-15T12:00:00+00:00"
}
```

Domain enum'u Application içinde kullanılabilir; API status'u açıkça string'e çevirir. Böylece EF veya domain entity'sini doğrudan serialize etmiyoruz. Balance şu an wallet tablosundaki değerdir; ledger henüz uygulanmadı.

## 9. Location header neden şimdi eklendi?

Önceden var olmayan bir GET adresini sunmak istemiyorduk. Artık gerçek route var:

```csharp
return CreatedAtAction(nameof(GetById), new { walletId = result.WalletId }, response);
```

ASP.NET Core adresi action ve route değerlerinden üretir. Başarılı POST hâlâ 201 ve walletId döner, ek olarak Location gelir. Test bu adresi takip edip aynı walletId'nin 200 ile döndüğünü kontrol eder.

## 10. Testleri hangi sırayla yazdık?

Önce HTTP sözleşmesini tanımlayıp üç case çalıştırdık:

- Mevcut wallet GET ile okunamadı: 200 yerine 404.
- Bulunamayan wallet için özel ProblemDetails yoktu: route 404 gövdesizdi.
- POST yanıtındaki Location null idi.

Üçü de Red oldu. Ardından query, repository sorgusu ve endpoint eklendi.

Application testleri handler'ın fake repository ile davranışını kontrol eder. Gerçek PostgreSQL'e yazmayı bu testlerden beklemiyoruz. Persistence ve HTTP testleri gerçek entegrasyon sınırını kontrol eder.

Sonuç:

```text
Domain             12 passed
Application         4 passed
IntegrationTests   17 passed
Toplam             33 passed, 0 failed, 0 skipped
```

- İki yeni Application testi: Alan dönüşümü/ID-token iletimi ve bulunamayan kayıt sonucu.
- İki yeni HTTP testi: Detayların doğru dönmesi ve 404 ProblemDetails. Tabloda başka wallet varken yanlış ID'nin o kaydı döndürmediği de kontrol edilir.
- Bir yeni persistence testi: Okuma tracked değildir; snapshot'taki değişiklik sonraki save ile yazılmaz.
- Mevcut POST testi: Location'ı takip eder.
- Mevcut dokümantasyon testi: OpenAPI GET 200/404 ve POST 201 sözleşmelerini kontrol eder.
- Önceki duplicate/concurrency testleri geçmeye devam eder.

IntegrationTests içindeki 3 case önceki save interceptor hata-enjeksiyon testleridir. Bu sayıların tamamı gerçek network arızası deneyi anlamına gelmez.

## 11. Kendim nasıl denerim?

Ledgerly klasöründe, Docker Desktop açıkken:

```bash
docker compose up -d
dotnet test Ledgerly.slnx
dotnet run --project src/Ledgerly.Api/Ledgerly.Api.csproj --launch-profile https
```

Scalar'da (`https://localhost:7092/scalar/v1`) önce POST ile wallet oluştur. Dönen walletId ile GET'i çağır veya Location adresini kullan. Farklı, bulunmayan bir GUID gönderdiğinde 404 görürsün.

`.http` dosyasında GET örneği de var. SDK PATH'te bulunamazsa `dotnet` yerine `~/.dotnet/dotnet` kullanılabilir. Testler 2026-09-15'te macOS ARM64, SDK 10.0.400/runtime 10.0.11, PostgreSQL 18.6-alpine üzerinde tam SDK yolu ile çalıştırıldı.

Testler varsayılan ledgerly_tests database'ini kullanır. HTTP testi finally temizliği, persistence testi transaction rollback uygular. Yeni migration gerekmedi. Browser üzerinden manuel test veya performans benchmark'ı bu doğrulamaya dahil değildir.

## 12. Mülakatta kısa anlatım

> Create Wallet akışını tamamlamak için ID ile okuyan ilk query'yi ekledim. Command ve query handler'larını ayırdım ama ölçülmüş ayrı read database ihtiyacı olmadığı için aynı PostgreSQL tablosunu kullandım. Repository AsNoTracking sorguluyor, handler save çağırmıyor. Kayıt yokluğunu API'de 404 ProblemDetails olarak sunuyorum. Gerçek GET route'u oluşunca POST yanıtına CreatedAtAction ile Location ekledim. Bu adresi takip ederek kaynağı okuyan HTTP testi ve okumanın tracked olmadığını doğrulayan PostgreSQL testi yazdım.

## 13. Sıradaki öğrenme adımı

Double-entry ledger ve test bakiyesi yatırma/transfer davranışlarının invariant ve transaction sınırlarını tasarlamak. Okuma endpoint'inin hazır olması henüz finansal para hareketi doğruluğunun uygulandığı anlamına gelmez.
