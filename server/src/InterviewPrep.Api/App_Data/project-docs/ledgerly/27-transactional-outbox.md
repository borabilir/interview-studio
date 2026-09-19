# Transactional Outbox: DB Commit Oldu Ama Event Gitmediyse Ne Olur?

## Neden event göndermek istiyoruz?

Transfer tamamlandığında her işi transfer endpoint'inin içinde yapmak istemeyiz. Başka bileşenler bu olaydan haberdar olabilir:

```text
TransferCompleted
   ├─ Notification kullanıcıya bildirim yollar
   ├─ Fraud şüpheli hareketi inceler
   ├─ Reporting raporları günceller
   └─ MongoDB işlem geçmişi read model'ini günceller
```

Bu bileşenlere daha sonra RabbitMQ üzerinden event göndereceğiz. Önce event'i güvenilir şekilde broker'a ulaştırma problemini ele aldık.

## Naif yaklaşım neden tehlikeli?

İlk akla gelen kod şu sırayla çalışır:

```text
Transferi PostgreSQL'e kaydet
Event'i broker'a gönder
```

Burada iki ayrı sistem vardır. PostgreSQL başarılı olduktan sonra broker kapalı olabilir veya uygulama çökebilir:

```text
PostgreSQL commit       ✅
Broker publish          ❌
```

Transfer gerçekten gerçekleşmiştir fakat notification, fraud ve read model bundan haberdar olamaz.

## Problemi nasıl reproduce ettik?

Publisher'ı bilerek exception fırlatacak hâle getirdik. Outbox eklenmeden önce gerçek HTTP akışında şunu gördük:

```text
API cevabı:             500
Kaynak:                 100 → 60
Hedef:                    0 → 40
Transfer ve journal:    database'de var
Event:                   teslim edilmedi
Retry edilecek kayıt:    yok
```

Kullanıcı aynı `Idempotency-Key` ile tekrar gönderince para yeniden taşınmadı; bu iyi. Fakat handler eski makbuzu doğrudan döndürdüğü için event yayınlama koduna tekrar gelmedi. Idempotency ile Outbox farklı problemleri çözüyor.

## Transaction neden tek başına yetmiyor?

Elimizde iki farklı kaynak var:

```text
PostgreSQL transaction
RabbitMQ publish
```

Normal PostgreSQL transaction'ı RabbitMQ'yu rollback edemez. Önce publish etmek de çözüm değildir; event gider ama database commit olmazsa tüketiciler gerçekleşmemiş bir transferi görür.

Bu duruma **dual-write problem** denir: aynı business işlemi için iki bağımsız sisteme tutarlı biçimde yazmaya çalışıyoruz.

## Transactional Outbox nasıl çözüyor?

Broker'a request sırasında doğrudan yazmak yerine, “bu event gönderilmeli” bilgisini PostgreSQL'e yazıyoruz:

```text
Tek PostgreSQL transaction'ı
   ├─ Kaynak bakiyeyi azalt
   ├─ Hedef bakiyeyi artır
   ├─ Transferi kaydet
   ├─ Journal ve posting'leri kaydet
   └─ Outbox mesajını kaydet
```

PostgreSQL açısından bunların tamamı tek transaction'dır:

```text
Hepsi commit ✅
veya
Hepsi rollback ❌
```

Bu sayede transfer varsa gönderilmeyi bekleyen event kaydı da vardır. Transfer rollback olduysa yanlışlıkla gönderilecek event de oluşmaz.

## Outbox tablosunda ne var?

```text
Id                 Event'in benzersiz kimliği
AggregateId        TransferId
Type               wallet.transfer-completed.v1
Payload            JSON event içeriği
OccurredAtUtc      Event ne zaman oluştu?
ProcessedAtUtc     Ne zaman başarıyla yayınlandı?
AttemptCount       Kaç kez denendi?
LastError          Son hata neydi?
```

`ProcessedAtUtc` boşsa mesaj hâlâ pending durumdadır.

## Background worker ne yapıyor?

