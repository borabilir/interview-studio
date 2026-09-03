# .NET Teknik Proje Dokümanı

## İnceleme kapsamı ve güven seviyesi

Çalışma alanında üç kaynak ağacı bulunuyor:

- `src`
- `src-dev`
- `src-dev-v01`

`src-dev`, dosya ve işlev sayısı bakımından en kapsamlı sürüm. Web uygulamasının yanında ETL servisi ve test projelerini de içeriyor. Bu nedenle ana analiz `src-dev` üzerinden yapıldı; diğer dizinler aynı çözümün daha eski veya kısmi varyantları olarak değerlendirildi.

Aşağıdaki ifadelerde:

- **Kesin:** Kodda doğrudan görüldü.
- **Güçlü çıkarım:** Birden fazla kod kanıtıyla destekleniyor.
- **Belirsiz:** Kaynak kod tek başına yeterli değil.

---

# 1. Projenin Özeti

## Proje ne yapıyor?

Bu proje, Novartis’in ticari operasyonlarına yönelik stok, satış, sipariş, müşteri, ürün, fatura ve dağıtım verilerini merkezi olarak yöneten bir kurumsal web uygulamasıdır.

İki ana çalışma parçası bulunuyor:

1. ASP.NET MVC tabanlı yönetim ve raporlama uygulaması
2. Windows Service olarak çalışan veri entegrasyon/ETL uygulaması

Web uygulamasında görülen temel fonksiyonlar:

- Ürün ve ürün grubu yönetimi
- Ürün fiyatı ve farklı ürün kodlarının yönetimi
- Müşteri, müşteri grubu, şube ve şehir ilişkileri
- Sipariş dosyası yükleme
- Sipariş dağıtım hesapları
- Pazar payı hesaplama ve dağıtma
- Depo stoklarının izlenmesi
- Günlük stok/SIT raporları
- Stok karşılaştırma raporları
- Müşteri satış ve stok takibi
- Fatura içe aktarma ve raporlama
- IMS geçmiş verileri
- Excel dışa aktarma
- Kullanıcı, rol ve izin yönetimi
- Kullanıcıya özel grid/pivot düzenlerinin saklanması

ETL tarafında:

- Farklı ecza deposu veya iş ortağı formatlarında gelen dosyalar okunuyor.
- Dosyanın kaynağı/formatı belirleniyor.
- Kaynağa özel mapper ile ortak veri modeline dönüştürülüyor.
- SQL Server’a toplu şekilde yükleniyor.
- Entegrasyon sonuçları loglanıyor.
- Zamanlanmış raporlar hazırlanıyor.
- Raporlar e-posta gönderim tablosuna kaydediliyor.

## Hangi problemi çözüyor?

**Güçlü çıkarım:** Farklı ecza depolarından gelen heterojen stok ve satış dosyalarının tek tek manuel işlenmesi problemini çözüyor.

Her depo aynı dosya düzenini kullanmadığı için sistemde `AllianceStockMapper`, `BEKStockMapper`, `SelcukStockMapper`, `NovartisStockMapper` gibi çok sayıda kaynak-özel mapper bulunuyor. Bu veriler ortak modele çevrilerek raporlama ve dağıtım hesaplarında kullanılabiliyor.

Ayrıca aşağıdaki operasyonel problemleri çözüyor:

- Dağınık stok ve satış verilerinin konsolidasyonu
- Ürünlerin müşterilere/depolara nasıl dağıtılacağının hesaplanması
- Pazar payı hedeflerine göre dağıtım simülasyonu
- Günlük stok ve sell-out görünürlüğü
- Manuel Excel raporlamasının otomatikleştirilmesi
- Rol bazlı veri ve ekran erişimi

## Business amacı

**Güçlü çıkarım:** Doğru ürünün doğru depo, müşteri, şehir veya şubeye doğru miktarda dağıtılmasını desteklemek; ticari ekiplerin stok, satış, pazar payı ve sipariş kararlarını güncel veriler üzerinden vermesini sağlamak.

