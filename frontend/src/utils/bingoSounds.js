const letters = { B: 'ቢ', I: 'አይ', N: 'ኤን', G: 'ጂ', O: 'ኦ' };
const FALLBACK_TO_ENGLISH = true;

function getAmharicNumber(num) {
  const ones = ['', 'አንድ', 'ሁለት', 'ሶስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
  const tens = ['', 'አስር', 'ሃያ', 'ሰላሳ', 'አርባ', 'ሃምሳ', 'ስልሳ', 'ሰባ', 'ሰማንያ', 'ዘጠና'];
  if (num < 10) return ones[num];
  if (num === 10) return 'አስር';
  if (num < 20) return `አስራ ${ones[num - 10]}`;
  if (num % 10 === 0) return tens[Math.floor(num / 10)];
  return `${tens[Math.floor(num / 10)]} ${ones[num % 10]}`;
}

let isMuted = false;
let voicesLoaded = false;
let amharicVoice = null;
let englishVoice = null;

const loadVoices = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesLoaded = true;
    amharicVoice = voices.find((voice) => /^am(?:-|$)/i.test(voice.lang)) || null;
    englishVoice = voices.find((voice) => /^en(?:-|$)/i.test(voice.lang)) || null;
  }
};

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

export const toggleMute = () => {
  isMuted = !isMuted;
  if (isMuted && typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  return isMuted;
};

export const getMuteState = () => isMuted;

export const playBallCall = (ballString) => {
  if (
    isMuted ||
    typeof window === 'undefined' ||
    !window.speechSynthesis ||
    typeof window.SpeechSynthesisUtterance !== 'function'
  ) return;

  const [letter, numberString] = ballString.split('-');
  const number = Number.parseInt(numberString, 10);
  if (!letters[letter] || !Number.isInteger(number) || number < 1 || number > 75) return;

  window.speechSynthesis.cancel();
  if (!voicesLoaded) loadVoices();

  const useAmharicVoice = Boolean(amharicVoice);
  if (!useAmharicVoice && !FALLBACK_TO_ENGLISH) return;

  const textToSpeak = useAmharicVoice
    ? `${letters[letter]} ${getAmharicNumber(number)}`
    : `${letter} ${number}`;
  const utterance = new window.SpeechSynthesisUtterance(textToSpeak);
  utterance.rate = 0.9;
  if (useAmharicVoice) {
    utterance.lang = 'am-ET';
    utterance.voice = amharicVoice;
  } else {
    utterance.lang = 'en-US';
    if (englishVoice) utterance.voice = englishVoice;
  }

  window.speechSynthesis.speak(utterance);
};

export const unlockAudio = () => {
  if (
    typeof window === 'undefined' ||
    !window.speechSynthesis ||
    typeof window.SpeechSynthesisUtterance !== 'function'
  ) return;

  const utterance = new window.SpeechSynthesisUtterance('');
  utterance.volume = 0;
  window.speechSynthesis.speak(utterance);
};
