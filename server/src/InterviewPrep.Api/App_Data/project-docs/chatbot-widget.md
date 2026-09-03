# 1. Projenin Özeti

## Proje ne yapıyor?

Bu proje, farklı web sitelerine JavaScript bundle olarak eklenebilen bir chatbot widget’ı geliştiriyor.

Widget:

- Sayfanın köşesinde açılır-kapanır sohbet paneli olarak çalışabiliyor.
- Belirli bir DOM container içine gömülü, inline akış olarak gösterilebiliyor.
- Backend ile HTTP veya WebSocket üzerinden haberleşebiliyor.
- Backend’den gelen mesaj tipini uygun React bileşenine dönüştürüyor.
- Kullanıcı etkileşimlerini analitik servisine gönderiyor.
- Tema ve davranışı dışarıdan verilen ayarlarla özelleştiriyor.

Bunun temel kanıtları [index.tsx](C:/Users/borab/repos/chatbot/chatbot-widget-v2/v2/src/index.tsx), [App.tsx](C:/Users/borab/repos/chatbot/chatbot-widget-v2/v2/src/App.tsx) ve [Widget/index.tsx](C:/Users/borab/repos/chatbot/chatbot-widget-v2/v2/src/Widget/index.tsx).

## Business amacı

Güçlü çıkarım olarak amaç:

- Web sitelerine chatbot veya yönlendirmeli konuşma deneyimi eklemek.
- Kullanıcıdan bilgi ve lead toplamak.
- Form, adres, tarih, seçenek ve medya gibi zengin mesajlarla dönüşüm akışı oluşturmak.
- Kullanıcı etkileşimlerini ölçmek.
- Aynı widget altyapısını farklı botlar, müşteriler ve temalar için yeniden kullanmak.

“Lead toplama” çıkarımını `leadpost`, formlar, `saveQuestions`, tracking ve kullanıcı parametreleri destekliyor. Ancak hangi sektörlerde kullanıldığı veya ticari KPI’ların ne olduğu koddan kesin çıkarılamıyor.

## Kullanıcılar ne yapabiliyor?

Kesin olarak:

- Widget’ı açıp kapatabiliyor.
- Serbest metin mesaj gönderebiliyor.
- Quick reply ve buton seçeneklerini kullanabiliyor.
- Dropdown, slider ve checkbox ile seçim yapabiliyor.
- Tarih ve tarih-saat seçebiliyor.
- Adres arayabiliyor.
- Birden fazla alan içeren form gönderebiliyor.
- Galeri, carousel, görsel ve video içeriği görüntüleyebiliyor.
- Option card seçebiliyor.
- Backend’in yönlendirme mesajıyla başka URL’ye geçebiliyor.
- Konuşmayı sıfırlayabiliyor.
- Bildirim sesini açıp kapatabiliyor.
- Adım bazlı veya klasik konuşma görünümü kullanabiliyor.

Mesaj çeşitleri [messageItems.ts](C:/Users/borab/repos/chatbot/chatbot-widget-v2/v2/src/Widget/constants/messageItems.ts) içinde açıkça listelenmiş.

---

# 2. Kullanılan Teknolojiler

## V2’de gerçekten kullanılanlar

- **React 18**
- **React DOM / `createRoot`**
- **TypeScript 4.9**, strict mod
- **Create React App / react-scripts 5**
- **Fetch API**
- **Native WebSocket API**
- **Context API**
- **Custom hooks**
- **Emotion**
  - `@emotion/react`
  - `@emotion/styled`
- **React Markdown**
- **rehype-external-links**
- **js-cookie**
- **use-places-autocomplete**
- **Google Maps Places API**
- **Local Storage**
- **Cookies**
- **CSS-in-JS**
- **Terser**, dışa aktarılan bundle’ı küçültmek için
- **Node.js tabanlı özel build scriptleri**
- **Docker**
- **Nginx**

Bağımlılıkların ana kaynağı [v2/package.json](C:/Users/borab/repos/chatbot/chatbot-widget-v2/v2/package.json).

## Kullanılmayan veya V2’de görünmeyenler

- Vite
- Redux
- Zustand
- TanStack Query / React Query
- React Router
- Axios
- SignalR
- Socket.io
- Material UI
- Tailwind
- Ant Design
- Framer Motion
- Chart.js
- Recharts
- React Hook Form
- Formik
- Zod / Yup

## V1 ayrımı

Depodaki eski V1’de şunlar bulunuyor:

- React 16
- Redux / React Redux
- Axios
- ASP.NET SignalR
- Immutable.js
- SCSS
- Webpack 4
- Jest / Enzyme


