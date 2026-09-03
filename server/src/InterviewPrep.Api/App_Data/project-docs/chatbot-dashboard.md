## 1. Projenin özeti

### Proje ne yapıyor?

Leedobot Dashboard, chatbotların oluşturulduğu, düzenlendiği, test edildiği ve yapılandırıldığı bir web uygulaması.

Ürünün merkezi, React Flow tabanlı görsel akış editörü. Kullanıcı bot davranışını step ve block’lardan oluşan bir graph üzerinde tasarlayabiliyor.

Kodda görülen başlıca kullanım alanları:

- Bot oluşturma, güncelleme, silme, klonlama ve birleştirme
- Botları müşterilere atama
- Botlar içinde flow oluşturma ve düzenleme
- Step ve block tabanlı konuşma akışları tasarlama
- Text, input, media, gallery, redirect, API, email, form ve next-step gibi bloklar kullanma
- Question flow oluşturma ve soru/cevap akışlarını bağlama
- Değişken, condition, link ve global verileri yönetme
- Widget görünümünü yapılandırma ve önizleme
- Flow’u uygulama içinde test etme
- KPI, impression, personalized score, user segment ve API metric verilerini inceleme
- Hesap, kullanıcı, müşteri ve bazı global ayarları yönetme

### Business amacı

Koddan çıkarılabilen iş amacı:

> Teknik olmayan veya düşük kod bilgisine sahip kullanıcıların, chatbot konuşma akışlarını görsel bir builder üzerinden oluşturmasını ve değiştirmesini sağlamak.

Buna ek olarak uygulama, chatbot sonuçlarını ve sıralama/KPI verilerini incelemek için operasyonel araçlar sunuyor.

Şunlar koddan kesin çıkarılamıyor:

- Hedef müşteri segmenti
- Gelir modeli
- Ürünün SaaS mı yoksa şirket içi platform mu olduğu
- KPI modülünün müşterilere mi yoksa iç operasyon ekibine mi açık olduğu
- Aktif kullanıcı veya trafik miktarı

---

## 2. Kullanılan teknolojiler

### Gerçekten kullanılan temel teknolojiler

- React 18
- TypeScript 5
- Create React App / `react-scripts`
- Craco
- React Router v6
- Axios
- React Context API
- Custom hooks
- ahooks
- Ant Design v5
- Emotion
- React Flow v11
- `@dnd-kit`
- Tiptap
- i18next / react-i18next
- Recharts
- Day.js
- Dagre
- ELK.js
- React Markdown
- React Lottie

Bağımlılıklar [package.json](C:/Users/borab/repos/chatbot/leedobot-dashboard/package.json) içinde görülebilir.

### Teknolojilerin kullanım amaçları

| Teknoloji | Kullanım |
|---|---|
| React | Component ve ekran yapısı |
| TypeScript | Domain modelleri, props ve API tipleri |
| CRA + Craco | Build/dev altyapısı ve Babel özelleştirmesi |
| React Router | Route, protected route ve URL parametreleri |
| Context API | Auth, bot, globals ve UI preferences |
| Axios | REST API haberleşmesi |
| Emotion | Co-located `styles.ts` dosyaları ve tema |
| Ant Design | Form, notification ve bazı temel UI parçaları |
| React Flow | Node/edge tabanlı bot ve soru akışı canvas’ı |
| dnd-kit | Step, block, question ve button sıralama |
| Tiptap | Rich text düzenleme |
| Recharts | KPI ve editör içi grafikler |
| Dagre / ELK | Graph auto-layout |
| i18next | Çeviri altyapısı |
| ahooks | Özellikle `useUpdateEffect` gibi yardımcı hook’lar |
| Day.js | Tarih işlemleri, UTC desteği |

### Bulunmayan veya kullanıldığı doğrulanamayanlar

- Vite yok; proje CRA/Craco kullanıyor.
- Redux yok.
- Zustand yok.
- TanStack Query / React Query yok.
- Tailwind yok.
- Material UI yok.
- SignalR veya Socket.io yok.
- Framer Motion yok.
- Chart.js yok.
- `react-lottie` bağımlılığı var; Lottie asset’i de mevcut.
- Dark mode kodda gerçekten var; preferences context ve CSS variables üzerinden uygulanıyor.

---

## 3. Frontend mimarisi

### Ana yaklaşım: Feature-based structure

Proje domain/feature bazlı ayrılmış:

- `Auth`
- `Bot`
- `Flow`
- `Home`
- `KPI`
- `Settings`
- `Account`
- `CallCampaign`
- `GlobalWhitelistedDomain`
- `Core`
- `Root`

