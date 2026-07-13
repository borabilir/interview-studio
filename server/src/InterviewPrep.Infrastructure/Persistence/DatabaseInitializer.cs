using InterviewPrep.Domain.Entities;
using InterviewPrep.Domain.Enums;
using System.Data;
using Microsoft.EntityFrameworkCore;

namespace InterviewPrep.Infrastructure.Persistence;

internal static class DatabaseInitializer
{
    private static readonly IReadOnlyDictionary<string, string[]> LegacySchema =
        new Dictionary<string, string[]>(StringComparer.Ordinal)
        {
            ["Topics"] = ["Id", "Name", "Category", "Description", "Priority", "Progress", "ConfidenceLevel", "EstimatedMastery"],
            ["Notes"] = ["Id", "Title", "Content", "CurrentVersion", "TopicId", "IsPinned", "IsFavorite"],
            ["NoteVersions"] = ["Id", "NoteId", "Version", "Title", "Content", "ChangeSummary"],
            ["CodingQuestions"] = ["Id", "Title", "Description", "Difficulty", "Language", "StarterCode", "ExpectedSolution", "Confidence", "TopicId"],
            ["CodingAttempts"] = ["Id", "CodingQuestionId", "Solution", "Language", "AttemptNumber", "CorrectnessScore", "ReadabilityScore", "PerformanceScore", "ArchitectureScore"],
            ["Flashcards"] = ["Id", "Question", "Answer", "Difficulty", "TopicId", "NextReviewAtUtc", "IntervalDays", "RepetitionCount", "EaseFactor"],
            ["InterviewSessions"] = ["Id", "Title", "Type", "Status", "TechnicalAccuracyScore", "CommunicationScore", "ConfidenceScore", "StructureScore"],
            ["InterviewAnswers"] = ["Id", "InterviewSessionId", "Sequence", "Question", "Answer", "TechnicalAccuracyScore", "CommunicationScore"],
            ["SystemDesignScenarios"] = ["Id", "Title", "Problem", "Requirements", "Constraints", "Architecture", "Confidence", "TopicId"],
            ["StudyPlans"] = ["Id", "Title", "ScheduledForUtc", "Status", "PlannedMinutes", "ActualMinutes"],
            ["StudyPlanItems"] = ["Id", "StudyPlanId", "TopicId", "Title", "ActivityType", "PlannedMinutes", "IsCompleted", "SortOrder"],
            ["ProgressEntries"] = ["Id", "ActivityDateUtc", "MinutesStudied", "QuestionsSolved", "CodingAttempts", "MockInterviews", "ConfidenceScore", "TopicId"],
            ["Tags"] = ["Id", "Name", "Slug", "Color"],
            ["TopicTag"] = ["Id", "TopicId", "TagId"],
            ["NoteTag"] = ["Id", "NoteId", "TagId"],
            ["CodingQuestionTag"] = ["Id", "CodingQuestionId", "TagId"],
            ["FlashcardTag"] = ["Id", "FlashcardId", "TagId"],
            ["SystemDesignScenarioTag"] = ["Id", "SystemDesignScenarioId", "TagId"]
        };

