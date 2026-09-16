# Create Wallet HTTP API ve Functional Test

## HTTP API nedir?

API, başka bir programın uygulamamızdan işlem istemek için kullandığı arayüzdür. HTTP API'de bu iletişim HTTP isteği ve cevabıyla yapılır. Örneğin bir mobil uygulama “bu kullanıcıya TRY wallet oluştur” isteğini API'ye gönderebilir.

Endpoint, belirli HTTP metodu ve adresiyle erişilen işlemdir. `POST /api/wallets` wallet oluşturma endpoint'imizdir. Request gelen istek, response dönen cevaptır; JSON bu örnekte bilgileri taşıdığımız metin biçimidir.

## Controller ve contract nedir?

Controller, HTTP isteğini karşılayıp uygulamanın ilgili işlemini çağıran sınıftır. Contract, tarafların hangi alanları gönderip alacağına ilişkin sözleşmedir. CreateWalletRequest, gelen owner ve currency alanlarını; CreateWalletResponse, dönen wallet kimliğini tanımlar.

Böylece dışarıdaki programın gördüğü veri biçimi ile içerideki Wallet nesnesini ayrı ele alabiliriz. Aşağıda isteğin controller'dan database'e kadar nasıl ilerlediğini izleyeceğiz.

## HTTP durum kodları ne anlatır?

201 yeni kaynağın oluşturulduğunu, 400 isteğin geçersiz olduğunu, 409 isteğin mevcut durumla çakıştığını, 500 beklenmeyen sunucu hatasını anlatır. Bunlar hatanın bütün ayrıntısı değil, istemcinin sonucu yorumlaması için ortak işaretlerdir.

Functional test bu işlemi dışarıdan çağırıp görünen davranışı sınar. LedgerlyApiFactory, test içinde API'nin HTTP istek işleme hattını kurar; testimiz de bu hatta istek gönderir. Database kullanan bu testler ledgerly_tests'e bağlanır.

## Bölümün uygulama bağlamı

**Durum:** Tamamlandı  
**Tarih:** 2026-09-14

Bu bölüm ilk HTTP milestone'ının kaydıdır. 2026-09-15'te GET ve POST Location eklendi; güncel sözleşme ve 33 test sonucu [18 — Get Wallet](18-get-wallet-query.md) bölümündedir.

## 1. Bu aşamada ne yaptık?

Application ve persistence katmanlarında çalışan Create Wallet use-case'ini gerçek bir HTTP endpoint'i olarak dışarı açtık:

```http
POST /api/wallets
Content-Type: application/json

{
  "ownerId": "7d8ea830-5bd0-4f5f-bdc8-9d3c413ea55e",
  "currencyCode": "TRY"
}
```

Başarılı sonuç:

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "walletId": "..."
}
```

Akışın tamamı şöyledir:

```text
HTTP request
  -> API request contract
  -> WalletsController
  -> CreateWalletCommand
  -> CreateWalletHandler
  -> IWalletRepository + IUnitOfWork
  -> LedgerlyDbContext
  -> PostgreSQL
  -> API response contract
```

## 2. Controller'ın görevi ne?

Controller business kuralı uygulamaz. Transport adapter olarak üç iş yapar:

1. HTTP request modelini alır.
2. Modeli Application command'ına dönüştürüp handler'ı çağırır.
3. Application sonucunu HTTP response'una dönüştürür.

```csharp
var command = new CreateWalletCommand(
    request.OwnerId,
    request.CurrencyCode);

var result = await _handler.Handle(command, cancellationToken);

return StatusCode(
    StatusCodes.Status201Created,
    new CreateWalletResponse(result.WalletId));
