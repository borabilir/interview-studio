# RabbitMQ Publisher: Outbox Mesajı Gerçek Broker'a Nasıl Gidiyor?

## RabbitMQ nedir?

RabbitMQ, uygulamalar arasında mesaj taşıyan bir **message broker**'dır. Bir uygulama mesajı bırakır, başka bir uygulama o mesajı daha sonra okuyabilir. İki uygulamanın aynı anda ayakta olması gerekmez.

Ledgerly açısından basit örnek:

```text
Wallet servisi
   │
   │ “Transfer tamamlandı” eventi
   ▼
RabbitMQ
   │
   └─ İşlem geçmişi consumer'ı
```

Şu anda işlem geçmişi consumer'ı henüz yazılmadı. Ancak event'in bekleyebileceği gerçek queue ve oraya mesaj gönderen publisher artık var.

## Exchange, queue ve binding ne demek?

RabbitMQ'da publisher çoğunlukla mesajı doğrudan queue'ya göndermez.

- **Exchange**, mesajı teslim alan ve nereye yönlendireceğine karar veren dağıtım noktasıdır.
- **Queue**, consumer okuyana kadar mesajın beklediği kuyruktur.
- **Binding**, exchange ile queue arasındaki yönlendirme kuralıdır.
- **Routing key**, mesajın hangi binding ile eşleşeceğini anlatır.

Bizim topolojimiz:

```text
Mesaj tipi / routing key
wallet.transfer-completed.v1
              │
              ▼
Topic exchange
ledgerly.events
              │
              │ binding eşleşir
              ▼
Durable queue
ledgerly.transfer-history
```

Topic exchange seçtiğimiz için ileride farklı event tiplerini farklı binding kurallarıyla bir veya birden fazla queue'ya yönlendirebiliriz.

## Ne işe yarıyor?

Transfer tamamlandıktan sonra notification, fraud, reporting veya MongoDB işlem geçmişi gibi bileşenlerin bundan haberdar olması gerekebilir.

RabbitMQ producer ile consumer'ın birbirine doğrudan bağlı olmasını azaltır:

```text
Consumer açık   → mesajı alıp işler
Consumer kapalı → mesaj queue'da bekler
Consumer açılır → bekleyen mesajı alır
```

Bu sayede Wallet API, işlem geçmişi servisini HTTP ile arayıp onun cevap vermesini beklemek zorunda kalmaz.

## Biz neden ihtiyaç duyduk?

Bir önceki adımda Transactional Outbox yaptık. Transfer, journal ve “bu event gönderilmeli” kaydı aynı PostgreSQL transaction'ında tutuluyordu.

Ancak publisher yalnızca log'a yazıyordu:

```text
Outbox mesajı → log satırı
```

Bu, Outbox algoritmasını test etmek için yeterliydi ama başka bir uygulamanın okuyabileceği gerçek bir teslim kanalı değildi. Bu adımda akışı şöyle tamamladık:

```text
Transfer + Outbox commit
        ↓
OutboxPublisherWorker
        ↓
RabbitMqIntegrationEventPublisher
        ↓
RabbitMQ exchange
        ↓
Transfer history queue
```

## RabbitMQ kullanmasaydık ne olurdu?

Alternatif olarak Wallet API başka servislere doğrudan HTTP isteği atabilirdi. Bu durumda hedef servis kapalı veya yavaşsa transfer request'i de etkilenirdi.

```text
Transfer tamamlandı
        ↓
History servisine HTTP çağrısı
        ↓
History servisi kapalı
        ↓
Transfer cevabı gecikir veya hata verir
```

Başka bir seçenek consumer'ın Outbox tablosunu doğrudan okumasıydı. Fakat bu da servislerin aynı database'e bağlanmasına ve veri sahipliği sınırının bozulmasına yol açardı.

## Alternatifler ve trade-off'lar

| Seçenek | Avantajı | Bedeli |
|---|---|---|
| Doğrudan HTTP | Kurması kolay, senkron cevap alınır | Servisler erişilebilirlik ve süre bakımından birbirine bağlanır |
| RabbitMQ | Queue, routing ve acknowledgement modeli güçlüdür | Ayrı bir altyapı bileşeni işletilir |
| Kafka | Yüksek throughput, replay ve uzun event saklama güçlüdür | Bu aşamadaki queue ihtiyacına göre daha ağırdır |
| Azure Service Bus gibi managed broker | Operasyonun bir kısmını sağlayıcı yönetir | Maliyet ve cloud bağımlılığı getirir |
| PostgreSQL'i ortak kullanmak | Yeni broker gerektirmez | Servis sınırını ve database ownership'i bozar |

