# Solution Kurulumu

## Solution ve project nedir?

.NET'te project, birlikte derlenen kodların ve bağımlılıkların tanımıdır; ayarları .csproj dosyasında bulunur. Solution ise birlikte çalıştığımız projeleri gruplar. Ledgerly.slnx bütün çözümü tek komutla derleyip test edebilmemizi kolaylaştırır.

Birden fazla project olması birden fazla servis çalıştığı anlamına gelmez. Domain, Application ve Infrastructure kodu, API uygulamasının kullandığı kütüphanelerdir.

## Katman ne demek, ne için ayırıyoruz?

Katman, benzer sorumlulukları bir araya getirdiğimiz kod bölümüdür. Bir wallet isteği üzerinden düşünelim:

```text
API            → İsteği alır, HTTP cevabını hazırlar.
Application    → Wallet oluşturmak için gereken adımları yürütür.
Domain         → Geçerli bir wallet'ın kurallarını korur.
Infrastructure → Database'e erişim gibi teknik işleri yapar.
```

Böylece currency kuralını değiştirdiğimiz yer ile PostgreSQL sorgusunu değiştirdiğimiz yer ayrılır. Clean/Onion Architecture konuşurken temel amaçlardan biri, iş kurallarının HTTP veya database kütüphanesine bağımlı olmamasıdır. Aşağıdaki referans yönleri bu ayrımı kodda kurar.

## Bölümün uygulama bağlamı

**Tarihsel kayıt:** Aşağıdaki komutlar ilk solution kurulumu için hazırlanmış adımlardır. Mevcut solution artık oluşturuldu; dolu repository üzerinde yeniden kurulum komutları olarak çalıştırılmamalıdır.

İlk teknik milestone, Wallet Core için küçük ve derlenebilir bir solution oluşturmaktır. Henüz EF Core, PostgreSQL container veya başka altyapı bileşeni eklenmeyecek.

## Solution yapısı

```text
src/
  Ledgerly.Api/
  Ledgerly.Application/
  Ledgerly.Domain/
  Ledgerly.Infrastructure/
tests/
  Ledgerly.Domain.Tests/
  Ledgerly.IntegrationTests/
```

## Katmanların sorumluluğu

| Proje | Sorumluluk |
|---|---|
| Ledgerly.Domain | Entity, value object, domain rule ve invariant'lar |
| Ledgerly.Application | Use-case orchestration ve port/interface'ler |
| Ledgerly.Infrastructure | PostgreSQL, EF Core ve dış sistem adaptörleri |
| Ledgerly.Api | HTTP sınırı, DI ve composition root |
| Ledgerly.Domain.Tests | Saf domain davranış testleri |
| Ledgerly.IntegrationTests | Uygulamayı dış sınırdan doğrulayan testler |

## Bağımlılık yönü

```text
Api ----------> Application
 |                   |
 +--> Infrastructure v
                  Domain
```

- Domain başka projeye bağımlı değildir.
- Application yalnızca Domain'e bağımlıdır.
- Infrastructure, Application ve Domain contract'larını uygular.
- API bağımlılıkları bir araya getirir.

## Projeleri oluşturma

Ledgerly kök dizininde:

```powershell
dotnet new sln --name Ledgerly

dotnet new webapi --name Ledgerly.Api --output src/Ledgerly.Api --use-controllers
dotnet new classlib --name Ledgerly.Domain --output src/Ledgerly.Domain
dotnet new classlib --name Ledgerly.Application --output src/Ledgerly.Application
dotnet new classlib --name Ledgerly.Infrastructure --output src/Ledgerly.Infrastructure

dotnet new xunit --name Ledgerly.Domain.Tests --output tests/Ledgerly.Domain.Tests
dotnet new xunit --name Ledgerly.IntegrationTests --output tests/Ledgerly.IntegrationTests
```

## Solution'a ekleme

```powershell
dotnet sln Ledgerly.slnx add src/Ledgerly.Api/Ledgerly.Api.csproj
dotnet sln Ledgerly.slnx add src/Ledgerly.Domain/Ledgerly.Domain.csproj
dotnet sln Ledgerly.slnx add src/Ledgerly.Application/Ledgerly.Application.csproj
dotnet sln Ledgerly.slnx add src/Ledgerly.Infrastructure/Ledgerly.Infrastructure.csproj
dotnet sln Ledgerly.slnx add tests/Ledgerly.Domain.Tests/Ledgerly.Domain.Tests.csproj
dotnet sln Ledgerly.slnx add tests/Ledgerly.IntegrationTests/Ledgerly.IntegrationTests.csproj
```

