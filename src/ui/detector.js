// MediaPipe Pose Landmarker yükleyici (tarayıcıda, cihaz üzerinde çalışır; görüntü hiçbir yere gönderilmez).
const VERSION = '0.10.14';
const BUNDLE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/vision_bundle.mjs`;
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODELS = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  heavy: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
};

export async function createDetector(model = 'full') {
  const { FilesetResolver, PoseLandmarker } = await import(BUNDLE);
  const fileset = await FilesetResolver.forVisionTasks(WASM);
  const opts = (delegate) => ({
    baseOptions: { modelAssetPath: MODELS[model] || MODELS.full, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.6,
    minPosePresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });
  let lm;
  try {
    lm = await PoseLandmarker.createFromOptions(fileset, opts('GPU'));
  } catch (e) {
    console.warn('GPU başarısız, CPU kullanılıyor', e);
    lm = await PoseLandmarker.createFromOptions(fileset, opts('CPU'));
  }
  let lastTs = 0;
  return {
    detect(video, nowMs) {
      const ts = Math.max(lastTs + 1, Math.round(nowMs));
      lastTs = ts;
      const r = lm.detectForVideo(video, ts);
      if (!r.landmarks?.length) return null;
      return { landmarks: r.landmarks[0], world: r.worldLandmarks?.[0] || null };
    },
    close() { lm.close(); },
  };
}
