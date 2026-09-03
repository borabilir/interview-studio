# 1. Projenin özeti

## Proje ne yapıyor?

Bu proje, reklam ve reklam kampanyalarının yönetildiği web tabanlı bir yönetim paneli. README’de ürün adı “Allfluencer Dashboard” olarak geçiyor; kod içinde backend kavramları çoğunlukla `ras`, `campaign` ve `rambly` adlarıyla modellenmiş.

Koddan doğrulanabilen ana iş alanları:

- Reklam oluşturma, düzenleme, listeleme, silme ve çoğaltma
- Rambly içeriğinden reklam oluşturma
- Reklamları gruplama
- Kampanya oluşturma ve yönetme
- Kampanya hedef kitlesini, konumunu, zamanlamasını ve bütçesini belirleme
- Kampanya performansını grafiklerle izleme
- Kategori yönetimi
- Kullanıcı girişi ve oturum yönetimi
- Bildirim ve ayar ekranları
- Reklam/kampanya adetlerini gösteren özet ekranı

## Business amacı

Koddan yapılabilecek en güvenli çıkarım:

> Reklam operasyonlarının tek bir panelden yürütülmesini; reklamların hazırlanmasını, gruplandırılmasını, hedef kitle ve bütçe kriterleriyle kampanyaya dönüştürülmesini ve sonuçların izlenmesini sağlamak.

Sistemin influencer reklam platformu olduğu README’deki “Allfluencer” adı ve creator/Rambly içerik entegrasyonlarından çıkarılabilir. Ancak hedef müşterinin ajans mı, marka mı yoksa şirket içi operasyon ekibi mi olduğu koddan kesin olarak belirlenemiyor.

## Kullanıcılar ne yapabiliyor?

- Kullanıcı adı/e-posta ve parola ile giriş yapabiliyor.
- Reklam oluşturabiliyor.
- Reklama görsel, başlık, açıklama, link ve özel parametreler ekleyebiliyor.
- Creator ve creator gönderileri arasından içerik seçebiliyor.
- Reklamı düzenleyebiliyor, silebiliyor ve çoğaltabiliyor.
- Reklam grubu oluşturup reklamları gruba ekleyebiliyor.
- Kampanyayı reklam veya reklam grubu üzerinden oluşturabiliyor.
- Kampanya için:
  - Demografi
  - Konum
  - Kategori/target
  - Zamanlama
  - Saat dilimi
  - Bütçe
  - Durum
    seçebiliyor.
- Tahmini bütçeyi backend’den hesaplatabiliyor.
- Kampanyayı aktive/deaktive edebiliyor.
- Kampanya performansını tarih aralıklarına göre inceleyebiliyor.
- Cihaz dağılımı ve gün/saat bazlı performans görebiliyor.
- Kampanya, reklam ve reklam gruplarında arama, filtreleme, sıralama ve sayfalama yapabiliyor.

---

# 2. Kullanılan teknolojiler

## Gerçekten kullanılan ana teknolojiler

| Teknoloji | Kullanım |
|---|---|
| React 18 | Uygulamanın UI katmanı |
| TypeScript | Component, API payload ve domain modellerinin tiplenmesi |
| Create React App / react-scripts | Build ve development altyapısı |
| React Router 6 | Routing, nested route ve layout yapısı |
| Ant Design 5 | Form, tablo, modal, input, select, layout ve bildirim bileşenleri |
| Emotion | CSS-in-JS, styled component ve theme yönetimi |
| Axios | REST API haberleşmesi |
| React Context API | Authentication state’i |
| Recharts | Kampanya performans grafikleri |
| dnd-kit | Sürükle-bırak sıralama |
| Day.js | Tarih hesaplama ve formatlama |
| js-cookie | Access ve refresh token saklama |
| React Helmet | Sayfa metadata yönetimi |
| react-show-more-text | Uzun metinleri daraltma/genişletme |
| UUID | Benzersiz identifier üretimi |
| slugify | Metinleri slug formatına dönüştürme |
| web-vitals | CRA tarafından sağlanan web vitals altyapısı |
| Husky | Git hook altyapısı |
| Docker | Production build paketleme |
| Nginx | SPA static hosting ve history fallback |

