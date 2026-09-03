# 1. Projenin Özeti

## Proje ne yapıyor

Bu proje, HCMİK sisteminde kullanılan dinamik parametrelerin merkezi olarak tanımlanmasını ve müşteri seviyesinde özelleştirilmesini amaçlayan bir ASP.NET Core servisidir.

Model iki ana parameter türü içeriyor

- `MetaParameter` Sistemin merkezi veya şablon parameter tanımı.
- `CustomerParameter` Bu tanımın müşteritenant tarafındaki karşılığı veya özelleştirilmiş kopyası.

Parametrelerde şu kavramlar modellenmiş

- Parametre tipi
- Dönüş tipi
- Kilit durumu
- Değişiklik yetkisiseviyesi
- Başlangıç ve bitiş tarihli değer setleri
- Şirket, profil, çalışan gibi kapsam seviyeleri
- Çok dilli ad ve açıklamalar
- Para birimi ve netbrüt ödeme tipi
- Liste, aralık ve SQL expression değerleri

Ana domain modeline [MetaParameter.cs](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.DomainParametersMetaMetaParameter.cs8) ve [CustomerParameter.cs](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.DomainParametersCustomerCustomerParameter.cs6) üzerinden ulaşılabilir.

## Hangi problemi çözüyor

Çıkarım HCM uygulamasındaki davranışların kod değişikliği olmadan parameter üzerinden yönetilmesini hedefliyor.

Örneğin aşağıdaki değerler müşteri, profil veya çalışan düzeyinde değişebilir

- Bordro hesaplama ayarları
- Para ve ödeme tipi tercihleri
- Tarihsel olarak geçerli değerler
- Modül bazlı iş kuralları
- Kullanıcıya gösterilecek çok dilli adaçıklamalar

`ParameterValueSetLevel` enum’u sistem, şirket, iş yeri, profil ve çalışan seviyelerini içeriyor. Bu, parameter overridehiyerarşi ihtiyacına işaret ediyor.

## Business amacı nedir

Muhtemel amaçlar

- HCM ürünündeki ayarları merkezi hale getirmek
- Farklı müşterilere aynı ürün üzerinde farklı davranışlar sunmak
- Parametre değişikliklerini deployment gerektirmeden yapabilmek
- Tarihe bağlı parameter değerlerini desteklemek
- Sistem parameterleri ile müşteri parameterlerini ayırmak
- Çok dilli yönetim ekranlarını desteklemek

Ancak parameter çözümleme algoritması—örneğin “çalışan değeri yoksa profile, sonra company, sonra system değerine dön”—kodda henüz uygulanmış değil.

## Kullanıcılar kimler

Koddan kesin olarak kullanıcı rolü çıkarılamıyor. Authentication ve role tanımı bulunmuyor.

Domain’den hareketle muhtemel tüketiciler

- HCM ürününün diğer backend modülleri
- Sistem yöneticileri
- Müşteri yöneticileri
- İKbordro yöneticileri
- Parameter yönetim ekranları
- Dolaylı olarak çalışanprofil bazında parameter kullanan servisler

Mevcut API’de yalnızca ID ile meta parameter okuyan tek endpoint bulunuyor [MetaParameterController.cs](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.APIControllersMetaParameterController.cs18).

---

# 2. Kullanılan Teknolojiler

Gerçekten kullanılan veya doğrudan tanımlanmış teknolojiler

- .NET 7
- C#
- ASP.NET Core Web API
- ASP.NET Core MVC Controller
- Entity Framework Core 7
- EF Core SQL Server provider
- SQL Server
- EF Core Code First migrations
- Dependency Injection
- Asyncawait
- SwaggerOpenAPI
- Docker
- Linux container image
- Worker Service  BackgroundService
- Microsoft.Extensions.Logging
- User Secrets desteği
- HTTPS redirection
- Data annotations ve Fluent API mapping

Kanıtlar

