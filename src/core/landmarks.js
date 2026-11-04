// MediaPipe Pose 33 nokta indeksleri. Sol/Sağ = kişinin anatomik sol/sağı.
export const LM = {
  nose: 0,
  leftEyeInner: 1, leftEye: 2, leftEyeOuter: 3,
  rightEyeInner: 4, rightEye: 5, rightEyeOuter: 6,
  leftEar: 7, rightEar: 8,
  mouthLeft: 9, mouthRight: 10,
  leftShoulder: 11, rightShoulder: 12,
  leftElbow: 13, rightElbow: 14,
  leftWrist: 15, rightWrist: 16,
  leftPinky: 17, rightPinky: 18,
  leftIndex: 19, rightIndex: 20,
  leftThumb: 21, rightThumb: 22,
  leftHip: 23, rightHip: 24,
  leftKnee: 25, rightKnee: 26,
  leftAnkle: 27, rightAnkle: 28,
  leftHeel: 29, rightHeel: 30,
  leftFoot: 31, rightFoot: 32,
};

export const SIDE = {
  L: { shoulder: 11, elbow: 13, wrist: 15, index: 19, hip: 23, knee: 25, ankle: 27, heel: 29, toe: 31, ear: 7, eye: 2, eyeOuter: 3, mouth: 9 },
  R: { shoulder: 12, elbow: 14, wrist: 16, index: 20, hip: 24, knee: 26, ankle: 28, heel: 30, toe: 32, ear: 8, eye: 5, eyeOuter: 6, mouth: 10 },
};

export const PART_TR = {
  shoulder: 'omuz', elbow: 'dirsek', wrist: 'bilek', hip: 'kalça', knee: 'diz', ankle: 'ayak bileği',
  heel: 'topuk', toe: 'ayak ucu', ear: 'kulak', eye: 'göz', nose: 'burun', mouth: 'ağız', index: 'el',
};

export const CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32],
  [15, 19], [16, 20], [7, 0], [8, 0],
];
