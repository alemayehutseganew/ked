const bingoRanges = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
};

let isVoiceEnabled = true;
let isAudioUnlocked = false;
let audioUnlockPromise = null;
const audioCache = Object.create(null);

const attemptAudioUnlock = async () => {
  try {
    const unlockAudioObj = new Audio('/audio/B1.m4a');
    unlockAudioObj.volume = 0;
    await unlockAudioObj.play();
    unlockAudioObj.pause();
    unlockAudioObj.currentTime = 0;
    isAudioUnlocked = true;
    console.log('[Audio] Mobile audio context unlocked successfully.');
    return true;
  } catch (error) {
    console.warn('[Audio] Unlock failed. The user might need to interact again.', error);
    return false;
  }
};

export const unlockAudio = async () => {
  if (isAudioUnlocked) return true;
  if (audioUnlockPromise) return audioUnlockPromise;
  if (typeof Audio === 'undefined') return false;

  const attempt = attemptAudioUnlock();
  audioUnlockPromise = attempt;
  try {
    return await attempt;
  } finally {
    audioUnlockPromise = null;
  }
};

export const toggleVoice = (enabled) => {
  isVoiceEnabled = Boolean(enabled);
  if (!isVoiceEnabled) {
    Object.values(audioCache).forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }
};

export const preloadAudio = () => {
  if (typeof Audio === 'undefined') return;

  Object.entries(bingoRanges).forEach(([letter, [start, end]]) => {
    for (let number = start; number <= end; number += 1) {
      const fileName = `${letter}${number}.m4a`;
      if (!audioCache[fileName]) {
        const audio = new Audio(`/audio/${fileName}`);
        audio.preload = 'auto';
        audioCache[fileName] = audio;
      }
    }
  });
  console.log('[Audio] All 75 audio files preloaded into cache.');
};

export const playNumberAudio = (letter, number) => {
  if (!isVoiceEnabled || !isAudioUnlocked || typeof Audio === 'undefined') return;

  const normalizedLetter = String(letter).toUpperCase();
  const numericNumber = Number(number);
  const numberRange = bingoRanges[normalizedLetter];
  if (
    !numberRange ||
    !Number.isInteger(numericNumber) ||
    numericNumber < numberRange[0] ||
    numericNumber > numberRange[1]
  ) return;

  const fileName = `${normalizedLetter}${numericNumber}.m4a`;
  try {
    Object.values(audioCache).forEach((audio) => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    if (!audioCache[fileName]) {
      audioCache[fileName] = new Audio(`/audio/${fileName}`);
      audioCache[fileName].preload = 'auto';
    }

    const audio = audioCache[fileName];
    audio.currentTime = 0;
    const playback = audio.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch((error) => {
        console.warn(`[Audio] Failed to play ${fileName}.`, error);
      });
    }
  } catch (error) {
    console.error('[Audio] Playback error:', error);
  }
};

preloadAudio();