- .NET 7 [API csproj](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.APIHcmOnAir.ParameterService.API.csproj4)
- SQL ServerEF Core [EntityFrameworkCore csproj](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.EntityFrameworkCoreHcmOnAir.ParameterService.EntityFrameworkCore.csproj10)
- Servis kayıtları [Program.cs](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.APIProgram.cs21)
- Docker [Dockerfile](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.APIDockerfile3)
- Worker [Worker.cs](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.DbMigratorWorker.cs3)

## Kullanılmayanlar

Repository’de şu teknolojilere dair kanıt yok

- React
- TypeScript
- MySQL
- Redis
- SignalR
- WebSocket
- RabbitMQ
- Hangfire
- JWT
- ASP.NET Core Identity
- OpenAI
- Dapper
- Azure runtimedeployment
- Kubernetes
- MediatR
- AutoMapper
- FluentValidation
- Serilog
- OpenTelemetry

Azure Containers Tools paketi bulunuyor; bu, tek başına Azure deployment yapıldığını kanıtlamaz.

## Güncellik durumu


 “Proje .NET 7 ile başlatılmıştı. Bugün production’a alınacak olsa LTS bir sürüme yükseltmeyi ilk teknik borç kalemlerinden biri yapardım.”

---

# 3. Mimari

## Kısa sınıflandırma

En doğru tanım

 DDD esintili, katmanlı bir ASP.NET Core servismonolith iskeleti. Clean Architecture hedefi taşıyor fakat bağımlılık kuralları tam uygulanmamış.

## Monolith mi

Repository tek bir business capability—parameter yönetimi—etrafında kurulmuş, tek API deployable’ı var.

Bu nedenle tek başına bakıldığında

- Katmanlı monolithservice Evet.
- Microservice İsim ve kapsam buna işaret ediyor, fakat daha büyük sistem bağlamı, bağımsız deployment ve servisler arası iletişim görülmeden kesin söylenemez.
- Modular Monolith Hayır. Ayrı business modülleri yok; katmanlar ayrı projeler halinde.
- Vertical Slice Hayır. Feature bazlı commandquery slice’ları yok.
- CQRS Hayır.
- OnionClean Architecture Kısmen niyet var, tam uyum yok.

## Katmanlar

### API

HTTP giriş katmanı ve composition root

- Controller
- Swagger
- DI registrations
- EF Core provider seçimi
- Middleware pipeline

### Application

Use-case orkestrasyonu ve DTO mapping

- `ParameterAppService`
- Domainrepository çağrıları
- Entity → DTO mapping

### Application.Contracts

Dış sözleşmeler

- `ParameterDto`
- `ParameterValueDto`
- `TranslationDto`
- Base DTO

### Domain

Business model

- Aggregate root’lar
- Entity ve value object taban sınıfları
- Repository arayüzleri
- Unit of Work arayüzü
- Domain enum’ları
- Domain service iskeleti

### EntityFrameworkCore

Persistenceinfrastructure

- DbContext
- Repository implementasyonları
- Unit of Work implementasyonu
- Migration

### DbMigrator

Worker Service iskeleti var; fakat gerçek migration çalıştırmıyor. Sadece saniyede bir log yazıyor ve solution’a dahil değil.

## Bağımlılık yönleri

Olumlu yön

- Infrastructure, Domain’e bağımlı.
- Application, Domain’e bağımlı.
- API composition root olarak Application ve Infrastructure’ı birleştiriyor.

Problemli yön

- `Domain`, `Application.Contracts` projesine referans veriyor.
- `IParameterAppService` Domain içinde fakat DTO döndürüyor.
- Böylece Domain, application contract kavramını biliyor.

Bu durum Clean Architecture’ın “iç katman dış katmanı bilmez” kuralını zayıflatıyor. [Domain csproj](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.DomainHcmOnAir.ParameterService.Domain.csproj14) bu bağımlılığı gösteriyor.

Daha temiz tasarım

