# PostgreSQL Persistence Baseline

## Persistence nedir?

Persistence, veriyi uygulama kapandıktan sonra da kalacak şekilde saklamaktır. Bellekte Wallet.Create ile bir nesne oluşturmak, onu database'e yazmak değildir. Uygulama yeniden başladığında aynı wallet'ı bulabilmek için kalıcı kayıt gerekir.

PostgreSQL bu projede veriyi tablolarda saklayan database'dir. EF Core, C# nesnelerini sorgulama ve kaydetme işlemlerinde kullandığımız kütüphane; Npgsql ise PostgreSQL bağlantısını sağlayan taraftır.

## DbContext, mapping ve migration nedir?

DbContext, EF Core ile database işlemlerini yürüttüğümüz çalışma nesnesidir. Kaydedilecek değişiklikleri takip edebilir ve SaveChangesAsync çağrısında database'e gönderir.

Mapping, C# alanının hangi tablo/sütunda ve hangi türle saklanacağını tarif etmektir. Örneğin Wallet.Balance alanı database'de numeric(19,4) sütununa eşlenir. Migration ise database şemasında yapılacak değişikliklerin sürümlenmiş tarifidir; yeni tablo oluşturmak gibi.

## Constraint ve transaction nedir?

Constraint, database'in kayıt üzerinde uyguladığı kuraldır. Unique aynı değerin veya değer birleşiminin tekrarlanmasını, foreign key olmayan bir kayda referans verilmesini, check ise tanımlı koşula aykırı değer yazılmasını engellemek için kullanılır.

Transaction bir grup database işlemini bütün olarak ele alır. Atomiklik, grubun yarısının kalmamasıdır: işlem ya tamamlanır ya geri alınır. Aşağıdaki bölüm bu kavramları önce tek wallet kaydı üzerinde uygular.

## Bölümün uygulama bağlamı

**Durum:** Uygulandı ve gerçek PostgreSQL ile doğrulandı
**Tarih:** 2026-09-14

## 1. Bu aşamada neyi tamamladık?

Create Wallet use-case'ini yalnızca domain ve application katmanlarında çalışan bir model olmaktan çıkarıp PostgreSQL'e kadar bağladık.

Tamamlanan sıra:

```text
1. compose.yml ile PostgreSQL başlatmak
2. EF Core ve Npgsql paketlerini eklemek
3. LedgerlyDbContext oluşturmak
4. Wallet entity mapping'ini yazmak
5. WalletRepository ve Unit of Work implementasyonu
6. InitialCreate migration'ını üretmek ve uygulamak
7. Gerçek PostgreSQL ile integration testi yazmak
```

Bu çalışma sonunda çalışan akış:

```text
CreateWalletHandler
  -> IWalletRepository
  -> WalletRepository
  -> LedgerlyDbContext
  -> PostgreSQL
```

Henüz HTTP endpoint eklenmedi. Bu nedenle bu bölüm bir persistence milestone'udur; tamamlanmış API ürünü değildir.

## 2. Neden PostgreSQL seçtik?

Wallet ve transfer işlemlerinin ilk veri modeli güçlü tutarlılık ve transaction gerektirir.

PostgreSQL şu ihtiyaçlara doğal karşılık verir:

- ACID transaction
- Primary key, unique constraint ve check constraint
- Eşzamanlı güncellemeler için row-level locking
- Optimistic concurrency uygulama imkânı
- Finansal kayıtları ilişkisel ve sorgulanabilir tutma
- EF Core ile olgun provider desteği

NoSQL öğrenme hedefinden vazgeçilmedi. Ancak bütün veriyi sırf NoSQL kullanmış olmak için tek veritabanına koymak yerine veri ihtiyacına göre seçim yapılacak.

Planlanan polyglot persistence yaklaşımı:

```text
Wallet ve ledger doğruluğu       -> PostgreSQL
Idempotency kayıtları            -> Redis veya DynamoDB benzeri key-value store
Read projection / aktivite akışı -> MongoDB adayı
Cache                            -> Redis
Event taşıma                     -> Kafka veya Redpanda
```