HTTP isteği artık broker'ı beklemiyor. Uygulama içindeki `BackgroundService` belirli aralıklarla pending mesajları okuyor:

```text
Outbox'tan pending mesajı oku
            ↓
Broker publisher'a gönder
      ├─ Başarılı → processed olarak işaretle
      └─ Hatalı   → hatayı kaydet, sonra tekrar dene
```

Broker geçici olarak kapalı olsa bile transfer endpoint'i başarılı olabilir. Event database'de güvenle bekler.

## Testte ne oldu?

Publisher'ı önce kapalı, sonra açık hâle getirdik:

```text
Transfer isteği                  → 200 OK
Transfer + outbox                → birlikte commit
İlk publish                      → hata
AttemptCount                     → 1
LastError                        → dolu
ProcessedAtUtc                   → boş

Publisher düzeldi
İkinci publish                   → başarılı
AttemptCount                     → 2
LastError                        → temiz
ProcessedAtUtc                   → dolu
```

HTTP isteğinin aynı idempotency key ile retry edilmesi ikinci bir outbox mesajı oluşturmadı.

## Bu exactly-once sağlıyor mu?

Hayır. Outbox event kaybetmemeyi sağlar ama duplicate ihtimalini tamamen yok etmez.

Şöyle bir an vardır:

```text
Event broker'a başarıyla gitti
        ↓
Uygulama processed bilgisini yazamadan çöktü
        ↓
Mesaj hâlâ pending göründü
        ↓
Aynı event tekrar gönderildi
```

Bu nedenle garanti **at-least-once delivery** olur: event en az bir kez gönderilir, bazen birden fazla kez gelebilir. Consumer, `EventId` değerini kullanarak duplicate event'i işlememelidir. Bunu Inbox/Idempotent Consumer aşamasında yapacağız.

## Neden distributed transaction kullanmadık?

PostgreSQL ile broker'ı 2PC benzeri bir protokolle koordine etmek bazı teknolojilerde mümkün olabilir; fakat sistemi altyapıya sıkı bağlar, hata ve operasyon modelini ağırlaştırır. Outbox, zaten güvendiğimiz local database transaction'ını kullanarak daha basit bir eventual consistency modeli kuruyor.

CDC ile PostgreSQL transaction log'unu Debezium gibi bir araçla okumak da güçlü bir alternatiftir. Şu an önce pattern'in temel problemini ve davranışını öğreniyoruz.

## Şu anda gerçek RabbitMQ var mı?

Henüz yok. Şu an event sınırı, logging publisher, kalıcı Outbox ve retry worker hazır. Testte broker davranışını kontrol edilebilir bir publisher ile simüle ettik. Sıradaki adım gerçek RabbitMQ container'ı ve publisher adaptörünü eklemek.

## Mevcut sınırlar

- Exponential backoff ve jitter henüz yok.
- Sürekli başarısız mesajlar için dead-letter politikası yok.
- İşlenmiş mesajlar için retention politikası yok.
- Birden fazla instance aynı mesajı publish edebilir.
- Consumer duplicate event'e karşı henüz korunmuyor.

## Mülakatta nasıl anlatırım?

> Transfer commit'i ile broker publish'inin iki ayrı write olduğunu publisher'ı hata verdirerek reproduce ettim. Transfer ve journal database'de kaldı fakat event kayboldu; idempotent HTTP retry da bu event'i yeniden üretmedi. Transfer event'ini business verilerle aynı PostgreSQL transaction'ında Outbox tablosuna yazdım. Background worker pending mesajları publish ediyor, hata ve deneme sayısını kalıcı tutarak retry ediyor. Bu event kaybını önlüyor ama publish sonrası processed işaretleme arasında crash olabileceği için at-least-once davranıyor; consumer'ın EventId ile idempotent olması gerekiyor.

Kanonik teknik kaynaklar: Ledgerly `docs/labs/007-transactional-outbox/README.md`, `docs/adr/0012-transactional-outbox.md`, `docs/journey/12-transactional-outbox.md`.
