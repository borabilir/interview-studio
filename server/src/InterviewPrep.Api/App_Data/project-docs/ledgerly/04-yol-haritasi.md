# Evrim Yol Haritası

Yol haritası takvim değil, öğrenme sırasıdır. Bir aşama yalnızca kod yazıldığında değil; test, lab ve dokümantasyonu tamamlandığında bitmiş sayılır.

## Aşama 0 — Inception

**Durum:** Başlangıç amacı, yöntem, invariant ve dokümantasyon zemini oluşturuldu

- Proje amacı ve kapsamı
- Çalışma yöntemi
- Ubiquitous language
- İlk business invariant'ları
- İlk senaryo kataloğu
- Dokümantasyon altyapısı

## Aşama 1 — Basit çalışan çekirdek

**Durum (2026-09-16):** Devam ediyor. Create Wallet, Get Wallet (ID ile okuma), PostgreSQL ve HTTP testleri tamamlandı. POST Location üzerinden yeni wallet okunabiliyor. Küçük bir concurrency ön lab'ında aynı wallet'ın eşzamanlı oluşturulması 201/409 ile doğrulandı; bu, Aşama 2'deki double-spending veya idempotency çalışmalarının tamamlandığı anlamına gelmez. Double-entry ledger için dengeli JournalEntry/Posting domain modeli ve 29 yeni domain testi tamamlandı; [19. bölüm](19-double-entry-ledger-domain.md). LedgerAccount domain modeli ve 5 yeni testi de tamamlandı; [20. bölüm](20-ledger-account-domain.md). Hesap/journal/posting persistence, test bakiyesi yatırma ve transfer sıradadır. Toplam 67 test geçti.

- Tek ASP.NET Core uygulaması
- İlişkisel veritabanı
- Wallet oluşturma
- Test bakiyesi yatırma
- Wallet-to-wallet transfer
- Bakiye ve işlem geçmişi
- Double-entry ledger
- Domain ve integration testleri

Bu aşamanın amacı dağıtık sistem kurmak değil, doğruluk için ölçülebilir bir baseline oluşturmaktır.

## Aşama 2 — Concurrency ve idempotency

- Eşzamanlı double-spending problemi
- Optimistic ve pessimistic locking karşılaştırması
- Transaction isolation
- HTTP idempotency
- Aynı idempotency key'in çoklu instance'ta işlenmesi

## Aşama 3 — SQL performansı

- Büyük transaction-history veri seti
- Slow query tespiti
- Execution plan analizi
- Composite/covering index
- Cursor pagination
- Partition değerlendirmesi

## Aşama 4 — Event-driven iletişim

- Domain event ve integration event ayrımı
- Database commit ile broker publish arasındaki boşluk
- Transactional Outbox
- Kafka/Redpanda
- Duplicate delivery ve Inbox
- Event ordering ve schema evolution

## Aşama 5 — CQRS ve NoSQL

- Query/write model ayrımı
- MongoDB wallet summary
- MongoDB transaction history
- Projection lag
- Stale read
- Projection rebuild
- Index ve shard-key deneyleri

## Aşama 6 — Dış sistem ve saga

- Fake Bank Provider
- Fake Fraud Provider
- Timeout, retry, circuit breaker ve bulkhead
- Deposit/withdrawal saga
- Compensation ve reversal
- Reconciliation

## Aşama 7 — Servis ayrıştırma

- Bounded context ve deployment boundary ayrımı
- Transfer/Ledger servis sınırları
- Database ownership
- Sync/async contract seçimi
- Distributed monolith riskleri

## Aşama 8 — Ölçek ve operasyon

- Tek instance'tan çoklu instance'a geçiş
- Load ve stress testleri
- Connection pool ve lock darboğazları
- Kafka partition/consumer lag
- Redis cache ve rate limiting
- Observability, SLO ve alert
- GameDay, runbook ve postmortem

## Aşama 9 — İleri senaryolar

- Toplu maaş ödemesi
- Hot wallet ve noisy neighbor
- Backpressure ve load shedding
- Backup/restore
- Container orchestration
- Multi-region tasarım değerlendirmesi

> Yol haritası bir teknoloji checklist'i değildir. Bir problem oluşmazsa ilgili çözüm ertelenebilir veya tamamen reddedilebilir.
