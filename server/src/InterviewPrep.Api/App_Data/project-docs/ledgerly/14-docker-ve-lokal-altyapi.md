# Docker ve Lokal Altyapı

**Durum:** PostgreSQL için uygulandı
**Tarih:** 2026-09-14

## 1. Docker'ı bu projede neden kullanıyoruz?

Ledgerly API şu anda doğrudan Windows host üzerinde çalışır. PostgreSQL ise Docker container içinde çalışır.

```text
Windows host
├── dotnet / Ledgerly.Api
├── dotnet test
└── Docker Desktop
      └── PostgreSQL container
```

Amaç production ortamını eksiksiz taklit etmek değildir. İlk hedef, ekipteki herkesin aynı PostgreSQL sürümünü ve aynı başlangıç ayarlarını tek komutla çalıştırabilmesidir.

Docker kullanmasaydık her geliştiricinin şunları manuel yapması gerekirdi:

- PostgreSQL'i işletim sistemine kurmak
- Aynı major/minor sürümü seçmek
- Kullanıcı ve database oluşturmak
- Port ve servis ayarlarını yapmak
- Kaldırma ve yeniden kurma sürecini yönetmek

Compose dosyası bu lokal altyapıyı kod olarak version control altında tutar.

Mülakat cümlesi:

> Docker'ı mikroservis kullandığım için değil, lokal PostgreSQL ortamını tekrarlanabilir ve makineden bağımsız hale getirmek için kullandım.

## 2. Image, container ve volume farkı

Bu üç kavram aynı şey değildir.

### Image

Image, uygulamayı çalıştırmak için gereken dosyaların salt okunur şablonudur.

Ledgerly'nin kullandığı image:

```yaml
image: postgres:18.6-alpine
```

```text
postgres   -> image repository adı
18.6       -> sabitlenen PostgreSQL sürümü
alpine     -> daha küçük Alpine Linux tabanı
```

`latest` kullanmamak önemlidir. `latest` zamanla farklı bir sürüme işaret edebilir ve çalışan geliştirme ortamı beklenmedik şekilde değişebilir.

### Container

Container, image'ın çalışan instance'ıdır.

```text
Image:     postgres:18.6-alpine
Container: ledgerly-postgres-1
```

Aynı image'dan birden fazla container çalıştırılabilir. Container durdurulabilir, yeniden başlatılabilir veya silinebilir.

Compose dosyasında `container_name` belirlemedik. Docker Compose adı otomatik üretir:

```text
<compose-project>-<service>-<instance>
ledgerly-postgres-1
```

Kodun otomatik üretilen container adına bağımlı olması doğru değildir. Container'lar birbirine Compose service adıyla erişmelidir.

### Volume

Container'ın kendi writable layer'ı geçicidir. Container silindiğinde burada tutulan veriler kaybolabilir.

Named volume, database verisini container yaşam döngüsünden ayırır:

```yaml
volumes:
  - ledgerly_postgres_data:/var/lib/postgresql
```

```text
Container silinir
  -> volume kalır
  -> yeni container aynı volume'u bağlar
  -> PostgreSQL verisi korunur
```

PostgreSQL 18 image düzeninde volume üst dizin olan `/var/lib/postgresql` konumuna bağlanır. Bu, image'ın version-specific data directory yönetimiyle uyumludur.

## 3. compose.yml dosyasının tamamı

Ledgerly'nin başlangıç Compose tanımı:

```yaml
services:
  postgres:
    image: postgres:18.6-alpine
    environment:
      POSTGRES_DB: ${LEDGERLY_DB_NAME:-ledgerly}
      POSTGRES_USER: ${LEDGERLY_DB_USER:-ledgerly}
      POSTGRES_PASSWORD: ${LEDGERLY_DB_PASSWORD:-ledgerly_dev}
    ports:
      - "${LEDGERLY_DB_PORT:-5432}:5432"
    volumes:
      - ledgerly_postgres_data:/var/lib/postgresql
      - ./docker/postgres/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  ledgerly_postgres_data:
```

## 4. Service nedir?

Compose içindeki `postgres`, service adıdır:

```yaml
services:
  postgres:
```

Service, container'ın nasıl oluşturulacağını tarif eder:

- Hangi image kullanılacak?
- Hangi environment variable'lar verilecek?
- Hangi port yayınlanacak?
- Hangi volume bağlanacak?
- Sağlık nasıl kontrol edilecek?

Service adı aynı zamanda Compose network içindeki DNS adıdır:

```text
Host üzerinde çalışan API -> localhost
Container içinde çalışan API -> postgres
```

