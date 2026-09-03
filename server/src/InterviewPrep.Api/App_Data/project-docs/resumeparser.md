# 1. Projenin Özeti

## Proje ne yapıyor?

ResumeParser, PDF biçimindeki özgeçmişleri okuyup yapılandırılmış bir modele dönüştürmeyi amaçlayan ASP.NET Core Web API prototipidir.

Temel akış:

1. Kullanıcı `multipart/form-data` ile PDF yükler.
2. Dosya uygulamanın `wwwroot` klasörüne yazılır.
3. PdfPig, PDF sayfalarındaki kelimeleri ve koordinatlarını çıkarır.
4. Kelimeler koordinatlarına göre sıralanıp mantıksal satırlara dönüştürülür.
5. Font boyutu, metin, konum, önceki/sonraki/üst/alt satır gibi kurallar çalıştırılır.
6. Eşleşen bilgiler reflection ile `ResumeModel` içindeki alanlara yazılır.
7. Sonuç JSON olarak döndürülür.

Ana iş akışı [FileController.cs](</C:/Users/borab/OneDrive/Masaüstü/Repos/ResumeParser/ResumeParser.API/Controllers/FileController.cs:20>), PDF okuma ve format seçimi [ResumeConfigurationFactory.cs](</C:/Users/borab/OneDrive/Masaüstü/Repos/ResumeParser/ResumeParser.API/ResumeConfigurations/ResumeConfigurationFactory.cs:13>), parser motoru ise [ResumeConfigurationsBase.cs](</C:/Users/borab/OneDrive/Masaüstü/Repos/ResumeParser/ResumeParser.API/ResumeConfigurations/ResumeConfigurationsBase.cs:14>) içindedir.

## Hangi problemi çözüyor?

**Kesin:** PDF özgeçmişlerdeki serbest biçimli veriyi şu yapılandırılmış alanlara dönüştürmeye çalışıyor:

- Kişisel bilgiler
- Yetenekler
- Yabancı diller
- İş deneyimleri
- Eğitimler
- Sertifikalar

Model [ResumeModel.cs](</C:/Users/borab/OneDrive/Masaüstü/Repos/ResumeParser/ResumeParser.API/Model/Resume/ResumeModel.cs:6>) içinde tanımlı.

**Güçlü çıkarım:** Amaç, insan kaynakları süreçlerinde özgeçmiş bilgilerinin elle girilmesi yerine otomatik çıkarılmasıdır.

## Business amacı nedir?

Repoda ürün dokümanı bulunmadığı için kesin business amacı bilinmiyor. Makul çıkarımlar:

- özgeçmiş verisini ATS/HR sistemine aktarılabilir hale getirmek
- Aday profili oluşturma süresini azaltmak
- Farklı özgeçmiş formatlarını ortak bir domain modeline normalize etmek
- Arama, filtreleme ve aday karşılaştırmaya uygun veri üretmek
- Manuel veri girişindeki zaman ve hata maliyetini azaltmak


## Kullanıcılar kimler?

Kod kullanıcı rolü tanımlamıyor. Muhtemel kullanıcılar:

- İnsan kaynakları uzmanları
- İşe alım ekipleri
- ATS veya aday yönetim sistemleri
- Kariyer platformları
- özgeçmiş yükleyen adaylar
- Başka bir frontend veya backend servisi

CORS politikasında `http://localhost:3000` bulunması, ayrı bir frontend istemcisinin düşünülmüş olabileceğini gösterir. Ancak repoda React veya başka bir frontend yoktur.

---

# 2. Kullanılan Teknolojiler

## Gerçekten kullanılanlar

- **C#**
- **.NET Core 3.1**
- **ASP.NET Core Web API**
- **ASP.NET Core MVC Controllers**
- **Built-in Dependency Injection**
- **IFormFile / multipart dosya yükleme**
- **PdfPig 0.1.6**
- **Newtonsoft.Json 13.0.1**
- **LINQ**
- **Expression Trees**
- **Reflection**
- **Fluent Builder API**
- **CORS**
- **Built-in logging abstraction**
- **Senkron dosya ve PDF işlemleri**

Hedef framework ve paketler [ResumeParser.API.csproj](</C:/Users/borab/OneDrive/Masaüstü/Repos/ResumeParser/ResumeParser.API/ResumeParser.API.csproj:1>) içinde görülebilir.