- `IParameterAppService`, `Application.Contracts` içine taşınabilir.
- Domain sadece domain nesneleri ve domain repository portlarını içerebilir.
- Domain’in Application.Contracts referansı kaldırılabilir.

## DDD açısından

DDD terimleri bilinçli kullanılmış

- Aggregate Root
- Entity
- Value Object
- Domain Service
- Repository
- Unit of Work

Ancak uygulama henüz olgun DDD seviyesinde değil

- Domain kuralları az
- Invariant ihlallerinde exception yok
- Collection initialization eksik
- Domain service boş
- Value object eşitliği standart `EqualsGetHashCode` olarak uygulanmamış
- Customer ve Meta modellerinde yüksek tekrar var

---

# 4. Design Patternler

## Repository Pattern

Nerede

- [IRepository.cs](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.DomainAbstractIRepository.cs5)
- [EfCoreRepository.cs](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.EntityFrameworkCoreAbstractEfCoreRepository.cs8)
- Metacustomer repository’leri

Niçin

- Domainapplication katmanını EF Core’dan soyutlamak
- Ortak CRUD davranışını merkezileştirmek
- Persistence implementasyonunu değiştirilebilirtest edilebilir yapmak

Teknik değerlendirme

EF Core zaten Repository ve Unit of Work davranışlarını içerir. Bu nedenle generic repository’nin gerçekten değer üretip üretmediği sorgulanacaktır. Buradaki özel repository’ler henüz özel sorgu içermiyor.

## Unit of Work

Nerede

- [IUnitOfWork.cs](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.DomainIUnitOfWork.cs6)
- [UnitOfWork.cs](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.EntityFrameworkCoreAbstractUnitOfWork.cs14)

Niçin

- Repository’lerin aynı DbContext’i kullanmasını sağlamak
- Bir use-case içindeki değişiklikleri tek `SaveChangesAsync` ile commit etmek
- Transaction boundary oluşturmak

Repository’ler lazy şekilde oluşturuluyor. Bu aynı zamanda sınırlı bir Lazy Initialization örneğidir.

## Dependency Injection

Nerede

[Program.cs](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.APIProgram.cs21)

Niçin

- Interfaceimplementation ayrımı
- Request-scope DbContext paylaşımı
- Test edilebilirlik
- Composition root’un API’de tutulması

## Aggregate Pattern

Nerede

`MetaParameter` ve `CustomerParameter`, `AggregateRootGuid` sınıfından türemiş.

Alt nesneler aggregate üzerinden eklenmeye çalışılıyor

- `AddMetaParameterValueSet`
- `AddMetaParameterValue`
- `AddMetaParameterNameTranslation`

Niçin

Aggregate içindeki değişiklikleri root üzerinden kontrol etmek ve tutarlılık sınırı oluşturmak.

Fakat listeler aggregate constructor’ında initialize edilmediği için yeni aggregate üzerinde `Add...` çağrısı `NullReferenceException` üretebilir.

## Value Object Pattern

Nerede

- `MetaParameterValue`
- `CustomerParameterValue`
- `ValueObject` taban sınıfı

Niçin

Parameter değerlerini aggregate’e ait, kimlikten ziyade içerikle anlam kazanan nesneler şeklinde modellemek.

Ancak bu sınıflarda `Id` var ve EF tarafından ayrı tabloya yazılıyor. Dolayısıyla pratikte entityvalue-object sınırı bulanık.

## DTO Pattern

Nerede

Application.Contracts projesindeki DTO’lar.

Niçin

Domain entity’lerini doğrudan API response olarak açmamak; API sözleşmesini domain modelinden ayırmak.

Mapping manuel yapılmış. Mevcut mapping yalnızca üç alanı dolduruyor.

## Application Service

`ParameterAppService`, HTTP ile domainpersistence arasında use-case orkestrasyonu yapıyor.

## Domain Service

`ParameterManager` bir domain service olarak tanımlanmış fakat constructor veya davranış içermiyor. Bu nedenle pattern’in yalnızca iskeleti mevcut.

