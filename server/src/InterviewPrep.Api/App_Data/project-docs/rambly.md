# Allfluencer / Rambly — React & Frontend Teknik Proje Dokümanı

## Okuma anahtarı

- **Kesin:** Kaynak kod veya yapılandırmada doğrudan görülen bilgi.
- **Güçlü çıkarım:** Birden fazla kod kanıtının desteklediği, fakat ürün sahibinden doğrulanması gereken yorum.
- **Bilinmiyor:** Repository tek başına doğrulamıyor.

Bu doküman bir code review değildir. Amaç, projeyi geliştiren kişinin yaptığı teknik tercihleri doğru sınırlar içinde anlatabilmesidir.

## 1. Projenin özeti

**Kesin:** Repository içindeki ürün adı yer yer `Rambly`, klasör adı ise `allfluencer`. Uygulama içerik üreticileri ile takipçi/son kullanıcılar arasında içerik, etkileşim ve gelir elde etme akışları sağlayan bir Next.js web uygulamasıdır.

Koddan görülen kullanıcı yetenekleri:

- İçerik üreticisi profilini, kapak/avatarını, sosyal ve mesajlaşma bağlantılarını düzenleyebilir.
- Blok tabanlı zengin içerik oluşturabilir: başlık, metin, medya, grid, listicle, anket, ses, video, attachment, embed, divider, temel/sosyal/Calendly/bağış/ödeme butonları.
- İçeriği taslak, önizleme, zamanlama, ücretli içerik, üyelik, bağış, e-posta toplama ve mesaj alma seçenekleriyle yayınlayabilir.
- Şablon oluşturabilir, global/kullanıcı şablonlarından içerik kopyalayabilir.
- İçerik, tıklama ve kazanç analitiklerini görebilir; grafik ve özet ekranları vardır.
- Son kullanıcı içerikleri görüntüleyebilir, beğenebilir, yorumlayabilir, kaydedebilir, paylaşabilir, raporlayabilir; üyelik/bağış/ödeme akışlarına girebilir.
- Kullanıcılar sohbet edebilir; bildirim ve sohbet güncellemeleri WebSocket üzerinden alınır.
- Stripe, PayPal, Google Pay, Amazon Pay; Calendly; Mailchimp, Klaviyo, Sendlane; çeşitli sosyal ağ ve messenger entegrasyonlarına ait akışlar vardır.
- Admin/blog, kullanıcılar, abonelikler, ücretli içerikler, bağış özeti ve CSV indirme ekranları vardır.

**Business amacı — güçlü çıkarım:** Creator economy odaklı “link-in-bio + içerik yayınlama + topluluk + monetization” platformudur. İçerik üreticisinin kitlesini tek profilde toplaması, doğrudan iletişim kurması ve üyelik/ücretli içerik/bağış üzerinden gelir elde etmesi hedeflenmektedir. Gelir modeli, komisyon veya abonelik planı olabilir; repository bunu kesinleştirmiyor.

## 2. Gerçekten kullanılan teknolojiler

| Teknoloji | Kanıtlanan kullanım |
|---|---|
| React 18.2 + React DOM | Component ve hook tabanı |
| TypeScript 4.8, strict mode | `.ts/.tsx`, `strict: true` |
| Next.js 12.3 Pages Router | `pages/`, `getServerSideProps`, API routes, `next/dynamic`, `next/image` |
| Axios | Merkezi API instance, interceptor ve yüzlerce domain API fonksiyonu |
| Native WebSocket | Bildirim/chat event bağlantısı; SignalR veya Socket.io değil |
| Context API | Auth, Notification ve Content Editor context/provider'ları |
| SCSS + CSS Modules | Global SCSS token/mixin ve component-scoped modüller |
| Draft.js + pluginleri | Rich text, emoji, image, video ve toolbar |
| dnd-kit | İçerik/sosyal bağlantı sıralama |
| react-virtuoso | Büyük grid/listelerde virtualization |
| Recharts + d3-shape | Analitik grafikler |
| Emotion | Bağımlılık ve kod içindeki styled kullanım alanları |
| react-colorful / cropper | Renk ve görsel düzenleme |
| WaveSurfer | Ses oynatıcı dalga görünümü |
| react-calendly | Görüşme planlama |
| Google Pay button | Ödeme UI entegrasyonu |
| react-joyride | Onboarding/tour |
| react-lottie | Animasyon/skeleton |
| New Relic | Next.js production instrumentation yapılandırması |
| Docker + Nginx | Production container yapılandırması |
| ESLint, TypeScript, Next build, Husky | Pre-commit kalite kapısı |

**Kullanılmıyor/görülmedi:** Vite, Redux, Zustand, React Query/TanStack Query, React Router, Material UI, Tailwind, Ant Design, SignalR, Socket.io, Framer Motion, Chart.js. Jest/Vitest, React Testing Library, Cypress, Playwright ve Storybook dosyaları da görülmedi.