Kaynak: [package.json](C:/Users/borab/repos/adserve-dashboard/package.json)

## Kullanılmayan veya kanıtı olmayanlar

- Vite kullanılmıyor.
- Redux kullanılmıyor.
- Zustand kullanılmıyor.
- TanStack/React Query kullanılmıyor.
- Tailwind kullanılmıyor.
- Material UI kullanılmıyor.
- React Hook Form veya Formik kullanılmıyor.
- SignalR kullanılmıyor.
- Socket.io kullanılmıyor.
- Framer Motion kullanılmıyor.
- Chart.js kullanılmıyor.

---

# 3. Frontend mimarisi

## Genel mimari

Proje en doğru biçimde şu şekilde tanımlanabilir:

> Feature-oriented modüler yapı ile ortak Core katmanını birleştiren, component-driven bir React mimarisi.

Ana feature’lar:

- `Ad`
- `AdGroup`
- `Campaign`
- `Category`
- `Auth`
- `Notification`
- `Settings`
- `Home`

Her iş alanı kendi içinde aşağıdaki katmanların bir bölümünü barındırıyor:

```text
Feature
├── api
├── components
├── constants
├── pages
├── types
├── utils
└── index.tsx
```

Bu, katı anlamda tamamen layered architecture değildir. Katmanlar feature sınırlarının içinde tekrar eder.

## Core katmanı

`Core`, uygulama çapındaki ortak parçaları içeriyor:

- Generic tablo ve filtreleme
- Tarih seçiciler
- Form yardımcıları
- Drag-and-drop altyapısı
- Theme
- API client
- Custom hook’lar
- Ortak tipler ve utility fonksiyonları
- İkonlar

Örnek: [Core/components](C:/Users/borab/repos/adserve-dashboard/src/Core/components)

## Page/component ayrımı

`pages` bileşenleri route seviyesindeki ekranları, `components` ise ekranların alt parçalarını temsil ediyor.

Örneğin kampanya oluşturma ekranı:

```text
CampaignCreatePage
└── CampaignForm
    ├── SelectAd / SelectAdGroup
    ├── SelectDemography
    ├── SelectTarget
    ├── Schedule
    ├── Budget
    └── Summary
```

Bu yapı kısmen container/presentational ayrımına benziyor. Ancak ayrım sistematik değil; birçok component hem API çağrısı hem state hem de rendering sorumluluğu taşıyor.

## Atomic Design var mı?

Hayır. `Core/components` içindeki bazı küçük bileşenler atom/molecule benzeri olsa da proje Atomic Design terminolojisi veya klasör yapısını kullanmıyor.

## State mimarisi

- Kimlik doğrulama: Context
- Sayfa/form state’i: `useState`
- Form state’i: Ant Design Form
- API request state’i: custom hook’lar
- Server cache: Yok
- Global business state: Yok

---

# 4. React patternleri

## Custom Hook — yoğun kullanılıyor

Örnekler:

- `useRequest`: imperative API çağrısı, loading/data/error yönetimi
- `useGet`: mount sırasında otomatik veri çekme
- `useList`: pagination/infinite-list benzeri veri yönetimi
- `useMounted`: mount callback’i
- `useUpdated`: ilk render haricindeki değişiklikleri izleme
- `useDevice`: responsive cihaz sınıflandırması
- `useOuterClick`: element dışı tıklama
- `useResize`, `useScroll`
- `useEventBus`

Kaynak: [Core/hooks](C:/Users/borab/repos/adserve-dashboard/src/Core/hooks)

Neden kullanılmış?

- Tekrarlayan lifecycle ve request kodlarını merkezileştirmek
- Component’lerde loading/error state tekrarını azaltmak
- Listeleme ve pagination davranışını standartlaştırmak

Trade-off:

Bu yaklaşım küçük/orta uygulamada bağımlılığı azaltır. Buna karşılık cache, deduplication, retry, stale-time, cancellation ve request invalidation gibi özellikleri yeniden geliştirme sorumluluğu getirir.

## Context + Provider

Authentication için kullanılmış:

- `AuthContext`
- `AuthProvider`
- `useAuth`