## 5. Environment variable ve default değerler

Örnek:

```yaml
POSTGRES_DB: ${LEDGERLY_DB_NAME:-ledgerly}
```

Anlamı:

```text
LEDGERLY_DB_NAME tanımlıysa -> onun değerini kullan
Tanımlı değilse            -> ledgerly kullan
```

Aynı kural kullanıcı, parola ve host portu için uygulanır:

```yaml
POSTGRES_USER: ${LEDGERLY_DB_USER:-ledgerly}
POSTGRES_PASSWORD: ${LEDGERLY_DB_PASSWORD:-ledgerly_dev}
```

PowerShell oturumunda override örneği:

```powershell
$env:LEDGERLY_DB_PORT = "55432"
$env:LEDGERLY_DB_NAME = "ledgerly_local"

docker compose up -d
```

Compose'un değişkenleri çözdükten sonra ürettiği konfigürasyonu görmek için:

```powershell
docker compose config
```

Önemli: `POSTGRES_DB`, `POSTGRES_USER` ve `POSTGRES_PASSWORD` initialization değişkenleridir. Named volume daha önce initialize edilmişse bu değerleri sonradan değiştirmek mevcut database'i veya kullanıcıyı otomatik yeniden oluşturmaz.

```text
İlk docker compose up
  -> volume boş
  -> PostgreSQL kullanıcı/database oluşturur

Sonraki docker compose up
  -> mevcut data volume bulunur
  -> initialization tekrar çalışmaz
```

## 6. Port mapping nasıl okunur?

Compose tanımı:

```yaml
ports:
  - "5432:5432"
```

Format:

```text
HOST_PORT:CONTAINER_PORT
```

Ledgerly için:

```text
localhost:5432
       │
       └── Docker port forwarding
                │
                └── postgres container:5432
```

Host portunu değiştirmek container içindeki PostgreSQL portunu değiştirmez:

```yaml
ports:
  - "55432:5432"
```

Bu durumda host üzerindeki API şuna bağlanır:

```text
Host=localhost;Port=55432
```

Başka bir Compose container'ı ise host portuna ihtiyaç duymaz:

```text
Host=postgres;Port=5432
```

## 7. localhost neden her yerde çalışmaz?

`localhost`, kodun çalıştığı makine veya container'ın kendisini ifade eder.

### API host üzerinde çalışıyorsa

```text
Ledgerly.Api -> Windows host
PostgreSQL   -> Docker container
```

Bağlantı:

```text
Host=localhost;Port=5432
```

Docker yayınlanan port üzerinden trafiği PostgreSQL container'ına iletir.

### API de container içinde çalışıyorsa

```text
API container içindeki localhost
  -> API container'ın kendisi
  -> PostgreSQL değildir
```

Doğru bağlantı:

```text
Host=postgres;Port=5432
```

Buradaki `postgres`, Compose service adıdır ve Docker'ın dahili DNS'i tarafından çözülür.

Mülakat cümlesi:

> Container içindeki localhost o container'ın kendisidir. Aynı Compose network'ündeki başka servise service adı ve container portuyla bağlanırım.

## 8. Compose network nasıl çalışır?

Compose açıkça network tanımlanmasa bile proje için varsayılan bridge network oluşturur.

Yaklaşık görünüm:

```text
ledgerly_default network
└── postgres service
      └── DNS adı: postgres
```

İleride API de Compose'a eklenirse:

```text
ledgerly_default network
├── api
│    └── Host=postgres ile bağlanır
└── postgres
```

Network'leri görmek için:

```powershell
docker network ls
docker compose images
```

Host'a açılması gerekmeyen servislerde `ports` tanımlamak zorunlu değildir. Örneğin production benzeri kapalı bir Compose ortamında yalnızca API dışarı açılır, database yalnızca internal network'ten erişilebilir.

## 9. Healthcheck neden var?

Container'ın `running` olması PostgreSQL'in sorgu kabul etmeye hazır olduğunu garanti etmez.

```text
Container process başladı
  -> PostgreSQL recovery/initialization yapıyor olabilir
  -> bağlantı henüz başarısız olabilir
```

Healthcheck:

```yaml
healthcheck:
  test:
    - CMD-SHELL
    - pg_isready -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"
  interval: 5s
  timeout: 5s
  retries: 10
```

Alanların anlamı:

| Alan | Anlamı |
|---|---|
| `test` | Sağlığın hangi komutla ölçüleceği |
| `interval` | Kontroller arasındaki süre |
| `timeout` | Bir kontrolün en fazla bekleme süresi |
| `retries` | Unhealthy olmadan önce izin verilen başarısızlık sayısı |