## Templatebase-class reuse

`EntityTKey`, `AggregateRootTKey`, `EfCoreRepositoryT...` gibi generic base class’lar ortak davranışı merkezileştiriyor.

## Kullanılmayan patternler

Kodda şu patternler yok

- CQRS
- Mediator
- Strategy
- Observer
- Builder
- Factory—DI container’ı genel anlamda factory görevi görse de explicit Factory Pattern yok
- Event sourcing
- Outbox
- Specification

---

# 5. SOLID

## S — Single Responsibility

Kısmen uygulanmış

- Controller HTTP sorumluluğunu taşıyor.
- Application service use-casemapping yapıyor.
- Repository persistence erişimini taşıyor.
- DbContext mapping ve EF erişimini yönetiyor.

Zayıf taraflar

- `ParameterAppService` hem orkestrasyon hem manuel mapping yapıyor.
- Unit of Work repository factory görevini de üstleniyor.
- Generic repository soft-delete, sorgu ve persistence commit kararlarını birlikte taşıyor.

## O — OpenClosed

Kısmen uygulanmış

- Generic repository yeni aggregate’lere genişletilebilir.
- Repository interface’leri farklı persistence implementasyonlarına açık.
- DI kayıtları implementasyon değişimini kolaylaştırıyor.

Ancak yeni parameter tipi veya yeni mapping eklemek için mevcut sınıfların değiştirilmesi gerekebilir.

## L — Liskov Substitution

Açık bir ihlal kanıtı yok. Repository implementasyonları interface sözleşmesine uyuyor.

Buna rağmen `GetAsync` dönüş tipi nullable değilken `FindAsync` null dönebilir. Bu kontrat belirsizliği substitution davranışını uygulamada sorunlu hale getirebilir.

## I — Interface Segregation

Kısmen uygulanmış

- `IMetaParameterRepository`
- `ICustomerParameterRepository`
- `IParameterAppService`

Fakat metacustomer repository interface’leri şimdilik yalnızca boş generic interface uzantıları. Ayrıca `IParameterAppService` içinde public mapping metodu olması tüketiciyi ilgilendirmeyen bir sorumluluğu contract’a taşıyor.

## D — Dependency Inversion

En güçlü uygulanan prensip

- Application, somut EF repository yerine `IUnitOfWork` kullanıyor.
- Controller, `IParameterAppService` kullanıyor.
- Domain repository interface’lerini, infrastructure implementasyonlarını sağlıyor.

Ama Domain’in Application.Contracts’a referans vermesi katman bağımlılığını ters yönde bozuyor.

## Genel sonuç


 “Katman sorumluluklarını ve dependency inversion’ı uygulamaya çalıştım; daha sonra Domain’in Application.Contracts referansının Clean Architecture yönüne aykırı olduğunu fark ettim. Bugün interface’i contracts katmanına taşıyarak bu bağımlılığı kaldırırdım.”

---

# 6. Önemli Teknik Kararlar

## Meta parameter ve customer parameter ayrımı

Merkezi ürün tanımı ile müşteriye özgü override’ı ayırmak hedeflenmiş. Multi-tenant ürünlerde güçlü bir business kararıdır.

## Tarihsel değer setleri

`StartDate` ve `EndDate`, parameter değerlerinin belirli dönemlerde geçerli olmasını destekliyor. Bordro ve İK uygulamalarında geçmiş dönem hesaplarının tekrar üretilebilmesi için değerlidir.

## Seviye bazlı parameter modeli

System → Company → WorkShop → Profile → Worker şeklinde parameter seviyesi tanımlanmış. Bu, overridefallback algoritmasına altyapısı olarak görülebilir.

## Aggregate üzerinden değişiklik

Alt değerlerin aggregate root metotları üzerinden eklenmesi, domain bütünlüğünü koruma niyetini gösteriyor.

## Repository ve Unit of Work