`Ledgerly.slnx` komutlarda açıkça belirtilir; CLI'ın solution dosyasını otomatik seçtiği varsayılmaz.

## Referansları oluşturma

```powershell
dotnet add src/Ledgerly.Application/Ledgerly.Application.csproj reference src/Ledgerly.Domain/Ledgerly.Domain.csproj

dotnet add src/Ledgerly.Infrastructure/Ledgerly.Infrastructure.csproj reference src/Ledgerly.Domain/Ledgerly.Domain.csproj
dotnet add src/Ledgerly.Infrastructure/Ledgerly.Infrastructure.csproj reference src/Ledgerly.Application/Ledgerly.Application.csproj

dotnet add src/Ledgerly.Api/Ledgerly.Api.csproj reference src/Ledgerly.Application/Ledgerly.Application.csproj
dotnet add src/Ledgerly.Api/Ledgerly.Api.csproj reference src/Ledgerly.Infrastructure/Ledgerly.Infrastructure.csproj

dotnet add tests/Ledgerly.Domain.Tests/Ledgerly.Domain.Tests.csproj reference src/Ledgerly.Domain/Ledgerly.Domain.csproj
dotnet add tests/Ledgerly.IntegrationTests/Ledgerly.IntegrationTests.csproj reference src/Ledgerly.Api/Ledgerly.Api.csproj
```

## İlk doğrulama

```powershell
dotnet sln Ledgerly.slnx list
dotnet build Ledgerly.slnx
dotnet test Ledgerly.slnx
```

Önce listede altı projenin tamamı görülmelidir. Boş bir solution hiçbir proje derlemeden `Build succeeded` döndürebileceği için yalnızca başarılı build çıktısı yeterli kanıt değildir.

Beklenen sonuç sıfır warning zorunluluğu değil, öncelikle **sıfır build error**, iki test projesinin çalışması ve doğru dependency yönüdür.

## Bilinçli olarak eklenmeyenler

- EF Core ve Npgsql paketleri
- Docker Compose
- MediatR veya başka CQRS kütüphanesi
- Kafka/Redpanda
- MongoDB ve Redis
- Authentication
- Ayrı mikroservis projeleri

## Git repository oluşturma

Solution build ve test ile doğrulandıktan sonra karşılaştırılabilir bir baseline commit oluşturulur.

Önce .NET'e uygun ignore kuralları üretilir:

```powershell
dotnet new gitignore
```

Repository başlatılır ve branch adı `main` yapılır:

```powershell
git init
git branch -M main
```

Stage öncesi kontrol:

```powershell
git status --short
```

Listede `bin/`, `obj/`, `.vs/`, IDE kullanıcı dosyaları veya secret bulunmamalıdır. Ardından dosyalar stage edilir ve eklenecek içerik özetlenir:

```powershell
git add .
git status --short
git diff --cached --stat
```

Liste doğruysa baseline commit oluşturulur:

```powershell
git commit -m "chore: bootstrap Ledgerly solution"
git log --oneline -1
git status --short
```

Son `git status --short` çıktısı boş olmalıdır. Bu commit, ilerideki her problem senaryosu için geri dönülebilir başlangıç noktasıdır.

> Connection string parolası, API key ve diğer secret'lar Git'e eklenmez. Lokal değerler ileride uygun secret yönetimiyle tutulacaktır.

## Tamamlanma kontrolü

- [ ] `global.json` .NET 10 SDK sürümünü sabitliyor.
- [ ] `dotnet sln Ledgerly.slnx list` çıktısında altı proje görünüyor.
- [ ] Referanslar belirlenen dependency yönünü izliyor.
- [ ] `dotnet build Ledgerly.slnx` başarılı.
- [ ] `dotnet test Ledgerly.slnx` iki test projesini çalıştırıyor.
- [ ] `.gitignore` build ve IDE çıktılarını dışarıda bırakıyor.
- [ ] Bootstrap ayrı bir commit olarak kaydedildi.
- [ ] Baseline commit sonrasında working tree temiz.

Bu kontroller tamamlandıktan sonra ilk vertical slice olan **Create Wallet** tasarımına geçilecek.
