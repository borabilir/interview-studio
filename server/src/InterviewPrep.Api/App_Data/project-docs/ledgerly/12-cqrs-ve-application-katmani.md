# CQRS ve Create Wallet Application Akışı

## CQRS nedir?

CQRS, bir şeyi değiştiren isteklerle bilgi okuyan istekleri ayrı modeller ve işlem yollarıyla ele alma yaklaşımıdır. Açılımı Command Query Responsibility Segregation'dır.

```text
“Yeni wallet oluştur.” → Command: değişiklik ister.
“Bu wallet'ı göster.”  → Query: bilgi ister.
```

Ne için kullanılır? Okuma ve değiştirme işlemlerinin ihtiyaçları farklı olabilir. Yeni wallet oluştururken kural kontrolü ve kayıt gerekir; wallet gösterirken mevcut bilgiyi okumak yeterlidir. Bunları ayırmak kodun amacını görünür yapar. Ayrı database kullanmak zorunlu değildir.

## Command, query ve handler nedir?

Command yapılması istenen işin bilgisidir; kendi başına işi yapmaz. Query öğrenmek istediğimiz şeyin bilgisidir. Handler ise o isteği alıp gereken adımları çalıştıran kod parçasıdır.

CreateWalletCommand owner ve currency bilgisini taşır. CreateWalletHandler bu bilgilerle wallet oluşturma akışını yürütür. GetWalletQuery bir wallet kimliği taşır; GetWalletHandler o kaydı arar. Result, handler'ın döndürdüğü sonuç modelidir.

## Repository ve Unit of Work nedir?

Repository, uygulamanın kayıtları bulmak veya eklemek için kullandığı arayüzdür. “Bu wallet var mı?” diye sorabiliriz; çağıran kod SQL'in ayrıntısını bilmek zorunda kalmaz.

Unit of Work, bir işlem sırasında biriken değişikliklerin kaydedilmesini birlikte yöneten yapıdır. Bizde Add, wallet'ı kaydedilmek üzere hazırlar; SaveChangesAsync kaydetme adımıdır. Böylece her ekleme metodunun içinde ayrı kayıt başlatmak zorunda kalmayız.

Interface bir sözleşmedir: hangi metotların sunulacağını söyler. Application bu sözleşmeye dayanır; Infrastructure onu EF Core/PostgreSQL ile gerçekleştirir. “Port” bu sınırdaki sözleşmeye, “adapter” onu belirli teknolojiyle gerçekleştiren parçaya verilen isimdir.

## Bölümün uygulama bağlamı

**Durum:** Create Wallet command ve Get Wallet query aynı PostgreSQL üzerinde uygulandı
**Tarih:** 2026-09-13

## Amaç

Bu belge Create Wallet use-case'inin Application katmanında nasıl orkestre edildiğini ve kullanılan mimari kararları açıklar.

## Mimari bağlam

Ledgerly şu anda tek deployable ile başlayan modüler bir monolith'tir. Kod bağımlılıkları Clean Architecture / Onion Architecture ilkelerine göre içeri doğru yönlendirilir:

```text
API ────────────────> Application ─────> Domain
 │                         ▲
 └──> Infrastructure ──────┘
              │
              └────────────────────────> Domain
```

- Domain hiçbir dış katmana bağımlı değildir.
- Application, Domain'i kullanır ve ihtiyaç duyduğu portları tanımlar.
- Infrastructure bu portları PostgreSQL, EF Core ve diğer adaptörlerle uygular.
- API composition root göreviyle bağımlılıkları bağlar ve HTTP sözleşmesini sunar.

## CQRS'i şu anda nasıl kullanıyoruz?

CQRS, write ve read use-case'lerini farklı modellerle ele alma yaklaşımıdır. İlk command tarafı şu akışla uygulanmıştır:

```text
CreateWalletCommand
        ↓
CreateWalletHandler
        ↓
Domain + persistence portları
        ↓
CreateWalletResult
```

GetWalletQuery ve GetWalletHandler da eklendi. Read ve write aynı PostgreSQL wallets tablosunu ve repository'yi kullanıyor; ayrı projection/database yok. Güncel query sözleşmesi, AsNoTracking ve testler [18 — Get Wallet](18-get-wallet-query.md) bölümündedir.

