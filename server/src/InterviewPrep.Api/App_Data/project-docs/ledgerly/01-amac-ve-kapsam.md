# Amaç ve Kapsam

## Ürün amacı

Kullanıcıların dijital cüzdan oluşturabildiği, para yatırabildiği, çekebildiği ve başka bir cüzdana para gönderebildiği güvenilir bir ödeme çekirdeği geliştirmek.

Ürün, gerçek para işletmeyecek bir eğitim simülasyonudur. Banka, fraud ve benzeri dış sistemler kontrol edilebilir test servisleriyle temsil edilir.

## Öğrenme amacı

Proje aşağıdaki sorulara çalışan kod ve deney sonuçlarıyla cevap üretmelidir:

- Finansal doğruluk hangi katmanda korunmalıdır?
- Local transaction sınırı nerede bitmelidir?
- Dağıtık bir işlem yarıda kaldığında nasıl devam ettirilir?
- Duplicate request ve event'ler nasıl zararsız hâle getirilir?
- Read model ile source of truth ayrıldığında tutarsızlık nasıl yönetilir?
- Bir sistemin darboğazı tahmin etmeden nasıl bulunur?
- Horizontal scaling sonrası hangi process-local varsayımlar bozulur?

## İlk ürün kapsamı

| Yetenek | İlk sürümde | Not |
|---|---:|---|
| Wallet oluşturma | Evet | Kullanıcı başına birden fazla wallet mümkün olabilir |
| Test bakiyesi yatırma | Evet | Gerçek banka entegrasyonu değildir |
| Wallet-to-wallet transfer | Evet | İlk finansal vertical slice |
| Para çekme | Evet | İlk aşamada simüle edilebilir |
| Bakiye görüntüleme | Evet | Başlangıçta ilişkisel kaynaktan okunur |
| İşlem geçmişi | Evet | Önce SQL, ihtiyaç oluşunca CQRS |
| Çoklu para birimi | Hayır | İlk aşamada yalnızca TRY |
| Gerçek kart işleme | Hayır | PCI kapsamına girilmez |
| Döviz dönüşümü | Hayır | İleri aşamaya bırakılır |

## Başlangıç teknik kapsamı

- Tek process
- Tek ilişkisel veritabanı
- Double-entry ledger
- HTTP API
- Domain ve integration testleri
- Tekrar üretilebilir lokal geliştirme ortamı

Kafka, MongoDB, Redis, Kubernetes ve servis ayrıştırması ilk milestone'a dahil değildir.

## Bilinçli olarak kapsam dışında

- Gerçek banka ve kart ağı entegrasyonu
- Gerçek PCI DSS, KYC veya AML uyumluluk süreci
- Kripto para ve blockchain
- Multi-currency ve FX
- Active-active multi-region
- Baştan oluşturulmuş çok sayıda mikroservis
- Full Event Sourcing
- İhtiyaç oluşmadan eklenen altyapı bileşenleri

## Değişebilir başlangıç varsayımları

- İlk para birimi `TRY` olacaktır.
- Overdraft desteklenmeyecektir.
- Tamamlanan finansal kayıtlar silinmeyecek veya güncellenmeyecektir.
- İade ve iptal işlemleri reversal posting oluşturacaktır.
- Finansal source of truth ilişkisel ledger kayıtları olacaktır.
- Cache hiçbir zaman finansal doğruluğun tek koruyucusu olmayacaktır.

Bu varsayımlardan biri değiştiğinde gerekçe bir ADR ile kaydedilir.