## Kullanılmayanlar

Kodda gerçek kullanımı yok:

- React
- TypeScript
- SQL Server
- MySQL
- PostgreSQL
- EF Core
- Dapper
- Redis
- SignalR
- WebSocket
- RabbitMQ
- Hangfire
- `BackgroundService`
- Docker
- Azure
- OpenAI
- JWT
- Authentication
- Rol/policy tabanlı authorization
- Repository
- Unit of Work
- CQRS
- MediatR
- Swagger/OpenAPI
- Gerçek unit test framework’ü
- CI/CD

`ResumeParser.Test.csproj` içinde `Microsoft.EntityFrameworkCore` adına ait bir `None Remove` girdisi var; bu bir paket referansı veya kullanım değildir.

## Önemli sürüm notu

`.NET Core 3.1` artık destek dışıdır. Derleme de `NETSDK1138` uyarısı vermektedir. Senior teknik değerlendirmede bunun:

- Güvenlik güncellemesi almaması
- Yeni paketlerle uyumluluk riski
- Operasyonel ve bakım maliyeti
- Güncel LTS’e migration gereksinimi

doğurduğunu açıkça söylemek gerekir.

---

# 3. Mimari

## En doğru sınıflandırma

Bu proje:

- **Tek deployable ASP.NET Core monolith**
- **Klasör bazında teknik sorumluluk ayrımı olan basit monolit**
- **Kısmen layered yaklaşım izleri taşıyan, fakat gerçek Layered Architecture olmayan yapı**

olarak tanımlanabilir.

## Neden monolith?

API, parsing motoru, domain modelleri, PDF altyapısı ve format konfigürasyonları aynı projede ve aynı process içinde çalışıyor.

Ayrı:

- Domain assembly
- Application layer
- Infrastructure layer
- Persistence service
- Worker
- Microservice

yok.

## Modular Monolith mi?

Hayır. `KariyerNet` ve `LinkedIn` konfigürasyonları farklı format modülleri gibi düşünülebilir, ancak bağımsız modül sınırları, public contract’lar veya modül izolasyonu bulunmuyor.

## Layered Architecture mı?

Tam olarak değil.

Klasörler teknik bir ayrım sunuyor:

- `Controllers`
- `Model`
- `ResumeConfigurations`
- `Builders`
- `Utils`

Ancak controller doğrudan:

- Dosya sistemine erişiyor
- Factory oluşturuyor
- Parser çalıştırıyor
- JSON serialization yapıyor

Dolayısıyla Presentation → Application → Domain → Infrastructure şeklinde bağımlılık yönü yok.

## Clean Architecture mı?

Hayır.

Çünkü:

- Domain ve application katmanları ayrılmamış.
- PDF kütüphanesinin `Word` tipi parser konfigürasyonlarına kadar taşınıyor.
- Use case interface’leri yok.
- Dependency inversion uygulanmış bir altyapı sınırı yok.
- Controller somut sınıfları `new` ile oluşturuyor.
- Framework ve altyapı detayları merkez koddan ayrıştırılmamış.

## Onion Architecture mı?

Hayır. İç domain halkasına doğru bağımlılık ilkesi yok.

## Vertical Slice mı?

Hayır. Feature bazlı uçtan uca slice yapısı bulunmuyor. Dosyalar teknik türlerine göre gruplanmış.

## Mimari akış

```text
HTTP POST /api/file
        |
        v
FileController
  - PDF'yi diske yazar
  - Formatı KariyerNet seçer
        |
        v
ResumeConfigurationFactory
  - PdfPig ile kelimeleri çıkarır
  - Format konfigürasyonunu oluşturur
        |
        v
KariyerNetResumeConfigurations
  - Section/data/rule tanımları
        |
        v
ResumeConfigurationsBase.Process()
  - Kuralları çalıştırır
  - Reflection ile modeli doldurur
        |
        v
ResumeModel -> JSON
```

---

# 4. Design Pattern’ler

## 4.1 Factory

**Nerede?**

[ResumeConfigurationFactory.cs](</C:/Users/borab/OneDrive/Masaüstü/Repos/ResumeParser/ResumeParser.API/ResumeConfigurations/ResumeConfigurationFactory.cs:13>)

`ResumeType` değerine göre:

- `LinkedinResumeConfigurations`
- `KariyerNetResumeConfigurations`