> Eski V1 Redux ve SignalR kullanıyordu; V2’de daha küçük ve widget odaklı bir yapı için Context, Fetch ve native WebSocket tercih edilmiş.

Bu geçişi bizzat mevcut geliştiricinin yaptığı ise commit sahipliği veya ekip bilgisi olmadan kesin değildir.

---

# 3. Frontend Mimarisi

## Genel mimari

En uygun tanım:

> Layered + component-driven, domain odaklı klasörleme içeren widget mimarisi.

Tam anlamıyla klasik feature-based değildir; çünkü ana domain zaten tek bir feature, yani chatbot widget’tır.

### Katmanlar

```text
Entry / Bootstrap
  index.tsx
       ↓
Application composition
  App.tsx
       ↓
State + transport
  BotProviderAPI / BotProviderWebSocket
       ↓
Widget UI
  Launcher / Panel / Conversation / Message Items
       ↓
Shared Core
  Button / Input / Select / hooks / date / theme / API
```

- `Core`: Domain’den görece bağımsız bileşenler, hook’lar, tema yardımcıları ve API wrapper.
- `Widget`: Chatbot domain’ine ait context, API fonksiyonları, mesaj modelleri ve UI.
- `Widget/components/Panel/Conversation/Item`: Mesaj türüne göre ayrılmış renderer bileşenleri.
- `types`: Backend mesaj sözleşmelerinin TypeScript karşılıkları.
- `constants`: Mesaj tipinden component’e mapping ve socket protokol sabitleri.
- `utils`: Mesaj oluşturma, payload parsing, entity formatlama, storage ve socket codec işlemleri.

## Component-driven yapı

Mesaj tipleri küçük ve bağımsız renderer’lara bölünmüş:

- Text
- Form
- Input
- Dropdown
- Slider
- Checkbox
- DatePicker
- DateTimePicker
- Address
- Media
- Gallery
- Template
- OptionCards
- StreamingText

Bu tasarım backend’in mesaj şemasına yeni mesaj tipi eklemeyi nispeten lokal hale getiriyor.

## Container / Presentational ayrımı

Katı veya isimlendirilmiş bir Container/Presentational yaklaşımı yok. Fakat fiilen:

- Provider ve `PanelConversation` gibi bileşenler davranış/state ağırlıklı.
- `Avatar`, `Button`, `Input`, ikonlar ve pek çok item renderer daha sunumsal.

Yani pattern kısmen mevcut, ancak disiplinli bir mimari kural olarak kanıtlanamıyor.

## Atomic Design

Atomic Design kullanıldığı söylenemez. `Core/components` altında temel UI parçaları var fakat atom/molecule/organism sınıflandırması yapılmamış.

---

# 4. React Patternleri

## 1. Custom Hook

### Nerede?

- `useBot`
- `useMount`
- `useUnmount`
- `useUpdateEffect`
- `useClickAway`
- `useNotifySound`

Örnekler: [contexts/bot/index.ts](C:/Users/borab/repos/chatbot/chatbot-widget-v2/v2/src/Widget/contexts/bot/index.ts), [Core/hooks](C:/Users/borab/repos/chatbot/chatbot-widget-v2/v2/src/Core/hooks), [useNotifySound.ts](C:/Users/borab/repos/chatbot/chatbot-widget-v2/v2/src/Widget/hooks/useNotifySound.ts).

### Neden?

- Context erişimini tek API altında toplamak.
- Mount/update/unmount lifecycle davranışlarını tekrar etmemek.
- Click-away ve ses yönetimi gibi tarayıcı side effect’lerini UI’dan ayırmak.

## 2. Context + Provider

### Nerede?

`BotContext`, `BotProviderAPI`, `BotProviderWebSocket`.

### Neden?

Mesajlar, ayarlar, token, tracking, bağlantı durumu ve `send/reset` gibi işlemler component ağacının çok farklı seviyelerinde gerekiyor. Prop drilling önlenmiş.

## 3. Strategy benzeri dinamik Provider seçimi

### Nerede?

[App.tsx](C:/Users/borab/repos/chatbot/chatbot-widget-v2/v2/src/App.tsx):

```tsx
const BotProvider =
  settings.type === "api" ? BotProviderAPI : BotProviderWebSocket;
```

### Neden?

UI aynı kalırken iletişim mekanizması HTTP veya WebSocket olabiliyor. İki provider da aynı context sözleşmesini sağlıyor.

Bu klasik GoF Strategy’nin birebir uygulaması değil, ancak React seviyesinde strateji değişimi olarak anlatılabilir.

## 4. Registry / component mapping