```

Controller doğrudan `DbContext`, repository veya Domain entity oluşturmaz. Böylece HTTP detayları Application katmanına sızmaz.

## 3. Neden ayrı request, command ve domain modeli var?

Bu üç model farklı sınırlara aittir:

| Model | Katman | Anlam |
|---|---|---|
| `CreateWalletRequest` | API | Dış client'ın gönderdiği JSON sözleşmesi |
| `CreateWalletCommand` | Application | Sistem içinde yürütülecek niyet |
| `Wallet` | Domain | Kimliği, durumu ve invariant'ları olan aggregate |

Tek bir modeli her yerde kullanmak başlangıçta daha kısa görünür; fakat dış API değişikliği Domain modelini, persistence değişikliği de client sözleşmesini etkiler. Ayrı modeller boundary'leri açık tutar.

## 4. Validation nerede yapılmalı?

Validation tek bir katmana ait değildir. Doğrulamanın türüne göre sınır değişir.

### API contract validation

```csharp
public sealed record CreateWalletRequest(
    Guid OwnerId,
    [param: Required, StringLength(3, MinimumLength = 3)]
    string CurrencyCode);
```

`currencyCode` alanının zorunlu ve tam üç karakter olması JSON/API sözleşmesi seviyesinde kontrol edilir. `[ApiController]`, bu kontrol başarısız olursa action'a girmeden `400 ValidationProblemDetails` üretir.

### Domain validation

- `OwnerId`, `Guid.Empty` olamaz.
- Currency kodu desteklenen bir para birimi olmalıdır.
- Yeni wallet aktif ve sıfır bakiyeyle başlamalıdır.

Bu kurallar Domain'de kalır. Use-case yarın HTTP yerine message consumer tarafından çağrılsa da aynı kurallar korunur.

Mülakatta kısa cevap:

> Şekil ve transport doğrulamasını API sınırında, business invariant'larını Domain'de tutarım. Aynı kontrolü yalnızca controller'a koymam; başka giriş noktaları Domain'i geçersiz duruma sokabilir.

## 5. `[ApiController]` bize ne sağladı?

`[ApiController]` controller davranışlarını API kullanımına göre özelleştirir. Bu aşamada en görünür faydası model validation hatalarında action çalışmadan otomatik `400 Bad Request` üretmesidir.

```csharp
[ApiController]
[Route("api/wallets")]
public sealed class WalletsController : ControllerBase
```

Bu otomatik 400 ile Domain'den gelen 400 aynı kaynaktan çıkmaz:

```text
"TR" currency
  -> API validation
  -> action çalışmaz
  -> 400 ValidationProblemDetails

Guid.Empty ownerId
  -> action ve handler çalışır
  -> Domain reddeder
  -> exception middleware
  -> 400 ProblemDetails
```

## 6. Neden `201 Created`?

POST başarılı olduğunda yeni bir wallet kaynağı oluşur. `200 OK` teknik olarak body taşıyabilse de kaynağın oluşturulduğunu en doğru anlatan status `201 Created`dır.

Henüz `Location` header yoktur. Çünkü `GET /api/wallets/{id}` endpoint'i henüz yazılmadı. Var olmayan bir resource URL'i üretmek yerine, query endpoint'i geldiğinde `CreatedAtAction` kullanma kararı aldık.

Mülakatta kısa cevap:

> Yeni resource oluşturulduğu için 201 dönerim. GET endpoint'im varsa Location header'ını gerçek route üzerinden `CreatedAtAction` ile üretirim; çalışmayan sahte bir URL dönmem.

## 7. Neden duplicate isteğe `409 Conflict`?

Aynı owner ve currency için wallet zaten varsa istek biçimsel olarak geçerlidir; ancak kaynağın mevcut durumuyla çatışır. Bu nedenle `400` yerine `409 Conflict` seçildi.

```text
WalletAlreadyExistsException -> 409 Conflict
```

`404` uygun değildir; aranan resource eksik değildir. `422` düşünülebilir fakat duplicate resource semantiğini `409` daha açık ifade eder.

## 8. ProblemDetails nedir?

Her hata için farklı JSON şekli üretmek client kodunu karmaşıklaştırır. ASP.NET Core `ProblemDetails`, HTTP API hataları için standart bir gövde sağlar:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.10",
  "title": "Wallet already exists",
  "status": 409,
  "detail": "Owner '...' already has a 'TRY' wallet."
}
```

Client en azından `status`, `title` ve `detail` alanlarının tutarlı olacağını bilir. İleride machine-readable error code ve trace ID eklenebilir.

