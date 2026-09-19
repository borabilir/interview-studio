# MongoDB ve Transfer History Worker: Read Model Zeminini Kurmak

## Bu adımda ne yaptık?

RabbitMQ'ya gönderdiğimiz `wallet.transfer-completed.v1` mesajları `ledgerly.transfer-history` kuyruğunda bekliyordu. Fakat bu kuyruğu okuyan bir uygulama henüz yoktu.

Bu aşamada iki yeni parça ekledik:

```text
Ledgerly.TransferHistory.Worker
MongoDB
```

Şimdilik worker yalnızca başlıyor, configuration'ı doğruluyor ve MongoDB'ye gerçek bir `ping` gönderiyor. Henüz RabbitMQ'dan mesaj okumuyor veya doküman yazmıyor.

Bu bilinçli bir sınır:

```text
Önce çalışan altyapı zemini
Sonra en basit consumer
Sonra duplicate problemi
Sonra Inbox / Idempotent Consumer
```

## Worker Service nedir?

Worker, HTTP isteği beklemek yerine arka planda çalışan bir .NET uygulamasıdır.

API'nin çalışma şekli genellikle şöyledir:

```text
HTTP isteği gelir
    ↓
Controller / handler çalışır
    ↓
HTTP cevabı döner
```

Worker ise sürekli çalışan bir süreçtir:

```text
Uygulama başlar
    ↓
RabbitMQ kuyruğunu dinler
    ↓
Mesaj gelince işler
    ↓
Sonraki mesajı bekler
```

Bizim worker henüz kuyruğu dinlemiyor. Bu davranışı bir sonraki adımda ekleyeceğiz.

## Neden consumer'ı mevcut API içine koymadık?

Teknik olarak API içindeki bir `BackgroundService` RabbitMQ kuyruğunu okuyabilirdi. Outbox publisher için bunu zaten yaptık. Fakat transfer history farklı bir sorumluluk:

```text
Wallet API
→ Para transferinin doğru gerçekleşmesinden sorumlu

Transfer History Worker
→ Gerçekleşen transferlerden sorgulanabilir geçmiş üretmekten sorumlu
```

Ayrı çalıştırınca:

- API ile consumer farklı sayıda instance'a çıkarılabilir.
- Consumer hata verdiğinde HTTP API process'ini doğrudan düşürmez.
- Transfer history kendi veri deposuna sahip olabilir.
- Eventual consistency ve servis iletişimini gerçek biçimde çalışabiliriz.

Bedeli ise yeni bir deployable, yeni configuration ve yeni operasyon yüküdür. Bu nedenle projenin başında boş yere ayırmadık; gerçek consumer ihtiyacı oluşunca ayırdık.

## Bu bir mikroservis mi?

Bağımsız çalışabilen ve kendi veri deposuna sahip bir servis sınırının başlangıcıdır. Fakat yalnızca ayrı `.csproj` açmak bir sistemi otomatik olarak iyi bir mikroservis yapmaz.

Bir sınırın anlamlı olması için şunlara bakıyoruz:

- Ayrı business sorumluluğu var mı?
- Kendi verisinin sahibi mi?
- Başka servisin database tablolarına doğrudan erişiyor mu?
- Bağımsız çalıştırılıp ölçeklenebiliyor mu?
- İletişim açık bir sözleşme üzerinden mi?

Worker, Ledgerly API'nin Domain veya Infrastructure projesine referans vermiyor. İleride iletişim yalnızca version'lı RabbitMQ eventi üzerinden olacak.

## MongoDB nedir?

MongoDB, veriyi JSON'a benzeyen BSON dokümanları halinde saklayan bir document database'dir.

İlişkisel modelde veri birden fazla tabloya ayrılabilir:

```text
wallet_transfers
wallets
journal_entries
postings
```

Read model tarafında ekrana hazır tek bir doküman tutabiliriz:

```json
{
  "transferId": "...",
  "sourceWalletId": "...",
  "destinationWalletId": "...",
  "amount": 100,
  "currencyCode": "TRY",
  "occurredAtUtc": "..."
}
```

Bu “MongoDB'de ilişki kurulamaz” demek değildir. Buradaki tercih, belirli bir sorgu için gerekli veriyi gösterime hazır doküman olarak tutmaktır.

## Neden PostgreSQL yerine MongoDB seçtik?

PostgreSQL ana finansal kayıtlarımız için hâlâ doğru seçim:

- Transaction desteği
- Constraint'ler
- Optimistic concurrency
- Double-entry ledger
- İlişkisel bütünlük

