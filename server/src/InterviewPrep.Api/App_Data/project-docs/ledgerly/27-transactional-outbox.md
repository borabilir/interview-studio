# Transactional Outbox: DB Commit Oldu Ama Event Gitmediyse Ne Olur?

## Önce kavramlar: event ve message broker nedir?

Bir **event**, sistemde geçmişte gerçekleşmiş önemli bir olayı anlatan mesajdır. Emir vermez; olmuş bir şeyi duyurur.

Ledgerly'deki örneğimiz:

```text
TransferCompleted

“Şu transfer başarıyla tamamlandı.”
```

Bu event şu bilgileri taşıyabilir:

```text
EventId
TransferId
SourceWalletId
DestinationWalletId
Amount
CurrencyCode
OccurredAtUtc
```

Bir **message broker** ise bu mesajları üreticiden alıp ilgili tüketicilere ulaştıran aracı sistemdir. RabbitMQ, Kafka ve Azure Service Bus bu amaçla kullanılan ürünlere örnektir.

```text
Ledgerly
   │
   └─ TransferCompleted eventi
             │
             ▼
         Message Broker
          ├─ Notification servisi
          ├─ Fraud servisi
          ├─ Reporting servisi
          └─ İşlem geçmişi read model'i
```

Bu bölüm yazıldığında Ledgerly henüz gerçek RabbitMQ kullanmıyordu; önce broker sınırını, kalıcı Outbox'ı, worker'ı ve hata senaryosunu hazırladık. Gerçek RabbitMQ adaptörü daha sonra bir sonraki bölümde eklendi.

## Transactional Outbox nedir?

Transactional Outbox, business verisiyle yayınlanması gereken event bilgisini **aynı database transaction'ında** kaydetme yöntemidir.

Transferi database'e kaydedip event'i doğrudan broker'a göndermek yerine önce şöyle yaparız:

```text
Aynı PostgreSQL transaction'ında:

1. Transferi kaydet
2. Bakiyeleri güncelle
3. Journal ve posting'leri kaydet
4. “TransferCompleted gönderilmeli” mesajını Outbox'a kaydet
```

Daha sonra ayrı çalışan bir background worker, Outbox'taki bekleyen mesajları broker'a gönderir.

Buradaki **transactional** kelimesi, PostgreSQL verileri ile Outbox satırının aynı local transaction'da olmasını ifade eder. PostgreSQL ile broker tek transaction'a alınmış değildir.

## Ne işe yarar?

Temel amacı şu tutarsızlığı önlemektir:

```text
Business işlemi database'de gerçekleşti
ama bu işlemi duyuran event kayboldu
```

Outbox kullandığımızda transfer gerçekleşmişse event niyeti de kalıcıdır. Broker geçici olarak kapalı olsa bile mesaj PostgreSQL'de bekler ve daha sonra yeniden denenebilir.

```text
Broker açık       → mesaj hemen yayınlanır
Broker kapalı     → mesaj Outbox'ta bekler
Broker düzelir    → worker yeniden dener
```

## Hangi senaryolarda kullanılır?

Transactional Outbox genellikle bir database değişikliğinden sonra başka bir sisteme güvenilir mesaj göndermek gerektiğinde kullanılır.

Örnekler:

- Ödeme tamamlandıktan sonra kullanıcıya bildirim gönderme
- Sipariş oluşturulduktan sonra stok servisinin ürünü ayırması
- Para transferinden sonra fraud kontrolünün başlatılması
- Kullanıcı oluşturulduktan sonra e-posta servisinin hoş geldin mesajı göndermesi
- Business verisi değişince Elasticsearch veya MongoDB read model'inin güncellenmesi
- Audit ve reporting sistemlerinin yapılan işlemden haberdar edilmesi

Tek uygulama, tek database ve tamamen senkron bir akış yeterliyse Outbox her zaman gerekli değildir. İkinci bir sisteme güvenilir mesaj gönderme ihtiyacı başladığında anlam kazanır.

## Biz neden ihtiyaç duyduk?

Ledgerly'de transfer artık güvenli ve idempotent şekilde tamamlanabiliyor. Sıradaki ihtiyaç, tamamlanan transferi başka bileşenlere duyurmak:

```text
Transfer tamamlandı
   ├─ Kullanıcıya bildirim gönder
   ├─ Fraud analizi başlat
   ├─ Raporları güncelle
   └─ MongoDB işlem geçmişini güncelle
```

