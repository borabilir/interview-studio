# Neden Hemen Mikroservis Kullanmadık?

## Monolith ve mikroservis nedir?

Monolith, farklı işleri aynı çalışan uygulama içinde barındıran yapıdır. Cüzdan oluşturma ve para hareketi kodu aynı uygulamayla başlatılıp yayınlanabilir.

Mikroservis yaklaşımında sorumluluklar ayrı uygulamalara bölünür. Örneğin bildirim uygulaması para transferi uygulamasından ayrı çalıştırılabilir ve güncellenebilir. Birbirlerine ağ üzerinden istek veya mesaj gönderirler.

## Modüler monolith ne demek?

Tek uygulama çalışır, ama içeride işler belirli sınırlarla ayrılır. Tek bir binadaki farklı bölümler gibi düşünebilirsin: aynı binadadırlar, görevleri farklıdır. Bu benzetme yalnızca organizasyonu anlatır; kodda sınırları yine bizim korumamız gerekir.

Ne için kullanılır? Ayrı uygulamaların kurulum ve iletişim yükünü hemen üstlenmeden kodu sorumluluklarına göre düzenlemek için. Mikroservis ise bağımsız çalıştırma ve büyütme ihtiyacına cevap verebilir; karşılığında ağ hataları ve birden fazla uygulamayı işletme sorumluluğu getirir.

## Bölümün uygulama bağlamı

Ledgerly'nin hedef öğrenme alanları arasında mikroservis mimarisi vardır. Ancak başlangıç kararı **çok sayıda mikroservis kurmak değil, modüler tek servisle baseline üretmektir**.

## Problem

Projenin başlangıcında henüz şunlar yoktur:

- Doğrulanmış domain modeli
- Ölçülmüş trafik ve darboğaz
- Kararlı servis contract'ları
- Kanıtlanmış bağımsız deployment ihtiyacı
- Netleşmiş bounded context sınırları

Bu aşamada mikroservis kurmak; servis iletişimi, broker, dağıtık transaction, deployment, tracing ve local orchestration maliyetini aynı anda getirir. Böylece finansal hatanın domain kuralından mı, veritabanından mı yoksa dağıtık iletişimden mi kaynaklandığını ayırmak zorlaşır.

## Karar

İlk sistem:

```text
HTTP Client
    |
    v
Ledgerly.Api
    |
    v
Wallet Core
    |
    v
PostgreSQL
```

- Tek process
- Tek deployment
- Tek PostgreSQL veritabanı
- Process içinde açık katman sınırları
- Finansal işlemlerde tek local transaction

`Api`, `Application`, `Domain` ve `Infrastructure` dört mikroservis değildir; tek uygulamanın katmanlarıdır.

## Değerlendirilen alternatifler

| Alternatif | Avantaj | Risk / maliyet |
|---|---|---|
| İlk günden mikroservis | Dağıtık sistem problemlerine hızlı giriş | Yanlış sınırlar, yüksek setup maliyeti, distributed monolith |
| Katmansız tek proje | En hızlı başlangıç | Domain, HTTP ve persistence kodunun karışması |
| Modüler tek servis | Basit deployment, görünür domain sınırları, kolay test | Sınırları kod disipliniyle korumak gerekir |

Seçilen alternatif **modüler tek servis** oldu.

## Mikroservisleri neden daha sonra kullanacağız?

Mikroservisler teknoloji gösterisi olarak değil, şu problemler ortaya çıktığında kullanılacak:

- Transaction history okuma yükünü bağımsız ölçeklemek
- Notification arızasını transfer akışından izole etmek
- Fraud/banka entegrasyonlarının hata ve latency etkisini sınırlamak
- Her servisin kendi verisine sahip olmasını uygulamak
- Outbox, idempotent consumer ve eventual consistency çalışmak
- Saga ve compensation gerektiren uzun akışları modellemek

## Trade-off

Başlangıçta mikroservis pratiğini erteliyoruz; karşılığında küçük, doğru ve ölçülebilir bir referans sistem elde ediyoruz. Daha sonra aynı sistemi ayırdığımızda eklenen operasyonel maliyeti ve kazanılan bağımsızlığı karşılaştırabileceğiz.

## Kararı ne zaman yeniden açacağız?

İlk ciddi ayrıştırma değerlendirmesi CQRS/read model veya dış provider aşamasında yapılacak. Bir modülün ayrı servise dönüşmesi için en az bir somut gerekçe ve ölçüm bulunacak.

## Mülakat özeti

> Mikroservis hedefimiz vardı ama domain ve trafik karakteristiği henüz doğrulanmadığı için ilk günden fiziksel olarak bölmedik. Modüler tek servisle finansal doğruluk baseline'ı kurduk. Servis ayrıştırmasını independent scaling, failure isolation ve data ownership gibi somut ihtiyaçlar ortaya çıktığında yapmayı seçtik.
