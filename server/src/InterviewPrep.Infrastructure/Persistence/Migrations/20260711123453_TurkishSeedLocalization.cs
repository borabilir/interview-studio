using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InterviewPrep.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class TurkishSeedLocalization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "Topics"
                SET "Category" = CASE "Name"
                    WHEN 'C#' THEN 'Programlama Dilleri'
                    WHEN 'SQL' THEN 'Veri'
                    WHEN 'Redis' THEN 'Veri'
                    WHEN 'Kafka' THEN 'Dağıtık Sistemler'
                    WHEN 'System Design' THEN 'Mimari'
                    WHEN 'Banking' THEN 'Alan Bilgisi'
                    WHEN 'Ziraat Technology' THEN 'Kariyer'
                    WHEN 'Agile' THEN 'Çalışma Biçimi'
                    WHEN 'Security' THEN 'Mimari'
                    ELSE "Category"
                END,
                "Description" = "Name" || ' için mülakat hazırlık notları ve pratik çalışmaları.'
                WHERE "Description" LIKE 'Interview preparation notes and practice for %';

                UPDATE "Notes"
                SET "Title" = 'Async/await mülakat özeti',
                    "Content" = '# Async/await

                `async` ve `await`, thread''i bloke etmeden çalışan operasyonları birleştirmeyi sağlar. İstek akışında `.Result` ve `.Wait()` kullanmaktan kaçın; bunlar thread''leri bloke edebilir ve synchronization context bulunan ortamlarda deadlock oluşturabilir.

                ## Kontrol listesi

                - [x] Cancellation token
                - [x] `ConfigureAwait` trade-off''ları
                - [ ] `ValueTask` kullanım alanları',
                    "AiSummary" = 'Task composition, cancellation, exception akışı ve sync-over-async yaklaşımının neden tehlikeli olduğu anlaşılmalı.',
                    "AiImprovementSuggestions" = 'Task.WhenAll ve bounded concurrency gösteren bir örnek ekle.'
                WHERE "Title" = 'Async/await interview essentials';

                UPDATE "Notes"
                SET "Title" = 'SQL index düşünme modeli',
                    "Content" = '# Index''ler

                B-tree index, seçici okumaları hızlandırmak için yazma maliyeti ve depolama alanı kullanır. Query şekliyle başla; equality predicate, range predicate, sıralama ve include kolonlarını bu sırayla değerlendir.',
                    "AiSummary" = 'Index''leri gerçek query kalıplarına göre tasarla ve execution plan ile doğrula.'
                WHERE "Title" = 'SQL indexing mental model';

                UPDATE "Notes"
                SET "Title" = 'System Design yanıt çerçevesi',
                    "Content" = '# Yapılandırılmış bir yanıt

                1. Kapsamı ve ölçeği netleştir.
                2. API''leri ve veri modelini tanımla.
                3. High-level akışı çiz.
                4. Darboğazları ayrıntılı incele.
                5. Reliability, security ve observability konularını tartış.',
                    "AiSummary" = 'Requirements ve tahminlerle başla, ardından trade-off''ları açıkça belirt.'
                WHERE "Title" = 'System design answer framework';

                UPDATE "NoteVersions"
                SET "Title" = (SELECT "Title" FROM "Notes" WHERE "Notes"."Id" = "NoteVersions"."NoteId"),
                    "Content" = (SELECT "Content" FROM "Notes" WHERE "Notes"."Id" = "NoteVersions"."NoteId"),
                    "ChangeSummary" = 'Başlangıç seed sürümü'
                WHERE "Version" = 1 AND "ChangeSummary" = 'Initial seeded version';

                UPDATE "CodingQuestions"
                SET "Title" = 'Trade-off''larıyla Two Sum',
                    "Description" = 'Toplamı target değerine eşit olan iki sayının index''lerini döndür. Time ve space complexity analizini açıkla.',
                    "StarterCode" = 'public int[] TwoSum(int[] numbers, int target)
                {
                    // Çözümünüz
                }',
                    "ExpectedSolution" = 'Değerden index''e giden bir Dictionary kullan ve complement değerini tek geçişte kontrol et.'
                WHERE "Title" = 'Two Sum with trade-offs';

                UPDATE "CodingQuestions"
                SET "Title" = 'Hesap ledger bakiyelerini toplama',
                    "Description" = 'Debit ve credit kayıtlarından her hesabın son bakiyesini decimal hassasiyetini koruyarak hesapla.',
                    "StarterCode" = 'public IReadOnlyDictionary<string, decimal> Calculate(IEnumerable<Entry> entries)
                {
                    // Çözümünüz
                }',
                    "ExpectedSolution" = 'Hesaba göre grupla; currency ve transaction state doğrulaması yaparak işaretli decimal tutarları topla.'
                WHERE "Title" = 'Aggregate account ledger balances';

                UPDATE "CodingAttempts"
                SET "BestPracticesFeedback" = 'İyi bir single-pass çözüm. Sonuç değişkenlerini daha açık adlandır ve yinelenen değer davranışını belirt.',
                    "InterviewFeedback" = 'Güçlü yanıt: O(n) analizi doğru ve implementasyon kısa. Kodlamadan önce çözüm bulunamadığındaki sözleşmeyi açıkla.',
                    "FollowUpQuestions" = 'Belleğe sığmayacak kadar büyük bir girdiyi nasıl ele alırdın?',
                    "AlternativeSolution" = 'Value-index çiftlerini sırala ve daha düşük hash maliyetiyle O(n log n) çalışan two-pointer yaklaşımını kullan.',
                    "SeniorLevelImprovements" = 'Input sözleşmesini ve null davranışını tanımla; Dictionary capacity preallocation seçeneğini benchmark et.'
                WHERE "CorrectnessScore" = 94
                  AND "AttemptNumber" = 1
                  AND "CodingQuestionId" IN (
                    SELECT "Id" FROM "CodingQuestions" WHERE "Title" = 'Trade-off''larıyla Two Sum'
                  );

                UPDATE "CodingAttempts"
                SET "BestPracticesFeedback" = 'Decimal kullan, her aggregation için tek currency doğrula ve reverse edilen kayıtların nasıl temsil edileceğine karar ver.',
                    "InterviewFeedback" = 'Temel aggregation doğru; ancak banking seviyesinde bir yanıt idempotency, currency ve transaction status konularını ele almalı.',
                    "FollowUpQuestions" = 'Belleğe sığmayan bir ledger''ı nasıl işlerdin?',
                    "AlternativeSolution" = 'Sıralı kayıtları stream et ve artımlı hesap toplamlarını idempotency key''leriyle kalıcılaştır.',
                    "SeniorLevelImprovements" = 'Domain validation ile aggregation''ı ayır ve parayı amount + currency olarak modelle.'
                WHERE "CorrectnessScore" = 76
                  AND "AttemptNumber" = 1
                  AND "CodingQuestionId" IN (
                    SELECT "Id" FROM "CodingQuestions" WHERE "Title" = 'Hesap ledger bakiyelerini toplama'
                  );

                UPDATE "Flashcards"
                SET "Question" = 'IEnumerable ile IQueryable arasındaki fark nedir?',
                    "Answer" = 'IEnumerable değerlendirmeyi process içinde sürdürür; IQueryable ise provider''ın çoğunlukla SQL''e çevirebildiği bir expression tree taşır.'
                WHERE "Question" = 'What is the difference between IEnumerable and IQueryable?';
                UPDATE "Flashcards"
                SET "Question" = 'Covering index ne zaman yararlıdır?',
                    "Answer" = 'Index, seçici bir query için gereken tüm kolonları içerdiğinde base table lookup işlemlerini azaltır veya tamamen önler.'
                WHERE "Question" = 'When is a covering index useful?';
                UPDATE "Flashcards"
                SET "Question" = 'Kafka''da consumer group hangi problemi çözer?',
                    "Answer" = 'Partition''ları paralel işleme için consumer''lar arasında dağıtır; gruptaki her partition aynı anda tek bir consumer tarafından sahiplenilir.'
                WHERE "Question" = 'What problem does a consumer group solve in Kafka?';
                UPDATE "Flashcards"
                SET "Question" = 'Üç cache invalidation stratejisi say.',
                    "Answer" = 'TTL, write sırasında explicit invalidation ve versioned key kullanımı; her biri freshness, karmaşıklık ve depolama arasında trade-off oluşturur.'
                WHERE "Question" = 'Name three cache invalidation strategies.';

                UPDATE "InterviewSessions"
                SET "Title" = 'Backend teknik deneme mülakatı #1',
                    "SummaryFeedback" = 'Temeller iyi. Varsayımlarını açıkça belirt ve trade-off''ları yanıtın daha başında sayısallaştır.'
                WHERE "Title" = 'Backend technical mock #1';
                UPDATE "InterviewAnswers"
                SET "Question" = 'Bir payment endpoint''ini nasıl idempotent hale getirirsin?',
                    "Answer" = 'Client bir idempotency key gönderir. Bu anahtarı response ile birlikte saklar, retry isteklerinde aynı response''u döndürürüz.',
                    "MissingDetails" = 'Payment state ile key persistence arasındaki atomicity, request fingerprint, expiration ve eşzamanlı yinelenen istekler.',
                    "Feedback" = 'Temel yaklaşım doğru. Eşzamanlı retry isteklerini güvenli kılan unique constraint ve transaction boundary''yi açıkla.',
                    "FollowUpQuestions" = 'Key nerede saklanır? Ne kadar yaşamalıdır? Aynı key farklı bir payload ile gelirse ne olur?'
                WHERE "Question" = 'How would you make a payment endpoint idempotent?';

                UPDATE "SystemDesignScenarios"
                SET "Problem" = 'Güvenli ve güvenilir bir payment orchestration service tasarla.',
                    "Requirements" = 'Payment intent oluşturma, authorize, capture, refund ve durum sorgulama.',
                    "Constraints" = 'Güçlü auditability, duplicate charge olmaması, dış provider hataları ve regülasyon sınırları.',
                    "Architecture" = 'API gateway → payment orchestrator → provider adapter''ları; transactional outbox değiştirilemez state değişikliklerini yayınlar.',
                    "Pros" = 'Açık state machine, provider izolasyonu ve replay edilebilir event''ler.',
                    "Cons" = 'Operasyonel karmaşıklık ve dikkatli reconciliation gerekir.',
                    "Scalability" = 'Merchant veya payment identifier''a göre partition et; stateless orchestration worker''larını yatay ölçekle.',
                    "Security" = 'Ödeme araçlarını tokenize et, hassas veriyi şifrele, least-privilege provider credential kullan ve değiştirilemez audit trail tut.',
                    "Caching" = 'Salt okunur merchant configuration verisini cache''le; cache''i hiçbir zaman payment state için source of truth kabul etme.',
                    "Monitoring" = 'Authorization oranları, provider latency, stuck-state yaşı ve reconciliation uyumsuzlukları.',
                    "Logging" = 'Sıkı redaction uygulanan structured ve correlated log''lar.',
                    "MessageQueue" = 'Transactional outbox ve idempotent handler kullanan at-least-once consumer''lar.',
                    "Database" = 'Relational ledger ve payment state; append-only audit/event kayıtları.',
                    "ApiDesign" = 'Idempotency key ile POST /payment-intents; capture/refund için POST; durum için GET.',
                    "AiCritique" = 'Consistency boundary''leri ve belirsiz provider timeout''ları sonrası reconciliation sürecini netleştir.'
                WHERE "Title" = 'Payment System' AND "Problem" LIKE 'Design a secure%';

                UPDATE "SystemDesignScenarios"
                SET "Problem" = 'Email, SMS ve push notification''ları yüksek hacimde güvenilir biçimde ilet.',
                    "Requirements" = 'Template, kullanıcı tercihleri, zamanlama, retry ve delivery tracking.',
                    "Constraints" = 'Provider rate limit''leri, duplicate delivery riski ve bölgesel uyumluluk.',
                    "Architecture" = 'API → durable queue → channel worker''ları → provider''lar; status event''leri analytics pipeline''a akar.',
                    "Pros" = 'Kanal izolasyonu ve bağımsız ölçekleme.',
                    "Cons" = 'Eventual consistency ve karmaşık retry/dead-letter operasyonları.',
                    "Scalability" = 'Tenant ve kanala göre partition et; rate-aware worker pool kullan.',
                    "Security" = 'Alıcı verisini şifrele ve tenant bazlı template authorization uygula.',
                    "Caching" = 'Derlenmiş template''leri ve preference okumalarını kısa TTL ile cache''le.',
                    "Monitoring" = 'Queue depth, mesaj yaşı, gönderim latency, bounce rate ve provider hataları.',
                    "Logging" = 'Mesaj içeriğini veya alıcı PII verisini loglamadan correlation ID kullan.',
                    "MessageQueue" = 'Exponential backoff ile gecikmeli retry ve dead-letter queue.',
                    "Database" = 'Relational metadata ve append-only delivery attempt kayıtları.',
                    "ApiDesign" = 'POST /notifications, GET /notifications/{id} ve callback ingestion endpoint''leri.',
                    "AiCritique" = 'Tenant fairness, poison-message yönetimi ve preference consistency stratejisi ekle.'
                WHERE "Title" = 'Notification System' AND "Problem" LIKE 'Deliver email%';

                UPDATE "StudyPlans"
                SET "Title" = 'Backend mülakat odağı',
                    "Notes" = 'Etkisi yüksek olan en zayıf alanlara öncelik ver.'
                WHERE "Title" = 'Backend interview focus';
                UPDATE "StudyPlanItems" SET "Title" = 'Query plan ve index''leri gözden geçir' WHERE "Title" = 'Review query plans and indexes';
                UPDATE "StudyPlanItems" SET "Title" = 'Derin çalışma: payment reliability' WHERE "Title" = 'Deep dive: payment reliability';
                UPDATE "StudyPlanItems" SET "Title" = 'Kafka flashcard tekrarı' WHERE "Title" = 'Kafka flashcard review';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Kullanıcının migration sonrasında düzenlemiş olabileceği içerikler güvenli biçimde geri çevrilemez.
        }
    }
}
