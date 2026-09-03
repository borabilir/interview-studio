# 1. Projenin özeti

## Proje ne yapıyor?

Bu proje, şirketlerin web sitesi ve Facebook kanallarında kullanabileceği, görsel olarak yapılandırılabilir bir chatbot platformunun backend’idir.

Sistem üç ana işlev sunuyor:

1. **Chatbot yönetimi**

   - Bot oluşturma, kopyalama ve müşteriye atama
   - Intent ve flow tasarlama
   - Metin, form, galeri, medya, yönlendirme, REST API çağrısı, lead post, AI scenario gibi adımlar tanımlama
   - Web widget ve Facebook kanal ayarlarını yönetme

2. **Mesaj çalıştırma motoru**

   - Web istemcileriyle SignalR üzerinden konuşma
   - Gelen kullanıcı mesajını veya intent payload’ını işleme
   - State Machine üzerinden konuşma akışını yürütme
   - Intent feature’larını farklı handler’larla çalıştırma
   - Facebook mesajlarını uygun kanal formatına dönüştürme

3. **Analitik ve optimizasyon**

   - Impression, user answer ve API metriklerini toplama
   - Kullanıcı segmentasyonu
   - Flow intent sıralaması ve dikey skorlar üretme
   - Günlük çalışan ranking pipeline’ı
   - Dashboard KPI ve raporlama endpoint’leri

Ana konuşma akışı [StateMachine.cs](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Application/States/StateMachine.cs), gerçek zamanlı bağlantı ise [MessagingHub.cs](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Messaging/Services/MessagingHub.cs) içinde görülebilir.

## Hangi problemi çözüyor?

İşletmelerin her chatbot davranışı için kod yazması yerine:

- Konuşma akışlarını yönetim panelinden tanımlamasını,
- Aynı bot davranışını web ve Facebook gibi kanallara taşımasını,
- Kullanıcı cevaplarını ve dönüşümleri takip etmesini,
- Harici API’lerle entegre olmasını,
- AI destekli cevap ve intent eşleştirme kullanmasını,
- Performansa göre chatbot adımlarını sıralamasını

sağlıyor.

## Business amacı

Güçlü çıkarımla temel business amacı:

- Lead generation ve conversion oranını artırmak,
- Kullanıcıları uygun flow veya kampanyaya yönlendirmek,
- Bot oluşturma ve değiştirme maliyetini azaltmak,
- Kullanıcı davranışını ölçerek flow sıralamasını optimize etmek,
- Birden fazla müşteri ve botu aynı platformdan yönetmek.

`CallCampaign`, `Leadpost`, `Impression`, `UserAnswer`, `ApiMetric`, `UserSegment`, `VerticalRankingScore` ve `FlowIntentRanking` modelleri bu çıkarımı destekliyor.

## Kullanıcılar kimler?

Koddan görülen kullanıcı grupları:

- **Son kullanıcılar:** Web widget veya Facebook üzerinden botla konuşan ziyaretçiler.
- **Customer kullanıcıları:** Kendi şirketlerine ait botları ve içerikleri yöneten kişiler.
- **Customer yöneticileri:** Kullanıcı yönetme ve tüm botları görme/düzenleme izinlerine sahip roller.
- **SuperAdmin:** Müşteriler arası yönetim ve ranking operasyonlarını yürüten sistem yöneticisi.
- **Operasyon/marketing ekipleri:** Flow, kampanya, lead, impression ve KPI verilerini yöneten kullanıcılar.

# 2. Kullanılan teknolojiler

## Kesin olarak kullanılanlar