oluşturuluyor.

**Niçin?**

özgeçmiş formatına göre doğru parser konfigürasyonunun seçimini tek noktada toplamak için.

**Senior değerlendirmesi:**

Bu, basit bir Factory/Simple Factory’dir. Ancak Open/Closed açısından eksiktir; yeni format eklemek için enum ve `switch` değiştirilmelidir. DI üzerinden `IResumeParser` implementasyonlarının kaydedildiği strategy registry daha genişleyebilir olurdu.

## 4.2 Builder / Fluent Builder

**Nerede?**

- [ResumeSectionBuilder.cs](</C:/Users/borab/OneDrive/Masaüstü/Repos/ResumeParser/ResumeParser.API/Model/Resume/Builders/ResumeSectionBuilder.cs:7>)
- [ResumeDataBuilder.cs](</C:/Users/borab/OneDrive/Masaüstü/Repos/ResumeParser/ResumeParser.API/Model/Resume/Builders/ResumeDataBuilder.cs:8>)
- [LineRuleBuilder.cs](</C:/Users/borab/OneDrive/Masaüstü/Repos/ResumeParser/ResumeParser.API/Model/Resume/Builders/LineRuleBuilder.cs:8>)
- [ReadExpressionBuilder.cs](</C:/Users/borab/OneDrive/Masaüstü/Repos/ResumeParser/ResumeParser.API/Model/Resume/Builders/ReadExpressionBuilder.cs:7>)

Kullanım örneği [KariyerNetResumeConfigurations.cs](</C:/Users/borab/OneDrive/Masaüstü/Repos/ResumeParser/ResumeParser.API/ResumeConfigurations/KariyerNetResumeConfigurations.cs:14>) içindedir.

**Niçin?**

Karmaşık parser konfigürasyonunu iç içe nesne oluşturmaları yerine okunabilir bir fluent DSL biçiminde tanımlamak için.

Örnek mantık:

```csharp
DeclareSection(...)
    .DeclareResumeData<PersonalInfo>(
        property: x => x.Email,
        ruleAction: rules => rules
            .AddKeywordRule("E-Posta Adresi")
            .AddFontSizeRule(12),
        readAction: ...
    );
```

Bu projenin teknik olarak en değerli yönlerinden biridir.

## 4.3 Strategy benzeri yaklaşım

**Nerede?**

`LinkedinResumeConfigurations` ve `KariyerNetResumeConfigurations`, ortak `ResumeConfigurationsBase` sınıfından türemektedir.

**Niçin?**

Farklı özgeçmiş sağlayıcılarının aynı çıktı modelini farklı parse kurallarıyla üretmesini sağlamak için.

**Not:** Bu eksiksiz bir Strategy implementasyonu değildir; ortak bir interface üzerinden runtime davranış enjeksiyonu yerine inheritance ve factory kullanılıyor. “Strategy benzeri format konfigürasyonu” demek daha doğrudur.

## 4.4 Template Method benzeri yaklaşım

**Nerede?**

Ortak `Process()` algoritması base sınıfta, format kuralları derived sınıfların constructor’larında kuruluyor.

**Niçin?**

PDF satırlarını dolaşma, kuralları çalıştırma ve modeli doldurma algoritmasını paylaşırken sağlayıcıya özel tanımları değiştirmek için.

**Not:** Klasik Template Method’da derived sınıfların override ettiği hook metotları beklenir. Burada hook yerine constructor ile konfigürasyon hazırlanıyor.

## 4.5 Specification / Rules Engine benzeri yapı

**Nerede?**

Kurallar şu tipte tutuluyor:

```csharp
Dictionary<Expression<Func<Line, bool>>, TargetLine>
```

Her rule, belirli bir hedef satır üzerinde test ediliyor.

**Niçin?**

“Bu satır e-posta alanı mı?”, “üstteki satırın etiketi nedir?”, “font boyutu uygun mu?” gibi koşulları parser motorundan ayırmak için.

Tam bir Specification Pattern değildir; fakat composable predicate/specification fikrine yakındır.

## 4.6 Dependency Injection

**Nerede?**

ASP.NET Core framework servisleri kullanılıyor. Örneğin `ILogger<WeatherForecastController>` constructor üzerinden alınmış.

**Niçin?**

Framework servislerinin yaşam döngüsü ve çözümlemesini container’a bırakmak için.