Her feature kendi `api`, `types`, `pages`, `components` veya `context` parçalarını taşıyor. Bu nedenle yapı en iyi şekilde “feature-based, ortak Core katmanıyla desteklenen modüler frontend” olarak anlatılabilir.

### Ortak katman

`Core` şu yatay ihtiyaçları içeriyor:

- API client
- Storage
- Theme
- Reusable UI component’leri
- App shell component’leri
- Custom hooks
- Translation altyapısı
- Preferences context

### Component-driven yaklaşım

Büyük ekranlar daha küçük bileşenlere ayrılmış:

- Flow editor
- Step node
- Right panel
- Block editor’leri
- Globals panel tab’leri
- KPI tabloları ve detail panel’leri
- Shared UI primitive’leri

Component logic ile Emotion stilleri genel olarak `index.tsx` ve `styles.ts` şeklinde ayrılmış.

### Container/presentational durumu

Tam anlamıyla katı bir container/presentational ayrımı yok.

Bazı component’ler yalnızca görünüm ve callback’lerle çalışırken, özellikle `BotEditorV2` ve `QuestionFlowEditor` çok fazla orchestration, state, persistence ve render sorumluluğu taşıyor. Bu nedenle:

> Projede presentational component’ler var, fakat mimari sistematik olarak container/presentational pattern üzerine kurulmamış.

### Mimari risk

[BotEditorV2](C:/Users/borab/repos/chatbot/leedobot-dashboard/src/Bot/pages/BotEditorV2/index.tsx) ve [QuestionFlowEditor](C:/Users/borab/repos/chatbot/leedobot-dashboard/src/Bot/pages/QuestionFlowEditor/index.tsx) binlerce satıra ulaşmış.

Teknik değerlendirme:

> “Editör karmaşıklığı büyüdükçe ana orchestration component’i fazla sorumluluk almaya başladı. Sonraki refactor adımım persistence, keyboard commands, editor history ve block operations mantığını ayrı hook/service katmanlarına taşımak olurdu.”

---

## 4. React patternleri

### Custom hook

Örnekler:

- [useRequest](C:/Users/borab/repos/chatbot/leedobot-dashboard/src/Core/hooks/useRequest.ts)
- [useEditorHistory](C:/Users/borab/repos/chatbot/leedobot-dashboard/src/Flow/hooks/useEditorHistory.ts)
- [useEditorSelection](C:/Users/borab/repos/chatbot/leedobot-dashboard/src/Flow/hooks/useEditorSelection.ts)
- `useAuth`, `useBot`, `useGlobals`, `usePreferences`

Neden kullanılmış?

- Request loading/error/data davranışını ortaklaştırmak
- Editor selection mantığını UI’dan ayırmak
- Undo/redo geçmişini tekrar kullanılabilir yapmak
- Context erişimini sadeleştirmek

### Context ve Provider

Provider’lar:

- `AuthProvider`
- `BotProvider`
- `GlobalsProvider`
- `PreferencesProvider`
- `EditorPrefsProvider`

Uygulama kökündeki composition [src/index.tsx](C:/Users/borab/repos/chatbot/leedobot-dashboard/src/index.tsx) içinde.

Neden kullanılmış?

- Kullanıcı hesabı ve authentication durumu
- Aktif bot ve bot listesi
- Botlar arası ortak/global veriler
- Dark/light görünüm tercihi
- Editöre özel tercihler

### Controlled component

Editör input’larının büyük bölümü `value` ve `onChange` üzerinden parent state tarafından kontrol ediliyor.

Örnekler:

- Block editor’leri
- Step isimleri
- Question editor alanları
- Condition builder
- Reusable Input/Textarea component’leri

Bu, form değerlerinin canvas/editor modeliyle eşzamanlı tutulmasını kolaylaştırıyor.

### Uncontrolled/ref kullanımı

Tamamen uncontrolled form mimarisi yok. Fakat DOM erişimi ve imperative davranışlar için ref yoğun kullanılmış:

- Input focus
- React Flow instance
- Save timer’ları
- Latest request veya pending state
- Dropdown konumlandırma
- History stack

### Portal

`createPortal` yaygın biçimde kullanılıyor:

- Dropdown
- Popover
- Spotlight search
- Sheet/panel
- Tooltip benzeri overlay
- Rename/clone/merge UI’ları

Örneğin [HomePage](C:/Users/borab/repos/chatbot/leedobot-dashboard/src/Home/pages/HomePage/index.tsx) ve editör spotlight component’leri.

Neden?

Overlay’leri overflow ve stacking-context sınırlarının dışına çıkarmak, fixed konumlandırmayı güvenilir hale getirmek.

### Lazy loading ve Suspense

