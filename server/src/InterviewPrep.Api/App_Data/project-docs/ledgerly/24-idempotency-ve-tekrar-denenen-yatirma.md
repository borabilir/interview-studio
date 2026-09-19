# Idempotency Nedir? Aynı Yatırma İsteği İki Kez Gelirse

## Önce kelimeyi anlayalım

Idempotency, **aynı mantıksal işlemi tekrar istemenin ikinci bir etki yaratmaması** demektir. İstemci iki kez HTTP isteği gönderebilir; ama sistem bunu tek yatırma olarak işler.

Bu, “her HTTP isteği yalnızca bir kez gelir” demek değildir. Ağda istekler tekrar gelebilir. Biz tekrarı tanıyıp güvenli sonuç vermeye çalışırız.

## Neden ihtiyaç duyduk?

Şöyle bir durum düşünelim: Cüzdanına 100 TL test bakiyesi yatırıyorsun. Sunucu yatırmayı kaydediyor, fakat cevap sana ulaşmadan bağlantı kopuyor. Ekranda hata veya yükleniyor işareti görüyorsun. İşlem oldu mu, olmadı mı bilmiyorsun; tekrar deniyorsun.

```text
İlk istek:    100 TL yatır → database'e kaydedildi
Yanıt:        bağlantıda kayboldu
Tekrar istek: 100 TL yatır → sunucu bunu yeni işlem sandı
Sonuç:       cüzdanda 200 TL
```

Burada database yarım işlem kaydetmedi. Tam tersine, iki isteği de düzgünce kaydetti. Hata, **ikinci isteğin ilkinin tekrarı olduğunu anlayamamasıydı**.

## Problemi nasıl gördük?

Önce gerçek bağlantıyı koparmadan aynı HTTP isteğini arka arkaya iki kez gönderdik. Bu, bağlantı koptuktan sonra istemcinin yapacağı tekrar denemenin etkisini kontrollü biçimde gösterir.

Gerçek PostgreSQL testinde iki farklı journal, dört posting ve 200 TL bakiye oluştu. Yani her çağrı yeni bir yatırma sayıldı. Test o aşamada yeşildi, ama bu “sistem doğru” anlamına gelmiyordu; test yalnızca **mevcut yanlış davranışı** kanıtlıyordu. Çözümden sonra testi beklediğimiz doğru davranışı kontrol edecek şekilde değiştirdik.

## Eşzamanlılık koruması neden yetmedi?

Önceden aynı eski bakiyeyi okuyup aynı anda yazmaya çalışan iki işlem için koruma eklemiştik. Bu, bir yazmanın diğerini ezmesini önler.

Bu senaryoda ise ikinci istek, ilk istek tamamen bittikten sonra gelebilir. İkinci istek güncel bakiyeyi görür ve üstüne bir 100 TL daha ekler. Teknik olarak bir yazma çakışması yoktur. Sistem **işlemin kimliğini** bilmediği için iki çağrının aynı amaçla yapıldığını anlayamaz.

## Aynı tutar olmasına baksak olmaz mı?

Olmaz. Sen bugün gerçekten iki ayrı 100 TL yatırmak isteyebilirsin. “Aynı cüzdan + aynı tutar” kuralı ikinci meşru yatırmanı yanlışlıkla engeller.

Bu yüzden tutarla birlikte işlem kimliği gerekir. İstemci her **yeni yatırma** için bir anahtar üretir; aynı yatırmayı tekrar denerken anahtarı değiştirmez:

```http
POST /api/wallets/{walletId}/test-deposits
Idempotency-Key: yatirma-123
Content-Type: application/json

{"amount":100}
```

Başka bir 100 TL yatırma yapmak istiyorsan `yatirma-124` gibi yeni bir anahtar gönderirsin. Anahtar 1–128 karakter olmalı; eksik veya geçersizse API `400` döndürür.

## Hangi çözümleri düşündük?

| Yaklaşım | Neyi kolaylaştırır? | Neden yeterli değil veya bedeli ne? |
|---|---|---|
| Cüzdan ve tutarı karşılaştırmak | Ek alan gerektirmez | Meşru iki aynı tutarlı işlemi karıştırır |
| Anahtarları yalnızca bellekte tutmak | İlk bakışta basittir | Uygulama yeniden başlayınca veya başka instance'a gidince bilgi kaybolur |
| İstek gövdesine `OperationId` koymak | Kimlik domain akışına da taşınabilir | API gövdesi değişir; bu aşama için daha geniş sözleşme değişikliği |
| `Idempotency-Key` başlığı ve PostgreSQL kaydı | HTTP tekrar denemesi için açık sözleşme; kalıcıdır | Her işlem için ek okuma/kayıt ve saklama politikası gerekir |