Mülakat cümlesi:

> Finansal source of truth için transaction ve constraint kabiliyeti nedeniyle PostgreSQL seçtim. NoSQL'i ise erişim paterni ve ölçek ihtiyacı oluşan ayrı read/idempotency problemlerinde değerlendirdim.

## 3. PostgreSQL'i nasıl çalıştırdık?

Repository kökündeki `compose.yml` tek bir PostgreSQL container'ı tanımlar.

Image, container, volume, port mapping, network, healthcheck ve günlük Docker komutları sol menüdeki **Docker ve Lokal Altyapı** bölümünde ayrıntılı olarak açıklanır.

```powershell
docker compose up -d
docker compose ps
```

Mevcut lokal bağlantı:

```text
Host      : localhost
Port      : 5432
Database  : ledgerly
Username  : ledgerly
Container : ledgerly-postgres-1
```

Healthcheck için `pg_isready` kullanılır. Container'ın process olarak çalışması database'in hazır olduğu anlamına gelmediği için test ve uygulama başlamadan önce `healthy` durumu kontrol edilir.

Lokal `ledgerly_dev` credential'ı yalnızca geliştirme içindir. Production secret'ı repository'ye yazılmaz; environment variable veya secret manager üzerinden verilir.

## 4. Hangi paketleri ekledik?

Infrastructure tarafında:

```text
Npgsql.EntityFrameworkCore.PostgreSQL
Microsoft.EntityFrameworkCore.Relational
Microsoft.Extensions.Configuration.Abstractions
Microsoft.Extensions.DependencyInjection.Abstractions
```

EF CLI'ın startup project'i API olduğu için design-time paket API projesinde tutulur:

```text
Microsoft.EntityFrameworkCore.Design
```

Araç sürümünün makineden makineye değişmemesi için `dotnet-ef`, repository-local tool manifestinde sabitlendi:

```powershell
dotnet tool restore
dotnet ef --version
```

## 5. LedgerlyDbContext ne yapıyor?

`LedgerlyDbContext`, EF Core ile database arasındaki ana çalışma oturumudur:

```csharp
public sealed class LedgerlyDbContext : DbContext, IUnitOfWork
{
    public DbSet<Wallet> Wallets => Set<Wallet>();
}
```

Başlıca sorumlulukları:

- Entity'leri ve mapping'leri EF modeline dahil etmek
- Query üretmek
- Change tracking yapmak
- Değişiklikleri transaction kapsamında database'e yazmak
- Migration modeline kaynak olmak

`DbContext`, doğal olarak Unit of Work davranışı taşıdığı için `IUnitOfWork` portunu da uygular.

Application sözleşmesi:

```csharp
public interface IUnitOfWork
{
    Task SaveChangesAsync(
        CancellationToken cancellationToken = default);
}
```

EF Core'un `SaveChangesAsync` metodu `Task<int>` döndürürken Application portu yalnızca işlemin tamamlanmasını önemser ve `Task` döndürür. Bu nedenle interface explicit implementation ile bağlanır.

## 6. Neden IEntityTypeConfiguration kullandık?

EF Core mapping'i üç temel yöntemle yapılabilir:

```text
Convention
Data Annotation
Fluent API
```

Ledgerly, Fluent API kodunu ayrı `IEntityTypeConfiguration<T>` sınıflarında tutar:

```csharp
internal sealed class WalletConfiguration
    : IEntityTypeConfiguration<Wallet>
{
    public void Configure(EntityTypeBuilder<Wallet> builder)
    {
        builder.ToTable("wallets");
    }
}
```

DbContext aynı assembly'deki configuration sınıflarını otomatik bulur:

```csharp
modelBuilder.ApplyConfigurationsFromAssembly(
    typeof(LedgerlyDbContext).Assembly
);
```

Bu tercih zorunlu değildir ve performansı değiştirmez. Sağladığı mimari faydalar:

- Domain sınıflarında `[Table]`, `[Column]`, `[MaxLength]` gibi EF detayları bulunmaz.
- Domain katmanı EF Core'a bağımlı olmaz.
- Her aggregate'in mapping'i ayrı dosyada okunabilir.
- `OnModelCreating` yüzlerce satırlık tek bir metoda dönüşmez.

Mülakat cümlesi:

> IEntityTypeConfiguration bir DDD işareti değil, EF mapping organizasyon yöntemidir. Ledgerly'de domain modelini persistence attribute'larından temiz tutmak ve mapping'leri aggregate bazında ayırmak için kullandım.

## 7. Wallet nasıl map edildi?

```text
Wallet.Id            -> uuid, primary key
Wallet.OwnerId       -> uuid, not null
Wallet.Currency      -> varchar(3), not null
Wallet.Status        -> integer, not null
Wallet.Balance       -> numeric(19,4), not null
Wallet.CreatedAtUtc  -> timestamp with time zone, not null
```

### ID neden database tarafından üretilmiyor?

Wallet ID'si domain factory içinde oluşturulur:

```csharp
id: Guid.NewGuid()
```

Mapping bu nedenle şunu belirtir:

```csharp
.ValueGeneratedNever();
```

Bu sayede kimlik aggregate oluşturulduğu anda hazırdır ve database round-trip'i beklenmez.

### Balance neden numeric(19,4)?

Finansal değerlerde floating-point tipleri kullanılmaz. `decimal` ile PostgreSQL `numeric(19,4)` eşlemesi kesin ondalık hesap sağlar.

Bu precision bütün finans sistemleri için evrensel karar değildir. Desteklenecek varlıkların scale ihtiyacına göre ileride değişebilir.

### Zaman neden timestamp with time zone?

Sistem içinde zaman UTC normalize edilir. PostgreSQL tarafında `timestamp with time zone` kullanılarak mutlak zaman saklanır; kullanıcıya gösterirken istenen saat dilimine çevrilir.

## 8. Currency value object database'e nasıl yazılıyor?

Domain'de `Currency` bir string değil, davranış ve doğrulama taşıyan value object'tir:

```csharp
public sealed record Currency
{
    public string Code { get; }

    public static Currency FromCode(string code);
}
```

Database'de ise tek kolon yeterlidir. EF value converter iki yönlü dönüşüm yapar:

```csharp
.HasConversion(
    currency => currency.Code,
    code => Currency.FromCode(code)
)
```

Akış:

```text
Yazma: Currency("TRY") -> "TRY"
Okuma: "TRY" -> Currency.FromCode("TRY")
```

Value object'i ayrı tablo yapmak gereksiz join ve lifecycle karmaşıklığı oluştururdu. Tek kolon ihtiyacı olduğu için converter seçildi.

## 9. Duplicate wallet nasıl engelleniyor?

İş kuralı:

> Bir owner aynı currency için yalnızca bir wallet sahibi olabilir.

Application handler önce kontrol yapar:

```text
ExistsAsync(ownerId, currency)
  -> true  : WalletAlreadyExistsException
  -> false : Wallet oluştur ve kaydet
```

Database tarafında ayrıca composite unique index bulunur:

```text
ux_wallets_owner_id_currency
  (owner_id, currency)
```

İki korumanın amacı farklıdır:

| Koruma | Amaç | Tek başına yeterli mi? |
|---|---|---|
| Application pre-check | Erken ve anlaşılır hata üretmek | Hayır; race condition olabilir |
| Database unique index | Eşzamanlı isteklerde son doğruluk garantisi | Evet; ancak exception çevrilmelidir |

Olası yarış:

```text
Request A: Exists -> false
Request B: Exists -> false
Request A: INSERT -> başarılı
Request B: INSERT -> unique violation
```

Bu yarış ileride ayrı bir concurrency lab'ında reproduce edilecek. Npgsql unique violation hatası `WalletAlreadyExistsException` benzeri uygulama hatasına çevrilecek.

