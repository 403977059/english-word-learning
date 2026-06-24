/**
 * 文字转语音 - 使用 Web Speech API
 * 改进了初始化时序和错误处理
 */

let ttsReady = false;
let ttsSupported = false;

// 检查是否支持语音合成（兼容多数浏览器）
function checkTTS() {
  return 'speechSynthesis' in window;
}

// 安全提示函数（不依赖 app.js 的 showToast）
function ttsNotify(msg) {
  try {
    if (typeof showToast === 'function') {
      showToast(msg);
    } else {
      const el = document.getElementById('toast');
      if (el) {
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(el._timer);
        el._timer = setTimeout(() => el.classList.remove('show'), 3000);
      }
    }
  } catch(e) {}
}

// 等待语音加载完成
function waitForVoices(callback, timeout = 3000) {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    callback(voices);
    return;
  }
  // 有些浏览器异步加载语音列表
  window.speechSynthesis.onvoiceschanged = () => {
    const v = window.speechSynthesis.getVoices();
    if (v.length > 0) {
      window.speechSynthesis.onvoiceschanged = null;
      callback(v);
    }
  };
  // 超时保护
  setTimeout(() => {
    if (window.speechSynthesis.getVoices().length > 0) return;
    // 超时后也尝试继续
    ttsReady = true;
  }, timeout);
}

function initTTS() {
  if (ttsReady) return;
  ttsSupported = checkTTS();
  if (!ttsSupported) return;
  try {
    // 触发语音加载
    window.speechSynthesis.getVoices();
    waitForVoices(() => { ttsReady = true; });
    ttsReady = true;
  } catch(e) {
    console.warn('TTS init error:', e);
  }
}

function speakWord(word) {
  // 如果语音还没准备好，尝试重新初始化
  if (!ttsReady) {
    initTTS();
  }

  if (!ttsSupported || !checkTTS()) {
    ttsNotify('您的浏览器不支持语音朗读');
    return;
  }

  try {
    // 取消之前正在播放的语音
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // 优先选择美式英语语音
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en-US'))
                       || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch(e) {
    ttsNotify('语音播放失败，请重试');
  }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initTTS);

// 首次用户交互时再次尝试（Chrome 等浏览器需要）
document.addEventListener('click', () => {
  if (!ttsReady) initTTS();
}, { once: true });

// 暴露检查状态（可选调试用）
window.__ttsReady = () => ttsReady;
