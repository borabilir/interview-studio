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

> **Mevcut durum (2026-09-16):** Create Wallet HTTP akışı gerçek PostgreSQL ile çalışıyor. Eşzamanlı duplicate yarışı reproduce edildi ve dar exception translation ile 201/409 sonucuna çevrildi. ID ile Get Wallet query de eklendi; POST Location gerçek GET adresine işaret ediyor. JournalEntry, Posting ve LedgerAccount domain modelleri eklendi; toplam 67 test geçti. [LedgerAccount](20-ledger-account-domain.md) bölümünde wallet hesabı ile test fon hesabının ayrımı anlatılıyor. Ledger persistence, deposit, transfer ve idempotency henüz uygulanmadı. [Ledger domain adımı](19-double-entry-ledger-domain.md) bu sınırı ve kuralları anlatıyor. Ayrıntılar [concurrency çözümü](17-concurrency-lab-solution.md) ve [Get Wallet query](18-get-wallet-query.md) bölümlerinde.