## 10. WalletRepository ne yapıyor?

Application portu:

```csharp
public interface IWalletRepository
{
    Task<bool> ExistsAsync(...);
    void Add(Wallet wallet);
}
```

Infrastructure adapter'ı:

```csharp
internal sealed class WalletRepository : IWalletRepository
{
    private readonly LedgerlyDbContext _dbContext;
}
```

Repository'nin görevi Application'ın domain odaklı ihtiyacını EF Core sorgusuna çevirmektir.

`Add` neden hemen `SaveChangesAsync` çağırmıyor?

```text
Repository    -> hangi aggregate değişti?
Unit of Work  -> değişiklikler ne zaman atomik kaydedilecek?
```

Commit repository içine gizlenseydi ileride transfer sırasında birden fazla aggregate değişikliğini aynı transaction sınırında toplamak zorlaşırdı.

## 11. Dependency Injection nerede bağlanıyor?

API'nin `Program.cs` dosyası composition root'tur:

```csharp
builder.Services.AddInfrastructure(builder.Configuration);
```

Infrastructure registration:

```text
IWalletRepository -> WalletRepository
IUnitOfWork        -> LedgerlyDbContext
```

Her ikisi de scoped yaşam süresindedir. Aynı HTTP request veya test scope'u içinde aynı `LedgerlyDbContext` instance'ını kullanırlar.

```text
Request scope
  ├── CreateWalletHandler
  ├── WalletRepository ─┐
  └── IUnitOfWork ──────┴── aynı LedgerlyDbContext
```

DbContext singleton olsaydı farklı request'lerin state'i karışabilir ve thread-safety problemi oluşurdu. Transient kullanılsaydı repository ile Unit of Work farklı context instance'ları alabilirdi.

## 12. Migration nedir ve neden kullandık?

Migration, EF modelindeki değişikliklerin version control altında database şema değişikliğine dönüştürülmesidir.

Migration üretme:

```powershell
dotnet ef migrations add InitialCreate `
  --project src/Ledgerly.Infrastructure/Ledgerly.Infrastructure.csproj `
  --startup-project src/Ledgerly.Api/Ledgerly.Api.csproj `
  --output-dir Persistence/Migrations `
  -- --environment Development
```

Database'e uygulama:

```powershell
dotnet ef database update `
  --project src/Ledgerly.Infrastructure/Ledgerly.Infrastructure.csproj `
  --startup-project src/Ledgerly.Api/Ledgerly.Api.csproj `
  -- --environment Development
```

Oluşan tablolar:

```text
wallets
__EFMigrationsHistory
```

`__EFMigrationsHistory`, hangi migration'ların ilgili database'e uygulandığını takip eder.

Model-snapshot uyumu:

```powershell
dotnet ef migrations has-pending-model-changes `
  --project src/Ledgerly.Infrastructure/Ledgerly.Infrastructure.csproj `
  --startup-project src/Ledgerly.Api/Ledgerly.Api.csproj `
  -- --environment Development
```

## 13. Neden gerçek PostgreSQL integration testi yazdık?

EF Core mapping'i fake veya mock ile güvenilir biçimde doğrulanamaz. InMemory provider da PostgreSQL'in gerçek davranışlarını eksiksiz taklit etmez.

Gerçek PostgreSQL testi şu zinciri çalıştırır:

```text
Handler
  -> gerçek DI registration
  -> gerçek WalletRepository
  -> gerçek LedgerlyDbContext
  -> Npgsql provider
  -> gerçek PostgreSQL
```

Doğrulanan davranışlar:

1. Wallet gerçek database'e yazılıyor.
2. ID ve owner doğru okunuyor.
3. Currency converter iki yönde çalışıyor.
4. Status, balance ve UTC zamanı doğru saklanıyor.
5. Repository'nin duplicate sorgusu SQL'e çevriliyor.
6. İkinci create denemesi reddediliyor.