EF Core’un doğrudan Application’a taşınmasını önlemek ve transaction boundary oluşturmak hedeflenmiş.

## EF Core ve SQL Server

Domain ilişkisel

- Bir parameter
- Çok sayıda çeviri
- Çok sayıda tarihsel değer seti
- Her set altında değerler

Bu model için EF Core ve SQL Server doğal bir tercihtir. Migration ile şema versiyonlanabiliyor.

## Scoped lifecycle

DbContext, repository, UoW ve application service scoped kaydedilmiş. Böylece aynı HTTP request içinde aynı DbContextidentity map paylaşılabiliyor.

## DTO kullanımı

Persistencedomain modelinin API sözleşmesi olarak doğrudan dışarı çıkarılması önlenmiş.

## Docker multi-stage build

SDK yalnızca build aşamasında, ASP.NET runtime final image’da kullanılıyor. Bu, daha küçük ve daha güvenli runtime image yaklaşımıdır.

## BackgroundService


## WebSocketRedisRabbitMQ neden yok

Kodda bu ihtiyaçları gerektiren event veya gerçek zamanlı akış bulunmuyor. Basit requestresponse parameter okuma servisi için eklenmemeleri makul.

---

# 7. Performans

## Mevcut olumlu yaklaşımlar

### Async IO

Controller → Application → Repository → EF Core zinciri async çalışıyor.

Bu, database bekleme süresinde thread’in bloke edilmesini azaltır; fakat tek başına sorguyu hızlandırmaz.

### EF Core connection pooling

SQL Server provider, ADO.NET connection pooling’i varsayılan olarak kullanır. Kodda özel pooling ayarı yok.

### Foreign-key index’leri

Migration, ilişkisel foreign key kolonları için index üretmiş. Örneğin parameter value set ve translation ilişkilerinde FK index’leri mevcut.

### Scoped DbContext

Request boyunca identity map ve change tracker paylaşılabilir.

## Bulunmayan performans yaklaşımları

- Caching yok
- Redis yok
- `AsNoTracking` yok
- Pagination yok
- Projection (`Select`) yok
- Eager loading (`Include`) yok
- Bulk işlem yok
- Compiled query yok
- `DbContextPool` yok
- Response compression yok
- Output caching yok
- Query timeoutcommand timeout ayarı yok

## Potansiyel performans sorunları

### Tracking gereksiz

Salt-okuma endpoint’inde `FindAsync` tracking yapıyor. Güncellenmeyecek veri için `AsNoTracking` ve projection daha verimli olabilir.

### Alt koleksiyonlar yüklenmiyor

Lazy loading paketiproxy ayarı yok, `Include` da yok. Dolayısıyla value-set ve translation koleksiyonları repository sorgusunda yüklenmeyecek.

### Pagination’sız GetAll

Generic repository tüm tabloyu `ToListAsync()` ile alıyor. Büyük tabloda memory ve latency problemi yaratır.

### DTO mapping eksik fakat projection daha iyi olabilir

Entity’nin tamamını yüklemek yerine doğrudan DTO’ya projection uygulanabilir.

### Soft-delete filtresi yok

`IsDeleted` alanı var ancak global query filter yok. Hem yanlış veri dönme hem gereksiz satır tarama riski oluşur.

### Business index’leri eksik

`ParameterKey`, `MetaParameterId`, language uniqueness ve tarih aralıkları için açık business indexunique constraint görülmüyor. Özellikle parameter lookup key üzerinden yapılacaksa index önemlidir.

### Cache adayı

Parametreler genellikle sık okunan ve seyrek değişen verilerdir. Bu nedenle distributed cache için güçlü bir adaydır. Fakat invalidation tasarımı gerektirir.

---

# 8. Güvenlik

## Authentication

Yok.

`AddAuthentication` veya authentication middleware bulunmuyor.

## Authorization

`app.UseAuthorization()` çağrısı var, fakat

- Authentication scheme yok
- Controlleraction üzerinde `[Authorize]` yok
- Policyrole tanımı yok

