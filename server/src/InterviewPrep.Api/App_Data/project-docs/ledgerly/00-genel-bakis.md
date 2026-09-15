# Ledgerly

*Digital Wallet & Payment Platform*

> **Mevcut durum (2026-09-15):** Create Wallet HTTP akışı gerçek PostgreSQL ile çalışıyor. Eşzamanlı duplicate yarışı reproduce edildi ve dar exception translation ile 201/409 sonucuna çevrildi. Toplam 28 test geçti. Transfer, ledger ve idempotency henüz uygulanmadı. Ayrıntılar [concurrency çözümü](17-concurrency-lab-solution.md) bölümünde.

## Proje ne yapıyor?

Ledgerly, kullanıcıların dijital cüzdanlarını yönetebildiği ve güvenli para transferleri gerçekleştirebildiği bir ödeme/finans platformudur.

İlk ürün akışı bilinçli olarak küçüktür:

```text
Kullanıcı
  ├── Wallet oluşturur
  ├── Test bakiyesi yatırır
  ├── Başka bir wallet'a para gönderir
  ├── Para çeker
  ├── Bakiyesini görüntüler
  └── İşlem geçmişini görüntüler
```

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