## 9. Merkezi exception handler neden kullandık?

Her controller action içinde tekrar eden `try/catch` blokları yazmak yerine `IExceptionHandler` kullanan merkezi middleware ekledik:

| Exception | HTTP status | Problem title |
|---|---:|---|
| `ArgumentException` | 400 | `Invalid request` |
| `WalletAlreadyExistsException` | 409 | `Wallet already exists` |
| Bilinmeyen exception | 500 | `An unexpected error occurred` |

Beklenmeyen exception'ın teknik detayı client'a verilmez. Detay, stack trace ile server loguna yazılır; client genel bir mesaj alır.

Mülakatta kısa cevap:

> Beklenen application/domain hatalarını merkezi bir katmanda HTTP semantiğine map ederim. Controller'ları temiz tutarım. Bilinmeyen hatalarda iç detayı sızdırmadan 500 döner, exception'ı correlation bilgisiyle loglarım.

### Başlangıç trade-off'u

Şu anda genel `ArgumentException` → `400` eşlemesi var. Sistem büyüdükçe bu fazla geniş kalabilir; programlama hatası olan bir `ArgumentException` yanlışlıkla client hatası gibi sunulabilir.

Alternatifler:

- `InvalidCurrencyException` gibi anlamlı exception tipleri
- Application Result/Error modeli
- Error code taşıyan ortak exception tabanı

Hata sayısı henüz azken basit mapping seçildi. Yeni hata türleri geldikçe daha kesin modele geçilecek.

## 10. Scalar ve OpenAPI ne işe yarıyor?

.NET OpenAPI belgesini üretir; Scalar bu belgeyi tarayıcıda etkileşimli bir arayüz olarak gösterir:

```text
Scalar UI    -> https://localhost:7092/scalar/v1
OpenAPI JSON -> https://localhost:7092/openapi/v1.json
```

Uygulamayı çalıştırma:

```powershell
docker compose up -d
dotnet dev-certs https --trust # yalnızca ilk lokal kurulumda gerekiyorsa
dotnet run --project src/Ledgerly.Api/Ledgerly.Api.csproj --launch-profile https
```

Scalar, unit/integration testlerin sonucunu gösteren bir test paneli değildir. Endpoint'leri, request/response şemalarını ve status code'ları görmek; tarayıcıdan manuel istek atmak için kullanılır.

UI `Development` ve otomatik doğrulama için `IntegrationTests` ortamlarında açılır; Production'da açık değildir. Production'da dokümantasyonun herkese açık olması güvenlik ve operasyon kararı gerektirir.

### VS Code run ve debug desteği

Repository köküne ekipçe paylaşılabilen üç VS Code dosyası eklendi:

```text
.vscode/launch.json     -> Ledgerly.Api HTTPS debug profili
.vscode/tasks.json      -> Docker, build, test ve migration task'ları
.vscode/extensions.json -> C# Dev Kit ve REST Client önerileri
```

**Run and Debug** görünümünden `Ledgerly.Api (HTTPS)` seçilip `F5`e basıldığında hazırlık task'ı sırasıyla:

```text
docker compose up -d
  -> dotnet tool restore
  -> dotnet ef database update
  -> API'yi debugger ile başlat
  -> Scalar sayfasını aç
```

API, VS Code'a özel portları tekrar tanımlamak yerine mevcut `Properties/launchSettings.json` içindeki `https` profilini kullanır. Böylece `dotnet run`, Visual Studio ve VS Code aynı `Development` environment ve URL ayarlarını paylaşır.

Controller, handler, repository veya merkezi exception handler'a breakpoint konabilir. `F10` ile satır üzerinden, `F11` ile çağrılan metoda girerek HTTP isteğinin bütün katmanlardaki yolculuğu izlenebilir.

Testler sol menüdeki C# Dev Kit **Testing** görünümünden tek tek çalıştırılabilir ve debug edilebilir. Aynı işlemler `Terminal > Run Task` altındaki `Ledgerly: test all` ve `Ledgerly: test integration` task'larıyla da yapılabilir.