Business değeri şu şekilde anlatılabilir:

- Stok yetersizliği ve aşırı stok riskini azaltmak
- Dağıtım kararlarını standartlaştırmak
- Ecza deposu verilerini tek raporlama modelinde birleştirmek
- Operasyon ekiplerinin Excel üzerinde yaptığı manuel işleri azaltmak
- Günlük ve dönemsel satış/stok görünürlüğü sağlamak
- Pazar payı hedeflerini operasyonel dağıtım kararlarına çevirmek

## Kullanıcılar kimler?

Kodda kullanıcı personalleri açıkça tanımlanmıyor. Ancak ekran ve yetkilerden hareketle muhtemel kullanıcılar:

- Satış operasyon ekipleri
- Ticari operasyon ekipleri
- Supply chain/dağıtım ekipleri
- Finans veya fatura kontrol ekipleri
- Bölge ve ürün yöneticileri
- Raporlama/iş zekâsı ekipleri
- Sistem yöneticileri

Bu kullanıcı grupları **çıkarımdır**; gerçek organizasyon rolleri koddan kesinleştirilemiyor.

---

# 2. Kullanılan Teknolojiler

Gerçekten kullanıldığı doğrulanan teknolojiler:

- .NET Framework 4.7.2 — ana web ve katman projeleri
- .NET Framework 4.5.2 — ETL projesi
- ASP.NET MVC 5
- Razor Views
- C#
- Entity Framework 6.2
- Database-first / reverse-generated POCO ve `DbContext`
- SQL Server
- Stored procedure’ler
- Dapper — özellikle ETL tarafında
- ADO.NET transaction’ları
- Autofac 4.9
- AutoMapper 9
- Hangfire 1.7
- Hangfire SQL Server Storage
- Topshelf — ETL uygulamasını Windows Service olarak çalıştırmak için
- jQuery
- jQuery Validation
- Bootstrap
- DevExpress MVC Grid, PivotGrid, Chart ve form bileşenleri
- EPPlus — Excel oluşturma
- ExcelDataReader
- Microsoft Exchange Web Services
- log4net
- Westwind Globalization — veritabanı tabanlı localization
- Z.EntityFramework.Plus — bulk update/delete
- Newtonsoft.Json
- Nager.Date
- MSTest
- NSubstitute
- NuGet `packages.config`
- TFS kaynak kontrol metadata’sı

Kullanıldığına dair kanıt bulunmayanlar:

- ASP.NET Core
- .NET 5+
- React
- TypeScript
- Redis
- SignalR
- WebSocket
- RabbitMQ
- JWT
- Docker
- Kubernetes
- Azure
- OpenAI
- MySQL
- `BackgroundService`
- CQRS/MediatR

Önemli teknik düzeltme: Bu proje “ASP.NET Core uygulaması” değil, klasik ASP.NET MVC 5 ve .NET Framework uygulamasıdır.

---

# 3. Mimari

## Genel sınıflandırma

En doğru tanım:

> Katmanlı kurumsal monolith ve yanında ayrı çalışan bir ETL/Windows Service bileşeni.

Tek bir deployable olmadığı için bütün sisteme sadece “monolith” demek eksik kalabilir. Web uygulaması kendi içinde katmanlı monolith, ETL ise ayrı bir process/deployment unit’tir. İkisi aynı SQL Server altyapısı ve ortak business verileri üzerinden ilişkilidir.

## Katmanlar

### `SYS.UI`

Presentation katmanı:

- MVC controller’ları
- Razor view’lar
- DevExpress UI
- Authentication yönlendirmesi
- Permission filter
- Autofac composition root
- Global hata yönetimi
- Excel çıktıları ve bazı raporlama işleri

### `SYS.BUS`

Business/service katmanı:

- Servis arabirimleri ve implementasyonları
- Request, response, DTO ve view model’ler
- Business validation
- AutoMapper profilleri
- Dağıtım ve pazar payı gibi iş akışları

