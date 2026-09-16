# Persistence ve Transaction Nedir? Journal'ı Birlikte Kaydetmek

## Persistence nedir?

Persistence, veriyi uygulama kapandıktan sonra da kalacak şekilde saklamaktır. Bellekte bir nesne oluşturmakla database'e kaydetmek farklı işlerdir.

Bir not uygulamasında yazı yazdığını düşün. Yazı ekranda görünüyor olabilir; ama uygulama kapanınca geri gelmesi için saklanmış olması gerekir. Ledgerly'de de JournalEntry.Create çağrısı bir nesne oluşturur. PostgreSQL'e kaydetmek ayrı adımdır.

Ne için kullanılır? Sonraki istekte aynı hesabı veya para hareketini bulabilmek için. Bu bölümde önce neyi sakladığımızı, sonra bir hata olduğunda hangi kayıtların kalması gerektiğini göreceğiz.

## Tablo, satır ve ilişki nedir?

Tablo benzer kayıtları bir arada tutar; satır o tablodaki tek kayıttır. Hesaplar tablosundaki bir satır bir muhasebe hesabını, journal tablosundaki bir satır bir olayın başlığını temsil eder.

Önceki kavramları hatırlayalım: ledger account hareketin ait olduğu hesap, journal aynı olayın bütün kaydı, posting o kaydın bir hesabı etkileyen satırıdır.

```text
ledger_accounts  → Hesapların kimliği, türü ve para birimi
journal_entries  → Bir olayın kimliği, para birimi ve zamanı
postings         → O olaya ait hesap, yön ve tutar satırları
```

Posting'in journal ve hesap kimliklerini taşıması bu kayıtlar arasında ilişki kurar. Örneğin “bu Debit 10 satırı, J1 olayının parçası ve A1 hesabına ait” diyebiliriz. Buradaki J1/A1 açıklama etiketleridir; gerçek kimlikler GUID'dir.

## Mapping nedir?

Mapping, C# nesnesindeki alanın database'de nereye ve hangi biçimde yazılacağını tarif etmektir. Örneğin Amount, postings tablosundaki amount sütununa yazılır. Bu sütunun numeric(19,4) olması toplam 19 basamak, bunun 4'ü ondalık olacak biçimde değer saklamasını ifade eder.

EF Core bu eşlemeyi kullanarak database işlemlerini yürütür. Biz Infrastructure'da üç küçük tablo sınıfı ekledik: LedgerAccountRecord, JournalEntryRecord ve PostingRecord. İsimlerindeki Record “kayıt” anlamındadır; bunlar C# record değil, class'tır.

Neden domain nesnesinin yanında bir sınıf daha var? Domain tarafındaki posting'ler değiştirilemiyor, journal koleksiyonu da dışarıya kapalı. EF'nin satırları takip edip yüklediği yapıyı ayırarak bu korumayı koruduk. Karşılığında domain nesnesinden tablo nesnesine dönüşüm kodu yazıyoruz.

## Aynı posting iki satırda geçebilir mi?

Domain'de aynı immutable Posting nesnesini iki kez kullanmak mümkündür. Örneğin Debit 1.2345 nesnesini iki satıra koyup Credit 2.4690 ile dengeleyebiliriz.

Database'de her satırı ayrı ayırt etmemiz gerekir. Bu yüzden posting satırının anahtarı journal kimliği ve satır sırasıdır:

```text
(J1, 0) → Debit  1.2345
(J1, 1) → Debit  1.2345
(J1, 2) → Credit 2.4690
```

Primary key, bir satırı diğerlerinden ayıran anahtardır. İki alanın birleşimini kullandığımızda composite key denir. Buradaki sıra yalnızca journal içindeki satır sırasıdır; bütün sistemdeki olayların sırası değildir. Okurken aynı sırayı geri getiriyoruz.

## Foreign key nedir, ne işe yarar?

Foreign key, “bu satırın işaret ettiği kayıt gerçekten var olmalı” kuralını database'e uygulatır. Olmayan bir hesaba posting yazmayı engellemek için kullanıyoruz.

Yalnızca hesabın var olması yeterli değil: hareketin para birimi de hesapla uyuşmalı. Bu yüzden ilişkiyi iki bilgiyle kuruyoruz:

```text
Posting: AccountId + Currency
              ↓
Hesap:   Id        + Currency
```

Bu composite foreign key, iki alanın birlikte eşleşmesini ister. Posting'in journal bağlantısı ve müşteri hesabının wallet bağlantısı da aynı mantıkla kurulur. Böylece yanlış currency'yi yalnızca C# kontrolüne bırakmamış oluruz.

