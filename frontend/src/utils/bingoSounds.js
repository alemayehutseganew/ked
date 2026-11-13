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
const SILENT_AUDIO = 'data:audio/wav;base64,UklGRqQCAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYACAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA=';

const attemptAudioUnlock = async () => {
  try {
    const silentAudio = new Audio(SILENT_AUDIO);
    silentAudio.volume = 0;
    const playback = silentAudio.play();
    await playback;
    silentAudio.pause();
    isAudioUnlocked = true;
    console.log('[Audio] Unlocked via silent audio.');
    return true;
  } catch (error) {
    console.log('[Audio] Unlock failed:', error);
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

  const fileBaseName = `${normalizedLetter}${numericNumber}`;
  const fileName = `${fileBaseName}.mp3`;
  if (!audioCache[fileName]) {
    const audio = new Audio(`/audio/${fileName}`);
    let usingM4aFallback = false;
    audio.addEventListener('error', () => {
      if (usingM4aFallback) {
        console.warn(`[Audio] Failed to load ${fileBaseName}.m4a.`);
        return;
      }

      usingM4aFallback = true;
      const fallbackFileName = `${fileBaseName}.m4a`;
      audio.src = `/audio/${fallbackFileName}`;
      audio.load();
      audio.currentTime = 0;
      playAudio(audio, fallbackFileName);
    });
    audioCache[fileName] = audio;
  }

  const audio = audioCache[fileName];
  audio.currentTime = 0;
  playAudio(audio, fileName);
};

const playAudio = (audio, fileName) => {
  try {
    const playback = audio.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch((error) => {
        console.warn(`[Audio] Failed to play ${fileName}.`, error);
      });
    }
  } catch (error) {
    console.warn(`[Audio] Failed to play ${fileName}.`, error);
  }
};