### Nerede?

[messageItems.ts](C:/Users/borab/repos/chatbot/chatbot-widget-v2/v2/src/Widget/constants/messageItems.ts).

### Neden?

Uzun bir `switch` veya koşul ağacı yerine mesaj tipi component’e çevriliyor:

```tsx
const Component = messageItems[message.messagingType];
<Component message={message as never} />
```

Yeni mesaj renderer’ı eklemeyi kolaylaştırıyor.

## 5. Controlled Component

### Nerede?

- Footer input
- Form alanları
- Select
- Checkbox
- Slider
- Date picker
- Address input

Değer React state’inden geliyor ve `onChange` ile güncelleniyor.

### Neden?

Validation, submit kilitleme, entity normalizasyonu ve backend payload üretimi merkezi kontrol ediliyor.

## 6. Uncontrolled Component

Belirgin bir uncontrolled form modeli yok. DOM ref’leri focus, blur, scroll ve dışarı tıklama için kullanılıyor; bu onları tek başına uncontrolled component yapmaz.

## 7. Provider composition

`BotProvider → EmotionProvider → Widget` şeklinde iki provider katmanı compose edilmiş.

Bot ayarları önce context’e giriyor; tema provider’ı bu context üzerinden dinamik tema üretiyor.

## 8. Polymorphic rendering

Tek bir conversation item, `messagingType` üzerinden farklı renderer seçiyor. Backend mesaj sözleşmesi UI davranışını belirliyor.

## 9. Adapter / normalization

`formatEntity`, `normalizeEntity`, `parsePayload`, `create` ve socket `encode/decode` fonksiyonları backend verisini UI modeline uyarlıyor.

## 10. Host-page integration / imperative bridge

`window.leedobot.open`, `close`, `refresh`, `toggleIntent` gibi fonksiyonlar dış sayfaya imperative API sunuyor.

Bu bir React patterninden çok entegrasyon patternidir. Widget’ın React dışı sitelerden yönetilebilmesini sağlıyor.

## Bulunmayan patternler

Kodda belirgin olarak bulunmuyor:

- Compound Components
- Render Props
- HOC
- React Portal
- `React.lazy`
- Suspense
- Error Boundary
- `forwardRef`
- Reducer pattern
- Redux middleware
- Server-state/query-cache pattern

---

# 5. State Management

## Local state

Yoğun olarak kullanılıyor:

- Widget açık/kapalı durumu
- Input değerleri
- Form değerleri
- Dropdown durumu
- Loading göstergesi
- Tema hesaplamasına bağlı UI durumları

Avantajı, state’in kullanıldığı yere yakın olması. Dezavantajı ise karmaşık zamanlama davranışlarında çok sayıda `useState`, `useEffect`, ref ve timer’ın birlikte yönetilmesi.

## Context state

Bot provider şu global widget state’ini taşıyor:

- Token
- Client/customer ID
- Settings
- Web config
- Messages
- Streaming message
- Trace
- Loading başlangıcı
- Query parametreleri
- `send`, `track`, `reset`, `getConfig`

Avantajları:

- Widget ölçeğinde harici state kütüphanesine ihtiyaç bırakmıyor.
- HTTP ve WebSocket implementasyonları aynı consumer API’sini sunuyor.
- Bundle boyutu açısından Redux/Zustand eklenmiyor.

Trade-off’ları:

- Context değeri değişince context’i tüketen bileşenlerin tamamı yeniden render adayı olur.
- State ile network orchestration aynı büyük provider içinde birleşiyor.
- `BotProviderWebSocket` bağlantı, retry, streaming, tracking ve mesaj state’ini aynı bileşende yönetiyor.
- Context selector bulunmuyor.
- API ve WebSocket provider’ları arasında tekrar eden önemli miktarda davranış var.
- State geçişleri reducer/state-machine ile modellenmediği için bağlantı ve loading durumlarını zihinsel olarak izlemek zorlaşıyor.

## Ref state

WebSocket provider’da render gerektirmeyen mutable durum için ref kullanılıyor:

- Aktif WebSocket
- Connection promise
- Send queue
- Streaming chunk queue
- Typing interval
- Accumulated/displayed text
- İlk mesaj alındı işareti

Bu, her chunk veya bağlantı iç ayrıntısında gereksiz render’ı önleyen doğru bir kullanım gerekçesidir.

## Persistent state

- Token ve client IP cookie’de saklanıyor.
- UID ve cevap parametreleri local storage’da tutuluyor.
- `resetSession` geldiğinde oturum bilgileri temizleniyor.

## Redux / Zustand / Query cache