### `SYS.DAL`

Data access katmanı:

- Generic Repository
- Özel repository’ler
- Unit of Work
- EF sorguları
- Stored procedure çağrılarının repository üzerinden sunulması
- Bulk update/delete

### `SYS.COM`

Ortak model ve altyapı sözleşmeleri:

- EF entity’leri
- Generated database modelleri
- Repository interface’leri
- Sabitler ve ortak modeller

### `CARETTA.COM`

Ortak teknik altyapı:

- DI registration
- Logging
- Session abstraction
- Application settings
- Encryption/helper sınıfları
- Genel response ve utility’ler

### `SYS.ETL`

Ayrı entegrasyon uygulaması:

- Extract
- Transform
- Load
- Dosya handler’ları
- Kaynak-özel mapper’lar
- Dapper ve transaction tabanlı veri yükleme
- Hangfire job’ları
- Topshelf Windows Service host’u

## Hangi mimariler değil?

- **Clean Architecture değil:** Domain merkezli bağımlılık kuralı tutarlı değil; business katmanı EF entity ve DAL sözleşmelerini doğrudan biliyor.
- **Onion değil:** Domain’in tamamen bağımsız olduğu bir yapı yok.
- **Vertical Slice değil:** Özellikler uçtan uca feature klasörlerinde değil, teknik katmanlara ayrılmış.
- **CQRS değil:** Command/query ayrımı ve ayrı handler modeli bulunmuyor.
- **Modular Monolith değil:** İş modülleri ayrı sınırlar ve composition’lar halinde organize edilmemiş; katmanlar büyük ölçüde tüm domain’i kapsıyor.

---

# 4. Design Patternler

## Repository

**Nerede?**

- `SYS.DAL/Repository.cs`
- `SYS.DAL/Repositories/*Repository.cs`

**Niçin?**

- EF erişimini business servislerinden soyutlamak
- Ortak CRUD işlemlerini tek noktada toplamak
- Karmaşık veya stored procedure tabanlı işlemleri özel repository’lere taşımak
- Servislerin doğrudan `DbContext` kullanımını azaltmak

Generic repository’nin yanında `OrderRepository`, `DistributionRepository`, `MarketShareReportRepository` gibi özelleşmiş repository’ler kullanılıyor.

## Unit of Work

**Nerede?**

- `SYS.DAL/UnitOfWork/IUnitOfWork.cs`
- `SYS.DAL/UnitOfWork/UnitOfWork.cs`

**Niçin?**

- Aynı `DbContext` altında repository’leri bir araya getirmek
- `SaveChanges` çağrısını business transaction sınırı olarak sunmak
- Audit alanlarını merkezi olarak doldurmak
- Request süresince tek context kullanmak


## Dependency Injection

**Nerede?**

- Autofac registration
- Controller ve servis constructor’ları
- `IUnitOfWork`, `ILogger`, `IMapper`, `ISessionManager` injection’ları

**Niçin?**

- Concrete bağımlılıkları gevşetmek
- Test doubles kullanabilmek
- Request/lifetime scope yönetmek
- Composition’ı uygulama başlangıcında yapmak

## Strategy

**Nerede?**

ETL mapper’larında:

- `IDataMapper`
- `StockMapperBase`
- Kaynak-özel stock mapper sınıfları

**Niçin?**

Her tedarikçi/depo dosyasının farklı doğrulama ve kolon eşleme kuralları var. Sistem çalışma zamanında uygun mapper’ı seçerek aynı iş akışını farklı stratejilerle yürütüyor.

## Factory

**Nerede?**

- `FileMapFactory`
- `EntityProviderFactory`

**Niçin?**

- Dosyaya uygun mapper’ı belirlemek
- Konfigürasyona göre uygun entity provider’ı üretmek
- Oluşturma/seçim mantığını consumer’dan ayırmak

## Template Method

**Nerede?**

- `StockMapperBase` ve türetilmiş stock mapper’ları