| Teknoloji | Kullanım |
|---|---|
| .NET 8 | Tüm projelerin hedef framework’ü |
| ASP.NET Core Web API | Auth, Dashboard ve Messaging API |
| C# | Ana geliştirme dili |
| Entity Framework Core 8 | ORM ve migration yönetimi |
| MySQL 8 / Pomelo | Runtime DbContext provider’ı |
| Redis | Dağıtık konuşma/cache state’i |
| SignalR | Web widget ile gerçek zamanlı iletişim |
| WebSocket | SignalR’ın kullanabileceği transport; kod doğrudan saf WebSocket API kullanmıyor |
| BackgroundService | Günlük metrics/ranking pipeline’ı |
| ASP.NET Core Identity | Kullanıcı ve rol yönetimi |
| OpenIddict | Password ve refresh-token flow |
| JWT Bearer | API authentication |
| Policy/role/claim authorization | Customer ve yetki bazlı erişim |
| OpenAI API | AI cevap, intent ve assistant işlemleri |
| Facebook Graph/Messaging API | Facebook chatbot kanalı |
| AutoMapper | Entity/DTO/view model dönüşümleri |
| Serilog | Yapısal loglama |
| Serilog MySQL sink | Logların MySQL’e yazılması |
| Fluid | Template rendering |
| RestSharp | Harici HTTP entegrasyonları |
| `HttpClient` | Harici servis ve OpenAI çağrıları |
| Swagger/OpenAPI | API dokümantasyonu |
| Docker | API container’ları |
| Docker Compose | MySQL, Redis, API servisleri ve ayrıca MSSQL container tanımı |
| Data Annotations | Input validation |
| UAParser | User-Agent/device analizi |
| Newtonsoft.Json | JSON işlemleri |

Paketler [Chatbot.Infrastructure.csproj](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Infrastructure/Chatbot.Infrastructure.csproj) ve diğer `.csproj` dosyalarında doğrulanabilir.

## Kullanıldığı söylenemeyenler

- **React / TypeScript:** Bu repository’de frontend projesi yok.
- **RabbitMQ / MassTransit:** Kullanılmıyor.
- **Hangfire:** Kullanılmıyor.
- **Dapper:** Kullanılmıyor.
- **MediatR/CQRS:** Kullanılmıyor.
- **Azure servisleri:** Azure container tooling paketi var ancak gerçek Azure deployment kanıtı yok.
- **SQL Server:** Paket ve Docker Compose servisi mevcut; fakat uygulama Program dosyaları `UseMySql` kullanıyor. Aktif production veri tabanı olduğunu söylemek doğru olmaz.

# 3. Mimari

## Genel sınıflandırma

Bu sistem için en doğru ifade:

> **Katmanlı mimariye sahip, birden fazla deploy edilebilir API içeren servis ayrıştırılmış bir backend.**

Tek bir monolith değildir; çünkü üç ayrı çalıştırılabilir host vardır:

- `Chatbot.Auth.Api`
- `Chatbot.Dashboard.Api`
- `Chatbot.Messaging`

Bunların yanında ortak class library’ler bulunur:

- `Chatbot.Core`
- `Chatbot.Application`
- `Chatbot.Infrastructure`
- `Chatbot.Api.Shared`

## Katmanlar

```text
Auth.Api ───────────────┐
Dashboard.Api ──────────┼── Application ── Core
Messaging ──────────────┘       │
       └──────────────── Infrastructure ── Core
```

### Core

- Entity, enum, DTO, repository ve service interface’leri
- Altyapı bağımlılığı yok
- Domain merkezine en yakın katman

### Application

- Business servisleri
- State Machine
- Feature handler’ları
- Validation strategy’leri
- Core’a bağımlı

### Infrastructure

- EF Core DbContext ve repository implementasyonları
- Redis, OpenAI, Facebook, HTTP ve logging implementasyonları
- Core’daki interface’leri uygular

### API katmanları

- HTTP/SignalR giriş noktaları
- Authentication, authorization, CORS, Swagger
- DI composition root’ları

## Clean Architecture mı?

**Kısmen benziyor**, çünkü:

- Core altyapıdan bağımsız.
- Interface’ler iç katmanda, implementasyonlar Infrastructure’da.
- DI ile dış bağımlılıklar ters çevriliyor.

Fakat saf Clean Architecture değildir:

- Core içinde çok sayıda DTO bulunuyor.
- Application bazı ASP.NET/DI ayrıntılarına bağımlı.
- API’ler hem Application hem Infrastructure’a doğrudan referans veriyor.
- Controller’lar zaman zaman doğrudan `IUnitOfWork` kullanıyor.
- Application service’leri oldukça büyük ve use-case bazlı ayrılmamış.


> “Clean Architecture prensiplerinden dependency inversion ve katman ayrımını kullanan pragmatik bir layered architecture”