Ledgerly'nin bu adımında son seçeneği aldık. Bu karar, ileride dış banka entegrasyonu geldiğinde aynı çözümün tek başına yeterli olacağı anlamına gelmez.

## Ledgerly'de nasıl çalışıyor?

Anahtar **cüzdan kapsamında** tutulur. Database'de `(wallet_id, key)` birlikte benzersizdir. Aynı anahtar metni başka bir cüzdanda kullanılabilir.

Yeni istek geldiğinde önce “bu cüzdan ve anahtar daha önce tamamlandı mı?” diye bakılır:

```text
Kayıt varsa:
  aynı tutar   → ilk işlemin makbuzunu tekrar döndür
  farklı tutar → 409 Conflict

Kayıt yoksa:
  bakiyeyi artır
  journal ve iki posting hazırla
  anahtar + ilk makbuzu kaydet
```

Makbuz, işlemin `JournalEntryId` değerini ve o işlem tamamlandığındaki bakiyeyi içerir. Tekrar çağrıda yeni journal üretmeyiz; ilk makbuzu döndürürüz. Arada başka bir yatırma yapıldıysa eski makbuzdaki bakiye de eski işlemin sonucudur. Güncel bakiyeyi görmek için wallet GET isteği gerekir.

## Anahtarı kaydetmek tek başına yeterli mi?

Hayır. Anahtar kaydedilip yatırma kaydedilmezse sonraki denemede sistem yanlışlıkla “bu işlem yapıldı” diyebilir. Yatırma kaydedilip anahtar kaydedilmezse tekrar geldiğinde ikinci kez para yazabilir.

Bu yüzden wallet bakiyesi, journal, posting'ler ve idempotency kaydı **aynı database transaction'ında** kaydedilir: ya hepsi tamamlanır ya hiçbiri kalmaz. PostgreSQL'deki benzersiz anahtar kuralı, iki paralel isteğin ayrı ayrı “kayıt yok” görmesi durumunda da iki kalıcı işlem oluşmasını önler.

Paralel çağrılardan biri henüz tamamlanmadıysa diğeri `409` alabilir. Bu durumda istemci **yeni anahtar üretmeden** aynı anahtarla tekrar dener. İlk işlem commit ettiyse ilk makbuzu alır.

## Neyi önledik, neyi çözmedik?

Yanıtı kaybolan bir test yatırmasının aynı anahtarla tekrar gönderilmesi hâlinde ikinci kez bakiye yazılmasını önledik. Aynı anahtar farklı tutarla kullanılırsa bunu sessizce kabul etmiyoruz. Farklı anahtar ise gerçekten yeni işlem kabul edilir; istemci yanlışlıkla anahtar değiştirirse sunucu bunun tekrar olduğunu anlayamaz.

Bu hâlâ **test bakiyesi** akışıdır; gerçek banka transferi değildir. Bankaya istek gönderme, bankanın kendi idempotency desteği ve banka kayıtlarıyla mutabakat ayrı senaryolardır. Anahtar kayıtları şu an süresiz saklanır; ileride saklama süresi ve temizlik politikası belirlemek gerekir.

## Nasıl doğruladık?

Gerçek PostgreSQL kullanan HTTP testleri aynı anahtarın sıralı ve paralel tekrarını, farklı tutarla kullanımını, eksik/uzun anahtarı ve farklı cüzdanlarda aynı anahtarın kullanılmasını kontrol ediyor. Başarılı tekrarın tek journal ve iki posting bıraktığını; hata halinde idempotency kaydının da geri alındığını doğruladık. Application testleri, tamamlanmış işlemin wallet'ı yeniden yükleyip tekrar save yapmadan eski makbuzu döndürdüğünü gösteriyor.

Ledgerly'deki teknik kanıt: `docs/labs/004-test-deposit-idempotency/README.md`. Kararın gerekçesi: `docs/adr/0009-test-deposit-idempotency.md`. Gelişim sırası: `docs/journey/09-test-deposit-idempotency.md`.

## Mülakatta nasıl anlatırım?

> Para yatırma commit olup HTTP yanıtı kaybolursa istemci güvenle tekrar deneyebilmelidir. Önce aynı isteğin iki ayrı journal ve iki bakiye artışı oluşturduğunu gerçek PostgreSQL testinde gösterdim. İstemcinin gönderdiği Idempotency-Key'i wallet kapsamında kalıcı ve benzersiz tuttum; anahtar kaydını bakiye ve journal ile aynı transaction'da yazdım. Aynı anahtar ve tutar ilk makbuzu döndürüyor, farklı tutar 409 alıyor. Böylece retry ikinci kez test parası yazmıyor; gerçek banka tarafının idempotency ve mutabakatı ise ayrı çözülmeli.