**Güçlü çıkarım:** Ortak mapping akışı base sınıfta, depo-özel farklar alt sınıflarda ele alınıyor.

## Service Layer

**Nerede?**

- `MemberService`
- `OrderService`
- `StockReportService`
- `InvoiceService`
- Diğer `SYS.BUS/Services` sınıfları

**Niçin?**

Controller’ları veri erişimi ve business kurallarından ayırmak.

## Mapper Pattern

AutoMapper profilleri ve ETL `IDataMapper` implementasyonlarında iki farklı biçimde görülüyor.

## Scheduler / Job Queue

Hangfire recurring job’ları:

- Dakikada bir entegrasyon dosyası kontrolü
- Günlük SIT raporu
- SQL Server üzerinde kalıcı job durumu

## Chain/Pipeline benzeri akış

`DataCollector`, handler listesi, file reader, mapper ve data service yapısı bir ETL pipeline’ı oluşturuyor. Ancak klasik Chain of Responsibility uygulaması olduğu kesin söylenemez.

---

# 5. SOLID

## Single Responsibility

Kısmen uygulanmış:

- Repository’ler veri erişimine odaklanıyor.
- Servisler business davranışlarını taşıyor.
- Mapper’lar kaynağa özel dönüşüme odaklanıyor.
- Logger implementasyonları farklı çıkışlara ayrılmış.
- ETL Extract/Transform/Load klasörlerine ayrılmış.

Zayıf örnekler:

- `OrderService` çok büyük ve çok sayıda farklı iş akışını yönetiyor.
- Bazı controller’larda Excel üretme ve raporlama kodu bulunuyor.
- `HangfireTasks.SendSITDaiylGroupReport` veri sorgulama, gruplama, Excel biçimlendirme ve e-posta kuyruğu oluşturmayı tek metotta yapıyor.

## Open/Closed

ETL mapper yapısında güçlü uygulanmış. Yeni depo formatı, yeni `IDataMapper` implementasyonu eklenerek genişletilebiliyor.

Ancak mapper discovery reflection tabanlı olduğu için kayıt sırası ve birden fazla mapper’ın aynı dosyayı kabul etmesi gibi durumların yönetimi belirsiz.

## Liskov Substitution

Mapper ve logger implementasyonları sözleşmeler üzerinden değiştirilebilir görünüyor. Fakat kapsamlı contract test’leri olmadığı için tüm implementasyonların aynı davranış kurallarını koruduğu kesinleştirilemiyor.

## Interface Segregation

Servis ve repository’ler için ayrı interface’ler bulunuyor. Buna karşılık `IUnitOfWork`, çok sayıda repository property’si içeren geniş bir interface; consumer’lar ihtiyaç duymadıkları repository’leri de görüyor.

## Dependency Inversion

Controller ve servislerde iyi uygulanmış:

- Controller → service interface
- Service → unit of work/interface
- Logging/session/settings → interface

Ancak business katmanı EF-generated entity’lere ve büyük `IUnitOfWork` abstraction’ına bağlı. Domain model bağımsız olmadığı için prensip tam uygulanmış değil.

---

# 6. Önemli Teknik Kararlar

## Neden ASP.NET MVC 5?

Projenin geliştirildiği dönemin kurumsal .NET ekosistemi ve DevExpress MVC entegrasyonu için doğal bir tercih. Server-rendered yönetim ve yoğun raporlama ekranları açısından uygundur.

## Neden ayrı ETL Windows Service?

Dosya toplama ve dönüştürme işlemleri HTTP request yaşam döngüsüne bağlı kalmamalı. Sürekli çalışan, yeniden başlatılabilir ve zamanlanabilir ayrı process olması operasyonel olarak daha güvenli.

## Neden Hangfire?

- Recurring job tanımlama
- Job durumunu SQL Server’da kalıcı tutma
- Windows Service yeniden başlasa bile job altyapısını devam ettirme
- Cron tabanlı zamanlama

