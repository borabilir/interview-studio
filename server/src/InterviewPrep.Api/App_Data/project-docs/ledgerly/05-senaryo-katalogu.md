# Senaryo Kataloğu

## Senaryo nedir?

Senaryo, sistemi belirli bir koşulda çalıştırıp ne olduğunu gözlediğimiz örnektir. “İki istek aynı kullanıcı için aynı anda wallet açmaya çalışırsa ne olur?” bir senaryodur.

Senaryo kataloğu, inceleyeceğimiz örneklerin listesidir. Ne için kullanılır? Bir teknolojiyi sırf adını kullanmış olmak için eklemek yerine, hangi davranışı öğrenmek istediğimizi görünür yapmak için. Aşağıdaki maddeler tamamlanmış özellik listesi değildir.

Bu katalog, gerçek hayat problemlerini planlanan lab çalışmalarına bağlar. Durumlar implementasyon ilerledikçe güncellenir.

| ID | Problem | Ana kavramlar | Durum |
|---|---|---|---|
| S-001 | Aynı transfer isteği eşzamanlı olarak üç kez geliyor | Idempotency, unique constraint | Planlandı |
| S-002 | Aynı wallet bakiyesi iki kez harcanıyor | Concurrency, locking, isolation | Planlandı |
| S-003 | Debit, credit ve transfer kaydı yarım kalıyor | ACID, transaction boundary | Planlandı |
| S-004 | Transaction history sorgusu milyonlarca kayıtta yavaşlıyor | Execution plan, index, pagination | Planlandı |
| S-005 | Database commit oluyor fakat event yayınlanamıyor | Transactional Outbox | Planlandı |
| S-006 | Broker aynı event'i tekrar teslim ediyor | Inbox, idempotent consumer | Planlandı |
| S-007 | Event'ler yanlış sırayla geliyor | Ordering, aggregate version | Planlandı |
| S-008 | Fraud servisi gecikiyor veya cevap vermiyor | Timeout, retry, circuit breaker | Planlandı |
| S-009 | Banka işlemi yapıyor fakat response kayboluyor | Unknown outcome, reconciliation | Planlandı |
| S-010 | API 1 instance'tan 20 instance'a çıkarılıyor | Horizontal scaling, shared state | Planlandı |
| S-011 | Redis kullanılamaz hâle geliyor | Cache fallback, degraded mode | Planlandı |
| S-012 | MongoDB projection verisi kayboluyor | Replay, projection rebuild | Planlandı |
| S-013 | Toplu maaş ödemesi kısmen tamamlanıyor | Saga, fan-out, compensation | Planlandı |
| S-014 | Production transfer endpoint'i `500` dönüyor | Incident response, runbook | Planlandı |
| S-015 | Saniyede 10.000 istekte latency yükseliyor ama CPU düşük | Bottleneck analysis, tracing, waits | Planlandı |

## Bir senaryo ne zaman tamamlanmış sayılır?

- Problem kontrollü biçimde reproduce edildi.
- Korunacak invariant veya SLO yazıldı.
- Root cause kanıtlandı.
- En az iki çözüm alternatifi değerlendirildi.
- Trade-off ve karar kaydedildi.
- Implementasyon tamamlandı.
- Başlangıç deneyi tekrar çalıştırıldı.
- Regression testi eklendi.
- Lab belgesi ve mülakat özeti yazıldı.

## İlk önerilen senaryo sırası

1. `S-003` — Lokal transaction sınırı
2. `S-002` — Eşzamanlı double-spending
3. `S-001` — Concurrent idempotency
4. `S-004` — SQL performansı
5. `S-005` — Outbox ihtiyacı

Bu sıra, önce finansal doğruluğu kurup ardından dağıtık sistem karmaşıklığını eklemeyi sağlar.
