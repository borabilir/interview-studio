# Ledgerly

*Digital Wallet & Payment Platform*

## Proje ne yapıyor?

Ledgerly, dijital cüzdan ve para hareketlerini adım adım kurarak öğrendiğimiz bir projedir. Dijital cüzdanı, uygulamada bakiyesini gördüğün ve para gönderme işlemlerini başlattığın hesap gibi düşünebilirsin. Gerçek para işletmiyoruz; küçük örneklerle yazılımın doğru davranmasını öğreniyoruz.

Hedeflediğimiz ürün akışı aşağıdaki gibi. Bütün adımlar henüz uygulanmadı; güncel durum bu bölümün sonunda:

```text
Kullanıcı
  ├── Wallet oluşturur
  ├── Test bakiyesi yatırır
  ├── Başka bir wallet'a para gönderir
  ├── Para çeker
  ├── Bakiyesini görüntüler
  └── İşlem geçmişini görüntüler
```

## Bu notları nasıl okuyacağım?

Yeni bir terim geldiğinde önce ne olduğunu, sonra ne için kullanıldığını ve basit örneğini okuyacaksın. Kod, tasarım kararları ve test kanıtı bunun ardından gelecek. Anlatım sırası [çalışma yönteminde](02-calisma-yontemi.md) tanımlı. Finansal kavramlar için [domain sözlüğü](03-domain-ve-invariantlar.md), son konular için [ledger](19-double-entry-ledger-domain.md) ve [ledger account](20-ledger-account-domain.md) bölümlerinden başlayabilirsin.

## Neden bu proje?

Amaç yalnızca CRUD yapan bir Wallet API geliştirmek değildir. Finansal sistemler küçük görünen bir işlemin arkasında güçlü doğruluk kuralları barındırır:

- Aynı istek birkaç kez gelirse para yalnızca bir kez hareket etmelidir.
- Eşzamanlı transferler bakiyeyi negatife düşürmemelidir.
- İşlem ortasında servis çökerse sonuç teşhis edilebilir olmalıdır.
- Finansal kayıtlar sonradan sessizce değiştirilememelidir.
- Kullanıcıya gösterilen veri gecikmeli olsa bile source of truth doğru kalmalıdır.

Bu problemler DDD, transaction, concurrency, idempotency, messaging, CQRS ve resilience konularını gerçek bir bağlam içinde öğrenmek için güçlü bir zemin oluşturur.

## Projenin temel yaklaşımı

Ledgerly baştan production-grade ve aşırı kompleks kurulmaz. Sistem küçük başlar; her yeni mimari yetenek, önce ilgili problem yeniden üretildikten sonra eklenir.

```text
Basit çalışan sistem
  -> Gerçek bir problem
  -> Ölçüm ve root cause
  -> Alternatiflerin karşılaştırılması
  -> Gerekçeli karar
  -> Implementasyon ve doğrulama
```

## Başarı nasıl ölçülecek?

Bir özelliğin endpoint'i çalışıyorsa iş bitmiş sayılmaz. Başarı için:

1. Finansal invariant otomatik testle korunmalıdır.
2. Problem tekrar üretilebilir olmalıdır.
3. Root cause gözlem veya ölçümle desteklenmelidir.
4. Seçilen çözümün trade-off'ları yazılmalıdır.
5. Aynı deney implementasyondan sonra tekrar çalıştırılmalıdır.
6. Sonuç kısa bir mülakat anlatımına dönüştürülmelidir.

## Dokümantasyon gerçeği

Bu ekranda geçen teknoloji ve pattern'ler, ilgili lab ve commit tamamlanmadıkça **uygulanmış değil, hedeflenen coverage** olarak değerlendirilmelidir.

## Güncel uygulama durumu

> **Mevcut durum (2026-09-17):** Create Wallet ve Get Wallet HTTP akışları, ledger domain modeli ve persistence tamamlandı. [Test bakiyesi yatırma](22-test-bakiyesi-yatirma.md) ile ilk kullanımda hesap hazırlama, bakiye ve journal'ın birlikte kaydı da eklendi. Eşzamanlı yazma ve hesap açma çakışmaları 409 ile sonuçlanıyor. Toplam 124 test geçti. Transfer ve idempotency henüz uygulanmadı. Önceki adımlar: [concurrency çözümü](17-concurrency-lab-solution.md), [Get Wallet](18-get-wallet-query.md), [ledger domain](19-double-entry-ledger-domain.md), [hesaplar](20-ledger-account-domain.md), [persistence](21-ledger-persistence-ve-atomiklik.md).

[Type ve Purpose: hesabın amacı](23-ledger-account-purpose.md) ile Wallet/TestFunding rolleri model ve database kurallarında açıkça ifade ediliyor.