## 3. Frontend mimarisi

En doğru tanım: **domain/feature tabanlı modüler yapı + ortak Core katmanı + Next.js route composition**.

- `Auth`, `Post`, `Chat`, `Settings`, `Dashboard`, `Template`, `Notification`, `Blog` gibi üst klasörler business domainlerini ayırıyor.
- Her domain kendi `api`, `types`, `utils`, `hooks`, `components`, `pages` parçalarını barındırıyor.
- `Core`, domain bağımsız component, layout, hook, API client, utility, style ve type katmanıdır.
- Next `pages/` dosyaları çoğunlukla ince route adapter'larıdır; gerçek ekranları `src/<Domain>/pages` içinden compose eder.
- Atomic Design terminolojisi uygulanmıyor. Yine de küçük Core primitive'lerinden büyük feature component'lerine doğru component-driven kompozisyon vardır.
- Container/presentational ayrımı formal değil; bazı page/provider component'leri veri ve orchestration, alt component'ler görünüm işini üstlenir.
- API fonksiyonları UI'dan ayrı tutulmuştur. Server state için merkezi cache/store yoktur.
- Layout'lar `Component.getLayout` ile route bazında seçilir. Creator ve end-user layout'ları client-only dynamic import edilir.


## 4. React patternleri

| Pattern | Nerede? | Neden? |
|---|---|---|
| Custom Hook | `Core/hooks`: `useRequest`, `useGet`, `useList`, `useForm`, `useDebounce`, `useDevice`, `useEventBus`; `Post/hooks` | Loading/error/form/pagination/lifecycle davranışını tekrar kullanılabilir kılmak |
| Context + Provider | Auth, Notification, Content Editor | Prop drilling olmadan oturum, bağlantı ve editör state/aksiyonlarını alt ağaca sunmak |
| Provider composition | `_app.tsx` | Auth → Notification → Network gibi app-wide concern'leri sarmalamak |
| Controlled component | Input/Form/Draft.js ve editor item'ları | Değeri üst state ile senkronize etmek, validation ve persistence sağlamak |
| Imperative handle | Image/Video/Audio picker, Dropdown, Popover, DatePicker, Onboarding | Parent'ın `open/close/reset` benzeri imperative işlemleri tetiklemesi |
| Portal | Core Modal → `#modalContainer` | Modalı stacking/overflow sınırlarından çıkarmak |
| Lazy loading/code splitting | Çok sayıda `next/dynamic`; bazıları `ssr:false` | Ağır/koşullu UI'yı ayrı chunk'a almak ve browser-only kütüphaneleri SSR'dan ayırmak |
| Memoization | İki `React.memo`; seçili `useMemo/useCallback` alanları | Editor/template item ve hesaplanan listelerde gereksiz render/hesabı azaltmak |
| Virtualized list/grid | Public profile, paid content, suggestions, image/GIF library | Uzun listelerde DOM elemanı sayısını sınırlamak |
| Event bus / pub-sub | `useEventBus`, WebSocket provider, chat/comments/status | Uzak component'ler arasında event tabanlı güncelleme |
| Strategy/registry + dynamic component | Content item type map'leri, conversation item map'leri | Discriminated content type'a göre doğru editor/view renderer'ı seçmek |
| HOC | `withAuth(getServerSideProps)` | SSR isteğinin cookie token'ını Axios client'a aktarmak |
| Children composition | Modal, Card, Grid, Onboarding, Sort | Reusable shell/primitives oluşturmak |

**Görülmeyen patternler:** Klasik render props örneği, belirgin compound component API'si ve uncontrolled form yaklaşımı. `forwardRef` kullanımı uncontrolled form demek değildir.

## 5. State management

- **Local state:** Ekran, modal, seçili kayıt, loading, editor alt durumları çoğunlukla `useState/useRef`.
- **Context:** Auth kullanıcı/ready/permission türevleri; Notification bağlantı durumu; Content Editor'ın içerik, aktif blok, adım, mobile view ve undo/redo aksiyonları.
- **Server state:** `useRequest`, `useGet`, `useList` ile manuel fetch/loading/error/data ve pagination.
- **Query cache:** Yok. Deduplication, stale time, invalidation, retry, background refetch ve optimistic update framework tarafından verilmez; manuel refresh yapılır.
- **Redux/Zustand:** Yok.
- **URL state:** Sohbette aktif conversation query parametresi ve editor step gibi bazı durumlar router ile taşınır.

Trade-off:

- Context az bağımlılıkla basit global state sağlar; fakat provider value değiştiğinde bütün consumer'lar yeniden render olabilir ve domain büyüdükçe action/state sınırları bulanıklaşabilir.
- Özel hook'lar ürün ihtiyacına uygun ve hafiftir; buna karşılık cache, cancellation, yarış koşulları, retry ve invalidation davranışlarını ekibin kendisi çözmesi gerekir.
- Local state component sahipliğini net tutar; fakat aynı backend entity'sinin farklı ekranlarda kopyaları ve manuel `refresh()` çağrıları oluşabilir.
- Event bus prop drilling'i azaltır; ancak event akışını izlemek, payload tip güvenliği ve ordering/debugging daha zordur.

Senior seviyede öneri: “Her şeyi Redux'a taşırdım” değil; önce server state'i TanStack Query gibi bir cache'e aday göstermek, Auth gibi küçük app state'ini Context'te tutmak, karmaşık editor state'i için reducer/store ölçümü yapmak daha dengeli cevaptır.

## 6. Performans

**Uygulananlar:**

- `next/dynamic` ile yaygın code splitting ve browser-only kod için `ssr:false`.
- `react-virtuoso` ile grid virtualization.
- Seçili sıcak alanlarda `React.memo`, custom equality, `useMemo`, `useCallback`.
- Arama/etkileşim için custom debounce.
- Next Image ve izinli remote image domainleri.
- WebSocket reconnect'te katlanarak artan bekleme süresi.
- Infinite pagination (`useList`) ve media upload'da chunk/abort signal belirtileri.
- Production'da console kaldırma ve New Relic entegrasyonu.

**Koddan eksik veya doğrulanamayanlar:**

- Bundle analyzer/bundle budget, Lighthouse/Web Vitals hedefleri ve ölçüm raporu.
- Sistematik image `sizes`, preload/prefetch ve font optimization stratejisi.
- Server-state request deduplication/cache/cancellation; `useRequest/useGet` genelinde AbortController yok.
- Virtualization'ın tüm uzun listelere uygulandığı söylenemez.
- Throttle helper görülmedi; Suspense boundary görünür bir strateji değil.
- `React.memo` yalnızca birkaç yerde; bu otomatik olarak eksik değildir, profiling sonucu karar verilmelidir.
- WebSocket reconnect için üst sınır/jitter ve offline-awareness görünmüyor.
- Editor undo stack'i sınırsız büyüyebilir; büyük postlarda bellek maliyeti ölçülmelidir.

## 7. API katmanı

- Merkezi Axios instance `NEXT_PUBLIC_API_URL` ve API key ile kuruluyor.
- Bearer token cookie'den okunup default Authorization header'a ekleniyor.
- Response interceptor backend hata biçimini `{title, message}` haline getiriyor.
- Domain başına küçük, typed API fonksiyonları mevcut; API dosyası sayısı yüksektir.
- Public SSR sayfaları `getServerSideProps` kullanıyor; `withAuth` request cookie token'ını ekliyor.
- Bazı Next API routes üçüncü taraf parse/download/OAuth işlemlerinde BFF/proxy gibi davranıyor.
- Native WebSocket token query parametresiyle bağlanıyor; heartbeat ve exponential reconnect var; event bus'a dağıtıyor.
- Genel HTTP retry/backoff görülmedi. Error modal opsiyonel olarak request hook'larında dynamic import ediliyor.

Teknik riskler: Axios singleton'ının SSR'da default header mutasyonu request izolasyonu açısından sorgulanmalı; JS-readable token cookie'leri XSS tehdidi taşır; cookie flag'leri (`httpOnly`, `secure`, `sameSite`) client-side kütüphanede güvence altına alınmıyor. Bunlar tasarım trade-off riskleridir.

## 8. UI

- **Component tasarımı:** Core'da Button, Input, Form, Modal, Card, Grid, Dropdown, Popover, pickers, editors ve icon sistemi; domainlerde business-specific composition.
- **Reuse:** Variant props, children composition, typed props, forwardRef/imperative handle ve content renderer registry'leri kullanılıyor.
- **Form:** Harici form kütüphanesi yok. Generic `useForm`, field factory'leri ve `Core/Form` ile controlled yapı kurulmuş.
- **Validation:** Required, email, date/age, PIN, array, password-match, Draft.js content gibi custom validator'lar; submit sonrası field error üretimi.
- **Theme/styling:** SCSS variables/mixins, CSS Modules, currentColor SVG iconları, dinamik font/color/background component'leri. Tam app-wide ThemeProvider görülmedi.
- **Responsive:** Mobil/tablet/desktop SCSS mixinleri, route/layout varyantları, `useDevice`, device height fix ve mobil preview bulunuyor.
- **Accessibility:** Modalda `role="dialog"`, semantic form/button örnekleri var; fakat otomatik a11y testleri, focus trap/restore, modal `aria-modal`/label, kapsamlı keyboard ve screen reader doğrulaması repository'den kanıtlanmıyor.