**Sınırlama:** Asıl iş akışında PDF reader, parser factory veya storage servisi DI ile alınmıyor; controller bunları doğrudan oluşturuyor. Bu yüzden domain seviyesinde DI kullanımı zayıf.

## Kullanılmayan pattern’ler

- Repository
- Unit of Work
- CQRS
- Mediator/MediatR
- Observer
- Message Bus
- Decorator
- Adapter — PdfPig çevresinde belirgin adapter yok

---

# 5. SOLID

## S — Single Responsibility Principle

**Kısmen uygulanmış.**

Olumlu örnekler:

- `LineRuleBuilder` yalnızca kural tanımaya odaklanıyor.
- `ReadExpressionBuilder` okuma davranışını kuruyor.
- Sağlayıcı konfigürasyonları ayrı sınıflara ayrılmış.
- Çıktı modeli parsing konfigürasyonundan ayrı.

Zayıf örnekler:

- `FileController` upload, storage, parsing orchestration ve serialization yapıyor.
- `ResumeConfigurationsBase` satır üretme, koordinat hesaplama, rules engine, navigation, reflection ve model assembly görevlerini birlikte yapıyor.
- Factory hem PDF’yi okuyor hem parser seçiyor.

Teknik değerlendirme: “SRP yönünde iyi bir DSL ayrımı var, ancak orchestration ve parser engine sınıfları hâlâ fazla sorumluluk taşıyor.”

## O — Open/Closed Principle

**Kısmen uygulanmış.**

Olumlu:

- Yeni field rule’ları builder üzerinden eklenebilir.
- Yeni sağlayıcı için base sınıftan türeyen konfigürasyon yazılabilir.

Olumsuz:

- Yeni sağlayıcı için `ResumeType` ve factory `switch` değiştirilmek zorunda.
- Yeni `TargetLine` davranışı için `GetTargetLine` switch’i değiştirilir.
- Model tipi ve reflection varsayımları sıkı bağlıdır.

## L — Liskov Substitution Principle

Belirgin ihlal kanıtı yok; ancak base sınıfın güçlü bir davranış contract’ı da tanımlanmamış.

Önemli nokta: `LinkedinResumeConfigurations` constructor’ının tamamı yorumda olduğundan nesne teknik olarak üretilebilse bile faydalı parsing yapmıyor. Bu, “her derived configuration kullanılabilir parser’dır” beklentisini pratikte bozar.

## I — Interface Segregation Principle

Değerlendirilecek interface bulunmuyor. Bu nedenle “uygulanmış” denemez.

Üretim tasarımında aşağıdaki küçük interface’ler anlamlı olurdu:

- `IResumeParser`
- `IPdfTextExtractor`
- `IUploadedFileStore`
- `IResumeParserResolver`

## D — Dependency Inversion Principle

Asıl iş akışında uygulanmamış:

- Controller doğrudan `FileStream` açıyor.
- Controller doğrudan `ResumeConfigurationFactory` yaratıyor.
- Factory doğrudan PdfPig kullanıyor.
- Parser konfigürasyonları PdfPig `Word` tipine bağımlı.

Framework düzeyinde built-in DI bulunması tek başına DIP uygulandığı anlamına gelmez.

---

# 6. Önemli Teknik Kararlar

## PDF metnini koordinatlarıyla okumak

PdfPig’den yalnızca düz metin değil:

- Bounding box
- Font size
- Font name
- Sayfa numarası

alınıyor.

Sebep: özgeçmiş’lerde anlam yalnızca metinden değil görsel düzenden de çıkar. Başlıklar font boyutuyla, değerler üst/alt konumuyla belirlenebilir.

## Format bazlı konfigürasyon

Kariyer.net ve LinkedIn PDF’lerinin layout’ları farklı kabul edilmiş. Ortak parserı zorlamak yerine format bazlı kurallar hedeflenmiş.

LinkedIn konfigürasyonu şu anda pasiftir; gerçek destek olarak sunulmamalıdır.

## Rule DSL kullanımı

Kurallar imperatif `if/else` blokları yerine builder çağrılarıyla tanımlanıyor. Bunun getirileri:

- Okunabilirlik
- Kural tekrarının azaltılması
- Yeni alan ekleme kolaylığı
- Parsing motoruyla format bilgisinin ayrılması