demek daha doğru olur.

## Modular Monolith mi?

Hayır. Domain modülleri feature bazlı ayrı assembly’lere bölünmemiş. `Bot`, `Flow`, `Ranking`, `Customer` gibi alanlar aynı Core/Application/Infrastructure projelerinde birlikte bulunuyor.

## Vertical Slice mı?

Hayır. Request-handler-response dosyaları use-case bazlı gruplanmamış. Yapı controller → service → repository şeklinde yatay katmanlı.

## Microservice mi?


- Ayrı deploy edilebilir servisler var.
- Auth ve Messaging ayrı runtime’lar.
- Fakat ortak class library ve muhtemelen ortak MySQL veritabanı kullanılıyor.
- Asenkron message broker veya servis başına veri sahipliği görülmüyor.

En güvenli ifade: **service-oriented / service-separated layered architecture**.

# 4. Design pattern’ler

## Repository

**Nerede?**

`Chatbot.Infrastructure/Repositories` altında 31 repository ve Core’da bunların interface’leri bulunuyor. Generic temel yapı [Repository.cs](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Infrastructure/Repositories/Repository.cs).

**Niçin?**

- EF sorgularını business katmanından ayırmak,
- Entity’ye özel sorguları merkezileştirmek,
- Application katmanının DbContext’e doğrudan bağımlılığını azaltmak,
- Test edilebilir interface’ler sunmak.

Senior seviyede söylemeniz gereken nüans: EF Core’un kendisi zaten Repository/Unit of Work davranışları sunar. Buradaki abstraction ancak entity-specific sorgular ve test sınırı sağlıyorsa değer üretir.

## Unit of Work

**Nerede?**

[UnitOfWork.cs](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Infrastructure/Repositories/UnitOfWork.cs).

**Niçin?**

- Bir business operation içindeki farklı repository işlemlerini aynı DbContext altında toplamak,
- Tek noktadan `SaveChangesAsync` çağırmak,
- Birden fazla entity değişikliğini aynı transaction sınırında tutabilmek.

## State Pattern / State Machine

**Nerede?**

[StateMachine.cs](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Application/States/StateMachine.cs) ve `States` altındaki `ContextBindingState`, `PayloadBindingState`, `RunIntentState`, `ResponseState`, `AICallState` gibi sınıflar.

**Niçin?**

Konuşma akışı tek bir uzun `if/switch` bloğu yerine durumlara ayrılmış:

- Context bağlama
- Input/payload çözümleme
- Intent çalıştırma
- AI çağrısı
- Response üretme
- Idle/fallback geçişi

Yeni davranış eklemeyi ve geçişleri görünür kılıyor.

## Factory

**Nerede?**

[IntentFeatureHandlerFactory.cs](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Application/Factories/IntentFeatureHandlers/IntentFeatureHandlerFactory.cs).

**Niçin?**

`IntentFeatureType` değerine göre `TextFeatureHandler`, `FormFeatureHandler`, `RestApiFeatureHandler`, `AIScenarioFeatureHandler` gibi uygun handler’ı seçiyor.

## Strategy

**Nerede?**

- Entity validation: [EntityValidatorService.cs](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Application/Strategies/EntityValidation/EntityValidatorService.cs)
- Kanal response handling: [ChannelResponseDispatcher.cs](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Messaging/Strategies/ResponseHandling/ChannelResponseDispatcher.cs)
- Intent feature handler’ları

**Niçin?**

- Validation davranışını entity tipine göre değiştirmek,
- Aynı semantik cevabı kanalın gerektirdiği formata çevirmek,
- Feature çalıştırma davranışını tip bazında izole etmek.

## Dispatcher

**Nerede?**

`ChannelResponseDispatcher`.

**Niçin?**

`(BotChannel, ResponseType)` ikilisinden uygun handler’ı bulup çalıştırıyor. Kanal ve response formatlarının birbirine bağlanmasını merkezi hale getiriyor.

## Dependency Injection

**Nerede?**

[ApplicationServiceRegistration.cs](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Application/Extensions/ApplicationServiceRegistration.cs) ve [InfrastructureServiceRegistration.cs](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Infrastructure/Extensions/InfrastructureServiceRegistration.cs).

