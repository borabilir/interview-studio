# Servis Sınırlarını Nasıl Belirledik?

Servis sınırlarını entity veya veritabanı tablolarına göre değil, **business capability**, **veri sahipliği** ve **tutarlılık ihtiyacına** göre belirliyoruz. İlk harita kesin bir fiziksel mimari değil; geliştirme boyunca kanıtlarla doğrulanacak bounded context hipotezidir.

## Kullandığımız sorular

Bir yeteneğin ayrı servis olup olmamasını değerlendirirken şu soruları soruyoruz:

1. **Neler birlikte atomik olmak zorunda?** Aynı transaction içinde tamamlanması gereken davranışlar aynı tutarlılık sınırında kalmalı.
2. **Verinin sahibi kim?** Bir veri yalnızca bir servis tarafından yazılmalı; diğerleri API, event veya projection ile tüketmeli.
3. **İş dili ve kurallar farklı mı?** Farklı terimler, uzmanlık ve invariant'lar ayrı bounded context'e işaret edebilir.
4. **Bağımsız ölçeklenmesi gerekiyor mu?** Okuma ve yazma yükleri belirgin biçimde farklıysa ayrıştırma anlamlı olabilir.
5. **Hata izolasyonu gerekli mi?** Notification arızası para transferini durdurmamalı gibi gereksinimler ayrı sınırı destekler.
6. **Bağımsız değişim nedeni var mı?** Farklı release sıklığı ve entegrasyon değişiklikleri bağımsız deployment gerekçesi olabilir.

## Neden entity başına servis oluşturmadık?

Şu tür bir ayrım ilk bakışta düzenli görünür:

```text
UserService
WalletService
BalanceService
TransactionService
```

Fakat tek bir transfer için dört servisin senkron konuşması gerekebilir. Sonuç, bağımsız servisler değil ağ üzerinden birbirine sıkı bağlı bir **distributed monolith** olur.

## Bounded context adayları

| Context | Sahip olduğu yetenek | Projeye giriş zamanı |
|---|---|---|
| Wallet Core | Wallet, bakiye, iç transfer ve ledger | İlk baseline |
| Transaction History | Kullanıcı odaklı sorgu/read model | CQRS ve MongoDB aşaması |
| Risk/Fraud | Risk değerlendirmesi ve fraud provider adaptasyonu | Resilience senaryosu |
| Payment Gateway | Dış banka/kart para giriş-çıkış akışları | External integration aşaması |
| Notification | E-posta/push gibi finansal olmayan yan etkiler | Event-driven aşama |
| Identity/Customer | Authentication, profil ve ileride KYC | Finansal çekirdekten sonra |

## İlk tutarlılık sınırı

Wallet ve ledger başlangıçta aynı sınırdadır. Bir iç transferde aşağıdaki etkiler birlikte gerçekleşmelidir:

```text
Kaynak wallet azalır
Hedef wallet artar
Debit kaydı oluşur
Credit kaydı oluşur
```

Bu işlemleri hemen iki servise bölmek, domain henüz doğrulanmadan distributed transaction problemi üretir. Bu nedenle ilk sınırımız tek deploy edilen **Wallet Core** uygulamasıdır.

## Ayrıştırma için arayacağımız kanıt

- Bağımsız deployment ihtiyacı
- Ölçülmüş farklı ölçek profili
- Açık veri sahipliği
- Hata izolasyonu ihtiyacı
- Ayrışmış iş dili ve kurallar
- Process içi çağrının kararlı bir contract'a dönüştürülebilmesi

> Servis sınırı bir klasörleme tercihi değil, iş ve tutarlılık kararıdır.

## Mülakat özeti

> Servisleri entity başına bölmedim. Önce business capability, data ownership ve transaction sınırlarını çıkardım. Atomik olması gereken wallet ve ledger davranışlarını aynı sınırda tuttum; query, fraud ve notification gibi farklı ölçeklenen veya bağımsız arızalanması gereken yetenekleri ise gelecekteki bounded context adayları olarak belirledim.
