# Interview Studio

## Güncel sade akış

Uygulama artık kişisel mülakat pratiği için iki ana ekrana odaklanır:

- **Konular**: ana konu/alt konu ağacı, etiketler ve hızlı soru-cevap ekleme.
- **Pratik**: konu, alt konu, etiket, zorluk ve arama filtreleriyle mülakat simülasyonu ve soru havuzu.

Genel bakış, çalışma planı, notlar, progress gibi geniş platform sayfaları ana navigasyondan çıkarıldı. `/` doğrudan `/topics` ekranına gider; eski rotalar kullanıcıyı tekrar sade akışa yönlendirir.

Yazılım mühendisleri için masaüstü öncelikli, Türkçe ve AI destekli teknik mülakat hazırlık uygulaması. Türkçe varsayılan dildir; Settings üzerinden English arayüze geçilebilir. `Task.WhenAll`, `async/await`, `idempotency`, `cache` gibi teknik terimler bilinçli olarak çevrilmez.

## Özellikler

- Günlük çalışma planı, odak zamanlayıcısı ve mülakat hazırlık skoru
- Markdown not editörü, version history ve debounce auto-save
- Monaco tabanlı coding alanı, 650 ms DB auto-save ve kalıcı attempt/AI evaluation kayıtları
- System Design senaryoları, 800 ms auto-save ve AI critique alanı
- Teknik, HR, behavioral ve System Design deneme mülakatları
- Spaced repetition destekli flashcard review akışı
- Konu, confidence ve ilerleme analitiği
- Topic detay çalışma alanı: Topic'e bağlı soru–cevap, not, Coding ve System Design içerikleri
- DB tabanlı global arama
- Türkçe varsayılan, English ikincil localization
- Light/dark theme, accent color ve kalıcı editor tercihleri

## Veri akışı

Frontend domain verisi fixture veya `localStorage` üzerinden okunmaz. Tüm feature sayfaları TanStack Query aracılığıyla ASP.NET Core API ve SQLite veritabanını kullanır. `localStorage` yalnızca theme, dil ve editor gibi kullanıcı tercihleri için kullanılır.

Bir Topic kartına tıklandığında `/topics/{topicId}` çalışma alanı açılır. Buradaki **Soru–Cevap** sekmesinden oluşturulan kayıtlar mevcut `Flashcard.TopicId` ilişkisiyle doğrudan o Topic'e bağlanır ve spaced repetition kuyruğuna eklenir. Aynı ekranda Topic'e ait Notes, Coding ve System Design kayıtları da filtrelenmiş olarak gösterilir.

SQLite dosyası ilk API açılışında migration ve seed işlemlerinden sonra burada oluşur:

```text
server/src/InterviewPrep.Api/App_Data/interview-prep.db
```

Dosya DBeaver ile doğrudan açılabilir.

## Yerelde çalıştırma

Gereksinimler: Node 18+ ve .NET 8 SDK veya üzeri.

```powershell
npm install
npm run dev:api
```

İkinci terminalde:

```powershell
npm run dev
```

- Web: `http://localhost:5173`
- Swagger: `http://localhost:5187/swagger`
- Health: `http://localhost:5187/api/health`

## Migration

Uygulama başlangıcında `Database.MigrateAsync()` çalışır. Yeni migration oluşturmak için:

```powershell
dotnet ef migrations add MigrationAdi `
  --project server/src/InterviewPrep.Infrastructure `
  --startup-project server/src/InterviewPrep.Api `
  --output-dir Persistence/Migrations
```

Mevcut eski `EnsureCreated` veritabanı startup sırasında tüm beklenen tablolar ve kritik kolonlar doğrulandıktan sonra veri kaybı olmadan ilk migration'a baseline edilir. Ardından Türkçe seed localization ve coding taslak migration'ları uygulanır.

## Doğrulama

```powershell
npm run typecheck
npm run lint
npm run build
npm run build:api
```

## Proje yapısı

```text
src/
  components/       ortak UI, application shell ve AI companion
  hooks/            query, persistence, theme ve debounce hook'ları
  i18n/             Türkçe/English localization context'i
  pages/            DB bağlantılı feature sayfaları
  services/         typed API client ve query key'leri
  types/            frontend DTO/domain sözleşmeleri

server/src/
  InterviewPrep.Domain/
  InterviewPrep.Application/
  InterviewPrep.Infrastructure/
  InterviewPrep.Api/
```

Gerçek AI provider bağlanana kadar coding ve interview değerlendirmeleri deterministik, Türkçe bir yerel fallback üretir.