**Niçin?**

- Interface-implementation ayrımı
- Lifetime yönetimi
- Test edilebilirlik
- OpenAI, Redis ve repository implementasyonlarını consumer’dan ayırma

## Cache-aside

**Nerede?**

[CacheService.cs](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Infrastructure/Services/CacheService.cs) ve çeşitli application service’leri.

**Niçin?**

Sık kullanılan context ve metrik sonuçlarını Redis’te TTL ile saklamak; veri değiştiğinde key veya prefix temizlemek.

## Middleware

**Nerede?**

[ErrorWrappingMiddleware.cs](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Api.Shared/Middlewares/ErrorWrappingMiddleware.cs).

**Niçin?**

Beklenmeyen hataları merkezi yakalama, loglama ve production ortamında stack trace sızmasını önleme.

## Observer benzeri yapı

SignalR client event’leri (`send`, `trace`, `track`, `streamChunk`) publish/subscribe karakteri taşır. Fakat klasik GoF Observer implementasyonu olarak adlandırmak yerine SignalR event messaging demek daha doğru.

## Kullanılmayan pattern’ler

- CQRS
- Mediator
- Event sourcing
- Outbox
- Saga
- Message broker tabanlı pub/sub

# 5. SOLID değerlendirmesi

## S — Single Responsibility

**Uygulanan örnekler:**

- `EmailValidator` yalnızca e-posta doğrular.
- `TextResponseFacebookHandler` yalnızca Facebook text response üretir.
- Repository’ler entity-specific veri erişimini taşır.
- Error middleware merkezi hata yönetimini üstlenir.

**Zayıflayan yerler:**

- `FlowIntentService` ve `OpenAIService` çok büyük sınıflardır.
- Bazı controller’lar mapping, serialization, business kuralı ve repository erişimini aynı action içinde yapıyor.
- `WebChannelConfigController.UpdateStartIntentId` hem intent tiplerini hem channel configuration’ı değiştiriyor.

Sonuç: **Kısmen uygulanmış; büyüyen servislerde SRP aşınması var.**

## O — Open/Closed

Feature handler ve validation strategy yapıları olumlu örneklerdir. Yeni handler eklenebilir.

Ancak factory dictionary’si ve DI registration da değiştirilmek zorunda. Tam plug-in mimarisi değil. Reflection tabanlı state keşfi bu prensibe daha yakın.

## L — Liskov Substitution

`StateBase`, repository interface’leri ve response handler interface’lerinde belirgin bir ihlal görünmüyor. Yine de testler olmadığı için davranışsal substitutability doğrulanamıyor.

## I — Interface Segregation

Olumlu:

- `IAIService`, `ICacheService`, `IHttpClientService`, `IFlowIntentRankingService` ayrı.
- Entity repository interface’leri ayrılmış.

Zayıf:

- `IUnitOfWork` çok fazla repository sunan geniş bir interface.
- Bazı service interface’leri büyümüş olabilir.

## D — Dependency Inversion

En güçlü uygulanan prensiptir:

- Application servisleri repository/interface’lere bağımlı.
- Infrastructure bu interface’leri uygular.
- API composition root’ta bağlar.

İstisna olarak factory içinde `IServiceProvider` kullanılması Service Locator karakteri taşır ve constructor dependency’lerini gizleyebilir.

# 6. Önemli teknik kararlar

## Neden SignalR?

Chatbot cevabı, trace bilgisi, tracking ve AI stream chunk’larının bağlantı açıkken anlık gönderilmesi gerekiyor.

SignalR:

- WebSocket varsa onu kullanır,
- Transport fallback sağlar,
- Connection lifecycle yönetir,
- Client method invocation sunar.

Doğrudan WebSocket’e göre geliştirme maliyeti düşüktür.

## Neden State Machine?

Konuşma işleme lineer bir CRUD operasyonu değildir. Mesaj türü, payload, mevcut context, intent, AI çağrısı, fallback ve response durumları arasında geçiş vardır. State Machine bu karmaşıklığı açık durumlara ayırır.

## Neden BackgroundService?

Ranking pipeline’ı New York saatine göre gece yarısında çalışıyor ve request lifecycle’ından bağımsız. `BackgroundService`, ayrı bir scheduler altyapısı kurmadan bunu host içinde yürütüyor.