Fon hesabının WalletId'si hâlâ null olabilir; o hesap bir müşteri wallet'ına bağlı değildir. Buradaki null, bozuk veya kayıp wallet demek değildir.

## Unique ve check constraint nedir?

Constraint, database'in kabul edeceği veriye koyduğumuz kuraldır.

**Unique**, belirli bir bilginin tekrarlanmasını engeller. Aynı wallet için iki müşteri hesabı oluşmasını istemiyoruz. Test fon hesabında da aynı para birimi için en fazla bir hesap istiyoruz.

**Check**, satırdaki değerlerin belirli koşulu sağlamasını ister. Örneğin posting tutarı pozitif olmalı; yön Debit veya Credit olmalı. Hesapta Asset ise WalletId boş, Liability ise dolu olmalı.

Filtreli unique index, tekillik kontrolünü sadece seçilen satırlara uygular. WalletId dolu olan müşteri hesapları ile WalletId boş olan test fon hesaplarını bu şekilde ayrı kurallarla kontrol ediyoruz. Bu, şu anki iki hesap rolüne göre verilmiş bir karar.

## Transaction nedir?

Transaction, bir grup database işlemini tek bir bütün olarak tamamlamamızı sağlayan yapıdır. Bu bölümde özellikle **atomiklik** özelliğiyle ilgileniyoruz: ya bütün değişiklikler kaydedilir ya hiçbiri kalmaz.

Commit, değişikliklerin kalıcı olarak kabul edilmesidir. Rollback, o transaction'ın değişikliklerinin geri alınmasıdır. Rollback daha önce başka transaction'da commit edilmiş her şeyi silmez; sınırın nerede başladığı bu yüzden önemlidir.

Örneğimiz şu: Debit 10 ve Credit 10 satırı olan dengeli journal var. Fakat ikinci satırın hesap kimliği database'de yok. Bu durumda yarım muhasebe kaydı bırakmak istemiyoruz.

## Önce yanlış yöntemi deneyelim

Her parçayı ayrı ayrı kaydedersek:

```text
1. Journal başlığını kaydet → commit
2. İlk posting'i kaydet     → commit
3. İkinci posting'i kaydet  → hesap yok, hata
```

Son adımın hatası önceki iki commit'i geri alamıyor. Testte yeni bir database bağlantısıyla baktığımızda **1 journal ve 1 posting** kaldığını gördük. Başlangıçta domain nesnesi dengeliydi; kayıt işlemini parçaladığımız için database'deki sonuç eksik oldu.

Bu bilinçli bozuk yöntem yalnızca lab testinde bulunur. Daha önce çalışan bir deposit endpoint'inin hatası olduğunu iddia etmiyoruz; iki kayıt yaklaşımını deneyle karşılaştırıyoruz.

## Biz nasıl kaydediyoruz?

Repository, hesapları veya journal'ı kaydetmek için kullandığımız arayüzdür. Add metodumuz database'e hemen yazmaz; kaydedilecek satırları hazırlar.

Unit of Work, aynı iş için hazırlanmış değişikliklerin birlikte kaydedilmesini yönetir. Mevcut IUnitOfWork üzerinden tek SaveChangesAsync çağırıyoruz:

```csharp
accountRepository.Add(account);
journalRepository.Add(journal);
await unitOfWork.SaveChangesAsync(cancellationToken);
```

Bu örnekte nesneler önceden oluşturulmuş ve repository'ler aynı istek kapsamındaki DbContext'i kullanıyor. DbContext, EF'nin database işlemlerini ve hazırlanmış değişiklikleri yönettiği çalışma nesnesidir. Journal Add, başlığı ve bütün posting'leri birlikte hazırlar.

