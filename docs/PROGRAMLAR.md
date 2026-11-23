# Kişiye özel program üretici — kurallar ve kaynaklar

Kod: `src/program/generator.js` (üretici), `src/program/store.js` (cihazda saklama), `src/ui/profile-page.js` (Profil sekmesi).

## Girdi

Cinsiyet, yaş, boy, kilo, spor geçmişi, haftalık gün (veya "sistem önersin"), ekipman, amaç (veya "sistem önersin").
Bilgiler istenildiği zaman güncellenebilir. Program her açılışta geçmişe göre yeniden hesaplanır.

## Amaçlar (5)

| Amaç | Ana hareket tekrarı | Yardımcı hareket tekrarı | Dinlenme (ana / yardımcı) | Kardiyo |
|---|---|---|---|---|
| Kas kazanımı | 10 | 12 | 120 / 75 sn | Seviye 3'ten itibaren 2 günde 10 dk |
| Kas + kilo kazanımı | 8 | 10 | 150 / 90 sn | yok |
| Kilo alımı | 6 | 10 | 180 / 90 sn | yok. Günde en çok 5 hareket, haftada en çok 4 gün |
| Yağ yakımı | 12 | 15 | 75 / 45 sn | her gün 15–30 dk + seviye 2'den itibaren kondisyon hareketi |
| Sıkılaşma / genel form | 12 | 15 | 60 / 45 sn | her gün 10–20 dk + kondisyon hareketi |

**Sistem önersin:** VKİ < 18,5 → kas + kilo. VKİ 25–30 → yağ yakımı. VKİ ≥ 30 → yağ yakımı, eklem dostu kardiyo (bisiklet, eliptik, kürek).
55 yaş ve üstü, normal kilo → genel form. Erkekte VKİ < 21 → kas + kilo. Geri kalanlar → kas kazanımı.
Örnek: 180 cm, 50 kg, 21 yaşında erkek → VKİ 15,4 → kas + kilo kazanımı.

## Seviyeler (6)

| Seviye | Günde hareket | Set (ana / yardımcı) | Önerilen gün | Bölünme |
|---|---|---|---|---|
| 1 Başlangıç | 5 | 2 / 2 | 3 | tüm vücut |
| 2 Temel | 6 | 3 / 2 | 3 | tüm vücut |
| 3 Gelişen | 6 | 3 / 3 | 4 | üst / alt |
| 4 Orta | 7 | 4 / 3 | 4 | üst / alt (4. hafta hafif) |
| 5 İleri | 7 | 4 / 3 | 5 | üst / alt + itiş / çekiş / bacak |
| 6 Uzman | 8 | 4 / 4 | 6 | itiş / çekiş / bacak ×2 |

- Başlangıç seviyesi spor geçmişinden gelir (hiç → 1, 1–6 ay → 2, 6–12 ay → 3, 1–2 yıl → 4, 2–4 yıl → 5, 4+ yıl → 6).
- **Seviye atlama:** seviye 1 ve 2'de 4 hafta, seviye 3'te 6 hafta, seviye 4'te 8 hafta, seviye 5'te 12 hafta geçmeli. Bu sürede planlanan günlerin en az %60'ı yapılmış olmalı.
  Örnek: 1 ay düzenli giden başlangıç seviyesindeki kullanıcı seviye 2'ye geçer, program ağırlaşır.
- 4 haftadan uzun ara verilirse program bir seviye hafifler.
- Kullanıcı seviyeyi − / + ile elle de değiştirebilir.
- **4 haftalık blok:**
  - 1. hafta temel.
  - 2. hafta +1 tekrar.
  - 3. hafta +2 tekrar ve ana hareketlere +1 set.
  - 4. hafta: seviye 4 ve üstünde hafif hafta (set −1). Diğer seviyelerde +2 tekrar.

## Kadın / erkek farkı (5 × 6 × 2 = 60 temel şablon)

- Kadın: yardımcı hareketlerde +2 tekrar ve dinlenme %15 kısa. Kadınlar setler arasında daha hızlı toparlanıyor (Nuckols ve ark. 2026).
- Kadın: alt vücut ve tüm vücut günlerinde kalça hareketi öne alınır, alt vücut gününe +1 kalça hareketi eklenir. Bu yaygın bir tercihe dayanır, bilimsel zorunluluk değildir.
  Temel ilkeler iki cinsiyette aynıdır (2025 derlemesi).

## Aynı amaca hep aynı program verilmez