İlk akla gelen yöntem şuydu:

```text
TransferWalletHandler
   1. PostgreSQL'e transferi kaydet
   2. TransferCompleted eventini publish et
```

Fakat bu iki adım iki farklı sisteme yazıyor:

```text
PostgreSQL commit
Broker publish
```

Bu nedenle ikisinin arasına hata girebilir.

## Kullanmasaydık ne olurdu?

Şu senaryoyu düşünelim:

```text
1. Kullanıcı 40 TRY gönderdi
2. PostgreSQL transaction'ı commit oldu
3. Kaynak bakiye 100 → 60 oldu
4. Hedef bakiye 0 → 40 oldu
5. Uygulama event yayınlarken broker'a ulaşamadı
```

Sonuç:

```text
Transfer gerçekleşti                    ✅
Journal kaydedildi                      ✅
Kullanıcıların bakiyeleri değişti       ✅
TransferCompleted eventi ulaştırıldı    ❌
```

Notification servisi kullanıcıya bildirim gönderemez. Fraud servisi transferi inceleyemez. MongoDB read model'i eski kalır. Sistemlerin her biri transfer hakkında farklı bir gerçeğe sahip olur.

Bu hata daha tehlikelidir çünkü database'deki transferi geri almak doğru değildir; para gerçekten taşınmıştır.

## Problemi nasıl reproduce ettik?

Gerçek broker henüz olmadığı için broker sınırını temsil eden publisher'ı bilerek hata verecek şekilde ayarladık.

Outbox öncesindeki doğrudan publish akışında gözlemimiz:

```text
API cevabı:             500
Kaynak bakiye:          100 → 60
Hedef bakiye:             0 → 40
Transfer ve journal:    database'de var
Event teslimi:          başarısız
Kalıcı retry kaydı:     yok
```

Yani kullanıcı `500` görmesine rağmen para taşınmıştı.

Kullanıcı aynı `Idempotency-Key` ile tekrar deneyince para ikinci kez taşınmadı. Ancak handler tamamlanmış transferin eski makbuzunu döndürdüğü için event publish noktasına tekrar gelmedi. Kayıp event hâlâ kayıptı.

Buradan şu ayrımı gördük:

```text
Idempotency
→ Aynı kullanıcı niyetinin iki kez uygulanmasını engeller.

Transactional Outbox
→ Gerçekleşmiş işlemin eventinin kaybolmasını engeller.
```

## Root cause: dual-write problemi

Aynı business işlemi sırasında iki bağımsız sisteme yazmaya çalışmaya **dual-write** diyoruz:

```text
Write 1 → PostgreSQL
Write 2 → RabbitMQ
```

Normal PostgreSQL transaction'ı RabbitMQ işlemini rollback edemez. PostgreSQL commit olduktan sonra publish başarısız olabilir.

Sıralamayı ters çevirmek de problemi çözmez:

```text
1. Event'i yayınla
2. Transferi database'e kaydet
```

Bu kez event başarıyla gider fakat database commit başarısız olabilir. Tüketiciler gerçekte oluşmamış bir transferi görür. Buna bazen “hayalet event” denir.

## Alternatif çözümler nelerdi?

| Yaklaşım | Avantajı | Bedeli |
|---|---|---|
| Database commit sonrası doğrudan publish | Basit ve düşük gecikmeli | Commit ile publish arasında event kaybolabilir |
| Önce publish, sonra database commit | Mesaj erkenden gönderilir | Database başarısızsa gerçekleşmemiş işlem duyurulur |
| Sürekli HTTP retry | Bazı geçici hataları çözebilir | Hangi adımın tamamlandığını bilemez; duplicate riski vardır |
| Distributed transaction / 2PC | İki sistemi koordine etmeyi hedefler | Altyapı desteği, sıkı bağlılık ve yüksek operasyon maliyeti |
| CDC / transaction log okuma | Uygulama polling ihtiyacını azaltabilir | Debezium veya Kafka Connect gibi ek altyapı gerekir |
| Transactional Outbox | Mevcut local transaction ile event niyetini garanti eder | Polling, tablo bakımı ve duplicate yönetimi gerekir |

## Neden Transactional Outbox'ı seçtik?

Ledgerly zaten finansal yazıları tek PostgreSQL transaction'ında güvenilir şekilde tutuyor. Outbox mesajını aynı transaction'a eklemek mevcut güven sınırımızı genişletmemizi sağladı.