## Command

```csharp
public sealed record CreateWalletCommand(
    Guid OwnerId,
    string CurrencyCode
);
```

Command dış sınırdan gelen niyeti ve ham veriyi taşır. `CurrencyCode` burada `string`dir; doğrulanmış domain tipi handler içinde `Currency.FromCode` ile oluşturulur.

Buradaki positional `record`, bu string/Guid alanları için değer bazlı karşılaştırma ve oluşturma sonrası normal atamaya kapalı özellikler sağlar. Her record içindeki bütün nesneleri kendiliğinden değiştirilemez yapmaz. Command entity değildir ve kimliğe dayalı bir yaşam döngüsü taşımaz.

## Handler

Handler use-case sırasını yönetir:

```text
1. Command'ı al
2. Currency value object oluştur
3. Aynı owner ve currency için wallet var mı kontrol et
4. Wallet aggregate'ını oluştur
5. Repository'ye ekle
6. Unit of Work ile transaction'ı kaydet
7. Oluşturulan WalletId'yi döndür
```

Handler iş kuralını yeniden yazmaz. Geçerli wallet oluşturma sorumluluğunu domain factory'ye bırakır.

## Result neden yalnızca WalletId taşıyor?

```csharp
public sealed record CreateWalletResult(Guid WalletId);
```

Command sonucunda tam bir read model döndürmek yerine oluşturulan kaynağın kimliği döndürülür. API bu kimlikle `201 Created` ve gerçek GET route'una işaret eden `Location` header üretir. Wallet detayını okuma ihtiyacı ayrı GetWallet query akışıyla ele alınır.

Alternatif olarak handler doğrudan `Guid` döndürebilirdi. İsimlendirilmiş result tipi, use-case sözleşmesini daha açık kılar ve ileride metadata eklenmesine alan bırakır.

## Repository portu neden Application'da?

```csharp
public interface IWalletRepository
{
    Task<bool> ExistsAsync(
        Guid ownerId,
        Currency currency,
        CancellationToken cancellationToken = default);

    void Add(Wallet wallet);
}
```

Application persistence'e ihtiyaç duyar fakat PostgreSQL veya EF Core detaylarını bilmez. Bu nedenle ihtiyaç duyduğu interface'i kendisi tanımlar. Infrastructure daha sonra bu interface'i uygular.

```text
Application: “Wallet sorgulayabilen ve ekleyebilen bir porta ihtiyacım var.”
Infrastructure: “Bu portu PostgreSQL ve EF Core ile uygularım.”
```

Bu Dependency Inversion uygulamasıdır. Repository interface'ini Infrastructure'a koymak Application'ın dış katmana bağımlı olmasına neden olurdu.

Klasik DDD projelerinde aggregate repository interface'inin Domain'de tutulduğu da görülür. Ledgerly'de repository'ye domain nesnesi değil use-case ihtiyaç duyduğu için Application katmanı seçildi.

## Unit of Work neden ayrı?

```csharp
public interface IUnitOfWork
{
    Task SaveChangesAsync(
        CancellationToken cancellationToken = default);
}
```

`IWalletRepository.Add` aggregate'ı çalışma birimine ekler; transaction'ı commit etmez. Commit sınırı `IUnitOfWork` ile açıkça Application handler tarafından kontrol edilir.

Bu ilk use-case'te tek repository olduğu için fazla görünebilir. Transfer gibi birden fazla değişikliğin aynı transaction içinde atomik kaydedileceği use-case'lerde transaction sınırını repository metodunun içine gizlememek önem kazanacaktır.

## TimeProvider nedir, neden enjekte edildi?

TimeProvider, “şu an saat kaç?” sorusunu sorduğumuz .NET nesnesidir. Dependency injection, sınıfın bu nesneyi kendi içinde üretmek yerine dışarıdan almasıdır. Böylece testte sabit saat sağlayan bir nesne verebiliriz.

Handler doğrudan `DateTimeOffset.UtcNow` kullansaydı test her çalışmada farklı sonuç üretirdi. .NET'in `TimeProvider` abstraction'ı production'da gerçek zamanı, testte sabit zamanı kullanmamızı sağlar:

```csharp
var wallet = Wallet.Create(
    command.OwnerId,
    currency,
    _timeProvider.GetUtcNow()
);
```

