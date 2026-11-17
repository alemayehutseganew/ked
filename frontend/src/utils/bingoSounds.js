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
const MAX_CACHE_SIZE = 10;

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
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
};

const fallbackToSpeech = (letter, number) => {
  if (
    !isVoiceEnabled ||
    typeof window === 'undefined' ||
    !window.speechSynthesis ||
    typeof SpeechSynthesisUtterance === 'undefined'
  ) return;

  const utterance = new SpeechSynthesisUtterance(`${letter} ${number}`);
  const amharicVoice = window.speechSynthesis.getVoices()
    .find((voice) => voice.lang.toLowerCase().startsWith('am'));
  utterance.lang = amharicVoice ? 'am-ET' : 'en-US';
  if (amharicVoice) utterance.voice = amharicVoice;
  window.speechSynthesis.speak(utterance);
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

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  Object.values(audioCache).forEach((audio) => {
    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
  });

  const fileName = `${normalizedLetter}${numericNumber}.m4a`;
  try {
    if (!audioCache[fileName]) {
      const cachedKeys = Object.keys(audioCache);
      while (cachedKeys.length >= MAX_CACHE_SIZE) {
        const oldestKey = cachedKeys.shift();
        audioCache[oldestKey].pause();
        delete audioCache[oldestKey];
      }
      audioCache[fileName] = new Audio(`/audio/${fileName}`);
    } else {
      const cachedAudio = audioCache[fileName];
      delete audioCache[fileName];
      audioCache[fileName] = cachedAudio;
    }

    const audio = audioCache[fileName];
    audio.currentTime = 0;
    const playback = audio.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch((error) => {
        console.warn(
          `[Audio] ❌ Failed to play ${fileName}. File might be missing or corrupt. Falling back to Web Speech API.`,
          error
        );
        fallbackToSpeech(normalizedLetter, numericNumber);
      });
    }
  } catch (error) {
    console.warn(`[Audio] Playback error for ${fileName}. Falling back to Web Speech API.`, error);
    fallbackToSpeech(normalizedLetter, numericNumber);
  }
};
