# Transfer Idempotency: Aynı İstek Neden İki Kez Para Taşımıyor?

## Senaryo nedir?

Kullanıcı 100 TL transfer eder. Backend işlemi PostgreSQL'e başarıyla yazar ama ağ kopar ve cevap kullanıcıya ulaşmaz. Kullanıcı veya mobil uygulama doğal olarak tekrar dener.

Buradaki belirsizlik şudur:

```text
Cevap gelmedi
   ├─ işlem database'e hiç yazılmamış olabilir
   └─ işlem yazılmış, yalnızca cevap kaybolmuş olabilir
```

İkinci durumda isteği yeniden çalıştırırsak 100 TL iki kez gider. Kullanıcının bakiyeyi sonradan görebilmesi faydalıdır ama retry'ın ikinci para hareketini oluşturmasını engellemez.

## Önce problemi nasıl gördük?

Kaynak wallet'a 250 TL koyup aynı 100 TL transfer isteğini art arda iki kez gönderdik. Koruma yokken sistem iki isteği de yeni işlem sandı:

```text
Kaynak: 250 → 150 → 50
Hedef:    0 → 100 → 200
Journal: 2 adet
```

Bu test bize root cause'u gösterdi: API, iki HTTP çağrısının aynı kullanıcı niyetinin tekrarı olduğunu bilmiyordu.

## Idempotency-Key nasıl çalışıyor?

İstemci her yeni transfer niyeti için benzersiz bir anahtar üretir. Aynı işlemi retry ederse hem request body'yi hem anahtarı aynı gönderir:

```http
POST /api/transfers
Idempotency-Key: transfer-7f3a
Content-Type: application/json

{
  "sourceWalletId": "wallet-a",
  "destinationWalletId": "wallet-b",
  "amount": 100
}
```

Bu anahtar transaction ID'ye benzer ama aynı şey değildir:

- `Idempotency-Key`, istemcinin “bu önceki isteğimin tekrarı” demesidir.
- `TransferId`, server'ın başarıyla kabul ettiği finansal işleme verdiği kalıcı kimliktir.
- `JournalEntryId`, işlemin muhasebe kaydının kimliğidir.

İlk başarılı cevapta üçü birbiriyle ilişkilidir. Retry olduğunda sistem yeni TransferId ve journal üretmek yerine ilk makbuzu döndürür.

## Neyi database'de tutuyoruz?

`wallet_transfers` kaydı şunları saklıyor:

```text
TransferId
SourceWalletId
DestinationWalletId
IdempotencyKey
Amount ve Currency
JournalEntryId
İşlem sonrası kaynak ve hedef bakiyesi
CreatedAtUtc
```

`(SourceWalletId, IdempotencyKey)` çifti unique'tir. Şu an auth/client kimliği olmadığı için key'i kaynak wallet kapsamında tutuyoruz.

## Neden Redis değil PostgreSQL?

İşlem finansal olduğu için “para taşındı ama idempotency kaydı yazılamadı” durumunu istemiyoruz. Bu nedenle şu değişiklikler aynı database transaction'ında commit oluyor:

```text
Kaynak bakiye azalır
Hedef bakiye artar
Journal ve posting'ler yazılır
wallet_transfers makbuzu yazılır
```

Ya hepsi olur ya hiçbiri olmaz. Redis kullansaydık PostgreSQL commit'i ile cache kaydını atomik yapmak için ayrı bir dağıtık koordinasyon problemi doğardı. Cache ileride okuma optimizasyonu olabilir; bu aşamada doğruluğun kaynağı değildir.

## Aynı key tekrar gelirse ne olur?

Handler önce tamamlanmış kaydı arar:

```text
Kayıt yok
  → normal transferi yap
  → transfer kaydını aynı transaction'da yaz

Kayıt var ve hedef+tutar aynı
  → bakiyeye dokunma
  → ilk makbuzu aynen döndür

Kayıt var ama hedef veya tutar farklı
  → 409 Conflict
```

Aynı key ile farklı payload'a izin vermemek önemlidir. Aksi hâlde istemci hangi işlemin gerçekleştiğini anlayamaz.

## İki aynı-key isteği aynı anda gelirse?

İkisi de ilk sorguda “kayıt yok” görebilir. Sadece uygulama kodundaki `if` bu yarışı çözmez. PostgreSQL'deki unique index son güvenlik katmanıdır. İlk commit kazanır; diğer yazma reddedilir. Kaybeden istek ilk işlemin kalıcı makbuzunu okuyup onu döndürür.

Bu davranışı gerçek HTTP ve PostgreSQL ile deterministik bir bariyer kullanarak test ettik. İki istek aynı anda save noktasına geldi ama sonuçta:

```text
1 transfer kaydı
1 journal
Kaynak 100 → 60
Hedef 0 → 40
İki cevaptaki TransferId aynı
```

## Transaction ile idempotency aynı şey mi?

Hayır. Transaction tek isteğin yarım kalmasını engeller. Idempotency ise tamamlanmış olabilecek aynı isteğin yeniden uygulanmasını engeller.

```text
Transaction:  “Bu transferin bütün yazıları birlikte olsun.”
Idempotency:  “Bu kullanıcı niyeti en fazla bir kez uygulansın.”
```

Finansal bir transferde ikisine de ihtiyacımız var.

## Test ettiğimiz durumlar

- Aynı key ve aynı payload sıralı gönderildiğinde ilk receipt replay edildi.
- Aynı key farklı tutarla gönderildiğinde `409 Conflict` döndü.
- Aynı payload farklı key ile gönderildiğinde iki ayrı gerçek transfer oluştu.
- Key olmadan gelen istek `400 Bad Request` aldı.
- Aynı key paralel geldiğinde tek finansal hareket commit edildi.
- Tüm solution'da 160 test başarılı geçti.

## Sınırlar ve trade-off

Key'ler şu an kalıcı tutuluyor; henüz TTL veya arşiv politikamız yok. Aynı body'nin farklı key ile gelmesi bilinçli olarak yeni transfer sayılır; çünkü iki gerçek 100 TL transfer mümkün olabilir. Idempotency yetersiz bakiyeyi veya geçersiz işlemi başarılı yapmaz, yalnızca aynı niyetin iki kez uygulanmasını önler.

## Mülakatta nasıl anlatırım?

> Transfer commit olduktan sonra HTTP cevabı kaybolursa istemci aynı isteği retry edebilir. Önce aynı isteğin iki journal ve iki bakiye hareketi oluşturduğunu integration testiyle reproduce ettim. İstemciden `Idempotency-Key` alıp transfer payload'ı ile ilk sonucu PostgreSQL'de kalıcı sakladım. Wallet değişiklikleri, journal ve transfer kaydı aynı transaction'da; unique source-wallet/key index'i paralel retry'ları da koruyor. Aynı payload ilk receipt'i alıyor, farklı payload aynı key'i kullanırsa 409 dönüyor. Böylece transaction atomikliği, idempotency ise aynı iş niyetinin tek kez uygulanmasını sağlıyor.

Kanonik teknik kaynaklar: Ledgerly `docs/labs/006-transfer-idempotency/README.md`, `docs/adr/0011-transfer-idempotency.md`, `docs/journey/11-transfer-idempotency.md`.
