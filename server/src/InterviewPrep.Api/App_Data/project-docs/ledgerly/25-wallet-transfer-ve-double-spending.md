# Wallet Transferi ve Double-Spending Nedir?

## Şu anda ne ekledik?

Bir wallet'tan başka bir wallet'a TRY gönderebiliyoruz. Kaynak wallet'ın bakiyesi azalıyor, hedef wallet'ın bakiyesi artıyor ve hareket double-entry ledger'a yazılıyor.

Örneğin Bora'nın wallet'ında 100 TL, Ayşe'nin wallet'ında 20 TL olsun. Bora, Ayşe'ye 40 TL gönderdiğinde:

```text
Bora:  100 → 60 TRY
Ayşe:   20 → 60 TRY
Toplam: 120 → 120 TRY
```

Para sistem içinde yer değiştirdi; yeni para oluşmadı ve para kaybolmadı.

## Debit metodu neyi koruyor?

Wallet'ta daha önce yalnızca `Credit` vardı; bu, bakiyeyi artırıyordu. Transfer için `Debit` ekledik. Debit, bakiyeyi azaltmadan önce şunları kontrol ediyor:

- Tutar pozitif mi?
- En fazla dört ondalık basamak içeriyor mu?
- Database'in desteklediği sayı sınırına uyuyor mu?
- Wallet'ta yeterli para var mı?

100 TL olan wallet'tan 100.0001 TL istenirse `InsufficientFundsException` oluşur ve bakiye 100 olarak kalır. Negatif bakiyeye izin vermiyoruz; overdraft desteğimiz yok.

## Ledger'da transfer nasıl görünür?

İki kullanıcı bakiyesi de platformun kullanıcılara olan borcudur; yani liability hesabıdır. Kaynak kullanıcının parası azalınca platformun ona borcu azalır. Hedef kullanıcının parası artınca platformun ona borcu artar:

```text
Kaynak wallet liability hesabı   Debit   40 TRY
Hedef wallet liability hesabı    Credit  40 TRY
```

Debit ve credit toplamı eşittir. Test yatırmasındaki fon hesabı bu journal'da yoktur; çünkü dışarıdan yeni para gelmiyor, mevcut para iki kullanıcı arasında yer değiştiriyor.

## Transaction neden önemli?

Transfer aslında tek SQL komutu değildir:

```text
Kaynağın bakiyesini azalt
Hedefin bakiyesini artır
Eksik ledger hesaplarını oluştur
Journal oluştur
İki posting oluştur
```

Kaynak azalırken hedef artmazsa para kaybolur. Hedef artıp kaynak azalmazsa sistem para üretir. Bu nedenle bütün değişiklikleri tek `SaveChanges` ve database transaction'ında tutuyoruz: ya hepsi commit edilir ya hepsi rollback olur.

## Double-spending nedir?

Double-spending, aynı paranın iki ayrı işlemde harcanabilmesidir. Kaynak wallet'ta 100 TL varken aynı anda şunlar gelirse problem oluşabilir:

```text
Transfer A: Ayşe'ye 80 TL
Transfer B: Mehmet'e 80 TL
```

İki istek de diğerinin yazmasından önce 100 TL'yi okuyabilir. İkisi de ayrı ayrı “100, 80'den büyük; transfer yapılabilir” der.

## Problemi nasıl reproduce ettik?

Gerçek PostgreSQL üzerinde iki DbContext'e aynı 100 TL'yi okuttuk. Concurrency kontrolünü deney amacıyla atlayıp iki eski kararı da yazdığımızda şu sonuç oluştu:

```text
Kaynak:    20 TRY
Ayşe:      80 TRY
Mehmet:    80 TRY
Toplam:   180 TRY
```

Kaynak iki kez 80 azalmadı; iki yazma da aynı son değer olan 20'yi yazdı. Fakat iki hedef de 80 aldı. Başlangıçta 100 olan toplam 180'e çıktı. Testin bu kolda yeşil olması doğru davranışı değil, hatayı kontrollü şekilde gösterebildiğimizi anlatıyor.

## “Bakiye yeterli mi?” kontrolü neden yetmedi?

Çünkü kontrol ile kaydetme arasında başka bir istek bakiyeyi değiştirebilir. “Okuduğumda 100'dü” demek, “kaydederken hâlâ 100” demek değildir.

Transaction da tek başına yeterli değildir. Her istek kendi transaction'ında aynı eski değeri okuyabilir. Kaydederken kararın dayandığı eski değerin hâlâ geçerli olduğunu kontrol etmeliyiz.

## Nasıl çözdük?

Wallet bakiyesini optimistic concurrency token olarak işaretlemiştik. Optimistic concurrency, okurken wallet'ı kilitlemez. Kaydederken “ben 100 okumuştum; satır hâlâ 100 ise 20 yap” der:

```sql
UPDATE wallets
SET balance = 20
WHERE id = @sourceWalletId
  AND balance = 100;
```

İlk transfer başarılı olunca bakiye 20 olur. İkinci transferin `balance = 100` koşulu artık hiçbir satır bulamaz. EF bunu concurrency hatası olarak bildirir. Infrastructure bu hatayı uygulamanın anlayacağı `LedgerWriteConflictException` hâline getirir ve API `409 Conflict` döndürür.

İkinci transferin transaction'ı rollback olduğu için yalnızca kaynak yazısı değil; hedef artışı, yeni ledger hesabı, journal ve posting'ler de kalmaz.

## Neden otomatik retry yapmıyoruz?

İkinci isteği otomatik tekrar çalıştırmak onun başarılı olacağını garanti etmez. Güncel bakiye artık 20 TL'dir ve 80 TL için yetersizdir. Aynı business kararını körlemesine tekrar etmek yerine istemciye kontrollü conflict döndürüyoruz.

## Başka hangi çözümler vardı?

| Yaklaşım | Avantaj | Bedel |
|---|---|---|
| Satırı `FOR UPDATE` ile kilitlemek | İkinci istek güncel değer için bekler | Bekleme, kilit sırası ve deadlock yönetimi |
| Serializable isolation | Database çelişkili yürütmeyi reddeder | Daha fazla iptal ve retry politikası |
| Koşullu atomik SQL | Kaynak bakiyede kısa ve güçlü kontrol | İki wallet, ledger ve receipt için özel persistence kodu |
| Optimistic concurrency | Mevcut EF modeliyle küçük ve anlaşılır çözüm | Çakışan isteğin biri `409` alır |

Bu projenin mevcut trafik varsayımında optimistic concurrency seçtik. Aynı wallet üzerinde çok yüksek contention ölçersek diğer seçenekleri yeniden değerlendiririz.

## HTTP davranışı nedir?

```http
POST /api/transfers
Idempotency-Key: benzersiz-transfer-anahtari
Content-Type: application/json

{
  "sourceWalletId": "...",
  "destinationWalletId": "...",
  "amount": 40
}
```

- Başarılı transfer: `200 OK`
- Geçersiz tutar veya aynı kaynak/hedef: `400 Bad Request`
- Kaynak ya da hedef bulunamadı: `404 Not Found`
- Yetersiz bakiye veya eşzamanlı yazma çakışması: `409 Conflict`

Şimdilik yalnızca TRY destekleniyor. Handler para birimlerini yine de karşılaştırıyor; döviz dönüşümü yapmıyor.

## Nasıl doğruladık?

Domain testleri debit'in bakiyeyi doğru azalttığını ve yetersiz bakiyede nesneyi değiştirmediğini kontrol ediyor. Application testleri iki wallet, iki ledger hesabı, dengeli journal ve tek Unit of Work çağrısını doğruluyor. Gerçek PostgreSQL HTTP testinde normal transfer, yetersiz bakiye, aynı wallet, eksik hedef ve iki paralel 80 TL transferi çalıştırılıyor.

Paralel testte sonuç şu:

```text
1 x 200 OK
1 x 409 Conflict
kaynak 20 TRY
hedeflerin toplamı 80 TRY
1 journal ve 2 posting
```

## Sonraki adımda hangi problem çözüldü?

Bu milestone tamamlandığında transferin ayrı bir kaydı yoktu ve bağlantı sorunu nedeniyle aynı istek tekrar gönderilirse para iki kez taşınabiliyordu. Bir sonraki bölümde `Idempotency-Key`, kalıcı `TransferId` ve `wallet_transfers` kaydı eklenerek bu açık kapatıldı: [Transfer Idempotency](26-transfer-idempotency.md).

## Mülakatta nasıl anlatırım?

> Aynı kaynak bakiyeyi kullanan paralel transferlerde yalnızca bakiye kontrolünün yetmediğini PostgreSQL üzerinde reproduce ettim. Guard olmadan 100 TL kaynakla iki hedefe 80'er TL yazıldı ve toplam bakiye 180'e çıktı. Kaynak wallet'ın eski bakiyesini optimistic concurrency koşuluna ekledim. İlk transfer commit edince ikinci transferin update'i reddedildi; hedef artışı ve journal dahil bütün ikinci transaction rollback oldu. Böylece tek transaction ile atomiklik, concurrency token ile double-spending koruması sağladım. Yüksek contention ölçülürse conditional SQL, row lock veya serializable isolation seçeneklerini yeniden değerlendiririm.

Kanonik teknik kaynaklar: Ledgerly `docs/labs/005-wallet-transfer-double-spending/README.md`, `docs/adr/0010-wallet-transfer-and-double-spending.md`, `docs/journey/10-wallet-transfer.md`.