Kaynak: [Auth/context/provider.tsx](C:/Users/borab/repos/adserve-dashboard/src/Auth/context/provider.tsx)

Neden?

Authentication kullanıcı bilgisi ve logout işlemi component ağacının farklı noktalarından erişilmesi gereken düşük frekanslı global state’tir. Bu kapsam için Redux/Zustand zorunlu değildir.

## Controlled component

Yaygın şekilde kullanılıyor:

- Arama alanları
- Filtreler
- Grafik periyot seçimleri
- Kampanya adımları
- Modal görünürlüğü
- Bütçe ve hedef seçimleri

Örnek: `PerformanceChart` içindeki `chartFilter`, `dateInterval` ve modal state’i.

## Form controller

Ant Design `Form.useForm()` form controller görevi görüyor. Form verisi tamamen yalnızca React `useState` üzerinden tutulmuyor; Ant Design’ın internal form store’u da kullanılıyor.

## Provider composition

Root seviyesinde provider’lar compose edilmiş:

```tsx
BrowserRouter
└── AuthProvider
    └── AntdProvider
        └── EmotionProvider
            └── Root
```

Kaynak: [src/index.tsx](C:/Users/borab/repos/adserve-dashboard/src/index.tsx)

## Lazy loading + Suspense

Hem feature hem de sayfa seviyesinde kullanılıyor.

Kaynak: [Root/index.tsx](C:/Users/borab/repos/adserve-dashboard/src/Root/index.tsx)

Amaç:

- İlk JavaScript paketini küçültmek
- Kullanılmayan feature kodunu başlangıçta indirmemek
- Route bazlı code splitting sağlamak

## Composition

`CampaignForm`, adımları prop tabanlı küçük feature bileşenlerinden oluşturuyor. `TableComponent` ise columns, custom header ve empty state alarak composition sağlıyor.

## Forward ref

Tablo header’ındaki arama input’una parent’tan erişmek için `forwardRef` kullanılıyor.

Kaynak: [TableHeader/index.tsx](C:/Users/borab/repos/adserve-dashboard/src/Core/components/TableComponent/TableHeader/index.tsx)

## Render callback / render function

Recharts tooltip içeriği `renderTooltip` fonksiyonu ile sağlanıyor. Klasik bir Render Props component’i yok; fakat kütüphane API’sine render callback veriliyor.

## Compound component

Projede açıkça tasarlanmış özel bir Compound Component patterni bulunmuyor. Ant Design’ın `Form.Item`, `Layout.Sider`, `Table.Column` gibi kendi compound API’leri kullanılıyor.

## HOC

Kodda özel HOC tespit edilmedi.

## Portal

Doğrudan `createPortal` kullanımı tespit edilmedi. Ant Design Modal gibi bileşenlerin kendi içinde portal kullanması olasıdır; ancak bu proje tarafından yazılmış bir Portal patterni değildir.

---

# 5. State management

## Local state

Ana yöntem `useState`.

Kullanıldığı alanlar:

- Modal görünürlüğü
- Aktif form adımı
- Seçilen reklam/reklam grubu
- Kampanya taslağı
- Tablo filtreleri
- Sayfa numarası
- Grafik filtreleri
- API loading/error/data state’leri

Avantajları:

- State’in kullanım noktasına yakın olması
- Düşük soyutlama maliyeti
- Akışın küçük component’lerde kolay takip edilmesi

Dezavantajları:

- Büyük `CampaignForm` gibi component’lerde birbirine bağlı çok sayıda state oluşuyor.
- Birden fazla `setState` ile tutarlılık sağlanıyor.
- Karmaşık geçişlerde `useReducer` veya state machine daha anlaşılır olabilirdi.
- Child component’lere callback ve veri prop’ları taşınıyor.

## Context

Yalnızca authentication için kullanılıyor.

Avantajları:

- Küçük global state için ek kütüphane gerektirmiyor.
- Auth API’sini component ağacına sunuyor.

Trade-off:

Provider `value` nesnesi ve fonksiyonları her render’da yeniden oluşturuluyor. Bu uygulamanın ölçeğinde ciddi problem olduğu kanıtlanamaz; fakat consumer sayısı büyürse gereksiz render’lara neden olabilir.

