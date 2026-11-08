// Kamera yerleşimi (omuz hareketleri HARİÇ — onlar kendi tanımlarında kalır).
// view: ölçümün en doğru olduğu açı; viewAlt: kabul edilen diğer açılar.
//   'front'   = tam karşıdan (telefon önünde)
//   'side'    = tam yandan (90°)
//   'oblique' = ön-arka çapraz (~45°, önünde ya da arkanda, yan tarafa doğru)
// setup: kullanıcıya gösterilen talimat. cameraFix: bir uzuv görünmediğinde ekranda (sessiz) önerilen düzeltme.
const H_CHEST = 'göğüs/omuz hizasında';
const FULL = 'baştan ayağa tüm vücut kadrajda olsun';

export const CAMERA = {
  // ======================= GÖĞÜS
  'bench-press': { view: 'side', setup: `Telefonu sehpanın tam yanına, sehpa yüksekliğine, 2-3 m uzağa koy. Baş, omuz, dirsek, bilek ve kalça görünsün.`, cameraFix: 'Telefonu sehpanın tam yanına al ve biraz uzaklaştır.' },
  'incline-dumbbell-press': { view: 'side', setup: `Telefonu eğimli sehpanın tam yanına, sehpa yüksekliğine, 2-3 m uzağa koy. Baş, omuz, dirsek, bilek ve kalça görünsün.`, cameraFix: 'Telefonu sehpanın tam yanına al ve biraz uzaklaştır.' },
  'chest-press': { view: 'side', setup: `Telefonu makinenin tam yanına, ${H_CHEST}, kameraya yakın kolun makine kolunun önünde kalacağı tarafa koy. Baş, omuz, kalça ve kameraya yakın kol görünsün.`, cameraFix: 'Telefonu makinenin diğer yanına veya biraz öne al (yakın kol makineye takılmasın).' },
  'pec-deck-fly': { view: 'side', viewAlt: ['oblique'], setup: `Telefonu makinenin yanına veya hafif yan çaprazına (~30°), ${H_CHEST} koy. Baş, omuz, dirsek ve kalça görünsün.`, cameraFix: 'Telefonu biraz öne, yan çapraza al.' },
  'push-up': { view: 'side', setup: `Telefonu yere, vücudunun tam yanına, 2-3 m uzağa koy; ${FULL}.`, cameraFix: 'Telefonu biraz uzaklaştır, tam yanına al.' },
  'decline-bench-press': { view: 'side', setup: `Telefonu sehpanın tam yanına, sehpa yüksekliğine, 2-3 m uzağa koy. Baş, omuz, dirsek, bilek ve kalça görünsün.`, cameraFix: 'Telefonu sehpanın tam yanına al ve biraz uzaklaştır.' },
  'incline-barbell-press': { view: 'side', setup: `Telefonu sehpanın tam yanına, sehpa yüksekliğine, 2-3 m uzağa koy. Baş, omuz, dirsek, bilek ve kalça görünsün.`, cameraFix: 'Telefonu sehpanın tam yanına al ve biraz uzaklaştır.' },
  'cable-fly-low-high': { view: 'oblique', viewAlt: ['side', 'front'], setup: `Kablo istasyonu karşında olduğu için telefonu ön-arka çapraza (yan tarafında ~45° önünde) veya tam yanına, ${H_CHEST} koy. İki kol açıkken eller kadrajda kalsın.`, cameraFix: 'Telefonu biraz uzaklaştır, yan çapraza al.' },
  'cable-fly-high-low': { view: 'oblique', viewAlt: ['side', 'front'], setup: `Kablo istasyonu karşında olduğu için telefonu ön-arka çapraza (yan tarafında ~45° önünde) veya tam yanına, ${H_CHEST} koy. Kollar yukarıda açıkken eller kadrajda kalsın.`, cameraFix: 'Telefonu biraz uzaklaştır, yan çapraza al.' },
  'dumbbell-fly': { view: 'side', setup: `Telefonu sehpanın tam yanına, sehpa yüksekliğine, 2-3 m uzağa koy. Baş, omuz, dirsek, bilek ve kalça görünsün.`, cameraFix: 'Telefonu sehpanın tam yanına al ve biraz uzaklaştır.' },
  'decline-push-up': { view: 'side', setup: `Telefonu yere, vücudunun tam yanına, 2-3 m uzağa koy; ${FULL}.`, cameraFix: 'Telefonu biraz uzaklaştır, tam yanına al.' },

  // ======================= SIRT
  'lat-pulldown': { view: 'side', viewAlt: ['oblique', 'front'], setup: `Telefonu makinenin tam yanına veya ön-arka çaprazına, omuz hizasında koy. Bar yukarıdayken eller, ayrıca omuz ve kalça görünsün (öne-arkaya eğilme yandan ölçülür).`, cameraFix: 'Telefonu biraz uzaklaştır; kalça uyluk pedinin üstünde görünsün.' },
  'seated-cable-row': { view: 'side', setup: `Telefonu kablo makinesinin tam yanına, oturduğun yükseklikte (bel-omuz hizası) koy. Omuz, dirsek, bilek ve kalça görünsün.`, cameraFix: 'Telefonu tam yanına al ve biraz uzaklaştır.' },
  'barbell-row': { view: 'side', setup: `Telefonu tam yanına, bel hizasına, 2-3 m uzağa koy. Baştan dizlere kadar görünsün.`, cameraFix: 'Telefonu biraz uzaklaştır.' },
  'one-arm-dumbbell-row': { view: 'side', setup: `Telefonu çalışan kolun tarafına, tam yanına, bel hizasına koy. Baştan dizlere kadar görünsün.`, cameraFix: 'Telefonu çalışan kolun tarafına al.' },
  'assisted-pull-up': { view: 'front', viewAlt: ['side'], setup: `Telefonu karşına (veya arkana), bar ve eller görünecek kadar uzağa, göğüs hizasına koy.`, cameraFix: 'Telefonu uzaklaştır; bar ve eller kadrajda olsun.' },
  'pull-up': { view: 'front', viewAlt: ['side'], setup: `Telefonu karşına (veya arkana), bar ve eller görünecek kadar uzağa, göğüs hizasına koy.`, cameraFix: 'Telefonu uzaklaştır; bar ve eller kadrajda olsun.' },
  'chin-up': { view: 'front', viewAlt: ['side'], setup: `Telefonu karşına (veya arkana), bar ve eller görünecek kadar uzağa, göğüs hizasına koy.`, cameraFix: 'Telefonu uzaklaştır; bar ve eller kadrajda olsun.' },
  'chest-supported-row': { view: 'side', setup: `Telefonu sehpanın tam yanına, sehpa yüksekliğine koy. Omuz, dirsek, bilek ve kalça görünsün.`, cameraFix: 'Telefonu sehpanın tam yanına al.' },
  't-bar-row': { view: 'side', setup: `Telefonu tam yanına, bel hizasına, 2-3 m uzağa koy. Baştan dizlere kadar görünsün.`, cameraFix: 'Telefonu biraz uzaklaştır.' },

  // ======================= BICEPS
  'dumbbell-curl': { view: 'front', viewAlt: ['side', 'oblique'], setup: `Telefonu tam karşına, göğüs hizasına, 2 m uzağa koy. Omuzlar, dirsekler ve eller (kollar aşağıdayken de) görünsün. Yandan da çekebilirsin.`, cameraFix: 'Telefonu biraz uzaklaştır; kollar aşağıdayken eller kadrajda olsun.' },
  'barbell-curl': { view: 'front', viewAlt: ['side', 'oblique'], setup: `Telefonu tam karşına, göğüs hizasına, 2 m uzağa koy. Omuzlar, dirsekler ve bar görünsün. Yandan da çekebilirsin.`, cameraFix: 'Telefonu biraz uzaklaştır.' },
  'hammer-curl': { view: 'front', viewAlt: ['side', 'oblique'], setup: `Telefonu tam karşına, göğüs hizasına, 2 m uzağa koy. Omuzlar, dirsekler ve eller görünsün. Yandan da çekebilirsin.`, cameraFix: 'Telefonu biraz uzaklaştır.' },
  'cable-curl': { view: 'side', viewAlt: ['oblique'], setup: `Kablo karşında olduğu için telefonu tam yanına veya ön-arka çaprazına (~45°), göğüs hizasına koy. Omuz, dirsek, bilek ve kalça görünsün.`, cameraFix: 'Telefonu tam yanına veya yan çapraza al.' },
  'preacher-curl': { view: 'side', setup: `Telefonu preacher sehpasının tam yanına, sehpa hizasına koy. Omuz, dirsek ve bilek görünsün (ped dirseği kapatmasın).`, cameraFix: 'Telefonu sehpanın diğer yanına al.' },
  'incline-dumbbell-curl': { view: 'side', setup: `Telefonu eğimli sehpanın tam yanına, sehpa yüksekliğine koy. Omuz, dirsek ve bilek (kol tamamen aşağı sarkarken de) görünsün.`, cameraFix: 'Telefonu sehpanın tam yanına al ve biraz uzaklaştır.' },
  'concentration-curl': { view: 'front', viewAlt: ['side', 'oblique'], setup: `Telefonu karşına veya yan çaprazına, oturduğun yükseklikte koy. Çalışan kolun omzu, dirseği ve eli görünsün.`, cameraFix: 'Telefonu çalışan kolun tarafına doğru al.' },
  'bayesian-cable-curl': { view: 'side', viewAlt: ['oblique'], setup: `Kablo arkanda olduğu için telefonu tam yanına (çalışan kol tarafına), göğüs hizasına koy.`, cameraFix: 'Telefonu çalışan kolun tarafına, tam yanına al.' },
  'spider-curl': { view: 'side', setup: `Telefonu sehpanın tam yanına, sehpa yüksekliğine koy. Omuz, dirsek ve bilek görünsün.`, cameraFix: 'Telefonu sehpanın tam yanına al.' },

  // ======================= TRICEPS (önden dirsek görülmez → ön-arka çapraz)
  'cable-pushdown': { view: 'oblique', viewAlt: ['side'], setup: `Telefonu ön-arka çaprazına (yan tarafında ~45° önünde veya arkasında), göğüs hizasına koy. Önden koyma: dirseğini göremez. Omuz, dirsek, bilek ve kalça görünsün.`, cameraFix: 'Telefonu yan çapraza (~45°) al; tam karşıdan dirsek görünmez.' },
  'overhead-triceps-extension': { view: 'oblique', viewAlt: ['side'], setup: `Telefonu ön-arka çaprazına (~45°), omuz hizasına koy. Kollar yukarıdayken eller kadrajda kalsın.`, cameraFix: 'Telefonu yan çapraza al ve uzaklaştır (eller yukarıda kadrajda olsun).' },
  'bench-dip': { view: 'side', setup: `Telefonu tam yanına, sehpa yüksekliğine koy. Omuz, dirsek, bilek ve kalça görünsün.`, cameraFix: 'Telefonu tam yanına al.' },
  'close-grip-bench-press': { view: 'side', setup: `Telefonu sehpanın tam yanına, sehpa yüksekliğine, 2-3 m uzağa koy.`, cameraFix: 'Telefonu sehpanın tam yanına al ve biraz uzaklaştır.' },
  'rope-pushdown': { view: 'oblique', viewAlt: ['side'], setup: `Telefonu ön-arka çaprazına (yan tarafında ~45° önünde veya arkasında), göğüs hizasına koy. Önden koyma: dirseğini göremez.`, cameraFix: 'Telefonu yan çapraza (~45°) al; tam karşıdan dirsek görünmez.' },
  'single-arm-cable-pushdown': { view: 'oblique', viewAlt: ['side'], setup: `Telefonu çalışan kol tarafında, ön-arka çaprazına (~45°), göğüs hizasına koy.`, cameraFix: 'Telefonu çalışan kol tarafında yan çapraza al.' },
  'lying-triceps-extension': { view: 'side', setup: `Telefonu sehpanın tam yanına, sehpa yüksekliğine koy. Omuz, dirsek, bilek ve kalça görünsün.`, cameraFix: 'Telefonu sehpanın tam yanına al.' },
  'overhead-cable-extension': { view: 'oblique', viewAlt: ['side'], setup: `Kablo arkanda olduğu için telefonu ön çaprazına (~45°) veya tam yanına, omuz hizasına koy.`, cameraFix: 'Telefonu yan çapraza al ve uzaklaştır.' },
  'parallel-bar-dip': { view: 'side', setup: `Telefonu tam yanına, göğüs hizasına, alt pozisyonda da dirsekler görünecek uzaklığa koy.`, cameraFix: 'Telefonu biraz uzaklaştır.' },

  // ======================= BACAK
  'squat': { view: 'side', viewAlt: ['front'], setup: `Telefonu tam yanına, diz hizasına, 3 m uzağa koy; ${FULL}. Önden çekersen dizlerin içe kaçması ölçülür.`, cameraFix: 'Telefonu uzaklaştır; ayaklar ve baş kadrajda olsun.' },
  'leg-press': { view: 'side', setup: `Telefonu makinenin tam yanına, diz hizasına koy. Kalça, diz ve ayak bileği görünsün.`, cameraFix: 'Telefonu makinenin tam yanına al; kalça ve ayaklar görünsün.' },
  'leg-extension': { view: 'side', setup: `Telefonu makinenin tam yanına, diz hizasına koy. Kalça, diz ve ayak bileği görünsün.`, cameraFix: 'Telefonu makinenin tam yanına al.' },
  'leg-curl': { view: 'side', setup: `Telefonu makinenin tam yanına, makine hizasına koy. Kalça, diz ve ayak bileği görünsün.`, cameraFix: 'Telefonu makinenin tam yanına al.' },
  'calf-raise': { view: 'side', setup: `Telefonu tam yanına, yere yakın (diz altı hizada) koy. Dizler ve ayaklar net görünsün.`, cameraFix: 'Telefonu yere yaklaştır; topuk ve ayak ucu görünsün.' },
  'walking-lunge': { view: 'side', setup: `Telefonu yürüme hattının yanına, 3-4 m uzağa, diz hizasına koy; ${FULL}.`, cameraFix: 'Telefonu daha uzağa al.' },
  'goblet-squat': { view: 'side', viewAlt: ['front'], setup: `Telefonu tam yanına, diz hizasına, 3 m uzağa koy; ${FULL}.`, cameraFix: 'Telefonu uzaklaştır.' },
  'bulgarian-split-squat': { view: 'side', setup: `Telefonu tam yanına, diz hizasına koy. İki bacak ve sehpa görünsün.`, cameraFix: 'Telefonu uzaklaştır.' },
  'hack-squat': { view: 'side', viewAlt: ['front'], setup: `Telefonu makinenin tam yanına, diz hizasına koy. Kalça, diz ve ayaklar görünsün.`, cameraFix: 'Telefonu makinenin tam yanına al.' },
  'lying-leg-curl': { view: 'side', setup: `Telefonu makinenin tam yanına, makine hizasına koy.`, cameraFix: 'Telefonu makinenin tam yanına al.' },
  'seated-leg-curl': { view: 'side', setup: `Telefonu makinenin tam yanına, diz hizasına koy.`, cameraFix: 'Telefonu makinenin tam yanına al.' },
  'step-up': { view: 'side', setup: `Telefonu tam yanına, 3 m uzağa koy. Sehpa ve iki bacak görünsün.`, cameraFix: 'Telefonu uzaklaştır.' },

  // ======================= KARIN / KALÇA
  'crunch': { view: 'side', setup: `Telefonu yere, vücudunun tam yanına koy. Baş, omuz, kalça ve diz görünsün.`, cameraFix: 'Telefonu tam yanına al.' },
  'plank': { view: 'side', setup: `Telefonu yere, vücudunun tam yanına, 2-3 m uzağa koy; ${FULL}.`, cameraFix: 'Telefonu uzaklaştır.' },
  'leg-raise': { view: 'side', setup: `Telefonu yere, vücudunun tam yanına, 2-3 m uzağa koy; ${FULL}.`, cameraFix: 'Telefonu uzaklaştır.' },
  'cable-crunch': { view: 'side', setup: `Kablo karşında olduğu için telefonu tam yanına, diz-kalça hizasına koy. Dizler, kalça ve baş görünsün.`, cameraFix: 'Telefonu tam yanına al ve uzaklaştır.' },
  'hip-thrust': { view: 'side', setup: `Telefonu tam yanına, kalça hizasına koy. Omuz, kalça ve diz görünsün.`, cameraFix: 'Telefonu tam yanına al.' },
  'glute-bridge': { view: 'side', setup: `Telefonu yere, tam yanına koy. Omuz, kalça ve diz görünsün.`, cameraFix: 'Telefonu tam yanına al.' },
  'cable-kickback': { view: 'side', setup: `Kablo karşında olduğu için telefonu tam yanına, çalışan bacak tarafına, kalça hizasına koy.`, cameraFix: 'Telefonu çalışan bacak tarafına al.' },
  'romanian-deadlift': { view: 'side', setup: `Telefonu tam yanına, kalça hizasına, 3 m uzağa koy; ${FULL}.`, cameraFix: 'Telefonu uzaklaştır.' },

  // ======================= KARDİYO / TÜM VÜCUT
  'treadmill': { view: 'side', setup: `Telefonu bandın tam yanına, 2-3 m uzağa koy; ${FULL}.`, cameraFix: 'Telefonu uzaklaştır.' },
  'elliptical': { view: 'side', setup: `Telefonu aletin tam yanına koy; ${FULL}.`, cameraFix: 'Telefonu uzaklaştır.' },
  'stationary-bike': { view: 'side', setup: `Telefonu bisikletin tam yanına koy. Kalça, diz ve ayak görünsün.`, cameraFix: 'Telefonu tam yanına al.' },
  'rowing-machine': { view: 'side', setup: `Telefonu makinenin tam yanına, 3 m uzağa koy; ${FULL}.`, cameraFix: 'Telefonu uzaklaştır.' },
  'burpee': { view: 'side', setup: `Telefonu tam yanına, 3-4 m uzağa koy; ayakta ve yerde ${FULL}.`, cameraFix: 'Telefonu daha uzağa al.' },
  'jumping-jack': { view: 'front', setup: `Telefonu tam karşına, 3-4 m uzağa koy; kollar yukarıda ve bacaklar açıkken ${FULL}.`, cameraFix: 'Telefonu daha uzağa al.' },
};
