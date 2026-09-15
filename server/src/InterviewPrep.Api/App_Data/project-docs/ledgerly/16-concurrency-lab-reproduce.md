# Concurrency Lab — Duplicate Wallet Yarışını Reproduce Etmek

**Durum:** Reproduce aşamasının tarihsel kaydı; çözüm 2026-09-15'te tamamlandı\
**Tarih:** 2026-09-14

Bu bölüm çözüm öncesi `201 + 500` gözlemini korur. Güncel implementasyon, `201 + 409` test sonucu ve mülakat anlatımı [17 — Concurrency Lab Çözümü](17-concurrency-lab-solution.md) içindedir.

## 1. Senaryo

Aynı kullanıcı aynı currency için iki Create Wallet isteğini aynı anda gönderirse Application katmanındaki pre-check yeterli olur mu?

```text
Request A -> ExistsAsync -> false
Request B -> ExistsAsync -> false
Request A -> INSERT
Request B -> INSERT
```

Korunması gereken invariant:

```text
Bir owner aynı currency için en fazla bir wallet'a sahip olabilir.
```

İstenen API davranışı:

```text
1 x 201 Created
1 x 409 Conflict
database'de 1 wallet
```

## 2. Neden doğrudan iki paralel Task yeterli değil?

İki `PostAsJsonAsync` çağrısını aynı anda başlatmak yarışı mümkün kılar fakat deterministik yapmaz. İşletim sistemi veya runtime ilk isteği daha hızlı ilerletirse ilk insert ikinci `ExistsAsync` sorgusundan önce tamamlanabilir:

```text
Request A -> Exists false -> INSERT
Request B -> Exists true  -> 409
```

Bu durumda test bazen geçip bazen farklı davranır. Böyle testlere flaky test denir. Concurrency testinde scheduler şansına güvenmek yerine kritik interleaving'i kontrol etmemiz gerekir.

## 3. Deterministik bariyer yaklaşımı

Test ortamında gerçek `WalletRepository`, `CoordinatedWalletRepository` ile decorate edildi. Decorator gerçek PostgreSQL sorgusunu değiştirmiyor; iki request'in de pre-check'i tamamlamasını bekletiyor:

```text
Request A -> gerçek ExistsAsync -> false -> bekle
Request B -> gerçek ExistsAsync -> false -> bekle
                                      |
                                bariyeri aç
                                      |
                    iki request de insert'e ilerler
```

`ConcurrentRequestGate` üç araç kullanıyor:

- `Interlocked.Increment`: Kaç request geldiğini thread-safe sayar.
- `TaskCompletionSource`: İkinci request gelince bekleyen iki task'ı birlikte serbest bırakır.
- `WaitAsync` timeout: Test altyapısı bozulursa sonsuza kadar beklemeyi engeller.

Bu koordinasyon production uygulamasına eklenmedi. `WebApplicationFactory.WithWebHostBuilder` ve `ConfigureTestServices` ile yalnızca test host'undaki repository registration'ı değiştirildi.

## 4. Test akışı

```csharp
var firstRequest = client.PostAsJsonAsync("/api/wallets", request);
var secondRequest = client.PostAsJsonAsync("/api/wallets", request);

var responses = await Task.WhenAll(firstRequest, secondRequest);
```

Test şu an istenen nihai sonucu değil, mevcut problemi karakterize ediyor:

```text
Assert -> tam olarak bir 201
Assert -> tam olarak bir 500
Assert -> database'de tam olarak bir wallet
```

Bu nedenle testin adı da problemi açıkça anlatıyor:

```text
Create_WhenSameWalletIsRequestedConcurrently_ShouldExposeCurrentFailure
```

## 5. Gözlenen kanıt

Gerçek PostgreSQL log sırası:

```text
SELECT EXISTS -> false
SELECT EXISTS -> false
INSERT         -> başarılı
INSERT         -> başarısız
```

İkinci insert'in provider hatası:

```text
Exception:      Npgsql.PostgresException
SqlState:       23505
ConstraintName: ux_wallets_owner_id_currency
TableName:      wallets
```

Npgsql hatası EF Core tarafından `DbUpdateException` içine sarıldı. Mevcut `ApiExceptionHandler`, bu exception'ı business conflict olarak tanımadığı için genel `500 Internal Server Error` döndürdü.

Sonuç:

```text
201 Created:               1
500 Internal Server Error: 1
wallet row count:           1
```

## 6. Bu sonuç iyi mi kötü mü?

İki ayrı açıdan değerlendirilmelidir:

### Veri doğruluğu açısından

İyi. PostgreSQL unique index ikinci satırı engelledi. Database'de tek wallet var ve invariant korunuyor.

### API sözleşmesi açısından

Kötü. Duplicate wallet beklenen bir business conflict'tir. Client rastgele bir sunucu arızası yaşamış gibi `500` almamalı; deterministik `409 Conflict` almalıdır.

## 7. İlk root cause cümlesi

> `ExistsAsync` ile `SaveChangesAsync` arasında bir race window vardır. Pre-check ve insert atomik olmadığı için iki request aynı eski duruma bakarak insert kararı verebilir. Unique index veriyi korur fakat provider exception henüz uygulama semantiğine çevrilmediği için kaybeden request 500 alır.

Burada önemli mülakat ayrımı şudur:

> Pre-check kullanıcı deneyimini iyileştirebilir ama concurrency garantisi değildir. Nihai invariant, concurrent write'ları serialize eden veya çakışmayı atomik olarak reddeden authoritative data store seviyesinde korunmalıdır.

## 8. Testi çalıştırma

macOS / zsh / Bash:

```bash
docker compose up -d
dotnet test tests/Ledgerly.IntegrationTests/Ledgerly.IntegrationTests.csproj --filter "Lab=ConcurrentCreateWallet" --logger "console;verbosity=normal"
```

Aynı komut reproduce commit'i `72fc271` üzerinde eski beklentiyi, çözümde yeni 201/409 beklentisini çalıştırır.

PowerShell:

```powershell
docker compose up -d

dotnet test tests/Ledgerly.IntegrationTests/Ledgerly.IntegrationTests.csproj `
  --filter "Lab=ConcurrentCreateWallet" `
  --logger "console;verbosity=normal"
```

## 9. Neden testi şu an 500 bekleterek yeşil yaptık?

Bu bir characterization/reproduction testidir. Amacı mevcut sistemin davranışını kanıtlamak ve problemi her çalıştırmada yeniden üretebilmektir. Testin yeşil olması sistem davranışının doğru olduğu anlamına gelmez; gözlemlediğimiz kusurun deterministik biçimde üretildiğini gösterir.

Çözüm uygulandığında aynı senaryo silinmeyecek. Beklenti `201 + 409` olarak değiştirilecek ve regression testine dönüşecektir.

## 10. Reproduce aşamasında belirlenen sonraki adım

Henüz exception mapping eklenmedi. Bir sonraki aşamada alternatifler değerlendirilecek:

- Unique constraint + exception translation
- PostgreSQL upsert
- Serializable transaction
- Pessimistic/distributed lock

Correctness, latency, throughput, karmaşıklık ve operasyonel maliyet açısından trade-off yapıldıktan sonra çözüm seçilecektir.

Bu adım artık tamamlandı: [17 — Unique Violation'ı 409'a Çevirmek](17-concurrency-lab-solution.md).
