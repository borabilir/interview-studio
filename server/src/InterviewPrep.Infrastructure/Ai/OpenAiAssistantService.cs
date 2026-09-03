using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using InterviewPrep.Application.Features.AiAssistant;
using Microsoft.Extensions.Options;

namespace InterviewPrep.Infrastructure.Ai;

public sealed class OpenAiAssistantService(
    HttpClient httpClient,
    IOptions<OpenAiOptions> options,
    IProjectDocumentService projectDocumentService) : IAiAssistantService
{
    private const string SystemPrompt = """
        Sen deneyimli bir yazılım mühendisi ve mülakat koçusun.
        Kullanıcının sorduğu teknik mülakat sorusuna, gerçek bir mülakatta adayın o anda yüksek sesle verebileceği doğal ve insani bir cevap üret.

        Genel cevap kuralları:
        - Türkçe yanıt ver.
        - Yazılı kaynak, ders notu veya doküman özeti gibi durmasın.
        - Adayın mülakatta o anda cevap veriyormuş gibi konuş: "Ben bunu şöyle düşünürüm", "burada aslında", "mesela" gibi doğal bağlaçlar kullanabilirsin.
        - Gereksiz uzun giriş yapma; cevabı mülakat öncesi hızlı okunacak kadar kısa tut.
        - Gereksiz jargon biriktirme; teknik doğruluğu koru ama cümleleri insan gibi kur.
        - Emin olmadığın konuda kesin konuşma; mülakatta söylenebilecek makul bir çerçeve kur.
        """;

    private const string RawAnswerSystemPrompt = """
        Sen ChatGPT'sin.
        Kullanıcının sorusunu doğrudan yanıtla.
        Türkçe cevap ver.
        Cevabı kısaltma, mülakat cevabı formatına sokma, özel başlık şablonu uygulama veya madde/paragraf sayısı kısıtı koyma.
        Soru ne gerektiriyorsa o kapsamda tam ve anlaşılır bir cevap ver.
        """;

    public async Task StreamInterviewAnswerAsync(
        string query,
        string? section,
        string? projectId,
        string? previousAnswer,
        string? followUpQuestion,
        Func<string, CancellationToken, Task> onChunk,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);

        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.ApiKey))
        {
            throw new InvalidOperationException("OpenAI API key is not configured.");
        }

        var projectDocument = string.IsNullOrWhiteSpace(projectId)
            ? null
            : await projectDocumentService.GetByIdAsync(projectId, cancellationToken);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{settings.BaseUrl.TrimEnd('/')}/chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.ApiKey);
        request.Content = JsonContent.Create(new
        {
            model = settings.Model,
            stream = true,
            messages = new object[]
            {
                new { role = "system", content = GetSystemPrompt(section, followUpQuestion) },
                new { role = "user", content = BuildUserPrompt(query, section, projectDocument, previousAnswer, followUpQuestion) }
            }
        });

        using var response = await httpClient.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"OpenAI request failed with status {(int)response.StatusCode}: {error}");
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream, Encoding.UTF8);

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(line) || !line.StartsWith("data: ", StringComparison.Ordinal))
            {
                continue;
            }

            var data = line["data: ".Length..];
            if (data == "[DONE]")
            {
                break;
            }

            var content = TryReadContentDelta(data);
            if (!string.IsNullOrEmpty(content))
            {
                await onChunk(content, cancellationToken);
            }
        }
    }

    private static string BuildUserPrompt(
        string query,
        string? section,
        ProjectDocumentContent? projectDocument,
        string? previousAnswer,
        string? followUpQuestion)
    {
        var normalizedSection = section?.Trim().ToLowerInvariant();
        var hasFollowUp = !string.IsNullOrWhiteSpace(followUpQuestion);
        var instruction = hasFollowUp
            ? "Bu bir follow-up sorusu. Ana soruyu ve önceki cevabı tekrar etme; sadece follow-up sorusuna, önceki cevabı bilen bir aday gibi doğal mülakat diliyle cevap ver."
            : normalizedSection switch
        {
            "note" => ShortNoteInstruction,
            "answer" => "Bu soru için ChatGPT'ye doğrudan sorulmuş gibi cevap ver. Ek format, özetleme, kısaltma veya mülakat koçu filtresi uygulama; sorunun doğal olarak gerektirdiği kadar tam cevap ver.",
            "why" => "Bu soru için özellikle 'neden' kısmını cevapla: kavram neden var, hangi problemi çözer, hangi trade-off'u yönetir?",
            "production" => "Bu soru için sadece gerçek hayata yakın kısa bir production örneği ver. Kavramı tanımlama, açıklama yapma, cevabı öğretici metne çevirme; dümdüz örnek senaryoyu anlat.",
            "banking" => "Bu soru için sadece bankacılık/fintech domain'inden kısa ve gerçekçi bir örnek ver. Kavramı tanımlama, açıklama yapma, cevabı öğretici metne çevirme; dümdüz örnek senaryoyu anlat.",
            "code" => "Bu soru için sadece kısa ve anlaşılır kod örneği yaz. Backend/.NET/C# konularında C#/.NET kodu üret ve code fence dili csharp olsun. Veritabanı/SQL sorgu/index/transaction konularında SQL üret ve code fence dili sql olsun. Kod bloğunun dışında başlık, açıklama, paragraf, madde veya konuşma cümlesi yazma. Python, JavaScript, TypeScript veya başka dil üretme.",
            _ => "Bu soru için ChatGPT'ye doğrudan sorulmuş gibi cevap ver. Ek format, özetleme, kısaltma veya mülakat koçu filtresi uygulama; sorunun doğal olarak gerektirdiği kadar tam cevap ver."
        };

        var projectContext = projectDocument is null
            ? "Proje context'i seçilmedi. Genel teknik bilgiyle cevap ver."
            : $"""
            Seçili proje: {projectDocument.Name}

            Project context:
            {projectDocument.Content}

            Project context kullanımı:
            - Soru seçili projeyle ilgiliyse cevabı bu context'e dayandır.
            - Context'te olmayan spesifik proje detaylarını uydurma.
            - Genel teknik kavramı anlatırken projedeki gerçek teknoloji, mimari ve trade-off'lardan yararlan.
            """;

        var followUpContext = hasFollowUp
            ? $"""

            Önceki cevap:
            {previousAnswer?.Trim()}

            Follow-up soru:
            {followUpQuestion?.Trim()}
            """
            : string.Empty;

        return $"""
            Soru: {query.Trim()}

            İstenen bölüm: {instruction}
            {followUpContext}

            {projectContext}
            """;
    }

    private static string GetSystemPrompt(string? section, string? followUpQuestion)
    {
        if (string.IsNullOrWhiteSpace(followUpQuestion)
            && string.Equals(section?.Trim(), "answer", StringComparison.OrdinalIgnoreCase))
        {
            return RawAnswerSystemPrompt;
        }

        return SystemPrompt;
    }

    private const string ShortNoteInstruction = """
        Bu soru için kısa not üret. Soru tipini sez ve sadece aşağıdaki formatlardan birini kullan.
        Her başlığın karşısına 1 kısa cümle yaz; gerekiyorsa son başlıkta en fazla 2 cümle kullan.
        Seçtiğin formatın başlıkları dışında başlık, uzun liste, tablo veya kapanış cümlesi ekleme.
        Markdown'da başlık etiketlerini bold yaz: **Nedir:** gibi.

        Tanım soruları için ("nedir", "ne demek", "açıkla", doğrudan kavram soruları):
        **Nedir:** Kavramı tek cümlede açıkla.
        **Ne işe yarar:** Pratikte neyi sağladığını tek cümlede söyle.
        **Niye var:** Çözdüğü problemi veya var olma sebebini 1-2 cümlede anlat.

        Trade-off soruları için ("vs", "mı mi", "hangisi", "avantaj/dezavantaj", "trade-off"):
        **Kısa cevap:** Dengeli ana fikri söyle.
        **Avantajı:** Güçlü tarafı söyle.
        **Dezavantajı:** Zayıf tarafı veya maliyeti söyle.
        **Ne zaman seçerim:** Hangi durumda tercih edeceğini söyle.

        Karşılaştırma soruları için ("farkı nedir", "arasındaki fark", iki kavramı kıyaslama):
        **Temel fark:** En önemli ayrımı söyle.
        **Birincisi ne zaman iyi:** İlk kavramın uygun olduğu durumu söyle.
        **İkincisi ne zaman iyi:** İkinci kavramın uygun olduğu durumu söyle.
        **Mülakatta nasıl söylerim:** Doğal ve kısa cevap cümlesi yaz.

        Debug/problem çözme soruları için ("nasıl debug edersin", "yavaşsa", "hata alırsan", "çalışmıyorsa"):
        **İlk bakacağım yer:** Nereden başlayacağını söyle.
        **Olası nedenler:** En muhtemel nedenleri kısa yaz.
        **Nasıl doğrularım:** Hangi ölçüm/log/test ile kanıtlayacağını söyle.
        **Çözüm yaklaşımı:** Nasıl ilerleyeceğini söyle.

        Mimari/design soruları için ("tasarla", "nasıl kurarsın", "architecture", "system design"):
        **Ana fikir:** Tasarımın merkezindeki yaklaşımı söyle.
        **Bileşenler:** Temel parçaları kısa yaz.
        **Akış:** İsteğin sistemde nasıl ilerlediğini söyle.
        **Dikkat edeceğim noktalar:** Ölçek, güvenilirlik veya tutarlılık gibi riskleri söyle.

        Best practice soruları için ("neden kullanılır", "nasıl kullanılmalı", "best practice", "doğru kullanım"):
        **Kural:** Pratik kuralı söyle.
        **Neden önemli:** Sağladığı faydayı söyle.
        **Yanlış kullanım:** Kaçınılması gereken hatayı söyle.
        **Pratik örnek:** Kısa örnek ver.

        Kod/implementasyon soruları için ("kodunu yaz", "implement", "örnek kod", "SQL yaz"):
        **Yaklaşım:** Nasıl çözeceğini söyle.
        **Kod:** Kısa code fence kullan.
        **Dikkat:** Önemli edge case veya risk yaz.
        """;

    private static string? TryReadContentDelta(string data)
    {
        try
        {
            using var document = JsonDocument.Parse(data);
            var delta = document.RootElement
                .GetProperty("choices")[0]
                .GetProperty("delta");

            return delta.TryGetProperty("content", out var content)
                ? content.GetString()
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