Mevcut sonuç:

```text
Domain tests       : 12 başarılı
Application tests  : 2 başarılı
Integration tests  : 2 başarılı
Toplam             : 16 başarılı
```

## 14. PostgresFixture neden var?

Fixture integration testlerinin ortak ortamını bir kez hazırlar:

```text
appsettings.IntegrationTests.json dosyasını yükle
  -> varsa environment override'ını uygula
  -> ServiceCollection oluştur
  -> gerçek Infrastructure DI kayıtlarını ekle
  -> deterministik TimeProvider ekle
  -> ServiceProvider oluştur
  -> migration uygula
  -> testler bitince kaynakları dispose et
```

Fixture Docker container'ını başlatmaz. Testten önce şu komut gerekir:

```powershell
docker compose up -d
```

Test bağlantısı environment variable ile değiştirilebilir:

```powershell
$env:LEDGERLY_TEST_DB_CONNECTION_STRING = "Host=localhost;Port=5432;Database=ledgerly_tests;Username=ledgerly;Password=ledgerly_dev"
```

Fixture'ın varsayılan bağlantısı `ledgerly_tests` database'idir. Testler transaction rollback yaptığı için wallet verisi bırakmaz; test migration'ları da development için kullanılan `ledgerly` database'inden ayrılmıştır.

Bağlantı C# koduna sabitlenmez. `appsettings.IntegrationTests.json` build sırasında test output dizinine kopyalanır. `LEDGERLY_TEST_DB_CONNECTION_STRING` tanımlıysa JSON değerini ezer.

## 15. Fixture constructor'a nereden geliyor?

Test constructor'ındaki `PostgresFixture`, uygulamanın DI container'ından değil xUnit tarafından sağlanır.

Fixture ile collection bağlantısı:

```csharp
public sealed class PostgresCollection
    : ICollectionFixture<PostgresFixture>
{
    public const string Name = "PostgreSQL";
}
```

Test sınıfının collection'a bağlanması:

```csharp
[Collection(PostgresCollection.Name)]
public sealed class CreateWalletPersistenceTests
```

xUnit daha sonra fixture'ı constructor'a geçirir:

```csharp
public CreateWalletPersistenceTests(PostgresFixture fixture)
{
    _fixture = fixture;
}
```

İki ayrı injection mekanizması vardır:

```text
xUnit fixture injection
  -> PostgresFixture'ı test sınıfına verir

Microsoft DI
  -> Handler, repository ve DbContext'i test scope'una verir
```

Collection fixture seçilmesinin nedeni ileride farklı persistence test sınıflarının aynı PostgreSQL hazırlığını paylaşabilmesidir.

## 16. Test verisi nasıl temizleniyor?

Her integration testi ayrı database transaction'ı içinde çalışır:

```csharp
await using var transaction =
    await dbContext.Database.BeginTransactionAsync();

try
{
    await test(scope.ServiceProvider);
}
finally
{
    await transaction.RollbackAsync();
}
```

Test gerçek insert ve select işlemi yapar. Test sonunda rollback edildiği için oluşturulan wallet kalıcı olmaz.

Bu yöntem hızlı ve basittir; ancak background process veya transaction dışındaki bağlantılarla yapılan işlemleri temizleyemez. Böyle ihtiyaçlar oluştuğunda database reset araçları veya test başına izole container değerlendirilebilir.

## 17. Neden henüz Testcontainers kullanmadık?

| Seçenek | Avantaj | Trade-off |
|---|---|---|
| Docker Compose database | Az bağımlılık ve kolay başlangıç | Container önceden çalıştırılmalı, ortam paylaşılır |
| Testcontainers | Otomatik ve izole lifecycle, CI için güçlü | Yeni paket, başlangıç süresi ve ek karmaşıklık |

Projenin ilkesi gereği başlangıçta en basit çalışan yöntem seçildi. Paylaşılan database gerçekten flaky test veya CI problemi oluşturursa Testcontainers eklenecek.

