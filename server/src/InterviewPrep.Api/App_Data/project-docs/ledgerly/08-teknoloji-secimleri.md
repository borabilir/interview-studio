# Teknolojileri Nasıl Seçtik?

## Bu araçlar ne yapıyor?

Bir API yazarken kodu yazdığımız dil, kodu çalıştıran ortam ve veriyi sakladığımız yer farklı görevler üstlenir. İsimleri ezberlemek yerine basit akışı düşünelim: istek gelir, C# kodu çalışır, gerekli veri database'e kaydedilir, cevap döner.

| Kavram veya araç | Basit anlamı | Bu projedeki işi |
|---|---|---|
| C# | Kod yazdığımız dil | Wallet kurallarını ve istek akışını ifade etmek |
| .NET runtime | Derlenmiş .NET kodunu çalıştıran ortam | API'yi çalıştırmak |
| .NET SDK | Derleme ve geliştirme araçları | dotnet build ve dotnet test komutlarını çalıştırmak |
| ASP.NET Core | HTTP uygulaması geliştirme çatısı | İstekleri karşılamak ve cevap üretmek |
| PostgreSQL | Veriyi tablolarda saklayan database | Uygulama kapansa da wallet kayıtlarını korumak |
| EF Core | C# nesneleri ile database işlemleri arasında çalışan kütüphane | Nesneleri sorgulamak ve kaydetmek |
| Npgsql | PostgreSQL ile iletişimi sağlayan .NET sağlayıcısı | EF Core'un PostgreSQL'e bağlanmasını sağlamak |
| xUnit | Otomatik test çalıştıran kütüphane | Beklenen davranışları doğrulamak |
| Docker Compose | Container'ların nasıl başlatılacağını dosyayla tanımlayan araç | Lokal PostgreSQL'i ortak ayarlarla başlatmak |

Container'ın nasıl çalıştığını [Docker bölümünde](14-docker-ve-lokal-altyapi.md) açıyoruz. Aşağıdaki seçim gerekçeleri bu görevleri bilerek okunmalı. LTS, seçilen sürümün uzun süre desteklenen sürüm ailesinde olduğunu belirtir.

## Bölümün uygulama bağlamı

Teknoloji seçiminde “projede mümkün olduğunca çok araç olsun” yaklaşımı kullanılmadı. Her araç; çözdüğü problem, öğrenme değeri, operasyon maliyeti ve alternatifleri üzerinden değerlendirildi.

## Başlangıç teknoloji seti

| Alan | Seçim | Gerekçe |
|---|---|---|
| Runtime | .NET 10 LTS | Yeni proje için güncel LTS ve uzun destek süresi |
| Dil | C# 14 | .NET 10'un kararlı dil sürümü; preview özellik yok |
| Web | ASP.NET Core Web API | Middleware, DI, API ve integration test pratiği |
| Endpoint yaklaşımı | Controllers | Endpoint sınırlarını ve HTTP contract'larını açık tutmak |
| Write database | PostgreSQL | ACID, constraint, transaction, isolation ve locking |
| Data access | EF Core | Unit of Work, transaction ve concurrency desteği |
| Test | xUnit | Domain ve integration testleri için yaygın ekosistem |
| Lokal altyapı | Docker Compose | PostgreSQL'i tekrar üretilebilir çalıştırmak |
| NoSQL | MongoDB — ileride | CQRS transaction-history read model |

## Neden .NET 10 LTS?

Proje sıfırdan başladığı için güncel LTS sürümü seçildi. Böylece güncel ASP.NET Core ve EF Core yeteneklerini kullanırken uzun destek süresi elde ediyoruz. Preview runtime ve dil özelliklerini kullanmıyoruz; deneyimizin konusu platform önizlemesi değil, sistem tasarımı.

SDK sürümü `global.json` ile sabitlenecek. Bu sayede geliştirici makinesine yeni bir SDK kurulduğunda projenin kullandığı sürüm sessizce değişmeyecek.

## Neden PostgreSQL?

İç transfer sırasında birden fazla finansal kaydın atomik olması gerekir. PostgreSQL bize şu deney alanlarını sağlar:

- ACID transaction
- Unique/check/foreign key constraint
- Isolation level
- Optimistic ve pessimistic concurrency
- Row-level lock
- Atomik koşullu update
- Index ve execution plan

SQL Server da geçerli bir alternatifti. PostgreSQL; ücretsiz olması, Docker ile kolay kurulması ve mevcut SQL deneyiminin dışına kontrollü bir adım sağlaması nedeniyle seçildi.

## MongoDB neden ilk veritabanı değil?

NoSQL mutlaka kullanılacak; fakat finansal write modelin ilk source of truth'ü olmayacak. Önce PostgreSQL ile doğruluk baseline'ı oluşturacağız, sonra MongoDB'yi CQRS read model olarak ekleyeceğiz.

Bu seçim sayesinde aşağıdaki sorunları kasıtlı olarak üretebiliriz:

```text
PostgreSQL commit başarılı
    |
    v
Event henüz işlenmedi
    |
    v
MongoDB read model eski veri gösteriyor
```

Buradan projection lag, stale read, duplicate event, idempotent consumer ve projection rebuild konularına geçeceğiz.

## Neden araçları şimdiden eklemiyoruz?

Kafka/Redpanda, MongoDB, Redis ve resilience araçları baseline template'inde olmayacak. Önce problem reproduce edilecek, alternatifler ve trade-off değerlendirilecek, sonra araç eklenecek.

## Mülakat özeti

> Teknolojileri popüler oldukları için değil, proje problemlerine göre seçtim. Finansal write modelde transaction ve constraint ihtiyacı nedeniyle PostgreSQL; uygulama tarafında güncel LTS olduğu için .NET 10 kullandım. MongoDB'yi ise CQRS read model aşamasına erteleyerek NoSQL ve eventual consistency problemlerini kontrollü biçimde gözlemlemeyi hedefledim.
