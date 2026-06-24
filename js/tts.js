/**
 * 文字转语音 - 三模式降级朗读
 * 1. 网络 TTS（有道词典，国内可用）
 * 2. Web Speech API（本地引擎）
 * 3. 提示安装语音服务
 */

function ttsNotify(msg) {
  try {
    if (typeof showToast === 'function') { showToast(msg); }
    else {
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

// 方案一：网络 TTS（有道词典美式发音，国内可直接访问）
function speakNetwork(word) {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      audio.src = 'https://dict.youdao.com/dictvoice?audio='
                  + encodeURIComponent(word.toLowerCase()) + '&type=0';
      audio.volume = 1.0;
      let timer = setTimeout(() => { audio.src = ''; resolve(false); }, 8000);
      audio.onplay = () => { clearTimeout(timer); };
      audio.onended = () => { clearTimeout(timer); resolve(true); };
      audio.onerror = () => { clearTimeout(timer); resolve(false); };
      audio.play().catch(() => { clearTimeout(timer); resolve(false); });
    } catch(e) { resolve(false); }
  });
}

// 方案二：Web Speech API（本地语音引擎）
function speakNative(word) {
  return new Promise((resolve) => {
    try {
      if (!window.speechSynthesis) { resolve(false); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-US';
      u.rate = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const ev = voices.find(v => v.lang.startsWith('en-US'))
                || voices.find(v => v.lang.startsWith('en'));
      if (ev) u.voice = ev;
      let done = false;
      const finish = (ok) => { if (!done) { done = true; resolve(ok); } };
      u.onend = () => finish(true);
      u.onerror = () => finish(false);
      window.speechSynthesis.speak(u);
      setTimeout(() => finish(false), 3000);
    } catch(e) { resolve(false); }
  });
}

// 主入口：自动选择最佳方案
async function speakWord(word) {
  // 优先走网络（兼容性最好，荣耀/华为手机优先）
  const ok1 = await speakNetwork(word);
  if (ok1) return;

  // 网络不行，试本地引擎
  const ok2 = await speakNative(word);
  if (ok2) return;

  // 都不行，简单提示
  ttsNotify('🔊 建议安装 Google 文字转语音应用');
}

// 点击时预加载语音
document.addEventListener('click', () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
}, { once: true });