İlk HTTPS kullanımında developer certificate eksikse bir kez şu komut çalıştırılır:

```powershell
dotnet dev-certs https --trust
```

Aynı komut `Terminal > Run Task > Ledgerly: trust HTTPS certificate` üzerinden de başlatılabilir. Sertifika güveni makineye ve kullanıcıya özel olduğu için otomatik `preLaunchTask` içine konmadı.

## 11. Functional test nedir?

Application testi handler'ı doğrudan çağırır. Functional HTTP testi ise gerçek API sınırından girer:

```text
HttpClient
  -> routing
  -> JSON model binding
  -> validation
  -> middleware
  -> controller
  -> handler
  -> EF Core
  -> gerçek PostgreSQL
```

Bu test; yanlış route, yanlış status code, serialization, DI registration veya exception mapping hatalarını Application unit testinin yakalayamadığı yerde yakalar.

## 12. WebApplicationFactory ne yapıyor?

`WebApplicationFactory<Program>`, ASP.NET Core uygulamasını test process'i içinde ayağa kaldırır. Gerçek bir TCP portu ve ayrı Kestrel process'i açmadan `HttpClient` ile uygulama pipeline'ına istek gönderilebilir.

```csharp
public sealed class LedgerlyApiFactory
    : WebApplicationFactory<Program>, IAsyncLifetime
```

Testin API'deki top-level `Program` tipine ulaşabilmesi için:

```csharp
app.Run();

public partial class Program;
```

eklendi. Bu satır ikinci bir uygulama başlangıcı oluşturmaz; compiler'ın top-level statements için ürettiği `Program` tipini test projesine görünür hâle getirir.

## 13. Functional test hangi database'i kullanıyor?

API factory, `appsettings.IntegrationTests.json` içindeki bağlantıyı host configuration'a verir:

```text
Database=ledgerly_tests
```

Öncelik sırası:

```text
LEDGERLY_TEST_DB_CONNECTION_STRING
  -> tanımlı değilse appsettings.IntegrationTests.json
```

Test başlangıcında `Database.MigrateAsync()` çağrılır. Böylece HTTP isteği fake repository'ye değil gerçek `WalletRepository`, EF mapping ve PostgreSQL'e gider.

Test verisi benzersiz owner ID ile üretilir ve `finally` içinde temizlenir. HTTP ile persistence testleri aynı xUnit collection altında seri çalışır; paylaşılan test database'inde birbirini etkilemez.

## 14. Hangi senaryoları test ettik?

### Happy path

```text
Given  benzersiz owner ve geçerli TRY currency
When   POST /api/wallets
Then   201 Created
And    walletId boş değil
And    kayıt gerçek PostgreSQL'de bulunuyor
```

### Sıralı duplicate

```text
Given  ilk istek wallet'ı oluşturmuş
When   aynı owner/currency ikinci kez gönderilir
Then   409 Conflict
And    ProblemDetails başlığı doğru
```

### Domain validation

```text
Given  Guid.Empty ownerId
When   POST /api/wallets
Then   400 Invalid request
```

### API contract validation

```text
Given  iki karakterli currencyCode
When   POST /api/wallets
Then   action çalışmadan 400 ValidationProblemDetails
```

Yalnızca HTTP testlerini çalıştırmak:

```powershell
dotnet test tests/Ledgerly.IntegrationTests/Ledgerly.IntegrationTests.csproj `
  --filter "FullyQualifiedName~CreateWalletHttpTests"