Risk: Birden fazla Dashboard replica ayağa kalkarsa job her instance’ta çalışabilir. Distributed lock veya ayrı worker görünmüyor.

## Neden Redis?

- Konuşma context’ini instance belleğinden bağımsız tutmak,
- TTL ile geçici verileri yönetmek,
- Çoklu instance senaryosuna yaklaşmak,
- Ağır metrik/ranking okumalarını azaltmak.

## Neden Repository ve Unit of Work?

Business servislerini EF ayrıntılarından ayırmak ve çoklu entity değişikliklerini aynı DbContext sınırında koordine etmek.

## Neden EF Core?

- Zengin ilişkisel domain modeli
- LINQ ile dinamik filtreleme
- Change tracking
- Migration yönetimi
- MySQL provider desteği
- Transaction ve async query desteği

## Neden OpenAI?

Koddan görüldüğü kadarıyla AI scenario, intent bulma, assistant yönetimi ve streaming cevap üretimi için.

## Neden ayrı Auth API?

Identity/OpenIddict kullanıcı yönetimini bot yönetimi ve mesaj yürütmeden ayırmak. Güvenlik ve deployment sınırı sağlar; ancak ortak database/library kullanımı servis bağımsızlığını azaltır.

## Neden AutoMapper?

Çok sayıdaki entity/DTO/view model dönüşümündeki tekrarları azaltmak.

## Neden raw SQL bulk upsert?

Ranking ve segment tablolarında yüksek hacimli verileri tek tek EF change tracking üzerinden işlemek yerine toplu insert/update yapmak için parametrik `ExecuteSqlRawAsync` kullanılmış.

# 7. Performans

## Uygulanan yaklaşımlar

### Async I/O

Repository, service, SignalR ve dış API çağrılarının çoğu `async/await` kullanıyor. Bu, I/O beklerken request thread’inin bloke edilmesini azaltır.

### `AsNoTracking`

Read-only sorgularda yoğun şekilde kullanılmış:

- Bot
- Flow
- Impression
- API metric
- Ranking
- User segment
- Call campaign

Bu, EF change tracker maliyetini düşürür.

### Pagination

`Skip/Take` ve `PaginationModel` birçok liste/KPI endpoint’inde uygulanmış.

Risk: Büyük offset’lerde offset pagination pahalılaşabilir. Yoğun tablolarda cursor/keyset pagination daha iyi olabilir.

### Eager loading

İlişkiler ihtiyaca göre `Include/ThenInclude` ile çekiliyor. Lazy-loading proxy kullanılmıyor. Bu yaklaşım sorgu davranışını daha öngörülebilir yapar.

### Bulk işlemler

- `AddRangeAsync`
- `UpdateRange`
- Parametrik raw SQL bulk upsert
- Ranking/segment toplu güncellemeleri

kullanılmış.

Nüans: `AddRangeAsync`, gerçek database bulk-copy ile aynı şey değildir. EF yine entity başına insert üretebilir. Raw SQL upsert’ler daha gerçek bir bulk optimizasyonudur.

### Redis caching

TTL’li distributed cache ve prefix invalidation mevcut. API metric sonuçlarının kullanıcı/customer permission context’iyle cache’lendiği görülüyor.

### Database index’leri

Migration isimleri dahi bilinçli performans çalışmasını gösteriyor:

- Ranking performance indexes
- CustomerId indexes
- Impression composite index
- Impression covering index
- Type/VerticalId index

### Projection/aggregate optimizasyonları

Flow segment criteria projection ve impression aggregate modelleri, ranking pipeline’ının tam entity graph yerine hesaplama odaklı veri çekmesi için kullanılıyor.

### Timeout ve cancellation

Background pipeline 50 dakikalık timeout ve linked cancellation token kullanıyor.

## Dikkat edilmesi gerekenler