Bu aşamada 2PC veya CDC eklemek öğrenmek istediğimiz problemin önüne büyük bir operasyon katmanı koyacaktı. Outbox ise problemi açık biçimde görmemizi ve çözümü adım adım test etmemizi sağlıyor.

Seçimin ana nedeni:

> Transfer database'de varsa, yayınlanmayı bekleyen event kaydı da mutlaka database'de olsun.

## Ledgerly'de nasıl uyguladık?

### 1. Integration event'i tanımladık

`TransferCompletedIntegrationEvent`, diğer sistemlere açacağımız event sözleşmesini temsil ediyor.

Event type olarak CLR sınıf adını kullanmadık. Açık ve version'lı bir isim belirledik:

```text
wallet.transfer-completed.v1
```

Bu sayede ileride sınıfın namespace'i değişse bile dış sözleşme yanlışlıkla değişmez. Event şeması kırıcı biçimde değişirse `v2` çıkarabiliriz.

### 2. Handler event'i broker'a göndermiyor

`TransferWalletHandler` başarılı transfer için event nesnesini oluşturuyor fakat doğrudan publisher çağırmıyor.

Event'i `IOutboxMessageWriter` üzerinden DbContext'e ekliyor:

```text
TransferWalletHandler
   ├─ Kaynak wallet Debit
   ├─ Hedef wallet Credit
   ├─ Journal oluştur
   ├─ WalletTransfer kaydı oluştur
   └─ Outbox mesajı oluştur
```

Sonra yalnızca bir kez `SaveChanges` çağrılıyor.

### 3. Hepsini tek transaction'da kaydettik

EF Core aynı `LedgerlyDbContext` içindeki değişiklikleri tek database transaction'ında yazıyor:

```text
PostgreSQL transaction
   ├─ wallets update
   ├─ wallet_transfers insert
   ├─ journal_entries insert
   ├─ postings insert
   └─ outbox_messages insert
```

Herhangi biri başarısız olursa hepsi rollback olur.

### 4. Outbox tablosunu oluşturduk

`outbox_messages` tablosunda şunlar bulunuyor:

| Alan | Anlamı |
|---|---|
| `Id` | Event'in benzersiz kimliği |
| `AggregateId` | Bu event için ilgili `TransferId` |
| `Type` | `wallet.transfer-completed.v1` |
| `Payload` | Event'in JSON içeriği |
| `OccurredAtUtc` | Event'in oluştuğu zaman |
| `ProcessedAtUtc` | Başarılı publish zamanı |
| `AttemptCount` | Publish deneme sayısı |
| `LastError` | Son publish hatası |

`ProcessedAtUtc` boşsa mesaj hâlâ gönderilmeyi bekliyor demektir. Pending mesaj sorgusunu hızlandırmak için partial index ekledik.

### 5. Background worker ekledik

`OutboxPublisherWorker`, ASP.NET host tarafından yönetilen bir `BackgroundService`.

Belirli aralıklarla scope açıyor ve `OutboxProcessor`ı çalıştırıyor:

```text
OutboxPublisherWorker
        ↓
OutboxProcessor
        ↓
Pending mesajları PostgreSQL'den oku
        ↓
IIntegrationEventPublisher ile yayınla
   ├─ başarılı → ProcessedAtUtc doldur
   └─ hatalı   → AttemptCount ve LastError güncelle
```

Worker uygulama kapanırken host tarafından durdurulur. Integration testlerinde zamanlama kaynaklı kararsızlık olmaması için otomatik worker kapalı; `OutboxProcessor` test tarafından doğrudan çalıştırılıyor.

### 6. Publisher sınırını ayırdık

`IIntegrationEventPublisher`, mesajın nereye ve nasıl gönderileceğini application akışından ayırıyor.

Bu adımın ilk sürümünde `LoggingIntegrationEventPublisher` kullandık. Bu gerçek broker değildi; event sınırının çalışan baseline'ıydı. Sonraki bölümde aynı interface'in RabbitMQ implementasyonu eklendi.

## Uygulama akışının tamamı

```text
HTTP POST /api/transfers
        ↓
TransferWalletHandler
        ↓
Transfer + Journal + Outbox hazırlanır
        ↓
Tek SaveChanges / tek PostgreSQL transaction'ı
        ↓
HTTP 200 OK

Daha sonra:

OutboxPublisherWorker
        ↓
Pending mesajı bulur
        ↓
Publisher'a gönderir
        ↓
Başarılıysa processed olarak işaretler
```