- V2’de Redux yok.
- Zustand yok.
- React Query/TanStack Query yok.
- Server-state query cache yok.

Bu proje uzun ömürlü ekran verisi yönetmekten çok event tabanlı bir widget olduğundan query cache zorunlu görünmüyor. Yine de config/token fetch deduplication, cancellation, retry policy ve cache invalidation gibi yetenekler elle uygulanıyor.

---

# 6. Performans

## Kullanılan teknikler

### `useMemo`

- Dinamik Emotion theme hesaplamasında.
- Step listesinin ve aktif step’in hesaplanmasında.
- Select’in seçili ve ilk aktif option index’inde.

### `useCallback`

`useNotifySound.play` fonksiyonunun referansı stabilize edilmiş.

### Refs ile mutable streaming yönetimi

WebSocket chunk’ları önce ref tabanlı kuyruğa alınıyor. Her protokol ayrıntısı state’e taşınmıyor.

### Debounce

Google Places autocomplete için 300 ms debounce var.

### Kontrollü render edilen mesaj listesi

İlk loading mesajında, sonraki mesajlar hazır olsa bile belirli bir noktaya kadar liste kesiliyor:

```ts
bot.messages.slice(0, firstLoadingIndex + 1)
```

Bu daha çok UX sıralaması olmakla beraber gereksiz erken render’ı da engelliyor.

### `requestAnimationFrame`

Streaming mesaj tamamlandığında geçici streaming state’ini render döngüsüyle uyumlu temizlemek için kullanılıyor.

### Build minification

CRA production build ve ayrıca root seviyesinde Terser kullanılıyor.

### Responsive CSS ve reduce-motion desteği

Mesaj animasyonunda `prefers-reduced-motion` kontrolü var. Bu doğrudan performanstan çok erişilebilirlik/UX tekniğidir.

## Kullanılmayanlar

- `React.memo`
- `React.lazy`
- Suspense
- Route-based code splitting
- Açık dynamic import
- Liste virtualization
- Throttle
- Web Worker
- Context selector
- Windowing
- Explicit bundle analyzer

## Geliştirme alanları

### Context render alanı

Provider value her provider render’ında yeniden oluşturuluyor. Çok sayıda consumer bulunduğu için context parçalanması düşünülebilir:

- Connection context
- Message context
- Configuration context
- Analytics context

Alternatif olarak selector destekli store değerlendirilebilir.

### Mesaj listesinde index key

Conversation listesi `key={i}` kullanıyor. Mesajların stabil `id` alanı olduğu için `key={x.id}` daha sağlam olabilir. Teknik değerlendirmede reconciliation ve yanlış component state eşleşmesi üzerinden sorulabilir.

### Virtualization

Uzun konuşmalar için virtualization yok. Ancak sohbet balonlarının dinamik yüksekliği, otomatik scroll ve typing animasyonu nedeniyle uygulanması kolay değildir. Önce gerçek konuşma uzunluğu ve performans ölçülmelidir.

### Code splitting

Her mesaj renderer’ı statik import ediliyor. Widget bundle’ı tek dosya olarak dağıtıldığı için bu bilinçli olabilir; ayrı chunk’lar host sayfada deployment ve cache karmaşıklığı yaratabilir. Bundle ölçümü olmadan “lazy loading kesin eklenmeli” denemez.

### Timer yoğunluğu

Typing/loading akışında çok sayıda timeout ve interval bulunuyor. State machine veya merkezi scheduler test edilebilirliği artırabilir.

---

# 7. API Katmanı

## HTTP

V2, Axios değil native `fetch` kullanıyor.

Ortak wrapper [Core/api/index.ts](C:/Users/borab/repos/chatbot/chatbot-widget-v2/v2/src/Core/api/index.ts) içinde:

- JSON header ekliyor.
- Body’yi serialize ediyor.
- Response’u JSON parse ediyor.
- `response.ok` değilse parsed response’u throw ediyor.
- Generic dönüş tipi sağlıyor.

Endpoint katmanı ayrı fonksiyonlara bölünmüş:

- Token alma
- Web config alma
- Mesaj gönderme
- Impression
- Tracking

## WebSocket

Native `WebSocket` kullanılıyor. SignalR’ın JSON protokolüne benzeyen bir framing/encoding katmanı var, fakat V2 bağımlılıklarında SignalR paketi yok. Bu nedenle “V2 SignalR kullanıyor” kesin denemez.

Önemli davranışlar:

- Tek bağlantı kurma promise’i ile duplicate connect engelleniyor.
- Socket açık değilse mesajlar kuyruğa alınıyor.
- Bağlantı açıldığında queue flush ediliyor.
- Socket kapanınca reconnect deneniyor.
- Tab yeniden görünür olduğunda bağlantı kontrol ediliyor.
- Streaming chunk’lar sıraya alınarak typing animasyonuyla gösteriliyor.
- Trace ve saved question event’leri ayrı işleniyor.

## Retry

HTTP provider config alma hatasında artan gecikmeyle tekrar deniyor:

```ts
getConfig(delay + 2000)
```

WebSocket:

- Close sonrası 1 saniyede reconnect deniyor.
- Connect sürüyorsa mevcut promise yeniden kullanılıyor.

Bunun tam bir exponential backoff olmadığı belirtilmeli; gecikme lineer artıyor. Maksimum retry, jitter ve terminal failure state görünmüyor.

## Error handling

Mevcut:

- HTTP `response.ok` kontrolü
- Config/token hatasında session temizleme ve retry
- WebSocket connect promise reject
- Markdown/HTML sanitization
- Settings JSON parse koruması

Sınırlı veya görünmeyen:

- Kullanıcıya hata UI’ı
- Error Boundary
- Request timeout
- `AbortController`
- Merkezi hata modeli
- Status-code bazlı davranış
- Offline durumu
- Retry limiti
- Telemetry/error reporting

## Refresh token

Refresh-token akışı yok. Bot session token’ı cookie’den okunuyor; yoksa `/webhook/token` üzerinden yenisi alınıyor. Bu token’ın auth token mı, anonim session token mı olduğu koddan kesin çıkarılamaz.

## Güvenlik açısından anlatılabilecek nokta

Markdown renderer HTML içeriklerini:

- Allowlist ile filtreliyor.
- Script/style/template kaldırıyor.
- Event handler attribute’larını kaldırıyor.
- Link protokollerini sınırlıyor.
- Dış linklere `noopener noreferrer` ekliyor.

Bu, kullanıcı/backend kaynaklı rich text içeriğine karşı XSS riskini azaltmaya yönelik somut bir geliştirmedir.

---

# 8. UI

## Component tasarımı

İki ana component seviyesi var:

- `Core/components`: Button, Input, Select, Checkbox, Slider, DatePicker, MarkdownView gibi tekrar kullanılabilir temel parçalar.
- `Widget/components`: Chat domain’ine ait Panel, Launcher, Greeting, message renderer’ları.

Bu, UI primitive’leri ile domain component’lerini ayırıyor.

## Reusable component yaklaşımı

Tekrar kullanılabilir bileşenler prop tabanlı varyasyonlar destekliyor:

- Boyut
- Disabled state
- Variant
- Block/rounded
- Tema
- Placement
- Options/value/onChange

## Form yönetimi

Harici form kütüphanesi yok. Form state’i array olarak local state içinde tutuluyor.

Submit butonu şu durumda devre dışı:

- Bir alan `undefined` ise.
- String alan boşsa.
- Form daha önce gönderilmişse.

Backend’den gelen parameter metadata’sı input tipini belirliyor.

## Validation

Validation iki seviyede görünüyor:

- Client-side boş alan kontrolü.
- Backend’in `showErrorAfter` ve `notValidText` değerleri üzerinden alan hatası gösterme.

Zod, Yup veya declarative schema validation yok. Email/telefon gibi entity formatlama yardımcıları bulunuyor, fakat tüm validation kurallarının frontend’de tanımlandığı söylenemez.

## Theme

Emotion `ThemeProvider` kullanılıyor.

Tema:

- Default core theme
- Bot settings
- Backend web config

birleştirilerek hesaplanıyor.

Dinamik alanlar arasında primary color, greeting background/text, inline ve step modları bulunuyor.

## Responsive yapı

- Telefon ve tablet breakpoint yardımcıları var.
- 576px altında global widget CSS’i değişiyor.
- Inline ve floating modlar farklı layout davranışları gösteriyor.
- Container içine gömülen modda body yerine sayfa scroll’u kontrol edilebiliyor.
- Mobil tab visibility sonrası WebSocket yeniden bağlanıyor.

## Erişilebilirlik

Mevcut örnekler:

- Send butonunda `aria-label`.
- Custom Select’te `listbox`, `option`, `aria-expanded`, `aria-selected`.
- Keyboard ile Select kontrolü.
- `prefers-reduced-motion`.

Fakat proje genelinde erişilebilirliğin ölçüldüğü veya WCAG hedefi olduğu koddan çıkarılamıyor. Dialog semantics, focus trap, launcher label’ları, screen-reader testleri ve kontrast doğrulaması ayrıca incelenmeli.

---