## Expression tree kullanımı

`Expression<Func<T,string>>` ile hedef property seçiliyor:

```csharp
x => x.Email
```

String olarak `"Email"` vermek yerine compile-time refactoring desteği sağlar. Daha sonra property metadata reflection ile kullanılır.

Kural tarafındaki expression’ların ise her kontrolde `Compile()` edilmesi performans maliyeti yaratabilir.

## Reflection ile generic model doldurma

Parser, concrete tipler için büyük `switch` yazmak yerine:

- `ResumeInfo` alt tiplerini assembly’den buluyor
- `Activator.CreateInstance` ile nesne oluşturuyor
- `PropertyInfo.SetValue` ile değer yazıyor

Bu esneklik sağlar, fakat type safety, hata teşhisi ve performans maliyeti doğurur.

## Senkron işleme

Dosya kopyalama ve parsing request thread’i üzerinde senkron çalışıyor.

**Kesin:** `CopyTo` kullanılıyor; `CopyToAsync` yok.

**Muhtemel neden:** Prototip ve düşük trafik varsayımı.

Production için büyük dosya ve yüksek concurrency altında uygun değildir.

## Sabit layout eşikleri

Örneğin:

- `PAGE_HEIGHT = 792`
- `MAX_LINE_HEIGHT = 20`
- `MAX_WORD_SPACING = 10`
- Font boyutları

kullanılıyor.

Bu karar belirli PDF üreticilerinde hızlı ve deterministik sonuç sağlayabilir; farklı DPI, font, sayfa boyutu veya template sürümünde kırılgandır.

## Neden EF Core/Repository yok?

Persist edilen veri veya veritabanı yok. Dolayısıyla EF Core ve Repository kullanmamak doğru ve doğal bir karardır.

## Neden WebSocket/BackgroundService yok?

Akış request-response ve kısa süreli parse işlemi olarak tasarlanmış. Kodda bunların kullanımı yok.

Uzun süren veya yoğun parsing için gelecekte:

- Upload → job enqueue
- Background worker
- Job status endpoint
- SignalR/SSE ile ilerleme bildirimi

tasarımı düşünülebilir.

---

# 7. Performans

## Mevcut olumlu yaklaşımlar

- `PdfDocument` ve `FileStream` `using` ile kapatılıyor.
- PDF yalnızca bir defa açılıp sayfalar dolaşılıyor.
- Kelimeler sayfa bazında toplanıyor.
- Format kuralları merkezi olarak yeniden kullanılabiliyor.
- LINQ ile deterministik sıralama yapılıyor.

## Async

Kullanılmıyor.

- `IFormFile.CopyTo` senkron.
- Controller action senkron.
- PDF parsing senkron.

Bu, request thread’ini işlem boyunca meşgul eder. PDF parsing CPU ağırlıklıysa yalnızca `async` eklemek çözüm olmaz; background processing veya concurrency sınırı gerekir. Disk I/O için `CopyToAsync` faydalıdır.

## Caching

Yok.

Aynı PDF tekrar parse edilirse sonuç yeniden hesaplanır. İçerik hash’i üzerinden sonuç cache’i düşünülebilir; fakat kişisel veri içerdiği için TTL, encryption ve erişim politikası gerekir.

## Pagination

Yok; bu endpoint tek dosya işliyor. Bu kullanım için pagination doğrudan ilgili değil.

## Bulk işlem

Yok. Çoklu özgeçmiş import ihtiyacı repodan anlaşılamıyor.

## AsNoTracking / Eager Loading / Lazy Loading

İlgili değil; EF Core ve veritabanı yok.

## Potansiyel darboğazlar

1. Her request’te dosyanın diske yazılması.
2. Tüm PDF kelimelerinin bellekte tutulması.
3. Her rule kontrolünde expression’ın yeniden `Compile()` edilmesi.
4. Reflection metadata’sının tekrar tekrar aranması.
5. `lines.IndexOf(currentLine)` çağrılarının tekrarlanması.
6. Üst/alt satır bulmak için tüm line listesinin tekrar taranması.
7. Fazla `Console.WriteLine`.
8. Request thread üzerinde CPU-bound parsing.
9. Dosya boyutu ve sayfa sayısı limiti olmaması.
10. Aynı isimli dosyalarda overwrite/race riski.

## İyileştirme seçenekleri