Broker geçici olarak çalışmıyorsa HTTP transferinin doğruluğu etkilenmez. Event Outbox'ta kalır ve yeniden denenir.

## Nasıl test ettik?

Publisher'ı çalışma sırasında açılıp kapanabilen kontrollü bir test implementasyonu ile değiştirdik.

Test akışı:

```text
1. Publisher hata verecek şekilde ayarlandı
2. 40 TRY transfer gönderildi
3. HTTP 200 döndü
4. Transfer, journal ve Outbox birlikte commit edildi
5. İlk Outbox işleme denemesi başarısız oldu
6. AttemptCount = 1 ve LastError dolu kaldı
7. Mesaj pending olarak korundu
8. Publisher düzeltildi
9. İkinci deneme başarılı oldu
10. AttemptCount = 2 ve ProcessedAtUtc doldu
```

Ayrıca aynı transfer HTTP seviyesinde aynı `Idempotency-Key` ile tekrar gönderildi. Eski makbuz döndü ve ikinci bir Outbox satırı oluşmadı.

Tam solution sonucu:

```text
60 domain testi
18 application testi
83 integration testi
161 başarılı test
```

## Outbox exactly-once sağlıyor mu?

Hayır. Outbox event kaybını önler fakat aynı event'in iki kez gönderilmesini tamamen engelleyemez.

Şu küçük zaman aralığını düşünelim:

```text
1. Event broker'a başarıyla gönderildi
2. Uygulama ProcessedAtUtc yazamadan çöktü
3. Uygulama yeniden başladı
4. Mesaj hâlâ pending göründü
5. Aynı event tekrar gönderildi
```

Bu yüzden sağladığımız garanti **at-least-once delivery**:

> Mesaj kaybolmasın; gerekirse birden fazla kez gelsin.

Consumer aynı `EventId` değerini daha önce işleyip işlemediğini kontrol etmelidir. Bunu bir sonraki Inbox / Idempotent Consumer senaryosunda uygulayacağız.

## Çözümün sınırları nelerdir?

Şu anda bilinçli olarak bırakılan sınırlar:

- Bu bölümün ilk sürümünde gerçek RabbitMQ publisher yoktu; sonraki adımda eklendi.
- Retry işlemlerinde exponential backoff ve jitter yok.
- Sürekli hata veren poison mesajlar için dead-letter politikası yok.
- İşlenmiş Outbox satırları için retention veya arşivleme yok.
- Birden fazla uygulama instance'ı aynı pending mesajı okuyup duplicate publish edebilir.
- Consumer duplicate event'e karşı henüz korunmuyor.

Bu maddeler çözümün yanlış olduğu anlamına gelmiyor. Bir sonraki gerçek sistem problemlerini görünür hâle getiriyor.

## Idempotency ile Outbox arasındaki fark

Bu iki kavram birlikte kullanılıyor ama aynı işi yapmıyor:

| Kavram | Koruduğu problem |
|---|---|
| HTTP idempotency | Aynı transfer isteğinin parayı iki kez taşıması |
| Transactional Outbox | Gerçekleşen transferin eventinin kaybolması |
| Idempotent Consumer / Inbox | Aynı event tekrar gelirse etkinin iki kez uygulanması |

Finansal event akışında bu üç koruma birbirini tamamlar.

## Mülakatta nasıl anlatırım?

> Transactional Outbox, business verisiyle yayınlanması gereken event'i aynı local database transaction'ında saklama pattern'idir. Ledgerly'de transfer commit'i ile broker publish'inin iki ayrı write olduğunu publisher'ı hata verdirerek reproduce ettim. Transfer ve journal PostgreSQL'de kalırken event kayboldu; idempotent HTTP retry da event'i yeniden üretmedi. `TransferCompleted` event'ini transfer, bakiye ve journal ile aynı transaction'da `outbox_messages` tablosuna yazdım. Background worker pending mesajları publish ediyor; hata ve deneme bilgisini kalıcı tutarak retry ediyor. Böylece event kaybetmiyoruz. Ancak publish başarılı olduktan sonra processed işareti yazılmadan crash olabileceği için teslimat at-least-once; consumer'ın `EventId` ile idempotent olması gerekiyor.

Kanonik teknik kaynaklar: Ledgerly `docs/labs/007-transactional-outbox/README.md`, `docs/adr/0012-transactional-outbox.md`, `docs/journey/12-transactional-outbox.md`.