    public static async Task InitializeAsync(
        InterviewPrepDbContext context,
        CancellationToken cancellationToken = default)
    {
        await BaselineLegacyDatabaseAsync(context, cancellationToken);
        await context.Database.MigrateAsync(cancellationToken);

        if (await context.Topics.AnyAsync(cancellationToken))
        {
            return;
        }

        var now = DateTime.UtcNow;
        var topics = new[]
        {
            CreateTopic("C#", "Programlama Dilleri", Priority.Critical, 72, 68, "#8B5CF6"),
            CreateTopic(".NET", "Backend", Priority.Critical, 65, 61, "#6366F1"),
            CreateTopic("SQL", "Veri", Priority.High, 58, 55, "#0EA5E9"),
            CreateTopic("React", "Frontend", Priority.High, 76, 70, "#06B6D4"),
            CreateTopic("REST API", "Backend", Priority.High, 69, 66, "#14B8A6"),
            CreateTopic("Redis", "Veri", Priority.Medium, 42, 44, "#EF4444"),
            CreateTopic("Kafka", "Dağıtık Sistemler", Priority.High, 34, 38, "#F97316"),
            CreateTopic("Docker", "DevOps", Priority.Medium, 63, 59, "#2563EB"),
            CreateTopic("Kubernetes", "DevOps", Priority.High, 29, 33, "#3B82F6"),
            CreateTopic("System Design", "Mimari", Priority.Critical, 48, 46, "#A855F7"),
            CreateTopic("Banking", "Alan Bilgisi", Priority.High, 57, 52, "#22C55E"),
            CreateTopic("Ziraat Technology", "Kariyer", Priority.High, 45, 47, "#16A34A"),
            CreateTopic("Agile", "Çalışma Biçimi", Priority.Medium, 81, 75, "#F59E0B"),
            CreateTopic("Security", "Mimari", Priority.High, 38, 40, "#F43F5E")
        };
        for (var index = 0; index < topics.Length; index++)
        {
            topics[index].SortOrder = index;
        }

        var topicByName = topics.ToDictionary(topic => topic.Name);
        var tags = new[]
        {
            new Tag { Name = "backend", Slug = "backend", Color = "#6366F1" },
            new Tag { Name = "frontend", Slug = "frontend", Color = "#06B6D4" },
            new Tag { Name = "database", Slug = "database", Color = "#0EA5E9" },
            new Tag { Name = "architecture", Slug = "architecture", Color = "#A855F7" },
            new Tag { Name = "banking", Slug = "banking", Color = "#22C55E" },
            new Tag { Name = "interview", Slug = "interview", Color = "#F59E0B" }
        };

        var tagByName = tags.ToDictionary(tag => tag.Name);
        var topicTags = new[]
        {
            Link(topicByName["C#"], tagByName["backend"]),
            Link(topicByName[".NET"], tagByName["backend"]),
            Link(topicByName["REST API"], tagByName["backend"]),
            Link(topicByName["SQL"], tagByName["database"]),
            Link(topicByName["Redis"], tagByName["database"]),
            Link(topicByName["React"], tagByName["frontend"]),
            Link(topicByName["System Design"], tagByName["architecture"]),
            Link(topicByName["Banking"], tagByName["banking"]),
            Link(topicByName["Ziraat Technology"], tagByName["interview"])
        };

        var asyncNote = new Note
        {
            Title = "Async/await mülakat özeti",
            Content = "# Async/await\n\n`async` ve `await`, thread'i bloke etmeden çalışan operasyonları birleştirmeyi sağlar. İstek akışında `.Result` ve `.Wait()` kullanmaktan kaçın; bunlar thread'leri bloke edebilir ve synchronization context bulunan ortamlarda deadlock oluşturabilir.\n\n## Kontrol listesi\n\n- [x] Cancellation token\n- [x] `ConfigureAwait` trade-off'ları\n- [ ] `ValueTask` kullanım alanları",
            AiSummary = "Task composition, cancellation, exception akışı ve sync-over-async yaklaşımının neden tehlikeli olduğu anlaşılmalı.",
            AiImprovementSuggestions = "Task.WhenAll ve bounded concurrency gösteren bir örnek ekle.",
            IsPinned = true,
            IsFavorite = true,
            TopicId = topicByName["C#"].Id
        };

        var indexingNote = new Note
        {
            Title = "SQL index düşünme modeli",
            Content = "# Index'ler\n\nB-tree index, seçici okumaları hızlandırmak için yazma maliyeti ve depolama alanı kullanır. Query şekliyle başla; equality predicate, range predicate, sıralama ve include kolonlarını bu sırayla değerlendir.",
            AiSummary = "Index'leri gerçek query kalıplarına göre tasarla ve execution plan ile doğrula.",
            IsPinned = true,
            TopicId = topicByName["SQL"].Id
        };

        var designNote = new Note
        {
            Title = "System Design yanıt çerçevesi",
            Content = "# Yapılandırılmış bir yanıt\n\n1. Kapsamı ve ölçeği netleştir.\n2. API'leri ve veri modelini tanımla.\n3. High-level akışı çiz.\n4. Darboğazları ayrıntılı incele.\n5. Reliability, security ve observability konularını tartış.",
            AiSummary = "Requirements ve tahminlerle başla, ardından trade-off'ları açıkça belirt.",
            TopicId = topicByName["System Design"].Id
        };

        var notes = new[] { asyncNote, indexingNote, designNote };
        var noteVersions = notes.Select(note => new NoteVersion
        {
            NoteId = note.Id,
            Version = 1,
            Title = note.Title,
            Content = note.Content,
            ChangeSummary = "Başlangıç seed sürümü"
        }).ToArray();

        var noteTags = new[]
        {
            new NoteTag { NoteId = asyncNote.Id, TagId = tagByName["backend"].Id },
            new NoteTag { NoteId = asyncNote.Id, TagId = tagByName["interview"].Id },
            new NoteTag { NoteId = indexingNote.Id, TagId = tagByName["database"].Id },
            new NoteTag { NoteId = designNote.Id, TagId = tagByName["architecture"].Id }
        };

        var twoSum = new CodingQuestion
        {
            Title = "Trade-off'larıyla Two Sum",
            Description = "Toplamı target değerine eşit olan iki sayının index'lerini döndür. Time ve space complexity analizini açıkla.",
            Difficulty = Difficulty.Easy,
            Language = "csharp",
            StarterCode = "public int[] TwoSum(int[] numbers, int target)\n{\n    // Çözümünüz\n}",
            ExpectedSolution = "Değerden index'e giden bir Dictionary kullan ve complement değerini tek geçişte kontrol et.",
            Confidence = 82,
            TopicId = topicByName["C#"].Id
        };

        var ledgerQuestion = new CodingQuestion
        {
            Title = "Hesap ledger bakiyelerini toplama",
            Description = "Debit ve credit kayıtlarından her hesabın son bakiyesini decimal hassasiyetini koruyarak hesapla.",
            Difficulty = Difficulty.Medium,
            Language = "csharp",
            StarterCode = "public IReadOnlyDictionary<string, decimal> Calculate(IEnumerable<Entry> entries)\n{\n    // Çözümünüz\n}",
            ExpectedSolution = "Hesaba göre grupla; currency ve transaction state doğrulaması yaparak işaretli decimal tutarları topla.",
            Confidence = 61,
            TopicId = topicByName["Banking"].Id
        };

        var codingQuestions = new[] { twoSum, ledgerQuestion };
        var codingAttempts = new[]
        {
            new CodingAttempt
            {
                CodingQuestionId = twoSum.Id,
                AttemptNumber = 1,
                Language = "csharp",
                Solution = "var seen = new Dictionary<int,int>(); for (var i = 0; i < numbers.Length; i++) { var needed = target - numbers[i]; if (seen.TryGetValue(needed, out var j)) return new[] { j, i }; seen[numbers[i]] = i; } return Array.Empty<int>();",
                CorrectnessScore = 94,
                ReadabilityScore = 88,
                PerformanceScore = 96,
                ArchitectureScore = 84,
                BestPracticesFeedback = "İyi bir single-pass çözüm. Sonuç değişkenlerini daha açık adlandır ve yinelenen değer davranışını belirt.",
                InterviewFeedback = "Güçlü yanıt: O(n) analizi doğru ve implementasyon kısa. Kodlamadan önce çözüm bulunamadığındaki sözleşmeyi açıkla.",
                FollowUpQuestions = "Belleğe sığmayacak kadar büyük bir girdiyi nasıl ele alırdın?",
                AlternativeSolution = "Value-index çiftlerini sırala ve daha düşük hash maliyetiyle O(n log n) çalışan two-pointer yaklaşımını kullan.",
                SeniorLevelImprovements = "Input sözleşmesini ve null davranışını tanımla; Dictionary capacity preallocation seçeneğini benchmark et.",
                DurationMinutes = 18,
                SubmittedAtUtc = now.AddHours(-5)
            },
            new CodingAttempt
            {
                CodingQuestionId = ledgerQuestion.Id,
                AttemptNumber = 1,
                Language = "csharp",
                Solution = "return entries.GroupBy(x => x.AccountId).ToDictionary(g => g.Key, g => g.Sum(x => x.Direction == Direction.Credit ? x.Amount : -x.Amount));",
                CorrectnessScore = 76,
                ReadabilityScore = 86,
                PerformanceScore = 72,
                ArchitectureScore = 68,
                BestPracticesFeedback = "Decimal kullan, her aggregation için tek currency doğrula ve reverse edilen kayıtların nasıl temsil edileceğine karar ver.",
                InterviewFeedback = "Temel aggregation doğru; ancak banking seviyesinde bir yanıt idempotency, currency ve transaction status konularını ele almalı.",
                FollowUpQuestions = "Belleğe sığmayan bir ledger'ı nasıl işlerdin?",
                AlternativeSolution = "Sıralı kayıtları stream et ve artımlı hesap toplamlarını idempotency key'leriyle kalıcılaştır.",
                SeniorLevelImprovements = "Domain validation ile aggregation'ı ayır ve parayı amount + currency olarak modelle.",
                DurationMinutes = 31,
                SubmittedAtUtc = now.AddDays(-1).AddHours(-2)
            }
        };

        var flashcards = new[]
        {
            NewCard("IEnumerable ile IQueryable arasındaki fark nedir?", "IEnumerable değerlendirmeyi process içinde sürdürür; IQueryable ise provider'ın çoğunlukla SQL'e çevirebildiği bir expression tree taşır.", Difficulty.Medium, topicByName[".NET"], now.AddHours(-2)),
            NewCard("Covering index ne zaman yararlıdır?", "Index, seçici bir query için gereken tüm kolonları içerdiğinde base table lookup işlemlerini azaltır veya tamamen önler.", Difficulty.Medium, topicByName["SQL"], now.AddHours(4)),
            NewCard("Kafka'da consumer group hangi problemi çözer?", "Partition'ları paralel işleme için consumer'lar arasında dağıtır; gruptaki her partition aynı anda tek bir consumer tarafından sahiplenilir.", Difficulty.Hard, topicByName["Kafka"], now.AddDays(1)),
            NewCard("Üç cache invalidation stratejisi say.", "TTL, write sırasında explicit invalidation ve versioned key kullanımı; her biri freshness, karmaşıklık ve depolama arasında trade-off oluşturur.", Difficulty.Medium, topicByName["Redis"], now.AddDays(3))
        };

        var interview = new InterviewSession
        {
            Title = "Backend teknik deneme mülakatı #1",
            Type = InterviewType.Technical,
            Status = SessionStatus.Completed,
            StartedAtUtc = now.AddDays(-2).AddMinutes(-45),
            CompletedAtUtc = now.AddDays(-2),
            TechnicalAccuracyScore = 74,
            CommunicationScore = 81,
            ConfidenceScore = 67,
            StructureScore = 78,
            SummaryFeedback = "Temeller iyi. Varsayımlarını açıkça belirt ve trade-off'ları yanıtın daha başında sayısallaştır."
        };

        var interviewAnswer = new InterviewAnswer
        {
            InterviewSessionId = interview.Id,
            Sequence = 1,
            Question = "Bir payment endpoint'ini nasıl idempotent hale getirirsin?",
            Answer = "Client bir idempotency key gönderir. Bu anahtarı response ile birlikte saklar, retry isteklerinde aynı response'u döndürürüz.",
            TechnicalAccuracyScore = 78,
            CommunicationScore = 84,
            ConfidenceScore = 70,
            StructureScore = 76,
            MissingDetails = "Payment state ile key persistence arasındaki atomicity, request fingerprint, expiration ve eşzamanlı yinelenen istekler.",
            Feedback = "Temel yaklaşım doğru. Eşzamanlı retry isteklerini güvenli kılan unique constraint ve transaction boundary'yi açıkla.",
            FollowUpQuestions = "Key nerede saklanır? Ne kadar yaşamalıdır? Aynı key farklı bir payload ile gelirse ne olur?"
        };

        var paymentDesign = new SystemDesignScenario
        {
            Title = "Payment System",
            Problem = "Güvenli ve güvenilir bir payment orchestration service tasarla.",
            Requirements = "Payment intent oluşturma, authorize, capture, refund ve durum sorgulama.",
            Constraints = "Güçlü auditability, duplicate charge olmaması, dış provider hataları ve regülasyon sınırları.",
            Architecture = "API gateway → payment orchestrator → provider adapter'ları; transactional outbox değiştirilemez state değişikliklerini yayınlar.",
            Diagram = "api-gateway -> payment-service -> provider-adapter\npayment-service -> payments-db\npayments-db -> outbox-worker -> event-bus",
            Pros = "Açık state machine, provider izolasyonu ve replay edilebilir event'ler.",
            Cons = "Operasyonel karmaşıklık ve dikkatli reconciliation gerekir.",
            Scalability = "Merchant veya payment identifier'a göre partition et; stateless orchestration worker'larını yatay ölçekle.",
            Security = "Ödeme araçlarını tokenize et, hassas veriyi şifrele, least-privilege provider credential kullan ve değiştirilemez audit trail tut.",
            Caching = "Salt okunur merchant configuration verisini cache'le; cache'i hiçbir zaman payment state için source of truth kabul etme.",
            Monitoring = "Authorization oranları, provider latency, stuck-state yaşı ve reconciliation uyumsuzlukları.",
            Logging = "Sıkı redaction uygulanan structured ve correlated log'lar.",
            MessageQueue = "Transactional outbox ve idempotent handler kullanan at-least-once consumer'lar.",
            Database = "Relational ledger ve payment state; append-only audit/event kayıtları.",
            ApiDesign = "Idempotency key ile POST /payment-intents; capture/refund için POST; durum için GET.",
            AiCritique = "Consistency boundary'leri ve belirsiz provider timeout'ları sonrası reconciliation sürecini netleştir.",
            Confidence = 58,
            TopicId = topicByName["System Design"].Id
        };

        var notificationDesign = new SystemDesignScenario
        {
            Title = "Notification System",
            Problem = "Email, SMS ve push notification'ları yüksek hacimde güvenilir biçimde ilet.",
            Requirements = "Template, kullanıcı tercihleri, zamanlama, retry ve delivery tracking.",
            Constraints = "Provider rate limit'leri, duplicate delivery riski ve bölgesel uyumluluk.",
            Architecture = "API → durable queue → channel worker'ları → provider'lar; status event'leri analytics pipeline'a akar.",
            Pros = "Kanal izolasyonu ve bağımsız ölçekleme.",
            Cons = "Eventual consistency ve karmaşık retry/dead-letter operasyonları.",
            Scalability = "Tenant ve kanala göre partition et; rate-aware worker pool kullan.",
            Security = "Alıcı verisini şifrele ve tenant bazlı template authorization uygula.",
            Caching = "Derlenmiş template'leri ve preference okumalarını kısa TTL ile cache'le.",
            Monitoring = "Queue depth, mesaj yaşı, gönderim latency, bounce rate ve provider hataları.",
            Logging = "Mesaj içeriğini veya alıcı PII verisini loglamadan correlation ID kullan.",
            MessageQueue = "Exponential backoff ile gecikmeli retry ve dead-letter queue.",
            Database = "Relational metadata ve append-only delivery attempt kayıtları.",
            ApiDesign = "POST /notifications, GET /notifications/{id} ve callback ingestion endpoint'leri.",
            AiCritique = "Tenant fairness, poison-message yönetimi ve preference consistency stratejisi ekle.",
            Confidence = 51,
            TopicId = topicByName["System Design"].Id
        };

        var studyPlan = new StudyPlan
        {
            Title = "Backend mülakat odağı",
            ScheduledForUtc = now.Date.AddHours(9),
            Status = StudyPlanStatus.InProgress,
            PlannedMinutes = 105,
            ActualMinutes = 30,
            Notes = "Etkisi yüksek olan en zayıf alanlara öncelik ver."
        };

        var planItems = new[]
        {
            new StudyPlanItem { StudyPlanId = studyPlan.Id, TopicId = topicByName["SQL"].Id, Title = "Query plan ve index'leri gözden geçir", ActivityType = StudyActivityType.Topic, PlannedMinutes = 30, IsCompleted = true, SortOrder = 1 },
            new StudyPlanItem { StudyPlanId = studyPlan.Id, TopicId = topicByName["System Design"].Id, ResourceId = paymentDesign.Id, Title = "Derin çalışma: payment reliability", ActivityType = StudyActivityType.SystemDesign, PlannedMinutes = 45, SortOrder = 2 },
            new StudyPlanItem { StudyPlanId = studyPlan.Id, TopicId = topicByName["Kafka"].Id, Title = "Kafka flashcard tekrarı", ActivityType = StudyActivityType.Flashcard, PlannedMinutes = 30, SortOrder = 3 }
        };

        var progressEntries = Enumerable.Range(0, 7)
            .Select(offset => new ProgressEntry
            {
                ActivityDateUtc = now.Date.AddDays(-offset),
                MinutesStudied = 25 + (offset % 3) * 15,
                QuestionsSolved = offset % 2,
                CodingAttempts = offset % 2,
                MockInterviews = offset == 2 ? 1 : 0,
                ConfidenceScore = 68 - offset,
                TopicId = topics[offset % topics.Length].Id
            })
            .ToArray();

        await context.Topics.AddRangeAsync(topics, cancellationToken);
        await context.Tags.AddRangeAsync(tags, cancellationToken);
        await context.Set<TopicTag>().AddRangeAsync(topicTags, cancellationToken);
        await context.Notes.AddRangeAsync(notes, cancellationToken);
        await context.NoteVersions.AddRangeAsync(noteVersions, cancellationToken);
        await context.Set<NoteTag>().AddRangeAsync(noteTags, cancellationToken);
        await context.CodingQuestions.AddRangeAsync(codingQuestions, cancellationToken);
        await context.CodingAttempts.AddRangeAsync(codingAttempts, cancellationToken);
        await context.Flashcards.AddRangeAsync(flashcards, cancellationToken);
        await context.InterviewSessions.AddAsync(interview, cancellationToken);
        await context.InterviewAnswers.AddAsync(interviewAnswer, cancellationToken);
        await context.SystemDesignScenarios.AddRangeAsync([paymentDesign, notificationDesign], cancellationToken);
        await context.StudyPlans.AddAsync(studyPlan, cancellationToken);
        await context.StudyPlanItems.AddRangeAsync(planItems, cancellationToken);
        await context.ProgressEntries.AddRangeAsync(progressEntries, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
    }

    private static async Task BaselineLegacyDatabaseAsync(
        InterviewPrepDbContext context,
        CancellationToken cancellationToken)
    {
        var migrations = context.Database.GetMigrations().ToList();
        if (migrations.Count == 0)
        {
            throw new InvalidOperationException("Uygulanabilir bir EF Core migration bulunamadı.");
        }

        var connection = context.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var historyCheck = connection.CreateCommand();
            historyCheck.CommandText = """
                SELECT COUNT(*)
                FROM sqlite_master
                WHERE type = 'table' AND name = '__EFMigrationsHistory';
                """;
            var historyTableExists = Convert.ToInt32(
                await historyCheck.ExecuteScalarAsync(cancellationToken),
                System.Globalization.CultureInfo.InvariantCulture) > 0;

            if (historyTableExists)
            {
                await using var appliedCheck = connection.CreateCommand();
                appliedCheck.CommandText = "SELECT COUNT(*) FROM \"__EFMigrationsHistory\";";
                if (Convert.ToInt32(
                        await appliedCheck.ExecuteScalarAsync(cancellationToken),
                        System.Globalization.CultureInfo.InvariantCulture) > 0)
                {
                    return;
                }
            }

            if (!await HasCompleteLegacySchemaAsync(connection, cancellationToken))
            {
                return;
            }

            await using var baseline = connection.CreateCommand();
            baseline.CommandText = """
                CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                    "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
                    "ProductVersion" TEXT NOT NULL
                );
                INSERT OR IGNORE INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                VALUES ($migrationId, '8.0.13');
                """;
            var migrationParameter = baseline.CreateParameter();
            migrationParameter.ParameterName = "$migrationId";
            migrationParameter.Value = migrations[0];
            baseline.Parameters.Add(migrationParameter);
            await baseline.ExecuteNonQueryAsync(cancellationToken);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<bool> HasCompleteLegacySchemaAsync(
        System.Data.Common.DbConnection connection,
        CancellationToken cancellationToken)
    {
        await using var tableCheck = connection.CreateCommand();
        tableCheck.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = $tableName;";
        var tableNameParameter = tableCheck.CreateParameter();
        tableNameParameter.ParameterName = "$tableName";
        tableCheck.Parameters.Add(tableNameParameter);

        var existingTableCount = 0;
        foreach (var tableName in LegacySchema.Keys)
        {
            tableNameParameter.Value = tableName;
            var tableExists = Convert.ToInt32(
                await tableCheck.ExecuteScalarAsync(cancellationToken),
                System.Globalization.CultureInfo.InvariantCulture) == 1;
            if (tableExists)
            {
                existingTableCount++;
            }
        }

        if (existingTableCount == 0)
        {
            return false;
        }

        if (existingTableCount != LegacySchema.Count)
        {
            throw new InvalidOperationException(
                "Mevcut SQLite şeması eksik olduğu için otomatik migration baseline işlemi güvenle yapılamadı.");
        }

        foreach (var (tableName, columns) in LegacySchema)
        {
            await using var columnCheck = connection.CreateCommand();
            columnCheck.CommandText =
                "SELECT COUNT(*) FROM pragma_table_info($tableName) WHERE name = $columnName;";
            var columnTableParameter = columnCheck.CreateParameter();
            columnTableParameter.ParameterName = "$tableName";
            columnTableParameter.Value = tableName;
            columnCheck.Parameters.Add(columnTableParameter);
            var columnNameParameter = columnCheck.CreateParameter();
            columnNameParameter.ParameterName = "$columnName";
            columnCheck.Parameters.Add(columnNameParameter);

            foreach (var column in columns)
            {
                columnNameParameter.Value = column;
                var columnExists = Convert.ToInt32(
                    await columnCheck.ExecuteScalarAsync(cancellationToken),
                    System.Globalization.CultureInfo.InvariantCulture) == 1;
                if (!columnExists)
                {
                    throw new InvalidOperationException(
                        $"Mevcut SQLite şemasında beklenen {tableName}.{column} kolonu bulunamadı; migration baseline işlemi durduruldu.");
                }
            }
        }

        return true;
    }

    private static Topic CreateTopic(
        string name,
        string category,
        Priority priority,
        int progress,
        int confidence,
        string accentColor) => new()
        {
            Name = name,
            Category = category,
            Description = $"{name} için mülakat hazırlık notları ve pratik çalışmaları.",
            Priority = priority,
            Progress = progress,
            ConfidenceLevel = confidence,
            EstimatedMastery = Math.Clamp((progress + confidence) / 2 + 8, 0, 100),
            AccentColor = accentColor
        };

    private static TopicTag Link(Topic topic, Tag tag) =>
        new() { TopicId = topic.Id, TagId = tag.Id };

    private static Flashcard NewCard(
        string question,
        string answer,
        Difficulty difficulty,
        Topic topic,
        DateTime nextReviewAtUtc) => new()
        {
            Question = question,
            Answer = answer,
            Difficulty = difficulty,
            TopicId = topic.Id,
            NextReviewAtUtc = nextReviewAtUtc,
            IntervalDays = 1,
            RepetitionCount = 1,
            ReviewCount = 1,
            CorrectReviewCount = 1
        };
}