## Redux / Zustand

Kullanılmıyor.

Teknik değerlendirme:

> Uygulamadaki business state’in çoğu route veya form kapsamındaydı. Global ve sık değişen karmaşık state az olduğu için Redux/Zustand eklemek yerine local state ve auth için Context kullandık.

Ancak bunun tarihsel ekip kararı olduğu koddan kesin çıkarılamaz; kişisel karar gibi sunmadan önce doğrulanmalı.

## Query cache

Yok.

API response’ları component state’inde tutuluyor. Aynı resource farklı component’lerde istendiğinde otomatik paylaşım, cache invalidation veya deduplication bulunmuyor.

TanStack Query eklenmesi şu alanlarda değer sağlayabilirdi:

- Liste/detail cache paylaşımı
- Mutation sonrası invalidation
- Retry
- Request cancellation
- Background refetch
- Loading/error standardizasyonu
- Stale data politikası

---

# 6. Performans

## Kullanılan teknikler

### Route-level lazy loading ve code splitting

En belirgin performans yaklaşımıdır. Ana feature’lar `React.lazy` ile yükleniyor.

### Suspense fallback

Lazy chunk yüklenirken ortak loading ekranı gösteriliyor.

### `useMemo`

İki doğrulanmış kullanım:

- `DayHourGrid` içindeki 7×24 hücrelik grid üretimi
- Emotion theme nesnesinin token değişmediği sürece korunması

Kaynaklar:

- [DayHourGrid/index.tsx](C:/Users/borab/repos/adserve-dashboard/src/Campaign/components/DayHourGrid/index.tsx)
- [EmotionProvider/index.tsx](C:/Users/borab/repos/adserve-dashboard/src/Core/components/EmotionProvider/index.tsx)

### `useCallback`

Event listener tabanlı custom hook’larda kullanılıyor:

- `useOuterClick`
- `useResize`
- `useScroll`

### Responsive chart

Recharts `ResponsiveContainer` ile grafik container boyutuna uyum sağlıyor.

### Server-side pagination yaklaşımı

Tablolar tüm veriyi browser’a yüklemek yerine `limit`/`offset` gönderiyor. Bu, büyük listelerde önemli bir performans avantajıdır.

## Bulunmayanlar

- `React.memo` yok.
- Virtualization yok.
- Uygulama seviyesinde debounce yok.
- Throttle yok.
- Prefetch yok.
- TanStack Query cache yok.
- Service Worker/PWA cache kanıtı yok.
- Image lazy loading/optimizasyon kanıtı yok.
- Bundle analyzer konfigürasyonu yok.
- Error boundary tespit edilmedi.

## İyileştirme adayları

En önemli adaylar:

1. Arama input’larını debounce etmek  
   Şu an tablo aramasındaki her değişiklik filtre state’ini ve dolaylı olarak API çağrısını tetikleyebilir.

2. Request cancellation  
   Hızlı filtre değişimlerinde eski response’un yeni sonucu ezmesini önlemek için `AbortController` veya Axios signal kullanılabilir.

3. Query cache  
   Kampanya/reklam liste-detail akışında tekrar istekleri azaltabilir.

4. Büyük listelerde virtualization  
   Gerçek veri hacmi bilinmediği için gerekliliği koddan kesin söylenemez.

5. Kampanya formunu reducer/state machine ile modellemek  
   Esas fayda render performansından çok state tutarlılığı olur.

6. Ölçüm sonrası memoization  
   Her component’e `React.memo` eklemek doğru yaklaşım değildir. React Profiler sonucuna göre uygulanmalı.

---

# 7. API katmanı

## Haberleşme yöntemi

Tek bir Axios instance kullanılıyor:

- Base URL: `REACT_APP_API_URL`
- Başlangıçta cookie’den bearer token ekleniyor.
- Response interceptor backend mesajını normalize ediyor.
- Feature API dosyaları `Core/api` client’ını kullanıyor.

Kaynak: [Core/api/index.ts](C:/Users/borab/repos/adserve-dashboard/src/Core/api/index.ts)

## API organizasyonu

Her feature kendi endpoint wrapper’larına sahip:

```text
Campaign/api/createCampaign.ts
Campaign/api/listCampaigns.ts
Campaign/api/getCampaignPerformance.ts
Ad/api/createAd.ts
Ad/api/listAds.ts
AdGroup/api/createAdGroup.ts
...
```

Bu yaklaşımın avantajı, endpoint bilgilerini UI’dan ayırmasıdır.

## Error handling

Üç seviye var:

1. Axios interceptor hata mesajını string’e dönüştürüyor.
2. `useRequest` error/loading state tutuyor.
3. `showError` verilirse Ant Design `message.error` gösteriliyor.

Eksikleri:

- Typed error modeli yok.
- HTTP status bazlı ayrıştırma yok.
- Global 401 handling yok.
- Error boundary yok.
- Bazı hook’lardaki `showError` blokları boş.
- Hatalar string’e indirgeniyor; metadata kayboluyor.

## Refresh token

`auth/refresh` endpoint wrapper’ı ve refresh-token cookie’si mevcut.

Ancak önemli ayrım:

> Kodda refresh token alınması ve refresh endpoint’i var; 401 sonrasında otomatik refresh edip başarısız request’i tekrar eden interceptor akışı tespit edilmedi.


## Retry

Otomatik retry mekanizması yok.

## Upload

Reklam görseli `FormData` ile multipart olarak gönderiliyor.

## REST yaklaşımı

GET, POST ve DELETE kullanılıyor. Bazı activate/deactivate işlemleri GET ile yapılmış. Bunun backend sözleşmesi olduğu görülebilir; kararın frontend geliştiriciye ait olduğu söylenemez.

---

# 8. UI

## Component tasarımı

İki grup component var:

- Domain component’leri: `CampaignForm`, `AdForm`, `AdsTable`
- Ortak component’ler: `TableComponent`, `EmptyState`, `PageHeader`, `DatePicker`, `Steps`, `ImageUpload`

Özellikle generic `TableComponent` şu davranışları ortaklaştırıyor:

- Search
- Status filter
- Date filter
- Sort
- Pagination
- Empty state
- Custom header

## Reusability

Başarılı tekrar kullanım örnekleri:

- Table ve pagination
- Form label/error/container
- Date/range picker
- Empty state
- Status tag
- Page header
- Ad preview
- Sort container
- Theme mixin’leri
- API request hook’ları

## Form yönetimi

Ant Design Form kullanılıyor:

- `Form.useForm`
- `Form.Item`
- `validateFields`
- `onFinish`
- Custom validator
- Required kuralları

## Validation

Doğrulanan validation örnekleri:

- Required alanlar
- E-posta
- Parola
- URL
- Kampanya adının backend üzerinden benzersizlik kontrolü
- Tarih aralığı
- Bütçe
- Reklam parametreleri

Ortak validation yardımcıları [validations.ts](C:/Users/borab/repos/adserve-dashboard/src/Core/utils/validations.ts) içinde.

## Theme

İki UI sistemi birleştirilmiş:

- Ant Design `ConfigProvider`
- Emotion `ThemeProvider`

Ant Design token’ları Emotion theme içine aktarılıyor. Böylece custom styled component’ler Ant Design temasıyla aynı token’ları kullanabiliyor.

Bu teknik olarak güçlü bir detaydır.

## Responsive yapı

- Emotion media-query mixin’leri bulunuyor.
- Phone/tablet/mobile breakpoint’leri tanımlı.
- `useDevice` viewport genişliğinden device türü üretiyor.
- Navigation mobil davranışlar içeriyor.
- Drag-and-drop mobilde `TouchSensor`, desktop’ta `PointerSensor` kullanıyor.
- Grafik `ResponsiveContainer` kullanıyor.

Ancak tüm ekranların eksiksiz responsive olduğu yalnızca koddan garanti edilemez.

## Accessibility

Bazı semantik/ARIA kullanımları mevcut olsa da sistematik accessibility yaklaşımı kanıtlanmıyor:

- Otomatik a11y testleri yok.
- Axe/Lighthouse entegrasyonu yok.
- Klavye navigasyonu kapsamı bilinmiyor.
- Screen reader testleri bilinmiyor.

---
