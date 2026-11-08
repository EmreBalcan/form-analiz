# Form kuralları (72 hareket)

Bu belge `src/exercises/catalog.js` dosyasından otomatik üretilir (`node tools/rules-doc.mjs`). Elle düzenleme.

## Nasıl karar verilir

- **Tekrar sayımı:** her hareketin bir ana ölçümü vardır (ör. dirsek açısı). Tekrar, başlangıç değerinden
  hedef değere ulaşıp başlangıca **geri dönünce** biter. Hedefe ulaşılmazsa veya başlangıca dönülmezse tekrar
  **sayılmaz** (hareket açıklığı kritik kuraldır).
- **Kritik kural (ret):** eşik, en az ~150–250 ms boyunca aşılırsa tekrar sayılmaz ve nedeni listeye yazılır.
- **Uyarı:** tekrar sayılır; yazılı ve sesli uyarı verilir.
- **Güven:** bir kural yalnızca ölçüm güveni yeterliyse ve kamera kuralın en iyi ölçüldüğü açıdaysa
  (`bestView`) tekrarı reddedebilir. Diğer durumlarda yalnızca ret eşiği aşılınca uyarır. Böylece yanlış
  açıdan bakan kamera doğru tekrarı reddetmez.
- **Yedek zincirleri:** omuz silkme kulak → göz → ağız → burun; gövde ekseni kalça → omuz hattı → yerçekimi;
  gövde salınımı kalça-omuz açısı → omuz yatay kayması → dünya modeli. Kullanılan kaynak arayüzde gösterilir.
- **Derinlik:** kameraya doğru/kameradan uzağa hareketler (ör. önden çekimde dirseğin öne kaçması) MediaPipe'ın
  z değeriyle değil, kemiğin ekranda kısalmasıyla (Taylor yöntemi) ölçülür; z yalnızca yön için kullanılır.
- **Birimler:** "üst kol boyu" ≈ 30 cm (0,10 ≈ 3 cm). "vücut ölçeği" = üst kol boyu.

## Kaynaklar (eşiklerin dayanağı)

