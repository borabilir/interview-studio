# Concurrent Create Wallet — Unique Violation'ı 409'a Çevirmek

## Exception translation nedir?

Exception, kod çalışırken işlemin olağan şekilde devam edemediğini bildiren hata nesnesidir. Exception translation, bir katmanın teknik hatasını diğer katmanın anlayacağı anlamlı hataya çevirmektir.

Örneğin database “unique kuralı ihlal edildi” der. Uygulamamız bunun hangi kurala ait olduğunu anlayıp “bu kullanıcı ve para birimi için wallet zaten var” diyebilir. API de istemciye 409 Conflict döndürür.

## Unique constraint ne işe yarar?

Unique constraint, seçtiğimiz değerin veya değer birleşiminin tekrarlanmasını database seviyesinde engeller. Ledgerly'de unique index, aynı owner/currency birleşimine ikinci wallet yazılmasını önler. İki istek de önce “yok” görse bile database ikinci kaydı kabul etmez.

## Neden hatanın ayrıntısına bakıyoruz?

Her database hatası duplicate değildir. Bağlantı kopmuş veya başka bir kural bozulmuş olabilir. SQLSTATE, PostgreSQL'in hata kategorisini belirten kodudur; 23505 unique ihlalini belirtir. ConstraintName ise hangi kuralın ihlal edildiğini söyler. Biz ikisini birlikte kontrol ederek yalnızca beklediğimiz wallet duplicate durumunu çeviriyoruz.

DbUpdateException EF Core'un kayıt hatasıdır. İçindeki PostgresException sağlayıcı ayrıntısını taşır. WalletAlreadyExistsException uygulamanın anladığı karşılıktır. Aşağıda bu çevirinin kodda nerede yapıldığını göreceğiz.

## Bölümün uygulama bağlamı

**Durum:** Uygulandı ve gerçek PostgreSQL ile doğrulandı\
**Tarih:** 2026-09-15\
**Önceki bölüm:** [16 — Yarışı reproduce etmek](16-concurrency-lab-reproduce.md)\
**Kanonik kaynak:** Ledgerly repository'sindeki `docs/labs/001-concurrent-create-wallet/README.md` ve `docs/adr/0003-concurrent-create-wallet-conflict.md`\
**Reproduce commit:** `72fc271`\
**Ledgerly çözüm commit:** `1c4bd8c` — `fix(wallets): translate concurrent duplicate conflicts`

## 1. Nereden devam ettik?

İki request de aynı owner/currency için “wallet yok” sonucunu alabiliyordu. PostgreSQL ikinci insert'i reddediyordu, ama API bu teknik hatayı tanımadığı için kaybeden istek 500 alıyordu.

```text
Önce:  1 × 201 + 1 × 500 + database'de 1 wallet
Sonra: 1 × 201 + 1 × 409 + database'de 1 wallet
```

Veri doğruluğunu unique index zaten koruyordu. Bu çalışmada eksik olan HTTP hata sözleşmesini tamamladık.

## 2. Root cause'u basitçe anlatmak

`ExistsAsync`, “baktığım anda yok” der; “ben ekleyene kadar kimse ekleyemez” demez. Kontrol ve insert arasında başka bir request ilerleyebilir.

```text
A: SELECT EXISTS -> false
B: SELECT EXISTS -> false
A: INSERT -> başarılı
B: INSERT -> unique violation
```

API kusuru, `DbUpdateException`ın anlamlı bir Application hatasına çevrilmemesiydi. Mevcut middleware `WalletAlreadyExistsException` için zaten 409 üretiyordu.

## 3. Testte firstRequest, secondRequest ve gate ilişkisi

İki isteği test başlatır:

```csharp
var firstRequest = client.PostAsJsonAsync("/api/wallets", request);
var secondRequest = client.PostAsJsonAsync("/api/wallets", request);
responses = await Task.WhenAll(firstRequest, secondRequest);
```

İlk çağrıyı await etmeden ikinciyi başlatıyoruz. `Task.WhenAll` iki HTTP yanıtının tamamlanmasını bekliyor. Gate ise request'in içinde, gerçek sorgu ile insert arasında çalışıyor:

```csharp
var exists = await _inner.ExistsAsync(ownerId, currency, cancellationToken);
await _gate.SignalAndWaitAsync(cancellationToken);
return exists;
```

İlk gelen sorgusunu bitirir, fakat gate açılmadığı için `return exists`e geçemez. Handler sonucu alamadığı için insert yapamaz. İkinci de sorgusunu bitirince gate açılır; iki handler da daha önce okunan false ile devam eder.

Her request'in repository/context'i ayrı, gate nesnesi ortaktır. Sayaç bir thread'e ait değil, bu ortak nesnenin alanıdır. Request ile thread bire bir eşleşmez; await sonrası farklı thread devam edebilir.

```csharp
if (Interlocked.Increment(ref _arrivedCount) == _participantCount)
{
    _release.TrySetResult();
}
await _release.Task.WaitAsync(Timeout, cancellationToken);
```

- `Interlocked.Increment` sayacı atomik artırır ve yeni değeri döndürür. İki artış birbirinin üzerine yazılmaz.
- Sayaç bekletmez; tamamlanmamış `_release.Task`ı await etmek bekletir.
- `TrySetResult` ortak Task'ı tamamlar; gate açılır, insert'e ilerlemek mümkün olur.
- `RunContinuationsAsynchronously`, bekleyen devamların sinyali veren çağrı içinde doğrudan çalıştırılmasını önler.
- 10 saniye dolarsa `WaitAsync` TimeoutException üretir; kapı kendiliğinden açılmaz. Bu süre bütün HTTP isteğinin veya insert'in timeout'u değildir.
- Gate tek kullanımlıktır. Her test yeni bir gate oluşturur.

İki insert'in aynı CPU anında yürütülmesini garanti etmiyoruz. İkisinin de insert öncesinde sorguyu bitirmesini garanti ediyoruz. `Task.Delay` ile süre tahmin etmek bu sırayı garanti etmez.

## 4. PostgreSQL hangisini önce işler?

Database istekleri genel olarak tek bir sırada baştan sona çalıştırmaz. Ancak aynı unique anahtardaki çakışmayı koordine eder.

A kaydı eklemiş fakat commit etmemişse, aynı anahtarı eklemek isteyen B transaction sonucunu bekleyebilir. A commit ederse B unique violation alır. A rollback yaparsa B yeniden kontrol sonrası eklemeye devam edebilir. İlk HTTP isteğini başlatmak onun kazanacağını garanti etmez.

`Interlocked` database tekilliği sağlamaz. Bunu yapan `ux_wallets_owner_id_currency` index'idir.

## 5. Hangi alternatifleri değerlendirdik?

| Seçenek | Ne sağlar? | Bedeli / sınırı |
|---|---|---|
| Unique + exception translation | DB kuralını koruyup ilgili reddi 409 yapar | Çakışmada bekleme ve exception maliyeti; dar provider mapping gerekir |
| PostgreSQL upsert | `ON CONFLICT (owner_id, currency) DO NOTHING RETURNING id`; eklenmezse conflict | PostgreSQL'e özel insert akışı; aynı unique index yine gerekir |
| Serializable transaction | Kontrol ve yazmayı daha güçlü transaction garantisiyle ele alır | Serialization failure için bütün transaction retry; unique violation yine mümkün |
| Pessimistic locking | Ortak kilit hedefinde istekleri sıraya alır | Olmayan wallet satırı kilitlenemez; owner/advisory hedefi, deadlock ve bekleme yönetimi gerekir |
| Distributed lock | Instance'lar arasında ortak koordinasyon | Ek ağ çağrısı, servis, lease süresi ve sahiplik kaybı problemleri |

Latency/throughput açısından lock beklemeleri ve retry yük oluşturabilir; upsert exception yolunu azaltabilir. Bunlar mekanizma trade-off'larıdır, bu lab'da ölçülmüş benchmark sonuçları değildir.

Mevcut wallet'ı güncellemek istemediğimiz için upsert alternatifinde DO UPDATE değil DO NOTHING düşündük. Serializable tek başına API'ye 409 vermez. Distributed lock kullanılsa bile finansal doğruluğu yalnızca kilit lease'ine emanet etmeyiz.