`$${POSTGRES_USER}` içindeki çift dolar önemlidir:

```text
${VAR}  -> Compose host ortamında çözmeye çalışır
$${VAR} -> Container'a $ karakteri olarak geçirilir
```

Böylece `POSTGRES_USER` ve `POSTGRES_DB` değerlerini container içindeki shell çözer.

Durumu görmek için:

```powershell
docker compose ps
```

Beklenen:

```text
postgres   running (healthy)
```

## 10. Volume ve veri yaşam döngüsü

Named volume tanımı:

```yaml
volumes:
  ledgerly_postgres_data:
```

Kullanılan volume'ları görmek için:

```powershell
docker volume ls
docker compose volumes
```

Komutların veri üzerindeki etkisi:

| Komut | Container | Network | Volume/veri |
|---|---|---|---|
| `docker compose stop` | Durdurur | Korur | Korur |
| `docker compose start` | Yeniden başlatır | Korur | Korur |
| `docker compose down` | Siler | Siler | Korur |
| `docker compose down -v` | Siler | Siler | **Siler** |

`docker compose down -v` destructive bir komuttur. Named volume silindiğinde lokal database verisi ve migration history de silinir.

Geliştirme database'ini gerçekten sıfırlamak istediğimizde:

```powershell
docker compose down -v
docker compose up -d
dotnet ef database update ...
```

Bu işlem yalnızca kaybı kabul edilen lokal ortamda yapılmalıdır.

## 11. Günlük Docker komutları

### Başlatmak

```powershell
docker compose up -d
```

`-d`, container'ı terminali meşgul etmeden arka planda çalıştırır.

### Durumu görmek

```powershell
docker compose ps
```

### PostgreSQL loglarını izlemek

```powershell
docker compose logs -f postgres
```

Son 100 satır:

```powershell
docker compose logs --tail 100 postgres
```

### Yalnızca PostgreSQL'i yeniden başlatmak

```powershell
docker compose restart postgres
```

### Container içinde psql çalıştırmak

```powershell
docker compose exec postgres psql -U ledgerly -d ledgerly
```

Non-interactive tablo listesi:

```powershell
docker compose exec -T postgres `
  psql -U ledgerly -d ledgerly -c '\dt'
```

### Durdurmak

```powershell
docker compose stop
```

### Container ve network'ü kaldırmak, veriyi korumak

```powershell
docker compose down
```

### Image güncellemesini kontrollü almak

```powershell
docker compose pull
docker compose up -d
```

Image tag sabit olduğu için `pull` aynı tag'in güncel image'ını kontrol eder. Major sürüm yükseltmesi yalnızca Compose tag'i bilinçli değiştirildiğinde yapılmalıdır.

## 12. Docker ile migration arasındaki fark

Docker PostgreSQL process'ini çalıştırır; uygulama tablosunu kendiliğinden oluşturmaz.

```text
docker compose up
  -> PostgreSQL server hazır
  -> ledgerly database var
  -> wallets tablosu henüz olmayabilir

dotnet ef database update
  -> EF migration'ları uygulanır
  -> wallets tablosu oluşur
```

Sorumluluk ayrımı:

```text
Docker Compose -> infrastructure process lifecycle
EF Migration   -> application database schema lifecycle
```

Container'ın healthy olması migration'ların güncel olduğu anlamına gelmez.

## 13. Integration testleri Docker'ı nasıl kullanıyor?

Test fixture container oluşturmaz. Çalışan PostgreSQL'e bağlanır:

```text
docker compose up -d
  -> postgres healthy
  -> dotnet test
  -> PostgresFixture bağlantı kurar
  -> Database.MigrateAsync()
  -> test transaction'ları
  -> rollback
```

Komut:

```powershell
docker compose up -d

dotnet test tests/Ledgerly.IntegrationTests/Ledgerly.IntegrationTests.csproj `
  --filter "Category=Integration"
```

Fixture varsayılan olarak development DB'den ayrı `ledgerly_tests` database'ini kullanır. Değer `tests/Ledgerly.IntegrationTests/appsettings.IntegrationTests.json` dosyasından okunur.

Bağlantı gerektiğinde environment variable ile override edilebilir:

```powershell
$env:LEDGERLY_TEST_DB_CONNECTION_STRING = "Host=localhost;Port=5432;Database=ledgerly_tests;Username=ledgerly;Password=ledgerly_dev"
```

Öncelik:

```text
LEDGERLY_TEST_DB_CONNECTION_STRING
  -> yoksa appsettings.IntegrationTests.json
```

Test transaction rollback yapsa da migration şemayı değiştirebilir. Bu nedenle development ve test database'leri ayrılmıştır:

```text
ledgerly       -> development
ledgerly_tests -> integration tests
```

## 14. Ayrı test database'i nasıl oluşturuluyor?

Yeni ve boş PostgreSQL volume'u ilk kez initialize edilirken Compose şu klasörü container'a bağlar:

```yaml
- ./docker/postgres/init:/docker-entrypoint-initdb.d:ro
```

Bu klasördeki `01-create-test-database.sql`, `ledgerly_tests` database'i yoksa oluşturur:

```sql
SELECT 'CREATE DATABASE ledgerly_tests'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'ledgerly_tests'
)\gexec
```

PostgreSQL entrypoint init script'lerini yalnızca data directory boşken çalıştırır. Named volume önceden initialize edilmişse yeni eklenen script otomatik tekrar çalışmaz.

Bu durumda mevcut lokal volume için bir kez:

```powershell
docker compose exec postgres `
  createdb -U ledgerly ledgerly_tests
```

çalıştırılır. Fixture'ın default connection string'i zaten test database'ini gösterdiği için normal test komutunda environment variable gerekmez:

```powershell
dotnet test tests/Ledgerly.IntegrationTests/Ledgerly.IntegrationTests.csproj `
  --filter "Category=Integration"
```

Farklı bir test instance'ı kullanmak gerekirse `LEDGERLY_TEST_DB_CONNECTION_STRING` ile override edilir.

## 15. Docker Compose ve Testcontainers trade-off'u

| Kriter | Docker Compose | Testcontainers |
|---|---|---|
| Başlangıç | Manuel `up -d` gerekir | Test kodu otomatik başlatır |
| İzolasyon | Ortam paylaşılabilir | Test run'a özel container kolaydır |
| Ek bağımlılık | Yok | Testcontainers paketi gerekir |
| Başlangıç süresi | Çalışan container tekrar kullanılır | Container lifecycle maliyeti vardır |
| Lokal debug | Kolay | Daha otomatik ama daha soyut |
| CI tekrarlanabilirliği | Pipeline ayrıca yönetir | Test fixture yönetebilir |

Ledgerly başlangıçta Compose kullanır. Flaky test, paralel pipeline veya environment drift problemi gözlemlendiğinde Testcontainers değerlendirilir.

## 16. Docker kullanmak mikroservis kullandığımız anlamına gelir mi?

Hayır.

```text
Containerization -> process'i paketleme ve çalıştırma yöntemi
Microservices    -> bounded context, bağımsız deploy ve veri sahipliği yaklaşımı
```

Ledgerly şu anda tek deployable modüler monolith'tir. Yalnızca PostgreSQL'in Docker'da çalışması sistemi mikroservis yapmaz.

Aynı şekilde her katmanı ayrı container yapmak da onları otomatik olarak doğru tasarlanmış mikroservis yapmaz.

## 17. Development ve production farkı

Lokal ortam:

- Kolaylık için PostgreSQL portu host'a açılır.
- Sabit ve yalnızca lokal olan credential kullanılabilir.
- Named volume ile veri korunur.
- Docker Compose tek geliştirici makinesini yönetir.

Production ortamında:

- Managed PostgreSQL tercih edilebilir.
- Database public internete açılmaz.
- Secret manager kullanılır.
- Backup, point-in-time recovery ve monitoring gerekir.
- Migration uygulama stratejisi deployment pipeline'ın parçasıdır.
- Resource limit, high availability ve failover ayrıca tasarlanır.

Compose dosyasının varlığı production deployment stratejisinin tamamlandığı anlamına gelmez.

## 18. Windows'ta Docker Desktop ön koşulları

Windows üzerinde Docker Desktop genellikle WSL 2 veya Hyper-V tabanlı sanallaştırma kullanır.

Kontrol listesi:

```text
BIOS/UEFI virtualization açık mı?
Windows Task Manager -> CPU -> Virtualization: Enabled mı?
WSL 2 kurulu ve çalışıyor mu?
Docker Desktop engine başlamış mı?
```

Komutlarla kontrol:

```powershell
wsl --status
docker version
docker compose version
```

BIOS'a klavyeyle girmek mümkün değilse Windows Advanced Startup kullanılabilir:

```text
Settings
  -> System
  -> Recovery
  -> Advanced startup
  -> Restart now
  -> Troubleshoot
  -> Advanced options
  -> UEFI Firmware Settings
```