İlişkisel provider, tek SaveChanges içindeki değişiklikleri transaction ile kaydeder. Herhangi biri başarısızsa o çağrının değişiklikleri geri alınır. Birden fazla save gerekiyorsa onları ayrıca ortak transaction içine almamız gerekir. [EF Core transaction davranışı](https://learn.microsoft.com/en-us/ef/core/saving/transactions)

## Aynı hatayla tekrar deneyince ne oldu?

```text
Tek SaveChanges içinde:
  Journal başlığı INSERT → başarılı
  İlk posting INSERT    → başarılı
  İkinci posting INSERT → hata
  Rollback
```

Yeni bağlantıyla sonuç **0 journal ve 0 posting** oldu. Aynı bozuk hesap kimliği kullanıldı; değişen şey kayıt sınırıydı.

| Yöntem | Hata sonrası journal | Hata sonrası posting |
|---|---:|---:|
| Ayrı ayrı save | 1 | 1 |
| Tek Unit of Work/save | 0 | 0 |

Hatanın PostgreSQL kodu 23503, ihlal edilen kural fk_postings_account_currency idi. İlk iki INSERT'in gerçekten çalıştığını test içinde komutları gözleyerek doğruladık. Komut gözlemcisine interceptor denir; burada yalnızca olanı kaydeder, hatayı uydurmaz.

Testin etrafında her şeyi geri alan başka bir transaction yok. Sonucu yeni bağlantıdan, test temizliği başlamadan okuyoruz. Önceden kaydedilen wallet ve hesap da yerinde kalıyor. Böylece test temizliğini uygulamanın rollback davranışıyla karıştırmıyoruz.

## Okurken snapshot ne demek?

Snapshot burada kaydedilmiş bilgilerin okunmuş görüntüsüdür. Repository hesap/journal bilgilerini bu sonuç nesnelerinde döndürür. Bunlar database'e geri yazılmak üzere takip edilen nesneler değildir.

AsNoTracking, EF'nin okunan satırları değişiklik takibine almamasını ister. Sonuç nesnesini değiştirmek kendiliğinden database güncellemesi yapmaz. Journal'ın posting listesi okurken de read-only olarak sunulur. Event sourcing snapshot sistemi eklemedik; aynı kelimeyi okuma sonucu için kullanıyoruz.

## Şu an neyi kullanabiliriz?

Hesap ve dengeli journal domain nesnelerini repository'lere verip tek Unit of Work ile PostgreSQL'e kaydedebilir, ardından başka kapsamdan okuyabiliriz. Tablolar development ve test database'lerine migration ile eklendi. Migration, şema değişikliğinin sürümlenmiş tarifidir.

Mevcut wallet endpoint'i henüz otomatik ledger hesabı açmaz. Para yatırma/transfer endpoint'i ve Wallet.Balance güncellemesi eklenmedi. Bu çalışma onların kayıt temelini hazırlıyor.

Denge ve minimum posting sayısı Domain factory'sinde korunuyor. Doğrudan SQL yazan biri boş veya dengesiz journal oluşturabilir; bunu engelleyen database trigger'ı henüz yok. Posting'lerin SQL ile güncellenmesini/silinmesini engelleyen kalıcı immutable ledger koruması da henüz yok. Foreign key üst kayıt silmeyi sınırlasa da bu bütün kayıtların silinemez olduğu anlamına gelmez.

## Kendim nasıl denerim?

Ledgerly klasöründe, yalnızca atomiklik lab'ını çalıştırmak için:

```bash
docker compose up -d
dotnet test tests/Ledgerly.IntegrationTests/Ledgerly.IntegrationTests.csproj --filter 'Lab=JournalAtomicity' --logger 'console;verbosity=detailed'
```

İki test de geçer. Ayrı-save testi bilerek yanlış yöntemin yarım kayıt bıraktığını; tek-save testi bütün kaydın geri alındığını doğrular. İlk testin yeşil olması yanlış yöntemin doğru olduğu anlamına gelmez.

16 Eylül 2026 doğrulamasında 23 yeni PostgreSQL case'iyle toplam **90 test** geçti: 46 Domain, 4 Application, 40 IntegrationTests. Yeni testler ayrıca hesap tekilliğini, yanlış referans/currency'yi, satır kurallarını, sıralı okumayı ve commit'in başka bağlantıda görünmesini kontrol eder. Önceki integration case'lerinden 3'ü hata-enjeksiyon kontrolleridir; gerçek network arızası deneyi değildir.

Kanonik kaynaklar: Ledgerly'deki `docs/architecture/03-ledger-persistence.md`, `docs/labs/002-journal-atomicity/README.md`, `docs/adr/0006-ledger-persistence-and-atomic-save.md`, `docs/journey/06-ledger-persistence.md`.

## Mülakatta nasıl anlatırım?

> Persistence verinin uygulama kapandıktan sonra da saklanmasıdır. Journal başlığı ve posting'leri ayrı ayrı commit edince son satırın hatası yarım kayıt bırakabiliyor. Bunu gerçek PostgreSQL'de reproduce ettim. Repository'yi bütün journal'ı hazırlayacak şekilde kurup tek Unit of Work ile kaydettim. Aynı hata altında önceki INSERT'ler çalışmış olsa da yeni bağlantıda hiçbir journal satırı kalmadığını doğruladım. Bu atomik kayıt garantisi; bakiye ve idempotency kuralları ayrıca ele alınacak.