- Biceps curl: üst kol sabit, dirsek gövde yanında, gövde salınımı/momentum yok, kontrollü indirme —
  [Wikipedia: Bicep curl](https://en.wikipedia.org/wiki/Bicep_curl), [LiveStrong](https://livestrong.com/article/13722123-biceps-curl-mistakes), [Built With Science](https://builtwithscience.com/fitness-tips/fix-bicep-curls-mistakes)
- Yana açış: dirsek hafif ve sabit bükük, omuz hizası, omuz silkme ve salınım yok, dirsekle yönet —
  [Peloton](https://www.onepeloton.com/blog/lateral-raises), [Origym](https://www.origym.co.uk/blog/lateral-raise/), [Speediance](https://www.speediance.com/blogs/fitness/how-to-do-lateral-raise-guide)
- Bench press: dirsek gövdeyle 45–75°, kürek kemikleri geri-aşağı, bar göğüs ortasına, bilek dirsek üstünde —
  [StrengthLog](https://www.strengthlog.com/common-bench-press-mistakes/), [Built With Science](https://builtwithscience.com/fitness-tips/shoulder-pain-bench-press/)
- Squat: en az paralel derinlik, diz içe kaçmaması, topuk yerde, aşırı öne eğilmeme —
  [Wikipedia: Squat](https://en.wikipedia.org/wiki/Squat_(exercise)), [NSCA: Squat depth](https://www.nsca.com/education/articles/nsca-coach/considerations-for-squat-depth)
- Triceps itiş: üst kol gövde yanında kilitli, en fazla ~10–20° öne eğilme, gövdeyle bastırmama —
  [Gravitus](https://gravitus.com/guides/exercises/pushdown), [SQUATWOLF](https://squatwolf.com/blogs/fitness/triceps-pushdown)
- MediaPipe noktaları, görünürlük ve z ölçeği — [Pose Landmarker (Web)](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js)

Eşikler bu kaynaklardaki koçluk değerlerine ve MediaPipe ölçüm gürültüsüne göre seçildi. Gerçek salon
videolarıyla kalibre edilmeleri gerekir (bkz. README: "Kayıt verisini indir").

## Göğüs

### 1. Düz Bench Press (Bench Press)

- **Kamera:** yandan — Telefonu sehpanın tam yanına, sehpa yüksekliğine, 2-3 m uzağa koy. Baş, omuz, dirsek, bilek ve kalça görünsün.
- **Başlangıç:** kollar yukarıda düz
- **Tekrar:** Bar/bilek yüksekliği: 1.6 → 0.6 · hedefe ulaşmazsa: "Bar göğse kadar indirilmedi" · dönmezse: "Kollar yukarıda tam açılmadı (kilitlenmedi)"
- **Tempo (uyarı):** hedefe gidiş ≥ 650 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsekler gövdeye 90° açıldı — 45-75° arasında tut (omuz sıkışır) | **Kritik** | uyarı > 75° · ret > 85° | tepe/dip noktası | ret: yandan |
| Dirsekler gövdeye fazla yapışık | Uyarı | uyarı < 20° | tepe/dip noktası | ret: yandan |
| Bilekler dirseklerin üstünde değil — ön kol dik olmalı | **Kritik** | uyarı > 20° · ret > 35° | tepe/dip noktası, dönüşte | yandan |
| Bar boyuna/üst göğse iniyor — meme ucu hizasına indir | Uyarı | uyarı < 0.1 (vücut ölçeği) | tepe/dip noktası | yandan |
| Bar karına doğru iniyor — göğüs ortasına indir | Uyarı | uyarı > 1.25 (vücut ölçeği) | tepe/dip noktası | yandan |
| Kalça sehpadan kalktı | **Kritik** | tekrar başına göre değişim uyarı > 0.25 (vücut ölçeği) · ret > 0.4 (vücut ölçeği) | tüm tekrar | ret: yandan |
| Omuzlar kulağa kaydı — kürek kemiklerini geri ve aşağı sabitle | **Kritik** | uyarı > 0.11 (vücut ölçeği) · ret > 0.18 (vücut ölçeği) | tüm tekrar | tümü |
| Omuzlar öne yuvarlandı — göğsünü öne çıkar, kürek kemiklerini geri al | Uyarı | kalibrasyona göre uyarı > 0.18 (vücut ölçeği) | tüm tekrar | yandan |

### 2. Eğimli Dambıl Press (Incline Dumbbell Press)

- **Kamera:** yandan — Telefonu eğimli sehpanın tam yanına, sehpa yüksekliğine, 2-3 m uzağa koy. Baş, omuz, dirsek, bilek ve kalça görünsün.
- **Başlangıç:** dambıllar yukarıda, kollar düz
- **Tekrar:** Bar/bilek yüksekliği: 1.3 → 0.8 · hedefe ulaşmazsa: "Dambıllar yeterince indirilmedi" · dönmezse: "Kollar yukarıda tam açılmadı (kilitlenmedi)"
- **Tempo (uyarı):** hedefe gidiş ≥ 650 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsekler gövdeye 90° açıldı — 45-75° arasında tut (omuz sıkışır) | **Kritik** | uyarı > 75° · ret > 85° | tepe/dip noktası | ret: yandan |
| Dirsekler gövdeye fazla yapışık | Uyarı | uyarı < 20° | tepe/dip noktası | ret: yandan |
| Bilekler dirseklerin üstünde değil — ön kol dik olmalı | **Kritik** | uyarı > 20° · ret > 35° | tepe/dip noktası, dönüşte | yandan |
| Bar boyuna/üst göğse iniyor — meme ucu hizasına indir | Uyarı | uyarı < 0.05 (vücut ölçeği) | tepe/dip noktası | yandan |
| Bar karına doğru iniyor — göğüs ortasına indir | Uyarı | uyarı > 1.2 (vücut ölçeği) | tepe/dip noktası | yandan |
| Kalça sehpadan kalktı | **Kritik** | tekrar başına göre değişim uyarı > 0.25 (vücut ölçeği) · ret > 0.4 (vücut ölçeği) | tüm tekrar | ret: yandan |
| Omuzlar kulağa kaydı — kürek kemiklerini geri ve aşağı sabitle | **Kritik** | uyarı > 0.11 (vücut ölçeği) · ret > 0.18 (vücut ölçeği) | tüm tekrar | tümü |
| Omuzlar öne yuvarlandı — göğsünü öne çıkar, kürek kemiklerini geri al | Uyarı | kalibrasyona göre uyarı > 0.18 (vücut ölçeği) | tüm tekrar | yandan |

### 3. Göğüs Press Makinesi (Chest Press)

- **Kamera:** yandan — Telefonu makinenin tam yanına, göğüs/omuz hizasında, kameraya yakın kolun makine kolunun önünde kalacağı tarafa koy. Baş, omuz, kalça ve kameraya yakın kol görünsün.
- **Başlangıç:** tutamaklar göğüs hizasında
- **Tekrar:** Kol uzanması: 0.6 → 1.55 · hedefe ulaşmazsa: "Kollar tam uzatılmadı" · dönmezse: "Tutamaklar göğüs hizasına kadar geri gelmedi"
- **Tempo (uyarı):** dönüş ≥ 650 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Sırt pedden ayrıldı — gövdeyle itildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 4° · ret > 8° | tüm tekrar | ret: yandan |
| Sırt pedden ayrılıp öne geldi — sırtını pede yasla | **Kritik** | kalibrasyona göre uyarı > 5° · ret > 9° | tüm tekrar | ret: yandan |
| Gövde öne eğik — dik otur, sırtını pede yasla | **Kritik** | uyarı > 8° · ret > 15° | tüm tekrar | ret: yandan |
| Gövde fazla geriye yatık | Uyarı | uyarı < -25° | tüm tekrar | tümü |
| Omuzlar kulağa kalktı — omuzları aşağıda ve geride tut | **Kritik** | uyarı > 0.07 (vücut ölçeği) · ret > 0.12 (vücut ölçeği) | tüm tekrar | tümü |
| Omuzlar öne yuvarlandı — göğsünü öne çıkar, kürek kemiklerini geri al | Uyarı | kalibrasyona göre uyarı > 0.18 (vücut ölçeği) | tepe/dip noktası | yandan |
| Dirsekler omuz hizasının üstüne çıktı | **Kritik** | uyarı < -0.15 (vücut ölçeği) · ret < -0.35 (vücut ölçeği) | tüm tekrar | tümü |
| Ön kollar itiş yönünde değil — bilek dirsekle aynı hizada olmalı | Uyarı | uyarı < 55° | hedefe giderken, dönüşte | yandan |

### 4. Pec Deck Açış (Pec Deck Fly)

- **Kamera:** yandan / çapraz — Telefonu makinenin yanına veya hafif yan çaprazına (~30°), göğüs/omuz hizasında koy. Baş, omuz, dirsek ve kalça görünsün.
- **Başlangıç:** kollar yanlarda açık, göğüs önde
- **Tekrar:** Kolların önde birleşmesi: 0.5 → 1.15 · hedefe ulaşmazsa: "Kollar önde birleştirilmedi" · dönmezse: "Kollar başlangıca kadar açılmadı"
- **Tempo (uyarı):** dönüş ≥ 700 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsek açısı değişti — hareket press’e döndü | **Kritik** | tekrar içindeki hareket aralığı uyarı > 25° · ret > 40° | tüm tekrar | ret: çapraz |
| Dirsekler fazla büküldü — hareket press’e döndü | **Kritik** | uyarı < 125° · ret < 110° | tepe/dip noktası | tümü |
| Dirsekler omuz seviyesinin üstüne çıktı | **Kritik** | uyarı < -0.15 (vücut ölçeği) · ret < -0.3 (vücut ölçeği) | tüm tekrar | tümü |
| Dirsekler göğüs hizasının altına düştü | **Kritik** | uyarı > 0.4 (vücut ölçeği) · ret > 0.6 (vücut ölçeği) | tüm tekrar | tümü |
| Omuzlar öne yuvarlandı — göğsünü öne çıkar, kürek kemiklerini geri al | **Kritik** | kalibrasyona göre uyarı > 0.08 (vücut ölçeği) · ret > 0.15 (vücut ölçeği) | tüm tekrar | yandan/çapraz |
| Gövde öne eğik — dik otur, sırtını pede yasla | **Kritik** | uyarı > 8° · ret > 15° | tüm tekrar | tümü |
| Gövde öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı < -0.07 (vücut ölçeği) · ret < -0.12 (vücut ölçeği) | tüm tekrar | önden/çapraz |
| Omuzlar kulağa kalktı — omuzları aşağıda ve geride tut | **Kritik** | uyarı > değişken · ret > değişken | sürekli | tümü |
| Gövde öne-arkaya sallandı — sırtını pedde sabit tut | **Kritik** | tekrar içindeki hareket aralığı uyarı > 5° · ret > 9° | tüm tekrar | ret: yandan |
| Sırt pedden ayrıldı / gövde öne eğildi | **Kritik** | kalibrasyona göre uyarı > 6° · ret > 10° | tüm tekrar | ret: yandan |

### 5. Şınav (Push-up)

- **Kamera:** yandan — Telefonu yere, vücudunun tam yanına, 2-3 m uzağa koy; baştan ayağa tüm vücut kadrajda olsun.
- **Başlangıç:** kollar düz, plank pozisyonu
- **Tekrar:** Omuz yüksekliği: 1.4 → 1 · hedefe ulaşmazsa: "Yeterince inilmedi — göğsünü yere biraz daha yaklaştır" · dönmezse: "Kollar yukarıda tam açılmadı"
- **Tempo (uyarı):** hedefe gidiş ≥ 300 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kalça çöktü — omuz, kalça ve ayak bileği düz bir çizgide olmalı | **Kritik** | uyarı > 15° · ret > 26° | tüm tekrar | ret: yandan |
| Kalça fazla yukarıda — vücudu düz tut | **Kritik** | uyarı < -20° · ret < -34° | tüm tekrar | ret: yandan |
| Dirsekler gövdeye 90° açıldı — 45° civarında tut | **Kritik** | uyarı > 80° · ret > 95° | tepe/dip noktası | ret: yandan |
| Baş gövde hizasından çıktı — boynunu nötr tut | Uyarı | uyarı > 45° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı — kürek kemiklerini aşağı tut | **Kritik** | uyarı > 0.15 (vücut ölçeği) · ret > 0.25 (vücut ölçeği) | tüm tekrar | tümü |

## Sırt

### 6. Lat Çekiş (Lat Pulldown)

- **Kamera:** yandan / çapraz / önden — Telefonu makinenin tam yanına veya ön-arka çaprazına, omuz hizasında koy. Bar yukarıdayken eller, ayrıca omuz ve kalça görünsün (öne-arkaya eğilme yandan ölçülür).
- **Başlangıç:** kollar yukarıda düz
- **Tekrar:** Bar yüksekliği: -1.5 → -0.4 · hedefe ulaşmazsa: "Bar üst göğse (çene altına) kadar çekilmedi" · dönmezse: "Kollar yukarıda tam açılmadı"
- **Tempo (uyarı):** dönüş ≥ 700 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Gövde öne-arkaya sallanarak çekildi — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | ret: yandan |
| Dirsekler gövdeye doğru aşağı çekilmedi | **Kritik** | fazdaki en iyi değer uyarı < 0.45 (vücut ölçeği) · ret < 0.25 (vücut ölçeği) | tepe/dip noktası | tümü |
| Gövde başlangıç duruşundan öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı > 8° · ret > 13° | tüm tekrar | ret: yandan |
| Gövde öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı < -0.09 (vücut ölçeği) · ret < -0.16 (vücut ölçeği) | tüm tekrar | önden/çapraz |
| Geriye fazla yaslandın | **Kritik** | uyarı < -18° · ret < -28° | tüm tekrar | ret: yandan |
| Çekişte omuzlar kulağa kalktı — kürek kemiklerini aşağı indir | **Kritik** | uyarı > 0.06 (vücut ölçeği) · ret > 0.14 (vücut ölçeği) | tüm tekrar | tümü |
| Kollar eşit hareket etmiyor — bir taraf geride kaldı | **Kritik** | uyarı > 0.3 (vücut ölçeği) · ret > 0.5 (vücut ölçeği) | tüm tekrar | önden |
| Gövde yana doğru kaydı/eğildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | önden |

### 7. Oturarak Kablo Kürek (Seated Cable Row)

- **Kamera:** yandan — Telefonu kablo makinesinin tam yanına, oturduğun yükseklikte (bel-omuz hizası) koy. Omuz, dirsek, bilek ve kalça görünsün.
- **Başlangıç:** kollar önde düz, gövde dik
- **Tekrar:** Dirsek açısı: 155 → 95 · hedefe ulaşmazsa: "Ağırlık gövdeye kadar çekilmedi" · dönmezse: "Kollar önde tam açılmadı"
- **Tempo (uyarı):** dönüş ≥ 650 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Gövde öne-arkaya sallanarak çekildi — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | ret: yandan |
| Gövde başlangıçtaki dik duruştan öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı > 7° · ret > 12° | tüm tekrar | ret: yandan |
| Dirsekler yana açıldı — dirsekler gövdeye yakın geriye çekilmeli | **Kritik** | uyarı > 35° · ret > 50° | tüm tekrar | tümü |
| Gövde öne eğildi — dik otur, çekişi sırtla yap | **Kritik** | uyarı > 20° · ret > 30° | tüm tekrar | ret: yandan |
| Çekişin sonunda geriye fazla yaslandın | **Kritik** | uyarı < -12° · ret < -22° | tepe/dip noktası, dönüşte | ret: yandan |
| Dirsekler gövdenin arkasına kadar çekilmedi — kürek kemiklerini sık | Uyarı | fazdaki en iyi değer uyarı > -5° | tepe/dip noktası | yandan |
| Çekerken omuzlar kulağa kalktı — kürek kemiklerini aşağı ve geri çek | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | sürekli | tümü |

### 8. Barla Eğilerek Kürek (Barbell Row)

- **Kamera:** yandan — Telefonu tam yanına, bel hizasına, 2-3 m uzağa koy. Baştan dizlere kadar görünsün.
- **Başlangıç:** öne eğilmiş, kollar aşağıda düz
- **Tekrar:** Dirsek açısı: 155 → 100 · hedefe ulaşmazsa: "Ağırlık gövdeye kadar çekilmedi" · dönmezse: "Kollar önde tam açılmadı"
- **Tempo (uyarı):** dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Gövde öne-arkaya sallanarak çekildi — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | ret: yandan |
| Gövdenin eğim açısı değişti — sırtı aynı açıda sabit tut | **Kritik** | kalibrasyona göre uyarı > 8° · ret > 13° | tüm tekrar | ret: yandan |
| Dirsek gövdeden uzaklaştı — kol vücudun yanında olmalı | **Kritik** | uyarı > 55° · ret > 70° | tüm tekrar | tümü |
| Gövde fazla dik — kalçadan öne eğil (gövde yere yakın) | Uyarı | uyarı < 35° | tüm tekrar | ret: yandan |
| Dirsekler gövdenin arkasına kadar çekilmedi — kürek kemiklerini sık | Uyarı | fazdaki en iyi değer uyarı > -5° | tepe/dip noktası | yandan |
| Çekerken omuzlar kulağa kalktı — kürek kemiklerini aşağı ve geri çek | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | tüm tekrar | tümü |
| Dizler fazla bükülü — dizler hafif bükük, kalça geride | Uyarı | uyarı < 120° | tüm tekrar | yandan |

### 9. Tek Kol Dambıl Kürek (One Arm Dumbbell Row)

- **Kamera:** yandan — Telefonu çalışan kolun tarafına, tam yanına, bel hizasına koy. Baştan dizlere kadar görünsün.
- **Başlangıç:** kol aşağıda düz
- **Tekrar:** Dirsek açısı: 155 → 100 · hedefe ulaşmazsa: "Ağırlık gövdeye kadar çekilmedi" · dönmezse: "Kollar önde tam açılmadı"
- **Tempo (uyarı):** dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Gövde öne-arkaya sallanarak çekildi — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | ret: yandan |
| Gövdenin eğim açısı değişti — sırtı aynı açıda sabit tut | **Kritik** | kalibrasyona göre uyarı > 8° · ret > 13° | tüm tekrar | ret: yandan |
| Dirsek gövdeden uzaklaştı — kol vücudun yanında olmalı | **Kritik** | uyarı > 55° · ret > 70° | tüm tekrar | tümü |
| Gövde fazla dik — kalçadan öne eğil (gövde yere yakın) | Uyarı | uyarı < 35° | tüm tekrar | ret: yandan |
| Dirsekler gövdenin arkasına kadar çekilmedi — kürek kemiklerini sık | Uyarı | fazdaki en iyi değer uyarı > -5° | tepe/dip noktası | yandan |
| Çekerken omuzlar kulağa kalktı — kürek kemiklerini aşağı ve geri çek | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | tüm tekrar | tümü |
| Dizler fazla bükülü — dizler hafif bükük, kalça geride | Uyarı | uyarı < 120° | tüm tekrar | yandan |

### 10. Destekli Barfiks (Assisted Pull-up)

- **Kamera:** önden / yandan — Telefonu karşına (veya arkana), bar ve eller görünecek kadar uzağa, göğüs hizasına koy.
- **Başlangıç:** kollar yukarıda düz asılı
- **Tekrar:** Çene–bar: -1.8 → 0 · hedefe ulaşmazsa: "Çene barın üstüne çıkmadı" · dönmezse: "Altta kollar tam açılmadı"
- **Tempo (uyarı):** dönüş ≥ 700 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Bacaklar/kalça savrularak çekildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 25° · ret > 40° | tüm tekrar | tümü |
| Vücut öne-arkaya sallanarak çekildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 7° · ret > 13° | tüm tekrar | ret: yandan |
| Gövde öne/arkaya eğildi — vücut dik asılı kalmalı | **Kritik** | kalibrasyona göre uyarı > 10° · ret > 17° | tüm tekrar | ret: yandan |
| Gövde öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı < -0.09 (vücut ölçeği) · ret < -0.16 (vücut ölçeği) | tüm tekrar | önden/çapraz |
| Vücut bir yana eğildi — iki kolla eşit çek | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8° · ret > 14° | tüm tekrar | önden |
| Çekerken omuzlar kulağa kalktı — kürek kemiklerini aşağı çek | **Kritik** | uyarı > 0.06 (vücut ölçeği) · ret > 0.14 (vücut ölçeği) | tüm tekrar | tümü |

## Omuz

### 11. Omuz Press (Shoulder Press)

- **Kamera:** önden — Kamerayı tam karşına koy; kollar yukarıdayken eller kadrajda kalmalı.
- **Başlangıç:** dambıllar omuz hizasında, dirsekler bükülü
- **Tekrar:** Dirsek açısı: 90 → 155 · hedefe ulaşmazsa: "Kollar yukarıda tam açılmadı" · dönmezse: "Ağırlık omuz hizasına kadar indirilmedi"
- **Tempo (uyarı):** dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kollar eşit hareket etmiyor — bir taraf geride kaldı | **Kritik** | uyarı > 0.35 (vücut ölçeği) · ret > 0.6 (vücut ölçeği) | tüm tekrar | önden |
| Bilekler dirseklerin üstünde değil — ön kollar dik olmalı | **Kritik** | uyarı > 20° · ret > 35° | tüm tekrar | önden |
| Dirsekler gövdenin önüne geldi — dirsekler yanda, omuz hizasında olmalı | **Kritik** | uyarı > 38 (vücut ölçeği) · ret > 50 (vücut ölçeği) | tüm tekrar | tümü |
| Kollar başın üstüne değil öne doğru uzatıldı | **Kritik** | fazdaki en iyi değer uyarı < 155° · ret < 145° | tepe/dip noktası | tümü |
| Belini büküp geriye yaslandın | **Kritik** | tekrar başına göre değişim uyarı < -7° · ret < -13° | tüm tekrar | ret: yandan |
| Dizler bükülerek yaylanıldı — bacaktan momentum alındı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 12° · ret > 22° | tüm tekrar | tümü |
| Gövde yana doğru kaydı/eğildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | önden |
| Omuzlar kulağa kalktı — omuzları aşağıda tut | **Kritik** | uyarı > değişken · ret > değişken | tüm tekrar | tümü |
| Dirsekler birbirine yaklaştı — kollar gövdenin önünden kalkıyor, dirsekleri yana aç | **Kritik** | uyarı < 1.45 (vücut ölçeği) · ret < 1.25 (vücut ölçeği) | hedefe giderken, dönüşte | önden/çapraz |

### 12. Yana Dambıl Açış (Dumbbell Lateral Raise)

- **Kamera:** önden — Kamerayı tam karşına koy; kollar yandayken eller kadrajda kalmalı.
- **Başlangıç:** kollar yanda aşağıda
- **Tekrar:** Kol-gövde açısı: 20 → 75 · hedefe ulaşmazsa: "Kollar omuz hizasına kadar kaldırılmadı" · dönmezse: "Kollar aşağıya tam indirilmedi"
- **Tempo (uyarı):** hedefe gidiş ≥ 450 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kollar omuz seviyesinin üstüne çıktı | Uyarı | uyarı > 100° | tepe/dip noktası | tümü |
| Dirsekler fazla büküldü — kollar hafif bükük ve sabit olmalı | **Kritik** | uyarı < 125° · ret < 100° | tüm tekrar | tümü |
| Dirsek açısı değişti — kollar hafif bükülü sabit kalmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 30° · ret > 50° | tüm tekrar | tümü |
| Omuzlar kulağa kalktı — trapez devreye girdi | **Kritik** | uyarı > değişken · ret > değişken | sürekli | tümü |
| Gövde sallanarak kaldırıldı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 12° | tüm tekrar | ret: yandan |
| Gövde yana doğru kaydı/eğildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | önden |
| Dizler bükülerek yaylanıldı — bacaktan momentum alındı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 12° · ret > 22° | tüm tekrar | tümü |
| Vücut aşağı-yukarı yaylandı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 0.12 (vücut ölçeği) · ret > 0.22 (vücut ölçeği) | tüm tekrar | tümü |
| Kollar yana değil öne doğru kalkıyor | Uyarı | uyarı < 40° | tepe/dip noktası | tümü |
| Bilekler dirseklerden yukarı çıktı — hareketi dirsekle yönet | Uyarı | uyarı > 0.3 (vücut ölçeği) | tepe/dip noktası | önden |
| İki kolu birden kaldır — kollar aynı yükseklikte kalkmalı | Uyarı | uyarı > 15° | tüm tekrar | önden/çapraz |

### 13. Öne Dambıl Kaldırış (Front Raise)

- **Kamera:** yandan / önden — Kamerayı yanına koy (önden de çalışır ama salınım yandan daha iyi ölçülür).
- **Başlangıç:** kollar önde aşağıda
- **Tekrar:** Kol-gövde açısı: 20 → 75 · hedefe ulaşmazsa: "Kollar omuz hizasına kadar kaldırılmadı" · dönmezse: "Kollar aşağıya tam indirilmedi"
- **Tempo (uyarı):** hedefe gidiş ≥ 450 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kollar omuz seviyesinin üstüne çıktı | **Kritik** | uyarı > 100° · ret > 118° | tepe/dip noktası | tümü |
| Dirsekler fazla büküldü — kollar hafif bükük ve sabit olmalı | **Kritik** | uyarı < 132° · ret < 108° | tüm tekrar | tümü |
| Dirsek açısı değişti — kollar hafif bükülü sabit kalmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 25° · ret > 40° | tüm tekrar | tümü |
| Omuzlar kulağa kalktı — trapez devreye girdi | **Kritik** | uyarı > değişken · ret > değişken | tüm tekrar | tümü |
| Gövde sallanarak kaldırıldı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 10° · ret > 18° | tüm tekrar | ret: yandan |
| Gövde yana doğru kaydı/eğildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | önden |
| Dizler bükülerek yaylanıldı — bacaktan momentum alındı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 12° · ret > 22° | tüm tekrar | tümü |
| Vücut aşağı-yukarı yaylandı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 0.12 (vücut ölçeği) · ret > 0.22 (vücut ölçeği) | tüm tekrar | tümü |
| Kollar öne değil yana doğru kalkıyor — kollar gövdenin önünden kalkmalı | **Kritik** | uyarı > 30° · ret > 45° | hedefe giderken, tepe/dip noktası | tümü |

### 14. Ters Pec Deck (Reverse Pec Deck)

- **Kamera:** yandan — Kamerayı yanına, omuz hizasına koy.
- **Başlangıç:** kollar önde, tutamaklarda
- **Tekrar:** Kol açılması: 1.5 → 0.35 · hedefe ulaşmazsa: "Kollar yanlara kadar açılmadı" · dönmezse: "Kollar öne tam dönmedi"
- **Tempo (uyarı):** dönüş ≥ 650 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kollar omuz hizasının altına düştü | **Kritik** | uyarı > 0.45 (vücut ölçeği) · ret > 0.7 (vücut ölçeği) | tüm tekrar | tümü |
| Kollar omuzun üstüne çıktı | Uyarı | uyarı < -0.4 (vücut ölçeği) | tüm tekrar | tümü |
| Gövde öne-arkaya sallandı — göğsünü pedden ayırma | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | ret: yandan |
| Gövde öne eğildi / geriye yattı — göğüs pedde sabit kalmalı | **Kritik** | kalibrasyona göre uyarı > 8° · ret > 13° | tüm tekrar | ret: yandan |
| Omuzlar kulağa kalktı — trapez devreye girdi | **Kritik** | uyarı > değişken · ret > değişken | sürekli | tümü |

### 15. Yüze Kablo Çekiş (Face Pull)

- **Kamera:** yandan / önden — Kamerayı yanına, omuz hizasına koy.
- **Başlangıç:** kollar önde düz, ip yüz hizasında
- **Tekrar:** Dirsek açısı: 155 → 95 · hedefe ulaşmazsa: "İp yüze kadar çekilmedi" · dönmezse: "Kollar önde tam açılmadı"
- **Tempo (uyarı):** dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsekler omuz hizasının altına düştü — dirsekler yüksek olmalı | **Kritik** | uyarı > 0.3 (vücut ölçeği) · ret > 0.55 (vücut ölçeği) | tepe/dip noktası | tümü |
| Eller kulak hizasına açılmadı — dış rotasyon eksik | Uyarı | fazdaki en iyi değer uyarı < 0.1 (vücut ölçeği) | tepe/dip noktası | tümü |
| Gövde öne-arkaya sallanarak çekildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | ret: yandan |
| Gövde başlangıç duruşundan öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı > 8° · ret > 13° | tüm tekrar | ret: yandan |
| Gövde öne/arkaya eğik — dik dur | **Kritik** | uyarı > 15° · ret > 25° | tüm tekrar | ret: yandan |
| Omuzlar kulağa kalktı — trapez devreye girdi | **Kritik** | uyarı > değişken · ret > değişken | sürekli | tümü |

## Biceps

### 16. Dambıl Biceps Kıvırma (Dumbbell Curl)

- **Kamera:** önden / yandan / çapraz — Telefonu tam karşına, göğüs hizasına, 2 m uzağa koy. Omuzlar, dirsekler ve eller (kollar aşağıdayken de) görünsün. Yandan da çekebilirsin.
- **Başlangıç:** kollar aşağıda düz
- **Tekrar:** Dirsek açısı: 150 → 70 · hedefe ulaşmazsa: "Ağırlık yeterince kaldırılmadı — kolu tam bük" · dönmezse: "Kol altta tam açılmadı — her tekrarda kolu uzat"
- **Tempo (uyarı):** hedefe gidiş ≥ 350 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsek sabit kalmadı — üst kol öne/arkaya hareket etti | **Kritik** | tekrar içindeki hareket aralığı uyarı > 14° · ret > 23° | tüm tekrar | ret: yandan |
| Dirsek sabit kalmadı — üst kol öne/arkaya hareket etti | **Kritik** | tekrar içindeki hareket aralığı uyarı > 28° · ret > 39° | tüm tekrar | önden/çapraz |
| Dirsek öne kaçtı — üst kol gövdenin yanında kalmalı | **Kritik** | uyarı > 20° · ret > 33° | tüm tekrar | ret: yandan |
| Dirsek öne kaçtı — üst kol gövdenin yanında kalmalı | **Kritik** | uyarı > 32° · ret > 45° | tüm tekrar | önden/çapraz |
| Dirsek gövdeden uzaklaştı — kol vücudun yanında olmalı | **Kritik** | uyarı > 20° · ret > 33° | tüm tekrar | ret: önden |
| Dirsek gövdeden uzaklaştı — kol vücudun yanında olmalı | **Kritik** | uyarı > 30° · ret > 43° | tüm tekrar | yandan/çapraz |
| Gövde geriye/öne sallandı — ağırlık bel ve kalçadan kaldırıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 5° · ret > 10° | tüm tekrar | ret: yandan |
| Gövde başlangıçtaki dik duruştan öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı > 7° · ret > 12° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | sürekli | tümü |

### 17. Barla Biceps Kıvırma (Barbell Curl)

- **Kamera:** önden / yandan / çapraz — Telefonu tam karşına, göğüs hizasına, 2 m uzağa koy. Omuzlar, dirsekler ve bar görünsün. Yandan da çekebilirsin.
- **Başlangıç:** bar aşağıda, kollar düz
- **Tekrar:** Dirsek açısı: 150 → 70 · hedefe ulaşmazsa: "Ağırlık yeterince kaldırılmadı — kolu tam bük" · dönmezse: "Kol altta tam açılmadı — her tekrarda kolu uzat"
- **Tempo (uyarı):** hedefe gidiş ≥ 350 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsek sabit kalmadı — üst kol öne/arkaya hareket etti | **Kritik** | tekrar içindeki hareket aralığı uyarı > 14° · ret > 23° | tüm tekrar | ret: yandan |
| Dirsek sabit kalmadı — üst kol öne/arkaya hareket etti | **Kritik** | tekrar içindeki hareket aralığı uyarı > 28° · ret > 39° | tüm tekrar | önden/çapraz |
| Dirsek öne kaçtı — üst kol gövdenin yanında kalmalı | **Kritik** | uyarı > 20° · ret > 33° | tüm tekrar | ret: yandan |
| Dirsek öne kaçtı — üst kol gövdenin yanında kalmalı | **Kritik** | uyarı > 32° · ret > 45° | tüm tekrar | önden/çapraz |
| Dirsek gövdeden uzaklaştı — kol vücudun yanında olmalı | **Kritik** | uyarı > 20° · ret > 33° | tüm tekrar | ret: önden |
| Dirsek gövdeden uzaklaştı — kol vücudun yanında olmalı | **Kritik** | uyarı > 30° · ret > 43° | tüm tekrar | yandan/çapraz |
| Gövde geriye/öne sallandı — ağırlık bel ve kalçadan kaldırıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 5° · ret > 10° | tüm tekrar | ret: yandan |
| Gövde başlangıçtaki dik duruştan öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı > 7° · ret > 12° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | sürekli | tümü |
| Kollar eşit hareket etmiyor — bir taraf geride kaldı | **Kritik** | uyarı > 0.3 (vücut ölçeği) · ret > 0.5 (vücut ölçeği) | tüm tekrar | önden |

### 18. Çekiç Kıvırma (Hammer Curl)

- **Kamera:** önden / yandan / çapraz — Telefonu tam karşına, göğüs hizasına, 2 m uzağa koy. Omuzlar, dirsekler ve eller görünsün. Yandan da çekebilirsin.
- **Başlangıç:** kollar aşağıda düz
- **Tekrar:** Dirsek açısı: 150 → 75 · hedefe ulaşmazsa: "Ağırlık yeterince kaldırılmadı — kolu tam bük" · dönmezse: "Kol altta tam açılmadı — her tekrarda kolu uzat"
- **Tempo (uyarı):** hedefe gidiş ≥ 350 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsek sabit kalmadı — üst kol öne/arkaya hareket etti | **Kritik** | tekrar içindeki hareket aralığı uyarı > 14° · ret > 23° | tüm tekrar | ret: yandan |
| Dirsek sabit kalmadı — üst kol öne/arkaya hareket etti | **Kritik** | tekrar içindeki hareket aralığı uyarı > 28° · ret > 39° | tüm tekrar | önden/çapraz |
| Dirsek öne kaçtı — üst kol gövdenin yanında kalmalı | **Kritik** | uyarı > 20° · ret > 33° | tüm tekrar | ret: yandan |
| Dirsek öne kaçtı — üst kol gövdenin yanında kalmalı | **Kritik** | uyarı > 32° · ret > 45° | tüm tekrar | önden/çapraz |
| Dirsek gövdeden uzaklaştı — kol vücudun yanında olmalı | **Kritik** | uyarı > 20° · ret > 33° | tüm tekrar | ret: önden |
| Dirsek gövdeden uzaklaştı — kol vücudun yanında olmalı | **Kritik** | uyarı > 30° · ret > 43° | tüm tekrar | yandan/çapraz |
| Gövde geriye/öne sallandı — ağırlık bel ve kalçadan kaldırıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 5° · ret > 10° | tüm tekrar | ret: yandan |
| Gövde başlangıçtaki dik duruştan öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı > 7° · ret > 12° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | sürekli | tümü |

### 19. Kablo Biceps Kıvırma (Cable Curl)

- **Kamera:** yandan / çapraz — Kablo karşında olduğu için telefonu tam yanına veya ön-arka çaprazına (~45°), göğüs hizasına koy. Omuz, dirsek, bilek ve kalça görünsün.
- **Başlangıç:** kollar aşağıda düz
- **Tekrar:** Dirsek açısı: 150 → 70 · hedefe ulaşmazsa: "Ağırlık yeterince kaldırılmadı — kolu tam bük" · dönmezse: "Kol altta tam açılmadı — her tekrarda kolu uzat"
- **Tempo (uyarı):** hedefe gidiş ≥ 350 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsek sabit kalmadı — üst kol öne/arkaya hareket etti | **Kritik** | tekrar içindeki hareket aralığı uyarı > 14° · ret > 23° | tüm tekrar | ret: yandan |
| Dirsek sabit kalmadı — üst kol öne/arkaya hareket etti | **Kritik** | tekrar içindeki hareket aralığı uyarı > 28° · ret > 39° | tüm tekrar | önden/çapraz |
| Dirsek öne kaçtı — üst kol gövdenin yanında kalmalı | **Kritik** | uyarı > 20° · ret > 33° | tüm tekrar | ret: yandan |
| Dirsek öne kaçtı — üst kol gövdenin yanında kalmalı | **Kritik** | uyarı > 32° · ret > 45° | tüm tekrar | önden/çapraz |
| Dirsek gövdeden uzaklaştı — kol vücudun yanında olmalı | **Kritik** | uyarı > 20° · ret > 33° | tüm tekrar | ret: önden |
| Dirsek gövdeden uzaklaştı — kol vücudun yanında olmalı | **Kritik** | uyarı > 30° · ret > 43° | tüm tekrar | yandan/çapraz |
| Gövde geriye/öne sallandı — ağırlık bel ve kalçadan kaldırıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 5° · ret > 10° | tüm tekrar | ret: yandan |
| Gövde başlangıçtaki dik duruştan öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı > 7° · ret > 12° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | sürekli | tümü |

## Triceps

### 20. Kablo Triceps İtiş (Cable Pushdown)

- **Kamera:** çapraz / yandan — Telefonu ön-arka çaprazına (yan tarafında ~45° önünde veya arkasında), göğüs hizasına koy. Önden koyma: dirseğini göremez. Omuz, dirsek, bilek ve kalça görünsün.
- **Başlangıç:** dirsekler 90° bükülü, ön kol yere paralel
- **Tekrar:** Dirsek açısı: 85 → 160 · hedefe ulaşmazsa: "Kollar altta tam kilitlenmedi — dirseği tamamen aç" · dönmezse: "Yukarıda ön kol yere paralel olana kadar dönülmedi"
- **Tempo (uyarı):** dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsek sabit kalmadı — üst kol gövdenin yanında kilitli olmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 14° · ret > 24° | tüm tekrar | ret: yandan |
| Dirsek sabit kalmadı — üst kol gövdenin yanında kilitli olmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 28° · ret > 40° | tüm tekrar | önden/çapraz |
| Dirsekler öne kaçtı — omuz ve sırt devreye girdi | **Kritik** | uyarı > 25° · ret > 38° | tüm tekrar | ret: yandan |
| Dirsekler öne kaçtı — omuz ve sırt devreye girdi | **Kritik** | uyarı > 37° · ret > 50° | tüm tekrar | önden/çapraz |
| Dirsekler yana açıldı — gövdene yakın tut | **Kritik** | uyarı > 25° · ret > 38° | tüm tekrar | ret: önden |
| Dirsekler yana açıldı — gövdene yakın tut | **Kritik** | uyarı > 35° · ret > 48° | tüm tekrar | yandan/çapraz |
| Öne fazla eğildin — gövde en fazla hafif (10-20°) eğik olmalı | **Kritik** | uyarı > 25° · ret > 40° | tüm tekrar | ret: yandan |
| Gövdeyle bastırıldı — vücut ağırlığı kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | ret: yandan |
| Gövde başlangıç duruşundan öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı > 8° · ret > 14° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | sürekli | tümü |

### 21. Baş Üstü Triceps Açış (Overhead Triceps Extension)

- **Kamera:** çapraz / yandan — Telefonu ön-arka çaprazına (~45°), omuz hizasına koy. Kollar yukarıdayken eller kadrajda kalsın.
- **Başlangıç:** kollar baş üstünde düz
- **Tekrar:** Dirsek açısı: 160 → 90 · hedefe ulaşmazsa: "Ağırlık başın arkasına yeterince indirilmedi (dirsek ~90°)" · dönmezse: "Kollar yukarıda tam açılmadı"
- **Tempo (uyarı):** hedefe gidiş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsekler öne düştü — üst kol başın yanında dik kalmalı | **Kritik** | uyarı < 145° · ret < 130° | tüm tekrar | tümü |
| Dirsek sabit kalmadı — üst kol öne/arkaya hareket etti | **Kritik** | tekrar içindeki hareket aralığı uyarı > 14° · ret > 24° | tüm tekrar | tümü |
| Dirsekler yana açıldı — başına yakın tut | **Kritik** | uyarı > 0.42 (vücut ölçeği) · ret > 0.62 (vücut ölçeği) | tüm tekrar | önden |
| Bel aşırı büküldü — karnını sık | **Kritik** | tekrar başına göre değişim uyarı < -7° · ret < -13° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.12 (vücut ölçeği) · ret > 0.2 (vücut ölçeği) | tüm tekrar | tümü |

### 22. Sehpa Dip (Bench Dip)

- **Kamera:** yandan — Telefonu tam yanına, sehpa yüksekliğine koy. Omuz, dirsek, bilek ve kalça görünsün.
- **Başlangıç:** kollar düz, eller sehpada
- **Tekrar:** Dirsek açısı: 160 → 95 · hedefe ulaşmazsa: "Yeterince inilmedi — dirsekler 90° bükülmeli" · dönmezse: "Kollar yukarıda tam açılmadı"
- **Tempo (uyarı):** hedefe gidiş ≥ 500 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Çok derine inildi — omuz önü zorlanır | **Kritik** | uyarı < 75° · ret < 60° | tepe/dip noktası | tümü |
| Gövde öne eğildi — sırtın sehpaya yakın ve dik olmalı | **Kritik** | uyarı > 25° · ret > 40° | tüm tekrar | ret: yandan |
| Altta omuzlar kulağa çöktü | **Kritik** | uyarı > 0.13 (vücut ölçeği) · ret > 0.21 (vücut ölçeği) | tepe/dip noktası, dönüşte | tümü |
| Kalça sehpadan uzaklaştı — vücudunu sehpaya yakın tut | Uyarı | uyarı < -0.8 (vücut ölçeği) | tüm tekrar | yandan |

### 23. Dar Tutuş Bench Press (Close Grip Bench Press)

- **Kamera:** yandan — Telefonu sehpanın tam yanına, sehpa yüksekliğine, 2-3 m uzağa koy.
- **Başlangıç:** kollar yukarıda düz
- **Tekrar:** Bar/bilek yüksekliği: 1.6 → 0.6 · hedefe ulaşmazsa: "Bar göğse kadar indirilmedi" · dönmezse: "Kollar yukarıda tam açılmadı (kilitlenmedi)"
- **Tempo (uyarı):** hedefe gidiş ≥ 650 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsekler açıldı — dar tutuşta dirsekler gövdeye yakın olmalı | **Kritik** | uyarı > 50° · ret > 65° | tepe/dip noktası | ret: yandan |
| Bilekler dirseklerin üstünde değil — ön kol dik olmalı | **Kritik** | uyarı > 20° · ret > 35° | tepe/dip noktası, dönüşte | yandan |
| Bar boyuna/üst göğse iniyor — meme ucu hizasına indir | Uyarı | uyarı < 0.1 (vücut ölçeği) | tepe/dip noktası | yandan |
| Bar karına doğru iniyor — göğüs ortasına indir | Uyarı | uyarı > 1.25 (vücut ölçeği) | tepe/dip noktası | yandan |
| Kalça sehpadan kalktı | **Kritik** | tekrar başına göre değişim uyarı > 0.25 (vücut ölçeği) · ret > 0.4 (vücut ölçeği) | tüm tekrar | ret: yandan |
| Omuzlar kulağa kaydı — kürek kemiklerini geri ve aşağı sabitle | **Kritik** | uyarı > 0.11 (vücut ölçeği) · ret > 0.18 (vücut ölçeği) | tüm tekrar | tümü |
| Omuzlar öne yuvarlandı — göğsünü öne çıkar, kürek kemiklerini geri al | Uyarı | kalibrasyona göre uyarı > 0.18 (vücut ölçeği) | tüm tekrar | yandan |

## Bacak

### 24. Çömelme (Squat)

- **Kamera:** yandan / önden — Telefonu tam yanına, diz hizasına, 3 m uzağa koy; baştan ayağa tüm vücut kadrajda olsun. Önden çekersen dizlerin içe kaçması ölçülür.
- **Başlangıç:** dik dur
- **Tekrar:** Diz açısı: 165 → 100 · hedefe ulaşmazsa: "Yeterince derine inilmedi — uyluk yere paralel olmalı" · dönmezse: "Tam ayağa kalkılmadı — kalça ve diz kilitlenmeli"
- **Tempo (uyarı):** hedefe gidiş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Gövde fazla öne eğildi — göğsünü dik tut | **Kritik** | uyarı > 50° · ret > 65° | tepe/dip noktası, dönüşte | ret: yandan |
| Kalkarken kalça önden yükseldi, göğüs düştü | **Kritik** | tekrar başına göre değişim uyarı > 15° · ret > 25° | dönüşte | ret: yandan |
| Topuklar yerden kalktı — ağırlık topuk ve orta ayakta olmalı | **Kritik** | kalibrasyona göre uyarı > 8° · ret > 15° | tüm tekrar | yandan/çapraz |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı > 0.12 (vücut ölçeği) · ret > 0.22 (vücut ölçeği) | tepe/dip noktası, dönüşte | önden/çapraz |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı < 0.85 (vücut ölçeği) · ret < 0.72 (vücut ölçeği) | tepe/dip noktası, dönüşte | önden/çapraz |
| Ayaklar fazla bitişik — omuz genişliğinde aç | Uyarı | uyarı < 0.8 (vücut ölçeği) | sürekli | önden |
| Ayaklar fazla açık | Uyarı | uyarı > 2.1 (vücut ölçeği) | sürekli | önden |
| Ayaklar aynı hizada değil — bir ayak önde/geride | Uyarı | uyarı > 0.3 (vücut ölçeği) | sürekli | önden |
| Gövde bir tarafa kaydı — ağırlığı iki bacağa eşit dağıt | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 10° | tüm tekrar | önden |
| Diz ayak ucunun çok önüne geçti — kalçayı geriye gönder | Uyarı | uyarı > 0.6 (vücut ölçeği) | tepe/dip noktası | yandan |

### 25. Bacak Press (Leg Press)

- **Kamera:** yandan / önden — Telefonu makinenin tam yanına, diz hizasına koy. Kalça, diz ve ayak bileği görünsün.
- **Başlangıç:** bacaklar açık (kilitlemeden)
- **Tekrar:** Diz açısı: 155 → 95 · hedefe ulaşmazsa: "Ağırlık yeterince indirilmedi — dizler 90°" · dönmezse: "Bacaklar tam açılmadı"
- **Tempo (uyarı):** hedefe gidiş ≥ 650 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dizler tamamen kilitlendi — hafif bükük bırak | Uyarı | uyarı > 177° | tüm tekrar | yandan |
| Çok derine inildi — kalça/bel pedden kalkıyor | **Kritik** | uyarı < 55° · ret < 45° | tepe/dip noktası | yandan |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı > 0.12 (vücut ölçeği) · ret > 0.22 (vücut ölçeği) | tepe/dip noktası, dönüşte | önden/çapraz |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı < 0.85 (vücut ölçeği) · ret < 0.72 (vücut ölçeği) | tepe/dip noktası, dönüşte | önden/çapraz |
| Ayaklar aynı hizada değil — bir ayak önde/geride | Uyarı | uyarı > 0.3 (vücut ölçeği) | sürekli | önden |

### 26. Bacak Açma (Leg Extension)

- **Kamera:** yandan — Telefonu makinenin tam yanına, diz hizasına koy. Kalça, diz ve ayak bileği görünsün.
- **Başlangıç:** dizler 90° bükülü
- **Tekrar:** Diz açısı: 95 → 160 · hedefe ulaşmazsa: "Bacak tam uzatılmadı" · dönmezse: "Ağırlık başlangıca kadar indirilmedi"
- **Tempo (uyarı):** hedefe gidiş ≥ 400 ms, dönüş ≥ 700 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kalça koltuktan kalktı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 12° · ret > 20° | tüm tekrar | tümü |
| Gövdeyle sallanarak kaldırıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8° · ret > 15° | tüm tekrar | ret: yandan |

### 27. Bacak Bükme (Leg Curl)

- **Kamera:** yandan — Telefonu makinenin tam yanına, makine hizasına koy. Kalça, diz ve ayak bileği görünsün.
- **Başlangıç:** bacaklar düz
- **Tekrar:** Diz açısı: 160 → 85 · hedefe ulaşmazsa: "Topuklar kalçaya yeterince yaklaşmadı" · dönmezse: "Bacaklar tam açılmadı"
- **Tempo (uyarı):** dönüş ≥ 700 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kalça pedden kalktı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 12° · ret > 20° | tüm tekrar | tümü |

### 28. Baldır Yükseltme (Calf Raise)

- **Kamera:** yandan — Telefonu tam yanına, yere yakın (diz altı hizada) koy. Dizler ve ayaklar net görünsün.
- **Başlangıç:** topuklar aşağıda
- **Tekrar:** Topuk yüksekliği: 0.02 → 0.2 · hedefe ulaşmazsa: "Topuklar yeterince yükseltilmedi" · dönmezse: "Topuklar tam indirilmedi"
- **Tempo (uyarı):** dönüş ≥ 500 ms, tepede bekleme ≥ 250 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dizler bükülerek yaylanıldı — itiş baldırdan olmalı | **Kritik** | uyarı < 155° · ret < 140° | tüm tekrar | tümü |
| Gövde ileri-geri sallandı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8° · ret > 15° | tüm tekrar | ret: yandan |

### 29. Yürüyen Hamle (Walking Lunge)

- **Kamera:** yandan — Telefonu yürüme hattının yanına, 3-4 m uzağa, diz hizasına koy; baştan ayağa tüm vücut kadrajda olsun.
- **Başlangıç:** dik dur
- **Tekrar:** Öndeki diz açısı: 160 → 100 · hedefe ulaşmazsa: "Yeterince inilmedi — öndeki diz 90° olmalı" · dönmezse: "Adım sonunda tam dikleşilmedi"
- **Tempo (uyarı):** hedefe gidiş ≥ 500 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Gövde öne eğildi — dik dur | **Kritik** | uyarı > 20° · ret > 35° | tüm tekrar | ret: yandan |
| Arka diz yere yaklaşmadı — daha derine in | Uyarı | fazdaki en iyi değer uyarı > 120° | tepe/dip noktası | tümü |
| Diz ayak ucunun çok önüne geçti — kalçayı geriye gönder | Uyarı | uyarı > 0.7 (vücut ölçeği) | tepe/dip noktası | yandan |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı > 0.14 (vücut ölçeği) · ret > 0.24 (vücut ölçeği) | tepe/dip noktası, dönüşte | önden/çapraz |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı < 0.85 (vücut ölçeği) · ret < 0.72 (vücut ölçeği) | tepe/dip noktası, dönüşte | önden/çapraz |

## Karın

### 30. Mekik Kıvırma (Crunch)

- **Kamera:** yandan — Telefonu yere, vücudunun tam yanına koy. Baş, omuz, kalça ve diz görünsün.
- **Başlangıç:** sırt yerde
- **Tekrar:** Gövde kalkışı: 85 → 62 · hedefe ulaşmazsa: "Omuzlar yerden yeterince kaldırılmadı" · dönmezse: "Sırt yere tam inmedi"
- **Tempo (uyarı):** dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Başını elinle çektin — çene ile göğüs arasında yumruk mesafesi bırak | **Kritik** | uyarı > 40° · ret > 55° | tüm tekrar | tümü |
| Bacaklar hareket etti | Uyarı | tekrar içindeki hareket aralığı uyarı > 0.35 (vücut ölçeği) | tüm tekrar | tümü |

### 31. Ön Plank (Plank)

- **Kamera:** yandan — Telefonu yere, vücudunun tam yanına, 2-3 m uzağa koy; baştan ayağa tüm vücut kadrajda olsun.
- **Başlangıç:** plank pozisyonu
- **Mod:** süre tutma (form bozulunca süre durur, olay listeye yazılır)

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kalça çöktü — omuz, kalça ve ayak bileği düz bir çizgide olmalı | **Kritik** | uyarı > 8° · ret > 15° | sürekli | ret: yandan |
| Kalça fazla yukarıda — vücudu düz tut | **Kritik** | uyarı < -12° · ret < -22° | sürekli | ret: yandan |
| Dirsekler omuzların altında değil | Uyarı | uyarı > 25° | sürekli | tümü |
| Baş gövde hizasından çıktı — boynunu nötr tut | Uyarı | uyarı > 30° | sürekli | ret: yandan |
| Omuzlar kulağa doğru kalktı — omuzlarını kulaklarından uzaklaştır | **Kritik** | uyarı > 0.12 (vücut ölçeği) · ret > 0.2 (vücut ölçeği) | sürekli | tümü |

### 32. Bacak Kaldırma (Leg Raise)

- **Kamera:** yandan — Telefonu yere, vücudunun tam yanına, 2-3 m uzağa koy; baştan ayağa tüm vücut kadrajda olsun.
- **Başlangıç:** bacaklar yerde düz
- **Tekrar:** Bacak-gövde açısı: 165 → 100 · hedefe ulaşmazsa: "Bacaklar yeterince kaldırılmadı (dik olmalı)" · dönmezse: "Bacaklar aşağı tam indirilmedi"
- **Tempo (uyarı):** dönüş ≥ 800 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dizler fazla bükülüyor | **Kritik** | uyarı < 145° · ret < 120° | tüm tekrar | tümü |
| Gövde/sırt yerden kalktı — bel yere bastırılmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 10° · ret > 18° | tüm tekrar | tümü |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.12 (vücut ölçeği) · ret > 0.2 (vücut ölçeği) | tüm tekrar | tümü |

### 33. Kabloyla Karın Kıvırma (Cable Crunch)

- **Kamera:** yandan — Kablo karşında olduğu için telefonu tam yanına, diz-kalça hizasına koy. Dizler, kalça ve baş görünsün.
- **Başlangıç:** dizler yerde, gövde dik
- **Tekrar:** Gövde kıvrılması: 25 → 60 · hedefe ulaşmazsa: "Gövde yeterince kıvrılmadı" · dönmezse: "Başlangıca tam dönülmedi"
- **Tempo (uyarı):** dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kalça geriye/aşağı oturdu — hareketi karınla yap | **Kritik** | tekrar içindeki hareket aralığı uyarı > 12° · ret > 20° | tüm tekrar | tümü |

## Kalça

### 34. Kalça İtişi (Hip Thrust)

- **Kamera:** yandan — Telefonu tam yanına, kalça hizasına koy. Omuz, kalça ve diz görünsün.
- **Başlangıç:** kalça aşağıda
- **Tekrar:** Kalça açısı: 115 → 165 · hedefe ulaşmazsa: "Kalça tam kilitlenmedi — omuz-kalça-diz düz olmalı" · dönmezse: "Kalça yeterince indirilmedi"
- **Tempo (uyarı):** dönüş ≥ 500 ms, tepede bekleme ≥ 300 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Tepede bel aşırı büküldü — kalçayı sık, kaburgaları indir | **Kritik** | uyarı > 12° · ret > 20° | tepe/dip noktası | ret: yandan |
| Ayaklar kalçaya çok yakın — tepede diz 90° olmalı | Uyarı | uyarı < 70° | tepe/dip noktası | yandan |
| Ayaklar çok önde — tepede diz 90° olmalı | Uyarı | uyarı > 115° | tepe/dip noktası | yandan |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı > 0.14 (vücut ölçeği) · ret > 0.24 (vücut ölçeği) | tüm tekrar | önden/çapraz |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı < 0.85 (vücut ölçeği) · ret < 0.72 (vücut ölçeği) | tüm tekrar | önden/çapraz |

### 35. Kalça Köprüsü (Glute Bridge)

- **Kamera:** yandan — Telefonu yere, tam yanına koy. Omuz, kalça ve diz görünsün.
- **Başlangıç:** sırt yerde, dizler bükülü
- **Tekrar:** Kalça açısı: 125 → 162 · hedefe ulaşmazsa: "Kalça yeterince kaldırılmadı" · dönmezse: "Kalça yere indirilmedi"
- **Tempo (uyarı):** dönüş ≥ 500 ms, tepede bekleme ≥ 300 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Bel aşırı büküldü — hareketi kalçayla yap | **Kritik** | uyarı > 12° · ret > 20° | tepe/dip noktası | ret: yandan |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı > 0.14 (vücut ölçeği) · ret > 0.24 (vücut ölçeği) | tüm tekrar | önden/çapraz |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı < 0.85 (vücut ölçeği) · ret < 0.72 (vücut ölçeği) | tüm tekrar | önden/çapraz |

### 36. Kabloyla Kalça İtişi (Cable Kickback)

- **Kamera:** yandan — Kablo karşında olduğu için telefonu tam yanına, çalışan bacak tarafına, kalça hizasına koy.
- **Başlangıç:** bacak aşağıda
- **Tekrar:** Bacağın geriye açılması: 0 → 25 · hedefe ulaşmazsa: "Bacak yeterince geriye itilmedi" · dönmezse: "Bacak başlangıca dönmedi"
- **Tempo (uyarı):** hedefe gidiş ≥ 350 ms, dönüş ≥ 500 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Gövde/bel hareket etti — bacak gövde sallanmadan itilmeli | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8° · ret > 14° | tüm tekrar | ret: yandan |
| Diz açısı değişti | Uyarı | tekrar içindeki hareket aralığı uyarı > 25° | tüm tekrar | tümü |

### 37. Romen Deadlift (Romanian Deadlift)

- **Kamera:** yandan — Telefonu tam yanına, kalça hizasına, 3 m uzağa koy; baştan ayağa tüm vücut kadrajda olsun.
- **Başlangıç:** dik dur, bar uyluk önünde
- **Tekrar:** Kalça açısı: 165 → 110 · hedefe ulaşmazsa: "Yeterince eğilinmedi — kalçayı geriye it" · dönmezse: "Tam dikleşilmedi — kalçayı kilitle"
- **Tempo (uyarı):** hedefe gidiş ≥ 700 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dizler fazla büküldü — hareket squat’a döndü | **Kritik** | uyarı < 140° · ret < 125° | tüm tekrar | yandan |
| Bar bacaklardan uzaklaştı — bacaklara sürterek in | **Kritik** | uyarı > 0.6 (vücut ölçeği) · ret > 0.9 (vücut ölçeği) | tepe/dip noktası, dönüşte | yandan |
| Kalça geriye itilmedi — yalnızca öne eğildin | Uyarı | fazdaki en iyi değer tekrar başına göre değişim uyarı > -0.15 (vücut ölçeği) | tepe/dip noktası | tümü |
| Baş gövde hizasından çıktı — boynunu nötr tut | Uyarı | uyarı > 40° | tüm tekrar | ret: yandan |

## Kardiyo

### 38. Koşu Bandı (Treadmill)

- **Kamera:** yandan — Telefonu bandın tam yanına, 2-3 m uzağa koy; baştan ayağa tüm vücut kadrajda olsun.
- **Başlangıç:** yürü/koş
- **Tekrar:** Adım: -0.3 → 0.3 (döngü sayımı, açıklık ret sebebi değil)

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Öne fazla eğiliyorsun — dik koş | Uyarı | uyarı > 15° | sürekli | ret: yandan |
| Ayak kalçanın çok önüne basıyor — adımını kısalt | Uyarı | uyarı > 0.5 (vücut ölçeği) | sürekli | tümü |

### 39. Eliptik Bisiklet (Elliptical Trainer)

- **Kamera:** yandan — Telefonu aletin tam yanına koy; baştan ayağa tüm vücut kadrajda olsun.
- **Başlangıç:** pedal çevir
- **Tekrar:** Diz açısı: 150 → 125 (döngü sayımı, açıklık ret sebebi değil)

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Öne eğiliyorsun — dik dur | Uyarı | uyarı > 15° | sürekli | ret: yandan |

### 40. Kondisyon Bisikleti (Stationary Bike)

- **Kamera:** yandan — Telefonu bisikletin tam yanına koy. Kalça, diz ve ayak görünsün.
- **Başlangıç:** pedal çevir
- **Tekrar:** Diz açısı: 135 → 95 (döngü sayımı, açıklık ret sebebi değil)

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Sele yüksek — alt noktada diz hafif (25-35°) bükülü kalmalı | Uyarı | uyarı > 160° | sürekli | yandan |
| Gövde fazla öne eğik | Uyarı | uyarı > 50° | sürekli | ret: yandan |

### 41. Kürek Makinesi (Rowing Machine)

- **Kamera:** yandan — Telefonu makinenin tam yanına, 3 m uzağa koy; baştan ayağa tüm vücut kadrajda olsun.
- **Başlangıç:** dizler bükülü, kollar önde (catch)
- **Tekrar:** Diz açısı: 75 → 155 · hedefe ulaşmazsa: "Bacaklar tam itilmedi" · dönmezse: "Başlangıç pozisyonuna (catch) dönülmedi"

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Bitişte fazla geriye yattın (saat 11 yeterli) | Uyarı | uyarı < -35° | tepe/dip noktası | ret: yandan |
| Kollar bacaklar açılmadan bükülmeye başladı | Uyarı | uyarı > 0.5 (vücut ölçeği) | hedefe giderken | tümü |

## Tüm vücut

### 42. Burpee (Burpee)

- **Kamera:** yandan — Telefonu tam yanına, 3-4 m uzağa koy; ayakta ve yerde baştan ayağa tüm vücut kadrajda olsun.
- **Başlangıç:** dik dur
- **Tekrar:** Gövde yatıklığı: 15 → 65 · hedefe ulaşmazsa: "Plank pozisyonuna inilmedi" · dönmezse: "Tam ayağa kalkılmadı"

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kalça çöktü — omuz, kalça ve ayak bileği düz bir çizgide olmalı | **Kritik** | uyarı > 12° · ret > 22° | tepe/dip noktası | ret: yandan |
| Kalça fazla yukarıda — vücudu düz tut | **Kritik** | uyarı < -25° · ret < -40° | tepe/dip noktası | ret: yandan |

### 43. Aç-Kapa Sıçrama (Jumping Jack)

- **Kamera:** önden — Telefonu tam karşına, 3-4 m uzağa koy; kollar yukarıda ve bacaklar açıkken baştan ayağa tüm vücut kadrajda olsun.
- **Başlangıç:** kollar yanda, ayaklar bitişik
- **Tekrar:** Kol açısı: 25 → 140 · hedefe ulaşmazsa: "Kollar baş üstüne kadar kalkmadı" · dönmezse: "Kollar yanlara tam inmedi"

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Bacaklar yeterince açılmadı | **Kritik** | fazdaki en iyi değer uyarı < 1.35 (vücut ölçeği) · ret < 1.05 (vücut ölçeği) | tepe/dip noktası | tümü |
| Kollar aynı yükseklikte değil | **Kritik** | uyarı > 20° · ret > 35° | tüm tekrar | önden |

## Göğüs

### 44. Göğüs Aşağı Eğimli Bench Press (Decline Bench Press)

- **Kamera:** yandan — Telefonu sehpanın tam yanına, sehpa yüksekliğine, 2-3 m uzağa koy. Baş, omuz, dirsek, bilek ve kalça görünsün.
- **Başlangıç:** kollar yukarıda düz
- **Tekrar:** Bar/bilek yüksekliği: 1.6 → 0.6 · hedefe ulaşmazsa: "Bar göğse kadar indirilmedi" · dönmezse: "Kollar yukarıda tam açılmadı (kilitlenmedi)"
- **Tempo (uyarı):** hedefe gidiş ≥ 650 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsekler gövdeye 90° açıldı — 45-75° arasında tut (omuz sıkışır) | **Kritik** | uyarı > 75° · ret > 85° | tepe/dip noktası | ret: yandan |
| Dirsekler gövdeye fazla yapışık | Uyarı | uyarı < 20° | tepe/dip noktası | ret: yandan |
| Bilekler dirseklerin üstünde değil — ön kol dik olmalı | **Kritik** | uyarı > 20° · ret > 35° | tepe/dip noktası, dönüşte | yandan |
| Bar boyuna/üst göğse iniyor — meme ucu hizasına indir | Uyarı | uyarı < 0.25 (vücut ölçeği) | tepe/dip noktası | yandan |
| Bar karına doğru iniyor — göğüs ortasına indir | Uyarı | uyarı > 1.35 (vücut ölçeği) | tepe/dip noktası | yandan |
| Kalça sehpadan kalktı | **Kritik** | tekrar başına göre değişim uyarı > 0.25 (vücut ölçeği) · ret > 0.4 (vücut ölçeği) | tüm tekrar | ret: yandan |
| Omuzlar kulağa kaydı — kürek kemiklerini geri ve aşağı sabitle | **Kritik** | uyarı > 0.11 (vücut ölçeği) · ret > 0.18 (vücut ölçeği) | tüm tekrar | tümü |
| Omuzlar öne yuvarlandı — göğsünü öne çıkar, kürek kemiklerini geri al | Uyarı | kalibrasyona göre uyarı > 0.18 (vücut ölçeği) | tüm tekrar | yandan |

### 45. Üst Göğüs Bar Press (Incline Barbell Press)

- **Kamera:** yandan — Telefonu sehpanın tam yanına, sehpa yüksekliğine, 2-3 m uzağa koy. Baş, omuz, dirsek, bilek ve kalça görünsün.
- **Başlangıç:** kollar yukarıda düz
- **Tekrar:** Bar/bilek yüksekliği: 1.3 → 0.6 · hedefe ulaşmazsa: "Bar göğse kadar indirilmedi" · dönmezse: "Kollar yukarıda tam açılmadı (kilitlenmedi)"
- **Tempo (uyarı):** hedefe gidiş ≥ 650 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsekler gövdeye 90° açıldı — 45-75° arasında tut (omuz sıkışır) | **Kritik** | uyarı > 75° · ret > 85° | tepe/dip noktası | ret: yandan |
| Dirsekler gövdeye fazla yapışık | Uyarı | uyarı < 20° | tepe/dip noktası | ret: yandan |
| Bilekler dirseklerin üstünde değil — ön kol dik olmalı | **Kritik** | uyarı > 20° · ret > 35° | tepe/dip noktası, dönüşte | yandan |
| Bar boyuna/üst göğse iniyor — meme ucu hizasına indir | Uyarı | uyarı < 0 (vücut ölçeği) | tepe/dip noktası | yandan |
| Bar karına doğru iniyor — göğüs ortasına indir | Uyarı | uyarı > 1 (vücut ölçeği) | tepe/dip noktası | yandan |
| Kalça sehpadan kalktı | **Kritik** | tekrar başına göre değişim uyarı > 0.25 (vücut ölçeği) · ret > 0.4 (vücut ölçeği) | tüm tekrar | ret: yandan |
| Omuzlar kulağa kaydı — kürek kemiklerini geri ve aşağı sabitle | **Kritik** | uyarı > 0.11 (vücut ölçeği) · ret > 0.18 (vücut ölçeği) | tüm tekrar | tümü |
| Omuzlar öne yuvarlandı — göğsünü öne çıkar, kürek kemiklerini geri al | Uyarı | kalibrasyona göre uyarı > 0.18 (vücut ölçeği) | tüm tekrar | yandan |

### 46. Aşağıdan Yukarı Kablo Açışı (Low to High Cable Fly)

- **Kamera:** çapraz / yandan / önden — Kablo istasyonu karşında olduğu için telefonu ön-arka çapraza (yan tarafında ~45° önünde) veya tam yanına, göğüs/omuz hizasında koy. İki kol açıkken eller kadrajda kalsın.
- **Başlangıç:** kollar aşağıda ve yanlarda açık
- **Tekrar:** Kolların önde birleşmesi: 0.5 → 1.15 · hedefe ulaşmazsa: "Eller önde birleştirilmedi" · dönmezse: "Kollar başlangıca kadar açılmadı"
- **Tempo (uyarı):** dönüş ≥ 650 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsek açısı değişti — kollar hafif bükülü sabit kalmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 28° · ret > 45° | tüm tekrar | tümü |
| Eller üst göğüs hizasına kadar kaldırılmadı | Uyarı | fazdaki en iyi değer uyarı > 1.1 (vücut ölçeği) | tepe/dip noktası | tümü |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > değişken · ret > değişken | sürekli | tümü |
| Gövde öne-arkaya sallandı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | ret: yandan |
| Gövde başlangıç duruşundan öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı > 8° · ret > 14° | tüm tekrar | ret: yandan |
| Gövde öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı < -0.07 (vücut ölçeği) · ret < -0.13 (vücut ölçeği) | tüm tekrar | önden/çapraz |
| Gövde yana doğru kaydı/eğildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 5° · ret > 10° | tüm tekrar | önden |
| Dizler bükülerek yaylanıldı — bacaktan momentum alındı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 10° · ret > 18° | tüm tekrar | tümü |
| Vücut aşağı-yukarı yaylandı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 0.1 (vücut ölçeği) · ret > 0.18 (vücut ölçeği) | tüm tekrar | tümü |
| Kollar eşit hareket etmiyor — bir taraf geride kaldı | **Kritik** | uyarı > 0.35 (vücut ölçeği) · ret > 0.6 (vücut ölçeği) | tüm tekrar | önden |

### 47. Yukarıdan Aşağı Kablo Açışı (High to Low Cable Fly)

- **Kamera:** çapraz / yandan / önden — Kablo istasyonu karşında olduğu için telefonu ön-arka çapraza (yan tarafında ~45° önünde) veya tam yanına, göğüs/omuz hizasında koy. Kollar yukarıda açıkken eller kadrajda kalsın.
- **Başlangıç:** kollar yukarıda ve yanlarda açık
- **Tekrar:** Kolların önde birleşmesi: 0.5 → 1.15 · hedefe ulaşmazsa: "Eller önde birleştirilmedi" · dönmezse: "Kollar başlangıca kadar açılmadı"
- **Tempo (uyarı):** dönüş ≥ 650 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsek açısı değişti — kollar hafif bükülü sabit kalmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 20° · ret > 35° | tüm tekrar | tümü |
| Eller alt göğüs/göbek hizasına kadar indirilmedi | Uyarı | fazdaki en iyi değer uyarı < 0.9 (vücut ölçeği) | tepe/dip noktası | tümü |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | sürekli | tümü |
| Gövde ileri-geri sallandı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8° · ret > 15° | tüm tekrar | ret: yandan |
| Kollar eşit hareket etmiyor — bir taraf geride kaldı | **Kritik** | uyarı > 0.35 (vücut ölçeği) · ret > 0.6 (vücut ölçeği) | tüm tekrar | önden |

### 48. Dambıl Göğüs Açışı (Dumbbell Fly)

- **Kamera:** yandan — Telefonu sehpanın tam yanına, sehpa yüksekliğine, 2-3 m uzağa koy. Baş, omuz, dirsek, bilek ve kalça görünsün.
- **Başlangıç:** dambıllar göğüs üstünde
- **Tekrar:** Dambıl yüksekliği: 1.55 → 0.45 · hedefe ulaşmazsa: "Kollar yeterince açılmadı (göğüs gerilmedi)" · dönmezse: "Dambıllar göğüs üstünde birleştirilmedi"
- **Tempo (uyarı):** hedefe gidiş ≥ 700 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsekler büküldü — hareket press’e döndü | **Kritik** | tekrar içindeki hareket aralığı uyarı > 20° · ret > 35° | tüm tekrar | tümü |
| Dirsekler fazla bükük | **Kritik** | uyarı < 125° · ret < 105° | tüm tekrar | tümü |
| Dambıllar omuz seviyesinin altına indi — omuz zorlanır | **Kritik** | uyarı < -0.15 (vücut ölçeği) · ret < -0.4 (vücut ölçeği) | tepe/dip noktası | tümü |
| Kalça sehpadan kalktı | **Kritik** | tekrar başına göre değişim uyarı > 0.25 (vücut ölçeği) · ret > 0.4 (vücut ölçeği) | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.11 (vücut ölçeği) · ret > 0.18 (vücut ölçeği) | tüm tekrar | tümü |

### 49. Ayak Yükseltilmiş Şınav (Decline Push-Up)

- **Kamera:** yandan — Telefonu yere, vücudunun tam yanına, 2-3 m uzağa koy; baştan ayağa tüm vücut kadrajda olsun.
- **Başlangıç:** kollar düz, ayaklar yüksekte
- **Tekrar:** Omuz yüksekliği: 1.35 → 0.95 · hedefe ulaşmazsa: "Yeterince inilmedi — göğsünü biraz daha indir" · dönmezse: "Kollar yukarıda tam açılmadı"
- **Tempo (uyarı):** hedefe gidiş ≥ 300 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kalça çöktü — omuz, kalça ve ayak bileği düz bir çizgide olmalı | **Kritik** | uyarı > 15° · ret > 26° | tüm tekrar | ret: yandan |
| Kalça fazla yukarıda — vücudu düz tut | **Kritik** | uyarı < -20° · ret < -34° | tüm tekrar | ret: yandan |
| Dirsekler gövdeye 90° açıldı | **Kritik** | uyarı > 80° · ret > 95° | tepe/dip noktası | ret: yandan |
| Baş gövde hizasından çıktı — boynunu nötr tut | Uyarı | uyarı > 45° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı — kürek kemiklerini aşağı tut | **Kritik** | uyarı > 0.15 (vücut ölçeği) · ret > 0.25 (vücut ölçeği) | tüm tekrar | tümü |

## Triceps

### 50. İple Triceps İtiş (Rope Pushdown)

- **Kamera:** çapraz / yandan — Telefonu ön-arka çaprazına (yan tarafında ~45° önünde veya arkasında), göğüs hizasına koy. Önden koyma: dirseğini göremez.
- **Başlangıç:** dirsekler 90° bükülü
- **Tekrar:** Dirsek açısı: 85 → 162 · hedefe ulaşmazsa: "Kollar altta tam kilitlenmedi — dirseği tamamen aç" · dönmezse: "Yukarıda ön kol yere paralel olana kadar dönülmedi"
- **Tempo (uyarı):** dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsek sabit kalmadı — üst kol gövdenin yanında kilitli olmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 14° · ret > 24° | tüm tekrar | ret: yandan |
| Dirsek sabit kalmadı — üst kol gövdenin yanında kilitli olmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 28° · ret > 40° | tüm tekrar | önden/çapraz |
| Dirsekler öne kaçtı — omuz ve sırt devreye girdi | **Kritik** | uyarı > 25° · ret > 38° | tüm tekrar | ret: yandan |
| Dirsekler öne kaçtı — omuz ve sırt devreye girdi | **Kritik** | uyarı > 37° · ret > 50° | tüm tekrar | önden/çapraz |
| Dirsekler yana açıldı — gövdene yakın tut | **Kritik** | uyarı > 25° · ret > 38° | tüm tekrar | ret: önden |
| Dirsekler yana açıldı — gövdene yakın tut | **Kritik** | uyarı > 35° · ret > 48° | tüm tekrar | yandan/çapraz |
| Öne fazla eğildin — gövde en fazla hafif (10-20°) eğik olmalı | **Kritik** | uyarı > 25° · ret > 40° | tüm tekrar | ret: yandan |
| Gövdeyle bastırıldı — vücut ağırlığı kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | ret: yandan |
| Gövde başlangıç duruşundan öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı > 8° · ret > 14° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | sürekli | tümü |

### 51. Tek Kol Kablo Triceps İtiş (Single Arm Cable Pushdown)

- **Kamera:** çapraz / yandan — Telefonu çalışan kol tarafında, ön-arka çaprazına (~45°), göğüs hizasına koy.
- **Başlangıç:** dirsek 90° bükülü
- **Tekrar:** Dirsek açısı: 85 → 160 · hedefe ulaşmazsa: "Kollar altta tam kilitlenmedi — dirseği tamamen aç" · dönmezse: "Yukarıda ön kol yere paralel olana kadar dönülmedi"
- **Tempo (uyarı):** dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsek sabit kalmadı — üst kol gövdenin yanında kilitli olmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 14° · ret > 24° | tüm tekrar | ret: yandan |
| Dirsek sabit kalmadı — üst kol gövdenin yanında kilitli olmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 28° · ret > 40° | tüm tekrar | önden/çapraz |
| Dirsekler öne kaçtı — omuz ve sırt devreye girdi | **Kritik** | uyarı > 25° · ret > 38° | tüm tekrar | ret: yandan |
| Dirsekler öne kaçtı — omuz ve sırt devreye girdi | **Kritik** | uyarı > 37° · ret > 50° | tüm tekrar | önden/çapraz |
| Dirsekler yana açıldı — gövdene yakın tut | **Kritik** | uyarı > 25° · ret > 38° | tüm tekrar | ret: önden |
| Dirsekler yana açıldı — gövdene yakın tut | **Kritik** | uyarı > 35° · ret > 48° | tüm tekrar | yandan/çapraz |
| Öne fazla eğildin — gövde en fazla hafif (10-20°) eğik olmalı | **Kritik** | uyarı > 25° · ret > 40° | tüm tekrar | ret: yandan |
| Gövdeyle bastırıldı — vücut ağırlığı kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | ret: yandan |
| Gövde başlangıç duruşundan öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı > 8° · ret > 14° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | sürekli | tümü |

### 52. Yatarak Triceps Açış (Lying Triceps Extension)

- **Kamera:** yandan — Telefonu sehpanın tam yanına, sehpa yüksekliğine koy. Omuz, dirsek, bilek ve kalça görünsün.
- **Başlangıç:** kollar yukarıda düz
- **Tekrar:** Dirsek açısı: 160 → 85 · hedefe ulaşmazsa: "Ağırlık alna/başa kadar indirilmedi" · dönmezse: "Kollar yukarıda tam açılmadı"
- **Tempo (uyarı):** hedefe gidiş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Üst kol hareket etti — dirsekler tavana bakarak sabit kalmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 14° · ret > 24° | tüm tekrar | tümü |
| Dirsekler ayaklara doğru kaydı — hareket press’e döndü | **Kritik** | uyarı < 65° · ret < 50° | tüm tekrar | tümü |
| Kalça sehpadan kalktı | **Kritik** | tekrar başına göre değişim uyarı > 0.25 (vücut ölçeği) · ret > 0.4 (vücut ölçeği) | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.12 (vücut ölçeği) · ret > 0.2 (vücut ölçeği) | tüm tekrar | tümü |

### 53. Baş Üstü Kablo Triceps (Overhead Cable Extension)

- **Kamera:** çapraz / yandan — Kablo arkanda olduğu için telefonu ön çaprazına (~45°) veya tam yanına, omuz hizasına koy.
- **Başlangıç:** dirsekler bükülü, eller başın arkasında
- **Tekrar:** Dirsek açısı: 75 → 155 · hedefe ulaşmazsa: "Kollar tam açılmadı" · dönmezse: "Eller başın arkasına kadar geri gelmedi"
- **Tempo (uyarı):** dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsekler aşağı düştü — üst kol başın yanında kalmalı | **Kritik** | uyarı < 130° · ret < 115° | tüm tekrar | tümü |
| Dirsek sabit kalmadı — üst kol öne/arkaya hareket etti | **Kritik** | tekrar içindeki hareket aralığı uyarı > 14° · ret > 24° | tüm tekrar | tümü |
| Dirsekler yana açıldı | **Kritik** | uyarı > 0.42 (vücut ölçeği) · ret > 0.62 (vücut ölçeği) | tüm tekrar | önden |
| Gövde ileri-geri sallandı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8° · ret > 15° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.12 (vücut ölçeği) · ret > 0.2 (vücut ölçeği) | tüm tekrar | tümü |

### 54. Paralel Bar Dip (Parallel Bar Dip)

- **Kamera:** yandan — Telefonu tam yanına, göğüs hizasına, alt pozisyonda da dirsekler görünecek uzaklığa koy.
- **Başlangıç:** kollar düz, vücut barların üstünde
- **Tekrar:** Dirsek açısı: 160 → 95 · hedefe ulaşmazsa: "Yeterince inilmedi — üst kol yere paralel olmalı" · dönmezse: "Kollar yukarıda tam açılmadı"
- **Tempo (uyarı):** hedefe gidiş ≥ 500 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Çok derine inildi — omuz önü zorlanır | Uyarı | uyarı < 70° | tepe/dip noktası | tümü |
| Altta omuzlar kulağa çöktü | **Kritik** | uyarı > 0.13 (vücut ölçeği) · ret > 0.21 (vücut ölçeği) | tepe/dip noktası, dönüşte | tümü |
| Bacaklar savrularak itildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 0.5 (vücut ölçeği) · ret > 0.9 (vücut ölçeği) | tüm tekrar | tümü |
| Gövde fazla öne eğik (triceps yerine göğüs çalışıyor) | Uyarı | uyarı > 45° | tüm tekrar | ret: yandan |

## Sırt

### 55. Barfiks (Pull-Up)

- **Kamera:** önden / yandan — Telefonu karşına (veya arkana), bar ve eller görünecek kadar uzağa, göğüs hizasına koy.
- **Başlangıç:** kollar yukarıda düz asılı
- **Tekrar:** Çene–bar: -1.8 → 0 · hedefe ulaşmazsa: "Çene barın üstüne çıkmadı" · dönmezse: "Altta kollar tam açılmadı (ölü asılma)"
- **Tempo (uyarı):** dönüş ≥ 700 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Bacaklar/kalça savrularak çekildi (kipping) | **Kritik** | tekrar içindeki hareket aralığı uyarı > 25° · ret > 40° | tüm tekrar | tümü |
| Vücut öne-arkaya sallanarak çekildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 7° · ret > 13° | tüm tekrar | ret: yandan |
| Gövde öne/arkaya eğildi — vücut dik asılı kalmalı | **Kritik** | kalibrasyona göre uyarı > 10° · ret > 17° | tüm tekrar | ret: yandan |
| Gövde öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı < -0.09 (vücut ölçeği) · ret < -0.16 (vücut ölçeği) | tüm tekrar | önden/çapraz |
| Vücut bir yana eğildi — iki kolla eşit çek | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8° · ret > 14° | tüm tekrar | önden |
| Çekerken omuzlar kulağa kalktı — kürek kemiklerini aşağı çek | **Kritik** | uyarı > 0.06 (vücut ölçeği) · ret > 0.14 (vücut ölçeği) | tüm tekrar | tümü |

### 56. Ters Tutuş Barfiks (Chin-Up)

- **Kamera:** önden / yandan — Telefonu karşına (veya arkana), bar ve eller görünecek kadar uzağa, göğüs hizasına koy.
- **Başlangıç:** kollar yukarıda düz asılı
- **Tekrar:** Çene–bar: -1.8 → 0 · hedefe ulaşmazsa: "Çene barın üstüne çıkmadı" · dönmezse: "Altta kollar tam açılmadı"
- **Tempo (uyarı):** dönüş ≥ 700 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Bacaklar/kalça savrularak çekildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 25° · ret > 40° | tüm tekrar | tümü |
| Vücut öne-arkaya sallanarak çekildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 7° · ret > 13° | tüm tekrar | ret: yandan |
| Gövde öne/arkaya eğildi — vücut dik asılı kalmalı | **Kritik** | kalibrasyona göre uyarı > 10° · ret > 17° | tüm tekrar | ret: yandan |
| Gövde öne/arkaya eğildi | **Kritik** | kalibrasyona göre uyarı < -0.09 (vücut ölçeği) · ret < -0.16 (vücut ölçeği) | tüm tekrar | önden/çapraz |
| Gövde yana doğru kaydı/eğildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8° · ret > 14° | tüm tekrar | önden |
| Çekerken omuzlar kulağa kalktı — kürek kemiklerini aşağı çek | **Kritik** | uyarı > 0.06 (vücut ölçeği) · ret > 0.14 (vücut ölçeği) | tüm tekrar | tümü |

### 57. Göğüs Destekli Dambıl Row (Chest Supported Row)

- **Kamera:** yandan — Telefonu sehpanın tam yanına, sehpa yüksekliğine koy. Omuz, dirsek, bilek ve kalça görünsün.
- **Başlangıç:** göğüs pedde, kollar aşağıda düz
- **Tekrar:** Dirsek açısı: 155 → 100 · hedefe ulaşmazsa: "Ağırlık gövdeye kadar çekilmedi" · dönmezse: "Kollar önde tam açılmadı"
- **Tempo (uyarı):** dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Göğüs pedden kalktı — gövdeyle çekildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 5° · ret > 10° | tüm tekrar | ret: yandan |
| Göğüs pedden ayrıldı / gövde başlangıç duruşundan çıktı | **Kritik** | kalibrasyona göre uyarı > 7° · ret > 12° | tüm tekrar | ret: yandan |
| Dirsekler yana açıldı — dirsekler gövdeye yakın geriye çekilmeli | **Kritik** | uyarı > 35° · ret > 50° | tüm tekrar | tümü |
| Dirsekler gövdenin arkasına kadar çekilmedi — kürek kemiklerini sık | Uyarı | fazdaki en iyi değer uyarı > -5° | tepe/dip noktası | yandan |
| Çekerken omuzlar kulağa kalktı — kürek kemiklerini aşağı ve geri çek | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | tüm tekrar | tümü |

### 58. T-Bar Row (T-Bar Row)

- **Kamera:** yandan — Telefonu tam yanına, bel hizasına, 2-3 m uzağa koy. Baştan dizlere kadar görünsün.
- **Başlangıç:** öne eğilmiş, kollar aşağıda düz
- **Tekrar:** Dirsek açısı: 155 → 100 · hedefe ulaşmazsa: "Ağırlık gövdeye kadar çekilmedi" · dönmezse: "Kollar önde tam açılmadı"
- **Tempo (uyarı):** dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Gövde öne-arkaya sallanarak çekildi — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | ret: yandan |
| Gövdenin eğim açısı değişti — sırtı aynı açıda sabit tut | **Kritik** | kalibrasyona göre uyarı > 8° · ret > 13° | tüm tekrar | ret: yandan |
| Dirsek gövdeden uzaklaştı — kol vücudun yanında olmalı | **Kritik** | uyarı > 55° · ret > 70° | tüm tekrar | tümü |
| Gövde fazla dik — kalçadan öne eğil (gövde yere yakın) | Uyarı | uyarı < 35° | tüm tekrar | ret: yandan |
| Dirsekler gövdenin arkasına kadar çekilmedi — kürek kemiklerini sık | Uyarı | fazdaki en iyi değer uyarı > -5° | tepe/dip noktası | yandan |
| Çekerken omuzlar kulağa kalktı — kürek kemiklerini aşağı ve geri çek | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | tüm tekrar | tümü |
| Dizler fazla bükülü — dizler hafif bükük, kalça geride | Uyarı | uyarı < 120° | tüm tekrar | yandan |

## Omuz

### 59. Kabloyla Yan Omuz Açış (Cable Lateral Raise)

- **Kamera:** önden — Kamerayı tam karşına koy.
- **Başlangıç:** çalışan kol aşağıda
- **Tekrar:** Kol-gövde açısı: 20 → 75 · hedefe ulaşmazsa: "Kollar omuz hizasına kadar kaldırılmadı" · dönmezse: "Kollar aşağıya tam indirilmedi"
- **Tempo (uyarı):** hedefe gidiş ≥ 450 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kollar omuz seviyesinin üstüne çıktı | Uyarı | uyarı > 100° | tepe/dip noktası | tümü |
| Dirsekler fazla büküldü — kollar hafif bükük ve sabit olmalı | **Kritik** | uyarı < 125° · ret < 100° | tüm tekrar | tümü |
| Dirsek açısı değişti — kollar hafif bükülü sabit kalmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 30° · ret > 50° | tüm tekrar | tümü |
| Omuzlar kulağa kalktı — trapez devreye girdi | **Kritik** | uyarı > değişken · ret > değişken | sürekli | tümü |
| Gövde sallanarak kaldırıldı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 12° | tüm tekrar | ret: yandan |
| Gövde yana doğru kaydı/eğildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 11° | tüm tekrar | önden |
| Dizler bükülerek yaylanıldı — bacaktan momentum alındı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 12° · ret > 22° | tüm tekrar | tümü |
| Vücut aşağı-yukarı yaylandı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 0.12 (vücut ölçeği) · ret > 0.22 (vücut ölçeği) | tüm tekrar | tümü |
| Kollar yana değil öne doğru kalkıyor | Uyarı | uyarı < 40° | tepe/dip noktası | tümü |
| Bilekler dirseklerden yukarı çıktı — hareketi dirsekle yönet | Uyarı | uyarı > 0.3 (vücut ölçeği) | tepe/dip noktası | önden |

### 60. Öne Eğilerek Arka Omuz Açış (Bent Over Rear Delt Fly)

- **Kamera:** yandan — Kamera yanda, bel hizasında.
- **Başlangıç:** öne eğilmiş, kollar aşağıda
- **Tekrar:** Kol açılması: 1.5 → 0.4 · hedefe ulaşmazsa: "Kollar yanlara omuz hizasına kadar açılmadı" · dönmezse: "Kollar aşağı tam inmedi"
- **Tempo (uyarı):** hedefe gidiş ≥ 400 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Gövde fazla dik — öne daha çok eğil (yere yakın paralel) | Uyarı | uyarı < 45° | tüm tekrar | ret: yandan |
| Gövde kaldırılarak/sallanarak açıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8° · ret > 15° | tüm tekrar | ret: yandan |
| Dirsek açısı değişti — kollar hafif bükülü sabit kalmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 20° · ret > 35° | tüm tekrar | tümü |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | tüm tekrar | tümü |

### 61. Yana Eğilerek Omuz Açış (Leaning Lateral Raise)

- **Kamera:** önden — Kamerayı tam karşına koy; ayaklar ve kalça da görünsün (eğim açısı buradan ölçülür). Bir elinle direğe tutun, gövdeni 15-30° yana (çalışan kol tarafına) yatır.
- **Başlangıç:** gövde yana eğik (15-30°), çalışan kol aşağıda
- **Tekrar:** Kol-gövde açısı: 30 → 85 · hedefe ulaşmazsa: "Kollar omuz hizasına kadar kaldırılmadı" · dönmezse: "Kollar aşağıya tam indirilmedi"
- **Tempo (uyarı):** hedefe gidiş ≥ 450 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kollar omuz seviyesinin üstüne çıktı | Uyarı | uyarı > 115° | tepe/dip noktası | tümü |
| Dirsekler fazla büküldü — kollar hafif bükük ve sabit olmalı | **Kritik** | uyarı < 125° · ret < 100° | tüm tekrar | tümü |
| Dirsek açısı değişti — kollar hafif bükülü sabit kalmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 30° · ret > 50° | tüm tekrar | tümü |
| Omuzlar kulağa kalktı — trapez devreye girdi | **Kritik** | uyarı > değişken · ret > değişken | tüm tekrar | tümü |
| Gövde sallanarak kaldırıldı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 12° | tüm tekrar | ret: yandan |
| Dizler bükülerek yaylanıldı — bacaktan momentum alındı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 12° · ret > 22° | tüm tekrar | tümü |
| Vücut aşağı-yukarı yaylandı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 0.12 (vücut ölçeği) · ret > 0.22 (vücut ölçeği) | tüm tekrar | tümü |
| Kollar yana değil öne doğru kalkıyor | Uyarı | uyarı < 40° | tepe/dip noktası | tümü |
| Bilekler dirseklerden yukarı çıktı — hareketi dirsekle yönet | Uyarı | uyarı > 0.3 (vücut ölçeği) | tepe/dip noktası | önden |
| Gövde yana eğilmedi — hareketin amacı gövdeyi yana yatırarak yapmak | **Kritik** | uyarı < 13 (vücut ölçeği) · ret < 8 (vücut ölçeği) | tüm tekrar | önden/çapraz |
| Gövde fazla yana yatırıldı (15-30° yeterli) | Uyarı | uyarı > 40 (vücut ölçeği) | tüm tekrar | önden/çapraz |
| Eğim açısı tekrar sırasında değişti — gövdeyle sallanarak kaldırıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8 (vücut ölçeği) · ret > 14 (vücut ölçeği) | tüm tekrar | önden/çapraz |

## Biceps

### 62. Preacher Biceps Curl (Preacher Curl)

- **Kamera:** yandan — Telefonu preacher sehpasının tam yanına, sehpa hizasına koy. Omuz, dirsek ve bilek görünsün (ped dirseği kapatmasın).
- **Başlangıç:** kollar pedde, neredeyse düz
- **Tekrar:** Dirsek açısı: 145 → 65 · hedefe ulaşmazsa: "Ağırlık yeterince kaldırılmadı — kolu tam bük" · dönmezse: "Kol altta tam açılmadı — her tekrarda kolu uzat"
- **Tempo (uyarı):** hedefe gidiş ≥ 350 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Üst kol pedden kalktı / omuz öne itildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 12° · ret > 20° | tüm tekrar | tümü |
| Gövdeyle çekildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8° · ret > 14° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | sürekli | tümü |

### 63. Eğimli Sehpa Biceps Curl (Incline Dumbbell Curl)

- **Kamera:** yandan — Telefonu eğimli sehpanın tam yanına, sehpa yüksekliğine koy. Omuz, dirsek ve bilek (kol tamamen aşağı sarkarken de) görünsün.
- **Başlangıç:** kollar tamamen aşağı sarkık, düz
- **Tekrar:** Dirsek açısı: 162 → 78 · hedefe ulaşmazsa: "Ağırlık yeterince kaldırılmadı — kolu tam bük" · dönmezse: "Kol altta tamamen açılmadı — her tekrarda kolu tamamen aşağı sal"
- **Tempo (uyarı):** hedefe gidiş ≥ 350 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kol altta tamamen açılmadı — her tekrarda kolu tamamen aşağı sal | **Kritik** | fazdaki en iyi değer uyarı < 155° · ret < 145° | dönüşte | tümü |
| Dirsek öne geldi — üst kol yere dik sarkık kalmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 16° · ret > 27° | tüm tekrar | tümü |
| Sırt sehpadan kalktı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8° · ret > 15° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.12 (vücut ölçeği) · ret > 0.2 (vücut ölçeği) | tüm tekrar | tümü |

### 64. Konsantrasyon Biceps Curl (Concentration Curl)

- **Kamera:** önden / yandan / çapraz — Telefonu karşına veya yan çaprazına, oturduğun yükseklikte koy. Çalışan kolun omzu, dirseği ve eli görünsün.
- **Başlangıç:** dirsek uylukta, kol düz
- **Tekrar:** Dirsek açısı: 150 → 70 · hedefe ulaşmazsa: "Ağırlık yeterince kaldırılmadı — kolu tam bük" · dönmezse: "Kol altta tam açılmadı — her tekrarda kolu uzat"
- **Tempo (uyarı):** hedefe gidiş ≥ 350 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsek uyluktan kaydı — dirsek sabit kalmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 10° · ret > 18° | tüm tekrar | tümü |
| Gövde kaldırılarak çekildi | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8° · ret > 15° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | sürekli | tümü |

### 65. Arkadan Kablo Biceps Curl (Bayesian Cable Curl)

- **Kamera:** yandan / çapraz — Kablo arkanda olduğu için telefonu tam yanına (çalışan kol tarafına), göğüs hizasına koy.
- **Başlangıç:** kol gövdenin arkasında düz
- **Tekrar:** Dirsek açısı: 150 → 75 · hedefe ulaşmazsa: "Ağırlık yeterince kaldırılmadı — kolu tam bük" · dönmezse: "Kol altta tam açılmadı — her tekrarda kolu uzat"
- **Tempo (uyarı):** hedefe gidiş ≥ 350 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsek öne geldi — kol gövdenin arkasında sabit kalmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 12° · ret > 21° | tüm tekrar | tümü |
| Üst kol gövdenin önüne geçti | **Kritik** | uyarı > 5° · ret > 20° | tüm tekrar | ret: yandan |
| Gövde ileri-geri sallandı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 7° · ret > 13° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.1 (vücut ölçeği) · ret > 0.17 (vücut ölçeği) | sürekli | tümü |

### 66. Spider Biceps Curl (Spider Curl)

- **Kamera:** yandan — Telefonu sehpanın tam yanına, sehpa yüksekliğine koy. Omuz, dirsek ve bilek görünsün.
- **Başlangıç:** göğüs pedde, kollar aşağı sarkık
- **Tekrar:** Dirsek açısı: 150 → 70 · hedefe ulaşmazsa: "Ağırlık yeterince kaldırılmadı — kolu tam bük" · dönmezse: "Kol altta tam açılmadı — her tekrarda kolu uzat"
- **Tempo (uyarı):** hedefe gidiş ≥ 350 ms, dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Dirsek hareket etti — üst kol yere dik kalmalı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 12° · ret > 21° | tüm tekrar | tümü |
| Göğüs pedden kalktı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 12° | tüm tekrar | ret: yandan |
| Omuzlar kulağa doğru kalktı (omuz silkme) | **Kritik** | uyarı > 0.12 (vücut ölçeği) · ret > 0.2 (vücut ölçeği) | tüm tekrar | tümü |

## Bacak

### 67. Goblet Squat (Goblet Squat)

- **Kamera:** yandan / önden — Telefonu tam yanına, diz hizasına, 3 m uzağa koy; baştan ayağa tüm vücut kadrajda olsun.
- **Başlangıç:** dik dur, ağırlık göğüste
- **Tekrar:** Diz açısı: 165 → 95 · hedefe ulaşmazsa: "Yeterince derine inilmedi — uyluk yere paralel olmalı" · dönmezse: "Tam ayağa kalkılmadı — kalça ve diz kilitlenmeli"
- **Tempo (uyarı):** hedefe gidiş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Gövde fazla öne eğildi — göğsünü dik tut | **Kritik** | uyarı > 40° · ret > 55° | tepe/dip noktası, dönüşte | ret: yandan |
| Kalkarken kalça önden yükseldi, göğüs düştü | **Kritik** | tekrar başına göre değişim uyarı > 15° · ret > 25° | dönüşte | ret: yandan |
| Topuklar yerden kalktı — ağırlık topuk ve orta ayakta olmalı | **Kritik** | kalibrasyona göre uyarı > 8° · ret > 15° | tüm tekrar | yandan/çapraz |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı > 0.12 (vücut ölçeği) · ret > 0.22 (vücut ölçeği) | tepe/dip noktası, dönüşte | önden/çapraz |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı < 0.85 (vücut ölçeği) · ret < 0.72 (vücut ölçeği) | tepe/dip noktası, dönüşte | önden/çapraz |
| Ayaklar fazla bitişik — omuz genişliğinde aç | Uyarı | uyarı < 0.8 (vücut ölçeği) | sürekli | önden |
| Ayaklar fazla açık | Uyarı | uyarı > 2.1 (vücut ölçeği) | sürekli | önden |
| Ayaklar aynı hizada değil — bir ayak önde/geride | Uyarı | uyarı > 0.3 (vücut ölçeği) | sürekli | önden |
| Gövde bir tarafa kaydı — ağırlığı iki bacağa eşit dağıt | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 10° | tüm tekrar | önden |
| Diz ayak ucunun çok önüne geçti — kalçayı geriye gönder | Uyarı | uyarı > 0.6 (vücut ölçeği) | tepe/dip noktası | yandan |

### 68. Bulgar Split Squat (Bulgarian Split Squat)

- **Kamera:** yandan — Telefonu tam yanına, diz hizasına koy. İki bacak ve sehpa görünsün.
- **Başlangıç:** arka ayak sehpada, dik dur
- **Tekrar:** Öndeki diz açısı: 155 → 100 · hedefe ulaşmazsa: "Yeterince inilmedi — öndeki uyluk yere paralel olmalı" · dönmezse: "Tam dikleşilmedi"
- **Tempo (uyarı):** hedefe gidiş ≥ 550 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Gövde öne eğildi — dik dur | **Kritik** | uyarı > 35° · ret > 50° | tüm tekrar | ret: yandan |
| Arka diz yere yaklaşmadı — daha derine in | Uyarı | fazdaki en iyi değer uyarı > 120° | tepe/dip noktası | tümü |
| Diz ayak ucunun çok önüne geçti — kalçayı geriye gönder | Uyarı | uyarı > 0.7 (vücut ölçeği) | tepe/dip noktası | yandan |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı > 0.14 (vücut ölçeği) · ret > 0.24 (vücut ölçeği) | tepe/dip noktası, dönüşte | önden/çapraz |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı < 0.85 (vücut ölçeği) · ret < 0.72 (vücut ölçeği) | tepe/dip noktası, dönüşte | önden/çapraz |

### 69. Hack Squat Makinesi (Hack Squat)

- **Kamera:** yandan / önden — Telefonu makinenin tam yanına, diz hizasına koy. Kalça, diz ve ayaklar görünsün.
- **Başlangıç:** bacaklar açık (kilitlemeden)
- **Tekrar:** Diz açısı: 165 → 95 · hedefe ulaşmazsa: "Yeterince derine inilmedi — uyluk yere paralel olmalı" · dönmezse: "Tam ayağa kalkılmadı — kalça ve diz kilitlenmeli"
- **Tempo (uyarı):** hedefe gidiş ≥ 650 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Topuklar yerden kalktı — ağırlık topuk ve orta ayakta olmalı | **Kritik** | kalibrasyona göre uyarı > 8° · ret > 15° | tüm tekrar | yandan/çapraz |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı > 0.12 (vücut ölçeği) · ret > 0.22 (vücut ölçeği) | tepe/dip noktası, dönüşte | önden/çapraz |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı < 0.85 (vücut ölçeği) · ret < 0.72 (vücut ölçeği) | tepe/dip noktası, dönüşte | önden/çapraz |
| Ayaklar fazla bitişik — omuz genişliğinde aç | Uyarı | uyarı < 0.8 (vücut ölçeği) | sürekli | önden |
| Ayaklar fazla açık | Uyarı | uyarı > 2.1 (vücut ölçeği) | sürekli | önden |
| Ayaklar aynı hizada değil — bir ayak önde/geride | Uyarı | uyarı > 0.3 (vücut ölçeği) | sürekli | önden |
| Gövde bir tarafa kaydı — ağırlığı iki bacağa eşit dağıt | **Kritik** | tekrar içindeki hareket aralığı uyarı > 6° · ret > 10° | tüm tekrar | önden |
| Diz ayak ucunun çok önüne geçti — kalçayı geriye gönder | Uyarı | uyarı > 0.6 (vücut ölçeği) | tepe/dip noktası | yandan |

### 70. Yatarak Bacak Kıvırma (Lying Leg Curl)

- **Kamera:** yandan — Telefonu makinenin tam yanına, makine hizasına koy.
- **Başlangıç:** bacaklar düz
- **Tekrar:** Diz açısı: 160 → 85 · hedefe ulaşmazsa: "Topuklar kalçaya yeterince yaklaşmadı" · dönmezse: "Bacaklar tam açılmadı"
- **Tempo (uyarı):** dönüş ≥ 700 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kalça pedden kalktı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 12° · ret > 20° | tüm tekrar | tümü |

### 71. Oturarak Bacak Kıvırma (Seated Leg Curl)

- **Kamera:** yandan — Telefonu makinenin tam yanına, diz hizasına koy.
- **Başlangıç:** bacaklar önde düz
- **Tekrar:** Diz açısı: 155 → 80 · hedefe ulaşmazsa: "Bacak yeterince bükülmedi" · dönmezse: "Bacaklar tam açılmadı"
- **Tempo (uyarı):** dönüş ≥ 700 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Kalça koltuktan kalktı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 12° · ret > 20° | tüm tekrar | tümü |
| Gövde ileri-geri sallandı — momentum kullanıldı | **Kritik** | tekrar içindeki hareket aralığı uyarı > 8° · ret > 15° | tüm tekrar | ret: yandan |

### 72. Sehpaya Adım Çıkma (Step-Up)

- **Kamera:** yandan — Telefonu tam yanına, 3 m uzağa koy. Sehpa ve iki bacak görünsün.
- **Başlangıç:** bir ayak sehpada
- **Tekrar:** Çalışan diz açısı: 100 → 162 · hedefe ulaşmazsa: "Sehpanın üstünde tam dikleşilmedi" · dönmezse: "Aşağı tam inilmedi"
- **Tempo (uyarı):** dönüş ≥ 600 ms

| Kural | Tür | Eşik | Ne zaman | Açı |
|---|---|---|---|---|
| Gövde öne eğildi — dik çık | **Kritik** | uyarı > 25° · ret > 40° | tüm tekrar | ret: yandan |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı > 0.14 (vücut ölçeği) · ret > 0.24 (vücut ölçeği) | tüm tekrar | önden/çapraz |
| Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı | **Kritik** | uyarı < 0.85 (vücut ölçeği) · ret < 0.72 (vücut ölçeği) | tüm tekrar | önden/çapraz |