Route component’leri `React.lazy` ile ayrılmış ve `Suspense` fallback’leri kullanılmış: [Root](C:/Users/borab/repos/chatbot/leedobot-dashboard/src/Root/index.tsx).

Böylece Home, Editor, Flows, KPI, Settings ve Account route’ları ayrı chunk olarak yüklenebilir.

### Forward ref

Reusable input component’lerinde bulunuyor:

- Input
- Textarea
- Button
- SearchInput
- SelectableCard

Amaç parent component’in focus ve native DOM davranışlarına erişebilmesi.

### Bulunmayan patternler

Kodda belirgin olarak bulunmayanlar:

- HOC
- Render props
- `useReducer`
- Sistematik compound component API’si
- `React.memo`

---

## 5. State management

### Local state

En yaygın yöntem `useState`.

Özellikle editörde şunlar local state/ref ile yönetiliyor:

- Seçili step/block
- Panel durumları
- Canvas mode
- Save status
- Preview
- Search/filter
- Form draft’ları
- Dropdown konumları
- Undo/redo geçmişi

Avantajı:

- State kullanım yerine yakın
- Redux benzeri ekstra abstraction yok
- Küçük UI state’leri için basit

Dezavantajı:

- Büyük editör component’lerinde çok sayıda bağımlı state oluşuyor
- Transition’ların takibi zorlaşıyor
- Stale closure ve effect dependency riski artıyor
- Test edilmesi zorlaşabiliyor

### Context API

Global veya subtree seviyesindeki state için kullanılıyor:

- Auth
- Bot
- Globals
- Preferences
- Editor preferences

Avantajı:

- Ek state library gerektirmiyor
- Düşük frekanslı global state için uygun
- Provider sınırları domain’e göre ayrılabiliyor

Trade-off:

- Context value değiştiğinde consumer’lar yeniden render olabilir
- Selector desteği doğal olarak yok
- Editörün yüksek frekanslı state’ini Context’e taşımak performans problemi yaratabilir
- Provider sayısı arttıkça dependency ilişkisi zorlaşabilir

### Server state

React Query veya başka bir query cache bulunmuyor.

Server state, custom `useRequest` ile component state’inde tutuluyor. Hook:

- `loading`
- `error`
- `data`
- `runAsync`
- `refresh`

sağlıyor.

Önemli detay: monoton artan request sequence id sayesinde yalnızca en yeni request sonucu state yazabiliyor. Böylece eski ve yavaş cevapların yeni sonucu ezmesi engelleniyor.

Eksikleri:

- Shared query cache yok
- Automatic retry yok
- Stale-time yok
- Background refetch yok
- Request deduplication yok
- Mutation invalidation yok
- Optimistic update için standart bir mekanizma yok
- AbortController ile fiziksel network cancellation yok

### Storage state

`localStorage` ve `sessionStorage` şu amaçlarla kullanılıyor:

- Token
- Aktif bot
- Dil
- Theme preference
- Favorite bot/flow bilgileri

“Remember me” benzeri davranışta token session veya local storage’a yazılabiliyor.

---

## 6. Performans

### Kullanılan teknikler

#### Route-level code splitting

Route’lar `React.lazy` ile yükleniyor.

#### Suspense ve shape-matched skeleton

Route fallback’leri generic spinner yerine sayfa/editor yapısına benzeyen skeleton’lar gösteriyor.

#### `useMemo`

Şunlar için kullanılmış:

- Filtreleme ve sıralama
- Favorite ID set’leri
- Derived option listeleri
- Condition dönüşümleri
- KPI hesaplamaları
- Context value stabilizasyonu

#### `useCallback`

Özellikle editör callback’leri, context method’ları, undo/redo ve persistence işlemlerinde yoğun.

#### Debounce

- Arama alanlarında yaklaşık 300 ms debounce
- Block autosave’de yaklaşık 650 ms debounce
- Canvas/layout persistence işlemlerinde timer tabanlı birleştirme
- History kayıtlarında coalescing

#### Race-condition koruması

Custom request hook, eski response’un yeni state’i ezmesini önlüyor.

#### Ref ile transient state

Timer, history stack, pending save ve React Flow instance gibi render gerektirmeyen değerler `useRef` içinde tutuluyor.

#### Responsive chart

Recharts `ResponsiveContainer` kullanıyor.

#### Graph layout

Dagre ve ELK ile layout hesaplamaları UI modelinden ayrılmış utility fonksiyonlarında yürütülüyor.

### Eksik veya doğrulanamayan teknikler