- Expression’ları konfigürasyon kurulurken bir kere compile etmek
- `PropertyInfo` ve type metadata cache’i
- Satır index’ini nesne üzerinde veya dictionary’de tutmak
- Koordinat tabanlı spatial index
- Streaming upload ve kontrollü geçici storage
- Dosya boyutu/sayfa limiti
- Bounded background queue
- BenchmarkDotNet ile gerçek ölçüm
- Aynı içerik için hash bazlı cache
- `ILogger` ile seviyeli ve structured logging

---

# 8. Güvenlik

## Authentication

**Yok.**

`launchSettings.json` anonymous authentication’a izin veriyor. API seviyesinde authentication scheme kaydı yok.

## Authorization

Pipeline’da `UseAuthorization()` var fakat:

- `AddAuthentication` yok
- `[Authorize]` yok
- Policy/role yok

Dolayısıyla endpointler fiilen anonymous erişime açık.

## Validation

Yetersiz:

- `FileModel` üzerinde validation attribute yok.
- `FormFile == null` kontrolü yok.
- Dosya boyutu kontrolü yok.
- MIME type kontrolü yok.
- PDF signature/magic byte kontrolü yok.
- Bozuk/şifreli PDF politikası yok.
- Sayfa sayısı limiti yok.

## Path traversal

Önemli risk:

```csharp
Path.Combine(dir, "wwwroot", file.FileName)
```

Dosya adı kullanıcı modelinden geliyor. Güvenli filename üretimi ve canonical path doğrulaması yok. Kullanıcı kontrollü path segmentleri istenmeyen konuma yazmaya veya dosya ezmeye yol açabilir.

`IFormFile.FileName` yerine de ayrıca bağımsız bir `FileName` alanı kullanılıyor.

## Dosya overwrite ve yarış durumu

`FileMode.Create`, aynı isimli mevcut dosyayı ezer. Paralel yüklemelerde çakışma oluşabilir. Random server-side isim veya içerik hash’i tercih edilmelidir.

## Hassas veri saklama

özgeçmiş’ler kişisel veri içerir. Dosyalar `wwwroot` altına yazılıyor; static file middleware şu anda ekli görünmese de bu klasör kamuya açık statik içerik için tasarlanır. Production’da özgeçmiş’ler:

- Web root dışında
- Yetkilendirilmiş storage’da
- Şifreli
- Retention/delete politikasıyla

saklanmalıdır.

Repoda gerçek özgeçmiş/PDF örneklerinin commit edilmesi de kişisel veri ve repository hijyeni açısından risklidir.

## SQL Injection

SQL ve veritabanı yok; dolayısıyla bu projede uygulanabilir bir SQL injection yüzeyi yok.

## XSS

API doğrudan HTML üretmiyor. Bununla birlikte PDF’den çıkan metin escape edilmeden JSON’a konuyor. Frontend bu veriyi `innerHTML` benzeri bir yöntemle gösterirse stored/reflected XSS riski frontend tarafında oluşabilir.

## CSRF

Cookie tabanlı authentication görünmediği için mevcut API açısından temel risk değil. İleride cookie authentication eklenirse değerlendirilmelidir.

## CORS

Yalnızca `http://localhost:3000` origin’i hedefleyen policy var. Bu iyi niyetli bir sınırdır fakat production konfigürasyonu değildir.

CORS bir authentication veya authorization mekanizması değildir; browser dışı istemcileri engellemez.

## Rate Limiting

Yok. CPU ve bellek tüketen PDF parsing endpoint’i için önemlidir.

## Hata yönetimi

Controller tüm hataları boş bir `catch` ile 500’e çeviriyor ve loglamıyor. Base parser ise:

```csharp
throw new Exception(ex.Message);
```

kullanarak stack trace ve exception tipini kaybediyor.

Production için:

- Global exception middleware
- Problem Details
- Correlation ID
- Structured logging
- Kontrollü client/server hata ayrımı

gereklidir.

## Zararlı dosya ve denial of service

Dosya boyutu, decompression/parse maliyeti, sayfa sayısı ve eşzamanlı işlem sınırı yok. Crafted PDF ile kaynak tüketimi mümkündür.

## HTTPS

`UseHttpsRedirection()` yok. Deployment katmanında reverse proxy ile sağlanmış olabilir, fakat repodan doğrulanamıyor.

---