## 18. Karşılaşılan problemler

### Problem 1 — dotnet-ef bulunamadı

Belirti:

```text
Run "dotnet tool restore" to make the "dotnet-ef" command available.
```

Root cause: `dotnet-tools.json` araç sürümünü tanımlar; yeni makinede aracı otomatik kurmaz.

Çözüm:

```powershell
dotnet tool restore
```

### Problem 2 — Design paketi yanlış projedeydi

Belirti:

```text
Your startup project 'Ledgerly.Api' doesn't reference
Microsoft.EntityFrameworkCore.Design.
```

Root cause: Migration Infrastructure'da tutulsa da EF CLI uygulama host'unu startup project olan API üzerinden oluşturur.

Karar: `Microsoft.EntityFrameworkCore.Design` API projesine taşındı ve `PrivateAssets=all` olarak işaretlendi.

### Problem 3 — Migration bulunduğu hâlde update görmedi

Belirti:

```text
No migrations were found in assembly 'Ledgerly.Infrastructure'.
```

Root cause: Migration kaynak dosyası üretildikten sonra assembly yeniden build edilmeden `database update --no-build` çalıştırıldı.

Çözüm:

```text
Migration oluştur
  -> build et
  -> database update çalıştır
```

Alternatif olarak update komutundan `--no-build` kaldırılabilir.

## 19. Mülakatta gelebilecek sorular

### Repository ve Unit of Work neden ayrı?

Repository aggregate'e yönelik veri erişimini, Unit of Work ise bir use-case'teki değişikliklerin commit sınırını temsil eder. Transfer gibi birden fazla değişikliğin atomik kaydedilmesi gerektiğinde commit'i repository metoduna gizlememek önemlidir.

### DbContext zaten Unit of Work değil mi?

Evet. EF Core `DbContext` change tracking ve `SaveChanges` ile doğal Unit of Work davranışı sağlar. Ayrı interface, Application katmanının EF Core'a bağımlı olmadan yalnızca ihtiyaç duyduğu commit sözleşmesini görmesini sağlar.

### Neden repository interface'i Application'da?

Repository'ye ihtiyaç duyan use-case Application katmanındadır. Dependency Inversion gereği Application ihtiyacını port olarak tanımlar; Infrastructure bu portu EF Core ile uygular.

### Pre-check varken unique index neden gerekli?

Pre-check iki eşzamanlı isteğin ikisinin de “kayıt yok” sonucunu almasını engelleyemez. Unique index database seviyesinde son doğruluk garantisidir.

### Integration testte neden EF InMemory kullanmadın?

InMemory provider PostgreSQL type mapping, SQL translation, constraint ve transaction davranışını güvenilir şekilde temsil etmez. Persistence risklerini gerçek provider ve gerçek PostgreSQL ile doğrulamak gerekir.

### Scoped DbContext neden önemli?

DbContext thread-safe değildir. Scoped yaşam süresi bir request içindeki repository ve Unit of Work'ün aynı change tracker ve transaction sınırını paylaşmasını sağlar; farklı request'lerin state'ini birbirinden ayırır.

## 20. Mevcut sınırlar ve sonraki adım

Bu aşamada tamamlanan:

- PostgreSQL container
- EF Core/Npgsql kurulumu
- DbContext ve mapping
- Repository ve Unit of Work adapter'ları
- DI registration
- Initial migration
- Gerçek PostgreSQL integration testleri

HTTP endpoint, request validation, `ProblemDetails` hata sözleşmesi ve HTTP functional testleri bir sonraki milestone'da tamamlandı.

Henüz bulunmayan:

- Unique violation exception mapping
- Concurrency ve idempotency lab'ları

Bir sonraki vertical slice sonucu:

```http
POST /api/wallets
```

Endpoint için `201 Created`, `400 Bad Request` ve `409 Conflict` sözleşmeleri oluşturuldu ve gerçek HTTP functional testleri yazıldı. Detaylar bir sonraki bölümde yer alır.