Burada ASP.NET Core `BackgroundService` kullanılmamasının temel nedeni projenin .NET Framework olmasıdır.

## Neden EF6?

- Entity mapping ve change tracking
- Include ile ilişkisel veri yükleme
- LINQ tabanlı sorgular
- Stored procedure sonuçlarının generated context içinde sunulması
- Transactional `SaveChanges`

## Neden Dapper/ADO.NET?

ETL tarafında yüksek hacimli ve SQL’e yakın veri yükleme süreçlerinde EF’ye göre daha doğrudan kontrol ve daha düşük overhead sağlamak için kullanıldığı güçlü biçimde düşünülebilir.

## Neden Repository + Unit of Work?

Business servisleri ile persistence ayrımı, test edilebilirlik ve ortak audit/commit davranışı sağlamak için.

## Neden Strategy/Factory?

20’den fazla depo formatını büyük bir `switch` içinde yönetmek yerine yeni mapper ekleyerek genişleyebilmek için.

## Neden DevExpress?

Grid, PivotGrid, chart, Excel export, batch editing, filtreleme ve kullanıcıya özel layout gibi kurumsal raporlama ihtiyaçlarını hazır olarak karşılıyor.

## Neden session tabanlı authentication?

Uygulama server-rendered intranet uygulamasına benziyor ve LDAP/domain authentication kullanıyor. JWT gerektiren stateless API/SPA yapısı bulunmuyor.

## Neden stored procedure?

Raporlama, dağıtım ve pazar payı hesapları veri yoğun. Bu işlemleri SQL Server’a yakın çalıştırmak ağ trafiğini ve uygulama tarafındaki hesaplama yükünü azaltabilir.

---

# 7. Performans

## Kullanılan olumlu yaklaşımlar

- Bulk update/delete: Z.EntityFramework.Plus
- ETL yüklemelerinde ADO.NET transaction
- Dapper kullanımı
- Stored procedure tabanlı raporlama ve hesaplamalar
- LINQ sorgularının deferred execution özelliği
- İlişkiler için açık `Include`
- Hangfire ile uzun/zamanlanmış işlerin request dışına taşınması
- SQL Server connection pooling’in provider tarafından varsayılan kullanımı
- Release build optimizasyonu
- DevExpress’in grid/pivot özellikleri
- Bazı generated stored procedure metotlarında async API

## Görülmeyen veya sınırlı kullanılanlar

- `AsNoTracking` kullanımı bulunamadı.
- Genel bir pagination stratejisi görülmedi.
- Redis veya uygulama cache’i bulunamadı.
- Web action/service akışlarının çoğu senkron.
- Query projection yerine çok yerde entity listesi çekilip AutoMapper kullanılıyor.
- Bazı ekranlarda `ShowAllRecords` kullanılıyor.
- InProc session yatay ölçeklemeyi zorlaştırır.

## Potansiyel performans sorunları

- `OrderService` içinde döngü başına repository sorguları var; N+1 riski taşıyor.
- Tek iş akışında çok sayıda `SaveChanges` çağrısı bulunuyor.
- Büyük raporlar bellekte `ToList()` ile tamamen materialize ediliyor.
- Excel üretimi process belleğinde yapılıyor.
- `GetAll()` tracked entity döndürüyor.
- Günlük rapor üretiminde aynı collection üzerinde tekrar tekrar `Where` ve `Sum` çalıştırılıyor.
- DevExpress `ShowAllRecords` büyük veri setlerinde riskli.
- InProc session, kullanıcı sayısı ve rapor verisi büyüdükçe IIS belleğini artırabilir.
- Bazı sıralamalarda ardışık `OrderBy` kullanılmış; önceki sıralama eziliyor. `ThenBy` gerekirdi.

---

# 8. Güvenlik

## Authentication

- Login, LDAP/domain authentication amacıyla tasarlanmış.
- Başarılı login sonrası kullanıcı bilgileri session’a yazılıyor.
- Session ID regenerate ediliyor; session fixation riskine karşı olumlu.
- Logout sırasında session temizleniyor ve abandon ediliyor.
- Login işlemi audit tablosuna yazılıyor.