Bu proje öğrenme ortamında lokal kurulumu kolay, .NET istemcisi olgun ve queue davranışı açık olduğu için RabbitMQ seçildi.

## Docker ile nasıl kurduk?

RabbitMQ'yu bilgisayara doğrudan kurmak yerine `compose.yml` içine ekledik. Böylece PostgreSQL ve RabbitMQ aynı komutla, tekrarlanabilir biçimde başlıyor.

Kullandığımız image:

```yaml
image: rabbitmq:4.3.6-management
```

`management` sürümü web yönetim ekranını da içeriyor.

Portlar:

```text
5672  → Uygulamanın AMQP bağlantısı
15672 → Tarayıcıdaki RabbitMQ yönetim ekranı
```

Container'a named volume ekledik. Böylece container yeniden oluşturulsa bile broker verisi volume silinmediği sürece korunur. Healthcheck ile RabbitMQ gerçekten hazır olmadan container'ı sağlıklı saymıyoruz.

Başlatma ve kontrol:

```powershell
docker compose up -d
docker compose ps rabbitmq
```

Yönetim ekranı:

```text
http://localhost:15672
```

Development kullanıcı bilgileri:

```text
Kullanıcı: ledgerly
Parola:    ledgerly_dev
```

Bu bilgiler sadece lokal development içindir. Production'da source control içindeki sabit parola yerine secret store ve TLS gerekir.

## Uygulamada nasıl bağlandık?

Infrastructure katmanına resmi `RabbitMQ.Client` paketini ekledik. Broker adresi, kullanıcı bilgileri, exchange ve queue adları `RabbitMqOptions` ile configuration'dan okunuyor. Genel `appsettings.json` içinde RabbitMQ kapalı; lokal bağlantı ayarları `appsettings.Development.json` içinde açık. Böylece production ortamı yanlışlıkla `localhost` ve development parolasıyla başlamıyor.

Dependency Injection tarafında seçim şöyle:

```text
RabbitMq:Enabled = true
  → RabbitMqIntegrationEventPublisher

RabbitMq:Enabled = false
  → LoggingIntegrationEventPublisher
```

Development ortamında gerçek RabbitMQ publisher açık. API integration testlerinde background worker kapalı ve logging publisher kullanılıyor; böylece eski HTTP testleri zamanlamaya veya broker'a bağımlı olmuyor. Gerçek RabbitMQ adaptörünü ayrıca gerçek container kullanan özel integration testiyle doğruluyoruz.

## Publisher tam olarak ne yapıyor?

### 1. Uzun ömürlü connection ve channel kullanıyor

Her mesaj için yeni TCP connection açmak pahalıdır. Bu nedenle publisher connection ve channel'ı saklayıp tekrar kullanıyor.

Publisher singleton olduğu için aynı channel'a eşzamanlı erişimi bir `SemaphoreSlim` ile sıraya koyduk. İleride throughput ölçüldüğünde channel pool veya birden fazla publisher değerlendirilebilir; şimdilik güvenli ve basit baseline seçildi.

### 2. Exchange ve queue'yu durable oluşturuyor

`durable`, RabbitMQ yeniden başladığında exchange ve queue tanımının korunmasını ister.

```text
Exchange: ledgerly.events
Queue:    ledgerly.transfer-history
```

### 3. Mesajı persistent gönderiyor

Mesajın `DeliveryMode` değeri persistent ayarlanıyor. Durable queue ile birlikte bu, broker'ın mesajı kalıcı tutmasını ister.

Bu tek başına mutlak veri kaybı imkânsız demek değildir; fakat geçici, memory-only mesaja göre daha güçlü bir dayanıklılık sağlar.

### 4. Publisher confirm bekliyor

Publisher confirm, broker'ın mesajı kabul ettiğini producer'a bildirir.

```text
Publish çağrısı
      ↓
RabbitMQ mesajı kabul eder
      ↓
Confirm gelir
      ↓
Outbox mesajı processed işaretlenebilir
```

Confirm gelmez veya publish hata verirse publisher exception fırlatır. Outbox processor mesajı başarılı saymaz.

Önemli ayrım:

> Publisher confirm, consumer mesajı işledi demek değildir. Yalnızca broker mesajı kabul etti demektir.

### 5. Hata olursa bağlantıyı yeniliyor

Publish sırasında connection veya channel bozulursa bunları kapatıyoruz. Exception'ı yutmuyoruz; Outbox processor'ın görmesini sağlıyoruz.

Sonraki polling turunda publisher yeni connection/channel kurup tekrar dener:

```text
RabbitMQ kapalı
   → publish başarısız
   → AttemptCount artar
   → LastError yazılır
   → Outbox pending kalır

RabbitMQ yeniden açık
   → yeni bağlantı kurulur
   → publish tekrar denenir
   → confirm alınır
   → ProcessedAtUtc yazılır
```

## Outbox ile RabbitMQ'nun görevleri farklı mı?

Evet. İkisi aynı problemi çözmüyor:

| Parça | Sorumluluğu |
|---|---|
| PostgreSQL transaction | Transfer ile event niyetini atomik kaydetmek |
| Outbox tablosu | Gönderilmemiş mesajı kaybetmemek |
| Outbox worker | Pending mesajları bulup tekrar denemek |
| RabbitMQ publisher | Mesajı broker'a göndermek |
| RabbitMQ queue | Consumer okuyana kadar mesajı bekletmek |
| Gelecekteki Inbox | Aynı event tekrar gelirse iki kez etki oluşturmamak |

## Nasıl test ettik?

Yeni integration testi sahte publisher kullanmıyor. Gerçek Docker RabbitMQ container'ına bağlanıyor.

Test akışı:

```text
1. Test exchange ve queue oluştur
2. Queue'yu temizle
3. TransferCompleted test mesajını gerçek publisher ile gönder
4. Publisher confirm bekle
5. Mesajı gerçek queue'dan oku
6. Payload ve metadata'yı doğrula
```

Kontrol edilen bilgiler:

- JSON payload değişmeden ulaştı mı?
- `MessageId`, ürettiğimiz `EventId` ile aynı mı?
- Event type `wallet.transfer-completed.v1` olarak geldi mi?
- Content type `application/json` mı?
- Mesaj persistent olarak işaretli mi?

Çalıştırma:

```powershell
docker compose up -d rabbitmq
dotnet test tests/Ledgerly.IntegrationTests/Ledgerly.IntegrationTests.csproj `
  --configuration Release `
  --filter "Lab=RabbitMqPublisher"
```

## Hangi garantiyi sağladık?

Şu anda akışımızın garantisi **at-least-once delivery**.

Broker mesajı kabul ettikten sonra uygulama `ProcessedAtUtc` yazamadan çökerse Outbox aynı mesajı yeniden yayınlayabilir:

```text
RabbitMQ mesajı kabul etti
        ↓
Uygulama ProcessedAtUtc yazamadan çöktü
        ↓
Outbox satırı hâlâ pending
        ↓
Aynı event yeniden yayınlandı
```

Mesajın kaybolmasındansa tekrar gelmesini kabul ediyoruz. Bunun bedeli, consumer'ın `EventId` üzerinden idempotent olmasıdır.

## Şu anda eksik olanlar neler?

- Queue'yu okuyup MongoDB işlem geçmişi oluşturacak consumer henüz yok.
- Consumer acknowledgement davranışı henüz uygulanmadı.
- Duplicate event için Inbox/Idempotent Consumer yok.
- Sürekli hata veren mesajlar için dead-letter queue yok.
- Retry'da exponential backoff ve jitter yok.
- Birden fazla API instance'ının aynı Outbox satırını claim etme problemi çözülmedi.
- Production secret yönetimi ve TLS yok.

Bu eksikleri baştan gizlice çözmüyoruz. Her birini ayrı bir problem olarak reproduce edip sisteme ekleyeceğiz.

## Mülakatta nasıl anlatırım?

> Transactional Outbox ile transfer ve event niyetini aynı PostgreSQL transaction'ında saklamıştım; ancak publisher yalnızca log'a yazıyordu. Docker Compose ile RabbitMQ ekledim ve resmi .NET client ile gerçek publisher adaptörü yazdım. Mesajı durable topic exchange'e version'lı event type routing key'iyle ve persistent olarak gönderiyorum. Publisher confirm beklediğim için broker kabul etmezse Outbox mesajını processed işaretlemiyorum; hata kaydedilip tekrar deneniyor. Gerçek broker kullanan integration testinde mesajın bağlı queue'ya ulaştığını, payload ve metadata'sını doğruladım. Confirm'in consumer'ın işlediğini kanıtlamadığını ve teslimatın hâlâ at-least-once olduğunu biliyorum; sıradaki adım duplicate delivery'yi reproduce edip Inbox/Idempotent Consumer eklemek.

Kanonik teknik kaynaklar: Ledgerly `docs/labs/008-rabbitmq-publisher/README.md`, `docs/adr/0013-rabbitmq-publisher.md`, `docs/journey/13-rabbitmq-publisher.md`.
