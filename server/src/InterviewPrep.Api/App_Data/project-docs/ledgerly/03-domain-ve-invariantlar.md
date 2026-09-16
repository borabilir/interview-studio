# Domain ve Invariant'lar

## Domain nedir?

Domain, yazılımın çözmeye çalıştığı iş alanıdır. Ledgerly'de bu alan dijital cüzdan ve para hareketleri. “Bir kullanıcı kaç cüzdan açabilir?”, “Yetersiz bakiyeyle para gönderebilir mi?” gibi sorular bu alanın kurallarını belirler.

Domain modeli ise bu kavram ve kuralların koddaki karşılığıdır. Wallet cüzdanı, Currency para birimini temsil eder. Modelin amacı gerçek hayattaki her ayrıntıyı kopyalamak değil, uygulamanın doğru karar vermesi için gerekli bilgiyi taşımaktır.

## Invariant nedir, ne için kullanılır?

Invariant, geçerli kabul ettiğimiz durumda bozulmaması gereken kuraldır. Örneğin “bir kullanıcının aynı para biriminde en fazla bir wallet'ı olabilir.” İstek tek başına da gelse, iki istek aynı anda da gelse bu kural korunmalıdır.

Kurala isim vermek neyi test edeceğimizi netleştirir. “Sistem çalışıyor” yerine “aynı owner ve currency ile iki wallet oluşamıyor” diyebiliriz. Bir invariant'ı tanımlamak, onu henüz uyguladığımız anlamına gelmez; aşağıda hedef kurallar ile mevcut uygulama durumunu ayırıyoruz.

## Ubiquitous language nedir?

İşi konuşurken, kod yazarken ve test oluştururken aynı kavrama aynı adı vermektir. Bu projede cüzdana her yerde Wallet dersek konuşmayla kod arasında çeviri yapmamız azalır. Aşağıdaki sözlük bu ortak dilin başlangıcıdır.

## Bölümün uygulama bağlamı

> **Uygulama sınırı (2026-09-16):** Dengeli journal, bellekte immutable posting ve [LedgerAccount modeli](20-ledger-account-domain.md) uygulandı. Kalıcı ledger, negatif bakiye koruması, idempotency ve reversal aşağıda hedef olarak anlatılır; henüz uygulanmadı. [Güncel domain adımı](19-double-entry-ledger-domain.md).

## Başlangıç ubiquitous language

| Terim | Anlamı |
|---|---|
| Wallet | Kullanıcının gördüğü dijital cüzdan ürünü |
| Ledger Account | Finansal hareketlerin kaydedildiği muhasebe hesabı |
| Transfer | Bir wallet'tan diğerine para gönderme iş akışı |
| Journal Entry | Tek bir finansal olayın dengeli muhasebe kaydı |
| Posting | Journal entry içindeki debit veya credit hareketi |
| Hold | Henüz kesinleşmemiş işlem için ayrılan tutar |
| Available Balance | Yeni işlemde kullanılabilecek tutar |
| Reversal | Önceki finansal etkiyi ters posting'lerle dengeleyen yeni kayıt |
| Idempotency Key | Aynı business operation'ın tekrar uygulanmasını engelleyen istemci anahtarı |
| Reconciliation | Sistemler arasındaki işlem durumlarını sonradan karşılaştırıp uzlaştırma süreci |

Bu sözlük domain keşfi ilerledikçe genişletilecek ve anlamı değişen terimler açıkça kaydedilecektir.

## Wallet ile ledger aynı şey değildir

Wallet, kullanıcıya sunulan üründür. Hedef tasarımda ledger finansal gerçeğin kaydıdır; mevcut Wallet.Balance henüz ledger'dan türetilmez. Kullanıcı arayüzünde tek bir bakiye gösterilse bile bu bakiye ledger posting'lerinden veya güvenilir bir projection'dan türetilir.

Örnek bir iç transfer:

```text
Journal Entry: transfer-123

Alice Wallet Account    -100 TRY
Bob Wallet Account      +100 TRY
                         --------
Net hareket                0 TRY
```

## Başlangıç business invariant'ları

### INV-001 — Dengeli journal

Her journal entry için aynı currency içindeki debit toplamı credit toplamına eşit olmalıdır. Yukarıdaki +/- gösterim müşterinin bakiye etkisini anlatır; kodda Amount pozitiftir ve yön ayrı PostingDirection alanındadır.

```text
sum(debit.amount) == sum(credit.amount)
```

### INV-002 — Negatif bakiye yok

Overdraft kapalıyken bir wallet kullanılabilir bakiyesinden fazlasını harcayamaz.

### INV-003 — Immutable ledger

Tamamlanmış posting'ler güncellenemez veya silinemez. Düzeltme gerektiğinde reversal kaydı oluşturulur.

### INV-004 — Tek finansal etki

Aynı business operation tekrar işlense bile ikinci bir finansal etki oluşmamalıdır.

### INV-005 — Idempotency payload bütünlüğü

Aynı idempotency key farklı bir request payload ile kullanılamamalıdır.

### INV-006 — İzlenebilir transfer sonucu

Bir transfer sonsuza kadar belirsiz durumda kalmamalı; tamamlanmış, reddedilmiş, başarısız veya reconciliation bekleyen tanımlı bir duruma ulaşmalıdır.

## Invariant ile validation farkı

`Amount > 0` gibi bir kontrol request validation olabilir. “Aynı para iki kez harcanamaz” ise eşzamanlı istekler ve process failure altında da korunması gereken domain invariant'ıdır.

Invariant'lar yalnızca application seviyesinde `if` kontrolüne bırakılmaz; uygun olduğunda transaction, constraint ve veri modeliyle de korunur.