- Bazı pagination işlemleri veriyi belleğe aldıktan sonra uygulanıyor olabilir.
- Büyük `Include` graph’ları Cartesian explosion yaratabilir.
- `HttpClientService` typed `IHttpClientFactory` kullanmıyor.
- `OpenAIService` içinde yer yer `new HttpClient()` var; socket exhaustion ve DNS yenileme riski doğurabilir.
- Redis `server.Keys` prefix taraması production’da pahalı olabilir.
- `StateMachine` içindeki `_executedStates` instance yaşam döngüsü dikkatle yönetilmeli.
- Birden çok app instance’ında background job çakışabilir.

# 8. Güvenlik

## Authentication

- ASP.NET Core Identity
- OpenIddict password ve refresh-token flow
- JWT Bearer validation
- Issuer, audience ve signing key doğrulaması
- Role claim mapping

kullanılıyor.

Önemli sorun: Dashboard JWT signing key’i configuration’dan okunmasına rağmen validation içinde hard-coded bir key kullanılıyor. Bu güvenlik ve environment tutarlılığı açısından düzeltilmesi gereken bir nokta: [Program.cs](C:/Users/borab/repos/chatbot/chatbot-backend-v2/Chatbot.Dashboard.Api/Program.cs).

Ayrıca `RequireHttpsMetadata = false` production için risklidir.

## Authorization

- `[Authorize]`
- Role policy
- Customer ID claim’i
- SuperAdmin
- CanManageUsers
- CanViewAllBots
- CanEditAllBots
- Custom `AuthorizationHandler`

kullanılıyor.

Customer/bot izolasyonu yalnızca attribute’a değil, service içindeki claim kontrollerine de dayanıyor. Bu multi-tenant erişim için önemli.

Ancak bazı endpoint’lerde `[Authorize]` görünmüyor. Özellikle `WebChannelConfigController.Put` dikkatle kontrol edilmeli; controller seviyesinde `[Authorize]` olmadığı için action anonim erişilebilir görünüyor. Bu önemli bir güvenlik ve authorization riskidir.

## Validation

Data Annotation tabanlı:

- `Required`
- `MinLength`
- `MaxLength`
- `StringLength`
- `Range`
- `EmailAddress`
- Custom identifier validation

kullanılmış.

Ayrıca entity girişleri Strategy pattern ile doğrulanıyor.

## SQL injection

EF LINQ sorguları parametre üretir. Raw SQL bulk işlemlerinde parametre listeleri kullanılıyor. Bu nedenle belirgin doğrudan injection kanıtı görmedim.

Yine de raw SQL oluşturulurken tablo/kolon veya SQL parçalarının kullanıcı girdisinden gelmediği garanti edilmelidir.

## XSS

Backend tarafında merkezi HTML sanitization görünmüyor. Kullanıcı tarafından tanımlanan text/template/media/URL değerleri frontend’de HTML olarak render edilirse XSS riski frontend veya output encoding katmanında çözülmelidir.

Fluid template kullanımı da template injection açısından sınırlandırılmalıdır.

## CSRF

JWT’nin `Authorization` header ile kullanıldığı varsayılırsa klasik cookie-CSRF riski düşüktür. Ancak token’ın nerede saklandığı ve auth cookie kullanılıp kullanılmadığı frontend olmadan doğrulanamıyor. Antiforgery middleware görünmüyor.

## CORS

Dashboard/Auth `AllowAnyOrigin`, Messaging ise herhangi bir origin’e credentials izni verecek dinamik policy kullanıyor. Production için fazla geniş.

SignalR endpoint’inin `userToken` ve `botToken` query string’inden veri aldığı görülüyor. Bunların yetkilendirme credential’ı gibi kullanılması durumunda URL/log/referrer sızıntısı riski vardır.

## Rate limiting

ASP.NET Core rate limiting middleware’i bulunmuyor. Özellikle:

- Login
- Token
- SignalR connect/send
- Facebook webhook
- OpenAI kullanan endpoint’ler

için rate limiting önemli.

## Secret yönetimi

User Secrets ID mevcut fakat production secret store, Key Vault veya environment-based secret policy doğrulanamıyor. Repository’de config secret’ları varsa rotate edilmelidir.

## Dependency güvenliği

Build sırasında:

- AutoMapper 14.0.0 için high severity vulnerability uyarısı,
- Eski ASP.NET MVC/WebPages paketleri için .NET 8 uyumluluk uyarıları,
- Eski Facebook paketi için uyumluluk uyarısı

alındı.
b