MongoDB'yi para transferini gerçekleştirmek için kullanmıyoruz. İşlem geçmişi ekranına yönelik, eventlerden üretilebilen bir read model için kullanıyoruz.

```text
PostgreSQL
→ Finansal source of truth

MongoDB
→ Sorgulama için türetilmiş read model
```

MongoDB kaybolursa finansal gerçek kaybolmuş olmaz. Read model eventlerden veya ana kayıtlardan yeniden üretilebilmelidir.

## CQRS ile ilişkisi ne?

CQRS, write ve read ihtiyaçlarının aynı modelle çözülmek zorunda olmadığını söyler.

Bizde:

```text
Write tarafı
  Ledgerly API
  PostgreSQL
  Domain invariant'ları
  Transfer ve ledger kayıtları

Read tarafı
  Transfer History Worker
  MongoDB
  Ekrana uygun history dokümanları
```

Bu yapı eventual consistency getirir. Transfer PostgreSQL'de tamamlandıktan çok kısa bir süre sonra MongoDB read model'i güncellenir. İki veri deposunun her milisaniye aynı durumda olması beklenmez.

## Alternatifler nelerdi?

| Seçenek | Avantajı | Bedeli |
|---|---|---|
| History sorgusunu PostgreSQL'den yapmak | Basit, yeni altyapı yok | CQRS read model ve NoSQL pratiği oluşmaz |
| PostgreSQL'de ayrı read tablo | Aynı teknoloji ve güçlü transaction | Read tarafı yine aynı database operasyonuna bağlanır |
| API içine consumer koymak | Daha az proje/deployable | API ve consumer ölçekleme/hata sınırı birleşir |
| Consumer'ın ana DB'yi okuması | Event işleme gerekmez | Database ownership ihlal edilir |
| Ayrı worker + MongoDB | Ayrı sahiplik, document read model ve bağımsız ölçekleme | Eventual consistency ve yeni altyapı yönetimi gerekir |

Amacımız “NoSQL kullandık” diyebilmek değil. Read model ihtiyacı MongoDB'nin güçlü taraflarını öğrenmek için uygun bir zemin sağlıyor.

## MongoDB'yi nasıl kurduk?

`compose.yml` içine resmi MongoDB image'ını ekledik:

```yaml
mongodb:
  image: mongo:8.3.11-noble
  ports:
    - "27017:27017"
  volumes:
    - ledgerly_mongodb_data:/data/db
```

Port:

```text
27017 → MongoDB bağlantısı
```

Named volume sayesinde container yeniden oluşturulsa da veri, volume silinmediği sürece korunur.

Healthcheck yalnızca process çalışıyor mu diye bakmıyor. Kullanıcı bilgileriyle bağlanıp MongoDB'ye gerçek `ping` komutu gönderiyor.

```powershell
docker compose up -d mongodb
docker compose ps mongodb
```

Doğrulanan durum:

```text
running (healthy)
```

## Worker projesini nasıl kurduk?

Karşılığı olan .NET CLI komutu:

```powershell
dotnet new worker `
  --name Ledgerly.TransferHistory.Worker `
  --output src/Ledgerly.TransferHistory.Worker `
  --framework net10.0
```

Ardından solution'a `/src/` altında eklendi.

Worker'a resmi MongoDB driver paketi eklendi:

```powershell
dotnet add src/Ledgerly.TransferHistory.Worker/Ledgerly.TransferHistory.Worker.csproj `
  package MongoDB.Driver `
  --version 3.11.2
```

## `MongoClient` neden singleton?

`MongoClient`, MongoDB bağlantılarını ve connection pool'u yöneten ağır, thread-safe bir nesnedir. Her doküman yazımında yeniden oluşturmak istemiyoruz.

```text
Tek MongoClient
   └─ Connection pool
        ├─ Connection 1
        ├─ Connection 2
        └─ Connection 3