### Kritik bulgu

`MemberService.Authenticate` içinde:

```csharp
bool isSuperPass = true;
```

Bu nedenle LDAP kontrolü fiilen bypass ediliyor ve sistem kullanıcıyı otomatik olarak doğrulanmış kabul ediyor.

Bu, development amaçlı bırakılmış olsa bile kaynak sürüm açısından **kritik authentication açığıdır**. Teknik değerlendirmede saklanmamalı; “tespit ettiğim ilk kritik risk buydu” şeklinde açıklanmalıdır.

## Authorization

- Rol ve permission modeli var.
- Kullanıcı permission code’ları session’a yükleniyor.
- Action’larda custom `[Permission]` attribute kullanılıyor.
- Base controller anonymous olmayan action’larda session kontrolü yapıyor.

Riskler:

- Permission attribute yalnızca eklendiği action’ları koruyor.
- Çok sayıda state-changing action’da permission attribute görünmüyor.
- Merkezi deny-by-default authorization politikası bulunmuyor.
- Custom action filter, standart `AuthorizeAttribute` veya policy sistemine göre daha kolay atlanabilir.

## CSRF

Login POST işleminde `[ValidateAntiForgeryToken]` var.

Ancak birçok POST action’da token doğrulaması görünmüyor. Bu nedenle CSRF koruması uygulama genelinde tutarlı değil.

## Validation

- Request modellerinde DataAnnotations bulunuyor.
- Servislerde manuel business validation yapılıyor.
- MVC model binding mevcut.

Eksikler:

- Controller’larda `ModelState.IsValid` kullanımının sistematik olduğu görülmüyor.
- Dosya upload validation’ının kapsamı belirsiz.
- Merkezi validator/FluentValidation yok.

## SQL Injection

Olumlu taraf:

- EF LINQ sorguları parametreli SQL üretir.
- Generated stored procedure çağrıları `SqlParameter` kullanıyor.
- Dapper parametreleri kullanılan yerlerde koruma sağlar.

Risk:

- Bazı ID listeleri string olarak stored procedure’lere iletiliyor.
- Stored procedure içeriği kaynakta bulunmadığı için bu stringlerin dynamic SQL’de güvenli işlendiği doğrulanamıyor.

## XSS

Razor varsayılan olarak output encoding uygular.

Ancak:

- Menü HTML’i `MvcHtmlString` olarak session’a konuyor.
- Dinamik HTML’in üretim kaynağı ve sanitization davranışı incelenmeli.
- Stored XSS açısından veritabanı tabanlı localization ve editable içerikler ayrıca değerlendirilmelidir.

## Session/cookie güvenliği

- InProc session kullanılıyor.
- Session timeout 120 dakika.
- Session ID login sonrası regenerate ediliyor.

Belirsiz veya görünmeyenler:

- `Secure` cookie
- `HttpOnly`
- SameSite politikası
- TLS/HSTS zorlaması
- Cookie encryption/machine key yönetimi

## Rate limiting

Bulunamadı. Özellikle login için brute-force/rate limiting mekanizması görünmüyor.

## Diğer riskler

- Dosya indirme action’ında istemciden gelen path kullanımı varsa path traversal riski araştırılmalı.
- Upload edilen dosyaların uzantı, MIME, içerik, boyut ve hedef path kontrolleri doğrulanmalı.
- ETL servisinin `LocalSystem` ile çalışması gereğinden fazla yetki anlamına gelebilir.
- Konfigürasyon dosyalarında secret yönetimi ve encryption stratejisi belirsiz.
- Global exception handling’in bazı durumlarda hata detaylarını uygunsuz işlemesi mümkün.
- `BaseController.OnException` içinde `ex` null kontrolünden önce `ex.EntityValidationErrors` kullanılıyor; farklı exception’larda ikinci bir hata üretme riski var.

---