- `React.memo` bulunamadı.
- Liste virtualization bulunamadı.
- Throttle bulunamadı.
- Web Worker kullanımı bulunamadı.
- Bundle analyzer yapılandırması bulunamadı.
- Dynamic import’lar route seviyesinde; ağır block editor’leri için daha granular splitting görünmüyor.
- React Profiler ölçümleri bulunamadı.
- Lighthouse veya Web Vitals sonuçları bulunamadı.
- Image optimization stratejisi doğrulanamıyor.

### Dikkat edilmesi gereken nokta

`useMemo` ve `useCallback` kullanımı performansı otomatik olarak iyileştirmez. Teknik değerlendirmede:

> “Profiler ölçümü olmadan her callback’i memoize etmek doğru değil; burada özellikle stable dependency, expensive derived data ve editör event handler’ları için kullanıldı.”

denmesi daha senior bir cevaptır.

---

## 7. API katmanı

API istemcisi [Core/api](C:/Users/borab/repos/chatbot/leedobot-dashboard/src/Core/api/index.ts) içinde.

### Yapı

İki Axios instance var:

- `api`: ana backend
- `authApi`: authentication backend, `withCredentials: true`

Base URL’ler environment variable üzerinden geliyor.

### Authentication

Login sonrasında:

- Token API response’tan alınıyor
- Axios default `Authorization` header’ına yazılıyor
- Tercihe göre sessionStorage veya localStorage’a kaydediliyor

Uygulama başlarken kayıtlı token Axios header’ına yükleniyor.

### Error handling

Response interceptor:

- `401` durumunda token’ı siliyor
- Kullanıcıyı login sayfasına yönlendiriyor
- Mevcut path’i redirect query olarak koruyor
- Birden fazla muhtemel backend error formatını ortak string’e dönüştürüyor

### Array query serialization

`.NET [FromQuery] List<T>` beklentisi için array parametreleri tekrarlanan key olarak serialize ediliyor:

```text
?ids=a&ids=b
```

Bu güzel bir frontend/backend contract ayrıntısıdır.

### Retry ve refresh token

- Automatic retry bulunmuyor.
- Refresh token akışı koddan doğrulanamıyor.
- `authApi` cookie gönderebiliyor, fakat bunun refresh mekanizması olduğu söylenemez.
- SignalR/WebSocket bulunmuyor.
- Request cancellation standartlaştırılmamış.

### İyileştirme alanları

- Axios interceptor’ın string throw etmek yerine typed `ApiError` üretmesi
- Refresh token için single-flight queue
- Request cancellation
- Retry politikasının yalnızca idempotent isteklerde uygulanması
- Query cache/invalidation
- API response runtime validation

---

## 8. UI

### Component tasarımı

İki seviye görülüyor:

- Core UI primitives: Button, Input, Textarea, Toggle, SegmentedControl, MultiPicker, Popover
- Feature component’leri: FlowEditor, StepNode, block editor’leri, globals tab’leri, KPI panelleri

Reusable component yaklaşımı güçlü; fakat büyük page component’lerinde domain orchestration yoğun.

### Styling ve theme

- Emotion styled components
- Object syntax
- Ant Design `ConfigProvider`
- App-level theme tokens
- CSS variables
- Light ve dark theme
- Apple benzeri renk, radius, surface ve shadow dili

Kodda dark mode gerçekten uygulanmış: [PreferencesProvider](C:/Users/borab/repos/chatbot/leedobot-dashboard/src/Core/context/preferences/provider.tsx).

### Form yönetimi

Login formunda Ant Design Form kullanılıyor.

Editörlerde ağırlıklı olarak:

- Controlled input
- Local draft state
- Callback ile immutable patch
- Custom validation/disabled-state

yaklaşımı var.

React Hook Form veya Formik yok.

### Validation

- Login’de Ant Design form rules bulunuyor.
- Bazı editörlerde required alanlar ve save öncesi koşullar var.
- TypeScript ile compile-time model kontrolü var.
- AJV kurulmuş olmasına rağmen runtime schema validation kullanımı bulamadım.
- Uygulama genelinde merkezi form validation mimarisi yok.

### Responsive yapı

- Theme breakpoint utility’leri
- Responsive chart container’ları
- CSS grid/flex
- Co-located responsive styling

mevcut.

Ancak gerçek cihaz test matrisi veya mobile UX hedefi koddan çıkarılamıyor. Flow builder’ın mobil kullanılabilirliği ayrıca test edilmelidir.

### Accessibility

Olumlu sinyaller:

- Bazı `aria-label`
- `role="status"`
- Button semantiği
- Klavye shortcut’ları
- Escape ile kapatma
- Focus yönetimi

Fakat kapsamlı WCAG uyumluluğu, screen-reader testi veya accessibility audit doğrulanamıyor.

---