Dolayısıyla mevcut endpoint fiilen anonim erişime açık.

## JWT

Yok.

## Validation

`[ApiController]` var; ancak input model yalnızca route’tan gelen `Guid`. DTO validation attribute’ları veya FluentValidation yok.

Domain constructor ve metotlarında da yeterli validation yok

- Tarih aralığı kontrol edilmiyor
- Boş keyvalue kontrol edilmiyor
- Minmax tutarlılığı kontrol edilmiyor
- Translation tekrarında yalnızca yorum satırı var, exception yok

## SQL Injection

EF Core LINQ sorguları parameterize edilir; mevcut repository sorgularında doğrudan SQL string’i çalıştırılmıyor. Bu nedenle mevcut endpoint açısından klasik SQL injection riski düşük.

Ancak domain’de `SqlExpression` alanı bulunuyor. Bu expression ileride doğrudan çalıştırılırsa ciddi injectionprivilege riski doğabilir. Şu anda çalıştırıldığına dair kanıt yok.

## XSS

API HTML üretmiyor. Ancak `Html` return type ve metin alanları var. Bunlar frontend’de raw HTML olarak render edilirse XSS riski frontendcontract sınırında ortaya çıkar. Backend’de sanitization görülmüyor.

## CSRF

Mevcut API cookie tabanlı authentication kullanmadığı için klasik CSRF bağlamı henüz oluşmamış. İleride cookie authentication eklenirse antiforgery tasarımı gerekir.

## Rate limiting

Yok.

## CORS

CORS policy yok. Bu, backend-to-backend tüketimde sorun olmayabilir; browser frontend varsa açıkça tasarlanmalıdır.

## Secret yönetimi

En ciddi açık bulgu SQL Server kullanıcı adı ve parolası repository’de plaintext tutuluyor [appsettings.json](CUsersborabOneDriveMasaüstüReposHcmOnAir.ParameterServiceHcmOnAir.ParameterService.APIappsettings.json10).

User Secrets ID tanımlı olsa da secret dosyaya yazılmış. Bu parola gerçek ortamda kullanıldıysa rotate edilmelidir.

## HTTPS

`UseHttpsRedirection` var. Docker’da 80 ve 443 expose edilmiş. Ancak certificate terminationdeployment bilgisi yok.

## Error handling

Global exception handler ve ProblemDetails middleware yok. Null entity mapping sırasında 500 üretilebilir.

## Soft-delete hatası

Predicate ile delete metodunda `IsDeleted = false` atanıyor; ID ile delete ise `true` atıyor. Bu güvenlikten çok veri bütünlüğü problemi olmakla birlikte silinmiş kabul edilen verilerin görünür kalmasına yol açabilir.

---

# 9. En İlginç Kısımlar — İlk 10

1. Metacustomer parameter ayrımı Ürün varsayımları ile müşteri override’larını ayıran business model.

2. Hiyerarşik parameter seviyesi System, company, workplace, profile ve worker kapsamlarına hazırlanmış model.

3. Tarihsel value-set tasarımı Başlangıçbitiş tarihleriyle effective-dated configuration yaklaşımı.

4. Çok dilli parameter metadata’sı Ad, kısa açıklama, kullanıcı açıklaması ve value-tag için ayrı translation modelleri.

5. Aggregate root yaklaşımı Alt nesnelerin root metotları üzerinden yönetilmesi niyeti.

6. Value object modellemesi Parameter değerleri için içerik bazlı domain nesnesi yaklaşımı.

7. Repository + Unit of Work Persistence sınırının Application’dan soyutlanması.

8. Katmanların ayrı assembly’lere bölünmesi API, Application, Contracts, Domain, Shared ve EF Core ayrımı.

9. EF Core property access configuration Private setter’lı domain nesnelerinin EF ile eşlenmesi.

10. Containerization Multi-stage Docker build ve Linux runtime hedefi.


---