```

Dependency Injection içinde singleton kaydedildi. Worker boyunca aynı client kullanılıyor; driver gerektiğinde pool'dan bağlantı seçiyor.

Bu, RabbitMQ'daki tek `IChannel` yaklaşımıyla tamamen aynı değildir. MongoDB driver kendi connection pooling ve eşzamanlı erişim yönetimini sağlar.

## Configuration nasıl düzenlendi?

`appsettings.json` güvenli baseline olarak gerçek bağlantı bilgisi taşımıyor. Lokal ayar `appsettings.Development.json` içinde:

```text
mongodb://ledgerly:ledgerly_dev@localhost:27017/?authSource=admin
```

Parçaları:

```text
mongodb://             → bağlantı protokolü
ledgerly               → lokal kullanıcı
ledgerly_dev           → lokal parola
localhost:27017        → sunucu ve port
authSource=admin       → kullanıcının doğrulandığı database
```

Hedef database adı ayrıca tutuluyor:

```text
ledgerly_transfer_history
```

Production ortamında connection string source control'a yazılmamalı; environment variable veya secret manager kullanılmalı.

## Startup ping neden var?

MongoDB driver genellikle `MongoClient` oluşturulduğu anda gerçek ağ bağlantısı kurmaz. İlk komuta kadar hatayı görmeyebiliriz.

Bu nedenle worker başlangıcında:

```javascript
{ ping: 1 }
```

komutunu çalıştırıyoruz.

Böylece şunları gerçekten doğruluyoruz:

- MongoDB adresi doğru mu?
- Port erişilebilir mi?
- Kullanıcı adı/parola doğru mu?
- Authentication başarılı mı?
- Driver sunucuyla konuşabiliyor mu?

Başarılı log:

```text
Transfer History Worker connected to MongoDB database ledgerly_transfer_history.
```

## Neden database'i MongoDB ekranında henüz göremeyebilirim?

MongoDB database ve collection'ı çoğunlukla ilk veri yazıldığında fiziksel olarak oluşturur. `ping` bağlantıyı doğrular ama doküman yazmaz.

Dolayısıyla şu anda:

```text
Bağlantı başarılı       ✅
Database adı seçildi    ✅
Collection oluşturuldu  ❌ henüz değil
Doküman yazıldı         ❌ henüz değil
```

İlk transfer history dokümanını yazdığımızda collection görünür hâle gelecek.

## VS Code desteği

Run and Debug ekranına şunlar eklendi:

- `Ledgerly.TransferHistory.Worker`
- `Ledgerly: API + Transfer History Worker`

İkinci seçenek API ile worker'ı birlikte başlatır. Infrastructure prepare task'ı PostgreSQL, RabbitMQ ve MongoDB container'larını çalıştırır.

## Şu anda sistemin akışı ne durumda?

```text
Ledgerly API
   ↓
PostgreSQL + Outbox
   ↓
RabbitMQ queue
   ↓
Henüz bağlantı yok
   ↓
Transfer History Worker → MongoDB ping başarılı
```

Worker ve MongoDB hazır fakat aradaki RabbitMQ consumer henüz yazılmadı.

## Sonraki problem ne olacak?

Önce en basit consumer'ı yazacağız:

```text
RabbitMQ mesajını al
    ↓
Payload'ı deserialize et
    ↓
MongoDB'ye history dokümanı ekle
    ↓
RabbitMQ'ya ack ver
```

Ardından aynı `EventId` değerine sahip mesajı iki kere göndereceğiz. Naif consumer iki MongoDB dokümanı oluşturursa duplicate problemi kanıtlanmış olacak.

Çözümü baştan eklemiyoruz çünkü şu soruları kanıtla cevaplamak istiyoruz:

- Duplicate gerçekten oluşuyor mu?
- `EventId` mi `TransferId` mi unique olmalı?
- Inbox ayrı collection mı olmalı?
- MongoDB unique index yeterli mi?
- Doküman yazımı ile Inbox kaydı nasıl atomik olacak?

## Mülakatta nasıl anlatırım?

> Transactional Outbox event'i RabbitMQ'ya güvenilir biçimde ulaştırdıktan sonra transfer history için ayrı bir consumer sınırı oluşturdum. Consumer'ı API process'ine gömmek yerine bağımsız ölçeklenebilmesi ve kendi verisinin sahibi olması için .NET Worker Service olarak ayırdım. Ana finansal source of truth PostgreSQL olarak kaldı; MongoDB'yi eventlerden türetilen, ekrana uygun CQRS read model için seçtim. Docker Compose ile authenticated ve healthcheck'li MongoDB kurdum, resmi .NET driver'ı ekledim, `MongoClient`ı singleton kullandım ve startup'ta gerçek ping ile configuration/authentication'ı doğruladım. Henüz consumer ve idempotency eklemedim; sıradaki adım duplicate teslimatı önce reproduce etmek.

Kanonik teknik kaynaklar: Ledgerly `docs/journey/14-transfer-history-worker-bootstrap.md`, `docs/adr/0014-transfer-history-worker-and-mongodb.md`.