## 6. Neden unique + translation seçtik?

Kural tek bir unique index ile zaten korunuyordu. Yeni servis veya kilit düzeni eklemeden yanlış 500 yanıtını düzeltebiliyorduk. Birden fazla API instance'ı aynı PostgreSQL'e yazdığında da index geçerlidir.

Pre-check erken duplicate yanıtı için kaldı; correctness garantisi olarak görülmüyor. Duplicate trafiği exception maliyetini ölçülmüş darboğaz yaparsa targeted upsert tekrar değerlendirilir.

## 7. Çeviriyi neden Infrastructure'a koyduk?

`WalletRepository.Add` yalnızca entity'yi change tracker'a ekler. Gerçek INSERT, `IUnitOfWork.SaveChangesAsync` içinde gerçekleşir. Bu yüzden catch sınırı `LedgerlyDbContext` içindeki explicit interface implementasyonudur.

```text
PostgreSQL
  -> PostgresException
  -> EF Core: DbUpdateException
  -> Infrastructure: WalletAlreadyExistsException
  -> API: 409 ProblemDetails
```

Application EF Core veya Npgsql exception tiplerini bilmez. API de SQLSTATE yorumlamaz; Application hatasını HTTP'ye çevirir.

Filtrenin özü:

```csharp
exception.InnerException is PostgresException
{
    SqlState: PostgresErrorCodes.UniqueViolation,
    ConstraintName: WalletConfiguration.OwnerCurrencyUniqueIndexName,
}
```

`UniqueViolation`, PostgreSQL'in `23505` kodudur. Ayrıca exception'ın tek bir Added Wallet entry'sine ait olduğunu kontrol ediyoruz. Owner ve currency bu entry'den alınıyor. Belirsiz batch hatalarında yanlış wallet bilgisi üretmek yerine orijinal hata korunuyor.

`WalletAlreadyExistsException` artık isteğe bağlı `innerException` alıyor. Böylece:

```text
WalletAlreadyExistsException
  -> DbUpdateException
      -> PostgresException
```

zinciri teşhis için korunuyor. SQL hata mesajını parse etmiyoruz. Index adı mapping ve filtrede ortak sabit; database adı değişmediğinden yeni migration gerekmiyor.

## 8. Neden bütün DbUpdateException'ları çevirmedik?

`DbUpdateException` yalnızca duplicate anlamına gelmez. Numeric overflow veya farklı constraint ihlalleri de bu tipte olabilir. Üstelik 23505 de tek başına yeterli değil: `pk_wallets` primary key ihlali, “aynı owner/currency zaten var” demek değildir.

Bu nedenle hem SQLSTATE hem tam constraint adı eşleşmeli. Diğer hatalar değiştirilmeden yukarı çıkar; mevcut API handler bunları 500 olarak sunar.

Bu dönüşüm `IUnitOfWork` portundadır; doğrudan DbContext save kullanan Infrastructure kodu EF hatalarını almaya devam eder. Hatalı request sona erdiğinde scoped context dispose edilir. Burada başarısız context ile retry veya batch recovery tasarlamadık.

## 9. Nasıl doğruladık?

2026-09-15'te gerçek PostgreSQL üzerinde şu sıra çalıştırıldı:

1. Eski test 201/500 ve tek wallet ile geçti.
2. Aynı test 409 bekleyecek şekilde değiştirildi; çözüm olmadan 500 aldığı için başarısız oldu.
3. Çeviri eklendi; aynı bariyer ve HTTP akışı 201/409 ve tek wallet ile geçti.
4. Bütün solution testleri çalıştırıldı.

```text
Domain             12 passed
Application         2 passed
IntegrationTests   14 passed
Toplam             28 passed, 0 failed, 0 skipped
```

IntegrationTests projesindeki 11 case gerçek PostgreSQL/HTTP entegrasyonunu kullanıyor; 3 case save interceptor ile kontrollü hata enjekte ediyor. Enjekte edilen testleri gerçek network/provider arızası deneyi olarak sunmuyoruz.

Ek korumalar:

- Gerçek owner/currency ihlali doğru Application exception'a çevriliyor; inner exception korunuyor.
- Gerçek primary key ihlali 23505 olsa da çevrilmiyor.
- Gerçek numeric overflow çevrilmiyor.
- Aynı constraint adında başka SQLSTATE, PostgreSQL dışı inner exception ve inner exception olmayan hata aynen korunuyor.

## 10. Mac'te testi çalıştırma

Docker Desktop açık olmalı. Ledgerly kökünde:

```bash
docker compose up -d
docker compose ps
dotnet test tests/Ledgerly.IntegrationTests/Ledgerly.IntegrationTests.csproj --filter "Lab=ConcurrentCreateWallet" --logger "console;verbosity=normal"
```

Tüm testler:

```bash
dotnet test Ledgerly.slnx
```

API'yi F5 ile ayrıca açmak gerekmez; LedgerlyApiFactory test içinde açar ve varsayılan olarak `ledgerly_tests` database'ine bağlanır. HTTP testleri kendi owner ID'lerine ait kayıtları finally içinde temizler. Doğrudan persistence hata testleri transaction rollback kullanır.

PowerShell'deki ters tırnak zsh'ta satır devamı değildir. Yukarıdaki tek satırlık test komutunu kullanabilirsin. SDK bulunamıyorsa kullanıcı kurulumunda `~/.dotnet/dotnet --version` ile kontrol edip aynı tam yolla testi çalıştırabilirsin.

Bu çalışmadaki ortam: macOS ARM64, SDK 10.0.400, runtime 10.0.11, PostgreSQL 18.6-alpine. Testler tam SDK yoluyla çalıştırıldı. Load/stress testi yapılmadı.

## 11. Mülakatta 60–90 saniyelik cevap

> Aynı owner ve currency için iki Create Wallet isteğinin pre-check'i birlikte geçebildiğini gerçek PostgreSQL kullanan bir HTTP testinde reproduce ettim. İstekleri sorgudan sonra ortak bariyerde bekleterek ikisinin de insert öncesinde wallet yok sonucunu almasını sağladım. Unique index tek kaydı koruyordu ama API kaybedene 500 dönüyordu. Upsert, Serializable ve kilitleme alternatiflerini değerlendirdim. Mevcut invariant tek index ile korunduğu için Infrastructure'da yalnızca ilgili SQLSTATE 23505 ve constraint adını WalletAlreadyExistsException'a çevirdim. Aynı test artık bir 201, bir 409 ve tek wallet doğruluyor. Diğer constraint ve kayıt hatalarının yanlışlıkla duplicate sayılmadığını da test ettim.

## 12. Takip soruları

### Yarışı ortadan kaldırdın mı?

Hayır; eşzamanlı denemeler hâlâ olabilir. Database kuralı korur, uygulama beklenen conflict sonucunu doğru sunar.

### Unique index varsa pre-check neden var?

Mevcut kayıtları erken yakalayıp anlaşılır hata verir. Yarışa karşı garanti değildir. Ek sorgunun maliyeti ve duplicate yükü ölçülürse kaldırılması/upsert değerlendirilebilir.

### Bu idempotency mi?

Hayır. İkinci istek conflict alır. Aynı operation'ın tekrarında aynı başarılı sonucu döndürmek için key, payload ve sonuç saklama politikası ayrıca tasarlanmalıdır.

### Bu çözüm double-spending'i de çözer mi?

Hayır. Bu index wallet tekilliğini korur. Bakiye güncelleme ve transfer, başka invariant'lar ve transaction/concurrency kararları gerektirir.

### Handler veya controller neden PostgreSQL exception'ını yakalamıyor?

Provider bilgisi Infrastructure'a aittir. Application use-case'i bilinen hata türünü sunar; API HTTP karşılığını üretir.

### Her zaman ilk HTTP isteği mi kazanır?

Hayır. Scheduler, bağlantı ve database ilerleme sırası değişebilir. Test hangi request'in kazandığını değil, sonuç kümesini doğrular.

## Kaynaklar

- [PostgreSQL unique kontrolü](https://www.postgresql.org/docs/18/index-unique-checks.html)
- [INSERT / ON CONFLICT](https://www.postgresql.org/docs/18/sql-insert.html)
- [Transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html)
- [Explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html)
