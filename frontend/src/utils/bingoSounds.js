const bingoRanges = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
};

let isVoiceEnabled = false;
let isAudioUnlocked = false;
let isAudioUnlockPending = false;
const audioCache = {};

export const unlockAudio = () => {
  if (
    isAudioUnlocked ||
    isAudioUnlockPending ||
    typeof Audio === 'undefined'
  ) return;

  const silentAudio = new Audio('/audio/B1.mp3');
  silentAudio.volume = 0;
  isAudioUnlockPending = true;

  try {
    const playback = silentAudio.play();
    if (playback && typeof playback.then === 'function') {
      playback.then(() => {
        silentAudio.pause();
        silentAudio.currentTime = 0;
        isAudioUnlocked = true;
        isAudioUnlockPending = false;
        console.log('[Audio] HTML5 Audio unlocked.');
      }).catch((error) => {
        isAudioUnlockPending = false;
        console.log('[Audio] Unlock failed:', error);
      });
    } else {
      silentAudio.pause();
      silentAudio.currentTime = 0;
      isAudioUnlocked = true;
      isAudioUnlockPending = false;
      console.log('[Audio] HTML5 Audio unlocked.');
    }
  } catch (error) {
    isAudioUnlockPending = false;
    console.log('[Audio] Unlock failed:', error);
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
  if (!isVoiceEnabled || typeof Audio === 'undefined') return;

  const normalizedLetter = String(letter).toUpperCase();
  const numericNumber = Number(number);
  const numberRange = bingoRanges[normalizedLetter];
  if (
    !numberRange ||
    !Number.isInteger(numericNumber) ||
    numericNumber < numberRange[0] ||
    numericNumber > numberRange[1]
  ) return;

  const fileName = `${normalizedLetter}${numericNumber}.mp3`;
  if (!audioCache[fileName]) {
    audioCache[fileName] = new Audio(`/audio/${fileName}`);
  }

  const audio = audioCache[fileName];
  audio.currentTime = 0;
  try {
    const playback = audio.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch((error) => {
        console.warn(`[Audio] Failed to play ${fileName}. Ensure the file exists in public/audio/.`, error);
      });
    }
  } catch (error) {
    console.warn(`[Audio] Failed to play ${fileName}. Ensure the file exists in public/audio/.`, error);
  }
};