`Hardware assisted virtualization ... must be enabled` hatası genellikle uygulama kodundan değil, host sanallaştırma ayarından kaynaklanır.

## 19. Sık karşılaşılan problemler

### Port zaten kullanımda

Belirti:

```text
bind: address already in use
```

Olası neden: Host üzerinde başka PostgreSQL veya container 5432 portunu kullanıyordur.

Çözüm seçenekleri:

```text
Mevcut process'i durdur
veya
LEDGERLY_DB_PORT ile farklı host portu seç
```

Örnek:

```powershell
$env:LEDGERLY_DB_PORT = "55432"
docker compose up -d
```

API connection string'i de `Port=55432` olarak güncellenmelidir.

### Container running ama bağlantı kurulamıyor

Kontroller:

```powershell
docker compose ps
docker compose logs postgres
```

`running` yerine `healthy` beklenmelidir. Connection string host ve portu kodun nerede çalıştığına göre kontrol edilmelidir.

### Environment değerini değiştirdim ama database değişmedi

Named volume önceden initialize edilmiş olabilir. PostgreSQL initialization environment variable'ları yalnızca boş data directory'de etkili olur.

Mevcut veriyi koruyarak SQL ile kullanıcı/database oluşturmak veya lokal veriyi silmek kabul edilebiliyorsa volume'u bilinçli sıfırlamak gerekir.

### Docker config access denied

Docker CLI kullanıcı profilindeki `.docker` ayarlarına erişemiyorsa terminal yetkileri, dosya izinleri ve Docker Desktop'ın çalışıp çalışmadığı kontrol edilir. Bu hata PostgreSQL mapping veya EF Core koduyla ilgili değildir.

### Testler connection refused ile düşüyor

Fixture Docker'ı otomatik başlatmadığı için önce:

```powershell
docker compose up -d
docker compose ps
```

çalıştırılmalı ve container'ın healthy olduğu görülmelidir.

## 20. Mülakatta gelebilecek sorular

### Image ile container farkı nedir?

Image immutable uygulama şablonudur; container bu image'ın çalışan ve izole edilmiş instance'ıdır.

### Volume neden kullanılır?

Database verisini container'ın geçici writable layer'ından ayırır. Container yeniden oluşturulduğunda veri korunabilir.

### `5432:5432` ne anlama gelir?

Soldaki host portu, sağdaki container portudur. Host üzerindeki `localhost:5432` trafiği container'ın 5432 portuna yönlendirilir.

### Container içindeki API neden localhost ile PostgreSQL'e bağlanamaz?

Container içindeki localhost API container'ının kendisidir. Aynı Compose network'ündeki PostgreSQL'e `postgres:5432` service adıyla bağlanmak gerekir.

### Healthcheck ile depends_on aynı şey mi?

Hayır. Healthcheck servisin sağlığını ölçer. `depends_on` başlangıç sırasını veya uygun koşulla readiness bağımlılığını ifade edebilir; uygulamanın transient bağlantı hatalarına karşı dayanıklılık ihtiyacını tamamen ortadan kaldırmaz.

### `docker compose down` veriyi siler mi?

Named volume varsayılan olarak korunur. `docker compose down -v` volume'u da siler ve lokal database verisini kaybettirir.

### Docker neden production parity garantilemez?

Image sürümünü eşitlese de network, secret, storage, backup, resource limit, orchestration ve managed service davranışları production'da farklı olabilir.

### Neden Docker Compose, neden Kubernetes değil?

Şu an ihtiyaç tek geliştirici makinesinde bir PostgreSQL bağımlılığını çalıştırmaktır. Kubernetes bu probleme gereksiz operasyonel karmaşıklık ekler. Dağıtık deployment ve orchestration ihtiyacı oluşursa ayrıca değerlendirilir.

## 21. Bu aşamada bilinçli olarak yapmadıklarımız

- Ledgerly API için Dockerfile
- API'yi Compose içine eklemek
- Testcontainers
- Redis, MongoDB veya broker container'ları
- Production Kubernetes manifestleri
- Otomatik backup ve restore
- Resource limit ve observability ayarları

Bu bileşenler yalnızca çözdükleri problem ortaya çıktığında eklenecektir.

## 22. Sonraki adım

Development ve integration test database'leri ayrıldı. Sıradaki adım Create Wallet use-case'ini HTTP üzerinden açmaktır:

```http
POST /api/wallets
```

HTTP aşamasında API host üzerinde çalışmaya devam edecek ve `localhost:5432` üzerinden PostgreSQL container'ına bağlanacaktır.