```

Bu aşamadaki sonuç:

```text
Domain       12 passed
Application   2 passed
Integration   7 passed
Total        21 passed
```

## 15. Test piramidi açısından elimizde ne var?

```text
Az sayıda, geniş kapsamlı  -> HTTP functional integration testleri
Orta kapsamlı             -> Persistence integration testleri
Çok sayıda, hızlı          -> Domain ve Application unit testleri
```

Her davranışı HTTP testinde tekrar etmek test paketini yavaşlatır ve teşhisi zorlaştırır. Domain invariant'larının ayrıntılı kombinasyonları unit testte; routing, status ve gerçek entegrasyon riski ise az sayıda functional testte tutulur.

## 16. Şu an neyi garanti etmiyoruz?

İki duplicate istek sırayla geldiğinde `409` döndüğünü biliyoruz. Ancak iki istek aynı anda gelirse ikisi de `ExistsAsync` kontrolünden `false` alabilir:

```text
Request A -> Exists false
Request B -> Exists false
Request A -> INSERT succeeds
Request B -> unique violation
```

Database unique index doğruluğu korur; fakat unique violation henüz `WalletAlreadyExistsException`a çevrilmediği için kaybeden istek `500` görebilir.

Bu eksik özellikle bırakıldı çünkü sıradaki deneyimizin problemidir:

```text
Problem
  -> Yarış koşulunu reproduce et
  -> PostgreSQL exception kanıtını gözle
  -> Alternatifleri karşılaştır
  -> Unique violation'ı kontrollü 409'a map et
  -> Paralel HTTP testiyle doğrula
```

## 17. Mülakatta 60 saniyelik anlatım

> Create Wallet use-case'ini HTTP'ye açarken API modellerini Application command ve Domain aggregate'den ayırdım. Controller yalnızca mapping ve orchestration başlangıcını yapıyor; business kuralları Domain'de. Contract validation hatalarını ApiController otomatik 400'e, beklenen domain/application hatalarını merkezi IExceptionHandler ProblemDetails formatında 400 veya 409'a çeviriyor. Endpoint'i yalnızca handler testiyle bırakmadım; WebApplicationFactory ile routing'den başlayıp gerçek test PostgreSQL'ine kadar giden functional testler yazdım. Scalar ile OpenAPI'yi manuel keşfedilebilir yaptım. Şu an sıralı duplicate doğru çalışıyor; eşzamanlı unique violation mapping'i ise sıradaki reproduce edeceğimiz concurrency senaryosu.

## 18. Mülakat soruları

### Controller neden repository çağırmıyor?

Controller HTTP adapter'ıdır. Repository çağırırsa use-case orchestration API katmanına dağılır, başka giriş noktalarında tekrar edilir ve test sınırları bulanıklaşır. Controller command oluşturup handler'a delegasyon yapar.

### `400` ile `409` farkı ne?

`400`, isteğin geçersiz olduğunu; `409`, biçimsel olarak geçerli isteğin kaynağın mevcut durumuyla çatıştığını anlatır. Duplicate wallet bu nedenle 409'dur.

### Neden her exception mesajını client'a dönmüyorsun?

Beklenmeyen exception'lar connection string, SQL veya stack trace gibi iç detaylar sızdırabilir. Client genel 500 alır, teknik ayrıntı yapılandırılmış server logunda tutulur.

### Functional test ile integration test aynı mı?

İsimler ekipten ekibe değişebilir. Burada persistence integration testi handler'dan gerçek DB'ye kadar gider; functional HTTP testi dış API davranışını routing ve middleware dahil uçtan uca doğrular. İkisi de entegrasyon testi kategorisindedir, giriş sınırları farklıdır.

### Swagger yerine neden Scalar?

İkisi de OpenAPI belgesini etkileşimli arayüzde sunabilir. Bu projede modern ve hafif bir UI olarak Scalar seçildi. Asıl sözleşme UI aracı değil OpenAPI belgesidir; UI gerektiğinde değiştirilebilir.

### WebApplicationFactory gerçek server mı çalıştırıyor?

Gerçek ASP.NET Core host ve middleware pipeline'ını kurar; varsayılan olarak ayrı TCP portunda Kestrel açmak yerine test server üzerinden `HttpClient` sağlar. Test hızlı ve izole kalırken uygulama davranışının büyük kısmı gerçektir.

## 19. Sonraki adım

Eşzamanlı iki Create Wallet isteğini paralel gönderip yarış koşulunu reproduce edeceğiz. Database'in doğruluğu unique index ile koruduğunu, fakat API'nin kaybeden isteği şu an nasıl sunduğunu ölçeceğiz. Sonra provider exception'ını kontrollü `409 Conflict` sonucuna çevireceğiz.
