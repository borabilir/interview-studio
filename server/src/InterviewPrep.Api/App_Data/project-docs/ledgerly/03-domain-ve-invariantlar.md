# Domain ve Invariant'lar

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

Wallet, kullanıcıya sunulan üründür. Ledger ise finansal gerçeğin kaydıdır. Kullanıcı arayüzünde tek bir bakiye gösterilse bile bu bakiye ledger posting'lerinden veya güvenilir bir projection'dan türetilir.

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

Her journal entry için aynı currency içindeki posting toplamı sıfır olmalıdır.

```text
sum(posting.amount) == 0
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
