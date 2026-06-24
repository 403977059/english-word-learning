/**
 * 文字转语音 - 使用 Web Speech API
 */

let speechSynthInitialized = false;

function initSpeech() {
  if (!speechSynthInitialized && 'speechSynthesis' in window) {
    // 预初始化语音合成
    window.speechSynthesis.getVoices();
    speechSynthInitialized = true;
  }
}

function speakWord(word) {
  if (!('speechSynthesis' in window)) {
    showToast('您的浏览器不支持语音朗读');
    return;
  }

  // 取消任何正在进行的语音
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.85;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // 尝试选择英语语音
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(v => v.lang.startsWith('en'));
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  initSpeech();
  // Chrome 需要用户交互后才能使用语音合成
  document.addEventListener('click', () => {
    if (!speechSynthInitialized) {
      initSpeech();
    }
  }, { once: true });
});