Testte kullanılan `StubTimeProvider`, belirlenmiş zamanı döndürür. Böylece test deterministik kalır.

## Duplicate kontrolü ve yarış durumu

Handler önce `ExistsAsync` çağırır. Bu kontrol kullanıcıya erken ve anlaşılır bir hata vermek için değerlidir ancak eşzamanlı iki isteği tek başına engelleyemez:

```text
İstek A: Exists → false
İstek B: Exists → false
İstek A: Insert
İstek B: Insert
```

Kalıcı doğruluk için `(owner_id, currency)` üzerinde PostgreSQL unique index eklendi. Eşzamanlı iki isteğin oluşturduğu ilgili constraint ihlali concurrency lab'ında reproduce edilip aynı Application hatasına çevrildi.

## Hata modeli kararı

Duplicate wallet şu anda `WalletAlreadyExistsException` ile temsil edilir. API bu hatayı `409 Conflict`e dönüştürür. Concurrent duplicate çevirisi [17. bölümde](17-concurrency-lab-solution.md) tamamlandı.

Alternatifler:

- Exception: Başlangıçta basit, akışı okunur; beklenen hatalarda exception maliyeti ve mapping ihtiyacı vardır.
- Result type: Beklenen başarısızlıkları açıkça modelleyebilir; ek model ve branching oluşturur.
- OneOf/discriminated union kütüphanesi: Güçlü sözleşme sunar; harici bağımlılık getirir.

Başlangıç için custom exception seçildi. Result yaklaşımı daha fazla hata türü oluştuğunda yeniden değerlendirilecektir.

## MediatR nedir, neden henüz kullanmadık?

MediatR, bir isteği uygun handler'a yönlendirmeyi sağlayan .NET kütüphanesidir. Controller handler'ı doğrudan çağırmak yerine isteği bu aracıya verebilir. Pipeline behavior, handler öncesi/sonrası ortak işleri çalıştırdığımız adımdır; örneğin birden fazla isteğe aynı doğrulama akışını uygulamak.

Command ve handler ayrımı için MediatR zorunlu değildir. Şu anda handler doğrudan çağrılabilir. Pipeline behavior, merkezi validation veya çok sayıda handler dispatch ihtiyacı ortaya çıkarsa MediatR ya da alternatifleri trade-off ile değerlendirilecektir.

## Application testleri

Gerçek PostgreSQL yerine elle yazılmış test double'lar kullanılır:

- `FakeWalletRepository`, eklenen wallet'ı bellekte yakalar.
- `FakeUnitOfWork`, save çağrı sayısını kaydeder.
- `StubTimeProvider`, sabit zaman döndürür.

Doğrulanan senaryolar:

1. Wallet yoksa oluşturulur, eklenir, bir kez kaydedilir ve ID döner.
2. Wallet varsa `WalletAlreadyExistsException` atılır; ekleme ve save yapılmaz.

Create Wallet için **2 başarılı Application testi** var; Get Wallet'ın 2 testiyle güncel Application toplamı **4** oldu.

Infrastructure tamamlandıktan sonra aynı akış gerçek PostgreSQL ile de doğrulandı: **2 başarılı integration testi**.

## Uygulandı ve planlandı ayrımı

### Uygulandı

- Command, handler ve result
- Currency dönüşümü
- Repository ve Unit of Work portları
- TimeProvider ile deterministik zaman
- Duplicate kontrolü ve Application exception
- Happy-path ve duplicate Application testleri
- EF Core DbContext ve PostgreSQL repository
- `(owner_id, currency)` unique index
- Dependency injection kayıtları
- InitialCreate migration
- Gerçek PostgreSQL persistence integration testleri
- `POST /api/wallets` endpoint'i
- Exception-to-ProblemDetails mapping
- HTTP functional integration testleri
- Dar unique violation çevirisi ve concurrency 201/409 testi
- Get Wallet query, 200/404, AsNoTracking okuma ve POST Location

### Planlandı

- İhtiyaç oluştuğunda ayrı read projection/database

## Sonraki adım

Concurrency çözümü ve ilk query tamamlandı. Ayrıntılar 17 ve 18. bölümlerde. Sırada finansal çekirdek için ledger/deposit/transfer kurallarının tasarlanması var.