- Her ~4 haftalık blokta hareket varyantları değişir. Hareketler aynı kalıbın havuzundan seçilir: yatay itiş, dikey çekiş, squat, kalça menteşe vb.
- Seçim kullanıcıya özel bir tohum değerine bağlıdır. Bu yüzden iki kullanıcı aynı amacı seçse bile farklı varyantlar alabilir.
- Varyantlar seviyeye göre açılır. Örnekler: barfiks seviye 4+, bulgar split squat seviye 3+, burpee seviye 3+. Makine varyantları başlangıç seviyesinde öne çıkar.
- **Geçmişe göre:** son 30 günde bir harekette ≥ 6 denemenin %40'ı veya daha fazlası sayılmadıysa, o hareket aynı kalıbın daha kolay varyantıyla değiştirilir.
- 50 yaş üstü veya VKİ ≥ 30: zıplama ve koşu yerine bisiklet, eliptik veya kürek. Tekrar en az 10.

## Günlük program akışı (zorunlu değil)

1. Profil → "Bugünün antrenmanına başla". Sıra takvime değil son yapılan güne bağlıdır.
2. Uygulama ilk hareketin analiz ekranını açar. Set ve hedef tekrar kamera üstünde görünür.
3. Set şu durumlarda biter:
   - hedef kadar geçerli tekrar yapıldığında,
   - toplam deneme hedefe ulaştığında ve geçerli tekrar hedefin yarısından fazla olduğunda,
   - yarıdan fazla geçerli tekrardan sonra 12 sn yeni tekrar gelmediğinde,
   - "Seti bitir" butonuna basıldığında.
   Tek taraflı hareketlerde hedef her taraf içindir; sayaç iki tarafı toplar.
4. Dinlenme sayacı başlar ("Dinlenmeyi geç" ile atlanabilir). Ardından sonraki set veya sonraki hareket gelir.
5. "Hareketi geç" ile sonraki harekete geçilir. Kardiyo süreyle, plank saniyeyle tamamlanır.
6. Her set geçmişe kaydedilir. Profil → "Antrenman geçmişim" kayıtları gün gün gösterir. Programsız serbest setler de kaydedilir.

## Kaynaklar

- ACSM (2009) Progression Models in Resistance Training for Healthy Adults — acemi 2–3, orta 3–4, ileri 4–5 gün/hafta; acemide 8–12 RM. https://pubmed.ncbi.nlm.nih.gov/19204579/
- ACSM (2026) güncellemesi — her büyük kas grubunu haftada en az 2 kez çalıştır; hipertrofi için kas başına ~10+ set/hafta; uyum, programın karmaşıklığından önemli. https://acsm.org/resistance-training-guidelines-update-2026/
- Schoenfeld, Ogborn, Krieger (2016) haftalık hacim – kas kütlesi doz-yanıt meta-analizi. https://pubmed.ncbi.nlm.nih.gov/27433992/
- Baz-Valle ve ark. (2022) — antrenmanlı kişilerde kas başına 12–20 set/hafta. https://pmc.ncbi.nlm.nih.gov/articles/PMC8884877/
- Schoenfeld ve ark. (2016) antrenman sıklığı meta-analizi — haftada ≥ 2 kez, 1 kezden iyi. https://pubmed.ncbi.nlm.nih.gov/27102172/
- Schoenfeld, Grgic, Krieger (2018) — hacim eşitken sıklığın etkisi küçük. https://pubmed.ncbi.nlm.nih.gov/30558493/
- Kalori açığında direnç antrenmanı kas kaybını önler (2018 meta-analiz). https://pmc.ncbi.nlm.nih.gov/articles/PMC5946208/
- Kalori açığında kas korumada antrenman hacminin rolü. https://pmc.ncbi.nlm.nih.gov/articles/PMC9012799/
- Kilo alımı: hızlı kalori fazlası çoğunlukla yağ ekler (2023). https://link.springer.com/article/10.1186/s40798-023-00651-y
- ACSM — sağlıklı kilo alımı (~500 kcal/gün fazla + ağır direnç antrenmanı). https://www.acsm.org/healthy-weight-gain
- Sporcu ve askerlerde kilo alımı derlemesi (2022). https://pubmed.ncbi.nlm.nih.gov/35233712/
- Nuckols ve ark. (2026) — kadınlar setler arasında daha hızlı toparlanır. https://peerj.com/articles/20542
- Kadın/erkek direnç antrenmanı derlemesi (2025). https://pmc.ncbi.nlm.nih.gov/articles/PMC12421175
- Bell ve ark. (2025) hafif hafta (deload) — 4–8 haftada bir, planlı. https://shura.shu.ac.uk/35313/
- WHO (2020) — haftada 150–300 dk orta şiddetli aerobik + ≥ 2 gün kas güçlendirme. https://www.who.int/europe/news-room/fact-sheets/item/physical-activity

**Sınır:** Program genel sağlıklı yetişkinler içindir. Sağlık sorunu, sakatlık veya hamilelik varsa önce hekime danışılmalıdır.
