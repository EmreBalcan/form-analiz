# Form Analiz

Spor salonu hareketlerinin formunu kamerayla analiz eden tarayıcı uygulaması. 72 hareket, her biri için
ayrı kurallar. Hatalar ekranda yazıyla ve Türkçe sesli uyarıyla bildirilir; geçerli/sayılmayan tekrarlar
sayılır, sayılmayanların nedeni listelenir. Görüntü cihazdan çıkmaz (MediaPipe Pose tarayıcıda çalışır).

## Çalıştırma

```
npm start          # http://localhost:8080  (bilgisayarda kamera izni localhost'ta çalışır)
npm test           # analiz motoru testleri (sentetik iskeletler)
node tools/rules-doc.mjs   # docs/KURALLAR.md'yi katalogdan yeniden üret
```

Telefondan denemek için sayfanın HTTPS ile yayınlanması gerekir (ör. GitHub Pages); `http://` üzerinden
telefon tarayıcıları kamera izni vermez.

**Video dosyasıyla test:** "Kamerayı başlat" yerine "Video dosyasıyla test et" ile salonda çekilmiş bir video
yüklenebilir. Analiz canlı kamerayla aynıdır.

## Kullanım

1. Hareketi seç, ekrandaki "Kurulum" önerisine göre kamerayı yerleştir (yandan / önden).
2. Başlangıç pozisyonunda ~1 sn sabit dur → **kalibrasyon** (omuz yüksekliği, ayak açısı vb. senin
   vücuduna göre kaydedilir; omuz silkme bu referansa göre ölçülür).
3. Tekrarlara başla. Kritik hata → tekrar sayılmaz, neden listeye yazılır. Küçük hata → uyarı.

## Mimari

| Dosya | Görev |
|---|---|
| `src/core/body.js` | Ölçüm katmanı: görüş açısı tespiti, gövde ekseni (yedekli), kol konumu (öne/yana/yükseklik), Taylor 3B segment kurma, omuz–kafa mesafesi, gövde eğimi |
| `src/core/measures.js` | Kurallarda kullanılan ~50 ölçüm; her biri değer + güven + kaynak döndürür |
| `src/core/engine.js` | Kalibrasyon, tekrar durum makinesi, kural değerlendirme, kabul/ret, tempo |
| `src/exercises/rules.js` | Ortak kural kalıpları (silkme, salınım, dirsek sabitliği, diz içe kaçma…) |
| `src/exercises/catalog.js` | 72 hareketin tanımı: kamera, ana ölçüm, hedef, kurallar ve eşikler |
| `src/app.js`, `src/ui/*` | Arayüz, MediaPipe yükleyici, ses, iskelet çizimi |
| `docs/KURALLAR.md` | Tüm kuralların okunabilir listesi + kaynaklar (otomatik üretilir) |

### Ölçümün hatasız olması için alınan önlemler

- **Derinlik z ile ölçülmez.** MediaPipe'ın z değeri gürültülüdür. Kolun/bacağın kameraya doğru açısı, kemiğin
  ekrandaki kısalmasından hesaplanır (gerçek boy = son 10 sn'nin %95 maksimumu). z yalnızca yönü (öne/arkaya)
  belirler ve yön değişimi ~200 ms tutarlılık ister.
- **Eklem açısı otomatik 2B/3B:** segment kamera düzlemindeyse 2B (en doğru), kısalmışsa 3B, arada yumuşak geçiş.
- **Yedek zincirleri:** omuz silkme kulak → göz → ağız → burun (ikinci kaynakla çapraz kontrol); gövde ekseni
  kalça → omuz hattı → yerçekimi; salınım kalça-omuz açısı → omuz yatay kayması → dünya modeli.
- **Yandan çekimde yalnızca kameraya yakın taraf** kullanılır (uzak taraf modelin tahminidir).
- **Güvene göre karar:** düşük güvenli ölçüm veya kuralın ölçülemediği kamera açısı tekrarı reddedemez,
  yalnızca ret eşiği aşılınca uyarır. Arayüzde her kuralın durumu ve kullanılan kaynak görünür.
- **Sabitlik kuralları "tekrar içindeki toplam hareket aralığı"** (max − min) ile ölçülür; tekrarın ne zaman
  başladığından bağımsızdır.

## Testler

`npm test` sentetik 3B iskelet üretip (önden/yandan, gürültülü, kalça/kulak gizli, çapraz duruş) motoru
çalıştırır: doğru tekrarlar kabul, hatalı tekrarlar doğru gerekçeyle ret, yanlış alarm yok, 72 hareket çökmez.

**Sınır:** sentetik testler mantığı doğrular, gerçek kamerayı değil. Eşikler gerçek salon videolarıyla
ayarlanmalı: yanlış karar görürsen arayüzde "Ölçüm ayrıntıları → Kayıt verisini indir (JSON)" ile son 60 sn'yi
indir; bu dosya `tests/` altına eklenip gerçek veri testi olarak kullanılabilir.

## Bilinen ölçüm sınırları

- Bel/sırt yuvarlanması 33 noktalık iskeletten doğrudan ölçülemez; yerine gövde açısı, kalça-diz uyumu ve
  baş-boyun hizası kullanılır.
- Bilek bükülmesi, tutuş genişliği ve el rotasyonu (ör. çekiç tutuş) ölçülmez.
- Makine/sehpa vücudu kapatırsa ilgili kurallar "ölçülemiyor" durumuna geçer (yanlış ret vermez).
