/**
 * 英语单词打卡学习 - 主应用逻辑（多学生版）
 */

// ====== 状态 ======
let currentGradeId = null;
let currentWords = [];
let currentIndex = 0;
let isShuffled = false;
let shuffledIndices = [];
let navigationStack = [];

// ====== 页面导航 ======
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
}

function goBack() {
  if (navigationStack.length === 0) {
    const si = getCurrentStudent();
    if (si) {
      showPage('pageGradeSelect');
      document.getElementById('navTitle').textContent = updateTitleForStudent('选择年级');
    } else {
      showPage('pageStudentSelect');
      document.getElementById('navTitle').textContent = '英语单词打卡';
    }
    document.getElementById('navBack').style.display = 'none';
    return;
  }
  const prev = navigationStack.pop();
  showPage(prev);
  updateNavForPage(prev);
}

function navigateTo(pageId, title) {
  const currentActive = document.querySelector('.page.active');
  if (currentActive && currentActive.id !== pageId) {
    navigationStack.push(currentActive.id);
  }
  showPage(pageId);
  if (title) {
    document.getElementById('navTitle').textContent = title;
  }
  document.getElementById('navBack').style.display = 'flex';
}

function updateNavForPage(pageId) {
  if (pageId === 'pageGradeSelect') {
    const si = getCurrentStudentInfo();
    document.getElementById('navTitle').textContent = si.name + ' · 选择年级';
  } else if (pageId === 'pageLearning') {
    const data = getWordData(currentGradeId);
    document.getElementById('navTitle').textContent = data ? data.name : '学习';
  } else if (pageId === 'pageProfile') {
    document.getElementById('navTitle').textContent = getCurrentStudentInfo().name + ' · 个人中心';
  } else if (pageId === 'pageReview') {
    document.getElementById('navTitle').textContent = '生词本复习';
  } else if (pageId === 'pageStudentSelect') {
    document.getElementById('navTitle').textContent = '英语单词打卡';
    document.getElementById('navBack').style.display = 'none';
  }
  if (navigationStack.length === 0 && pageId !== 'pageStudentSelect') {
    document.getElementById('navBack').style.display = 'none';
  }
}

function updateTitleForStudent(base) {
  const si = getCurrentStudentInfo();
  return si.emoji + ' ' + si.name + ' · ' + base;
}

// ====== 学生选择 ======
function renderStudents() {
  const grid = document.getElementById('studentGrid');
  grid.innerHTML = '';
  const avatars = ['🧑‍🎓', '👧', '👦', '🧒'];
  STUDENTS.forEach((s, i) => {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.style.borderColor = s.color + '60';
    // 显示该学生的统计数据
    const prevId = getCurrentStudent();
    setCurrentStudent(s.id);
    const learned = getTotalLearnedCount();
    const known = getAllKnownCount();
    const vocab = getVocabBook().length;
    setCurrentStudent(prevId); // 恢复

    card.innerHTML = `
      <div class="student-top" style="background:${s.color}">
        <span class="student-emoji">${s.emoji}</span>
      </div>
      <div class="student-name" style="color:${s.color}">${s.name}</div>
      <div class="student-preview">
        <span>📚 ${learned} 学</span>
        <span>✅ ${known} 会</span>
        <span>📕 ${vocab} 生词</span>
      </div>
      <button class="btn btn-primary student-btn" style="background:${s.color}">开始学习 →</button>
    `;
    card.addEventListener('click', () => selectStudent(s.id));
    grid.appendChild(card);
  });
}

function selectStudent(studentId) {
  setCurrentStudent(studentId);
  const si = getCurrentStudentInfo();
  renderGrades();
  navigateTo('pageGradeSelect', si.emoji + ' ' + si.name + ' · 选择年级');
}

function switchStudentFromProfile() {
  navigationStack = [];  // 清空导航栈
  showPage('pageStudentSelect');
  document.getElementById('navTitle').textContent = '英语单词打卡';
  document.getElementById('navBack').style.display = 'none';
}

// ====== 年级选择 ======
function renderGrades() {
  const grid = document.getElementById('gradeGrid');
  grid.innerHTML = '';
  const gradeIcons = ['🎨', '🐾', '🏫', '🌈', '📚', '🌟', '🏛️', '⏰', '📝', '🌺', '🚀', '🏆'];
  GRADES.forEach((grade) => {
    const card = document.createElement('div');
    card.className = 'grade-card';
    const words = getWordsForGrade(grade.id);
    const knownCount = getKnownCount(grade.id);
    const totalCount = words.length;
    card.innerHTML = `
      <div class="grade-bar" style="background:${grade.color};height:4px;position:absolute;top:0;left:0;right:0;"></div>
      <span class="grade-icon">${gradeIcons[GRADES.indexOf(grade)] || '📖'}</span>
      <div class="grade-name" style="color:${grade.color}">${grade.name}</div>
      <div class="grade-desc">${grade.desc}</div>
      <div class="grade-count">${knownCount}/${totalCount} 已掌握</div>
    `;
    card.addEventListener('click', () => startLearning(grade.id));
    grid.appendChild(card);
  });
}

// ====== 获取单词 ======
function getWordsForGrade(gradeId) {
  const data = WORD_DATA[gradeId];
  return data ? data.words : [];
}

function getWordData(gradeId) {
  return WORD_DATA[gradeId] || null;
}

// ====== 开始学习 ======
function startLearning(gradeId) {
  currentGradeId = gradeId;
  currentWords = getWordsForGrade(gradeId);
  if (currentWords.length === 0) { showToast('该年级暂无单词数据'); return; }
  currentIndex = 0;
  isShuffled = false;
  shuffledIndices = [];
  navigateTo('pageLearning', getWordData(gradeId).name);
  showWord();
  updateStats();
  hideDetail();
  document.getElementById('actionButtons').style.display = 'flex';
  document.getElementById('learningStats').style.display = 'flex';
  document.getElementById('cardFront').style.display = 'flex';
  document.getElementById('cardFront').style.flexDirection = 'column';
}

// ====== 显示单词 ======
function showWord() {
  const words = getShuffledWords();
  if (words.length === 0) return;
  if (currentIndex >= words.length) {
    document.getElementById('wordEn').textContent = '🎉 恭喜完成！';
    document.getElementById('wordStatus').textContent = '所有单词已学习完毕';
    document.getElementById('wordStatus').className = 'word-status known';
    document.getElementById('cardDetail').style.display = 'none';
    document.getElementById('cardFront').style.display = 'flex';
    document.getElementById('cardFront').style.flexDirection = 'column';
    document.getElementById('actionButtons').style.display = 'none';
    document.getElementById('learningStats').style.display = 'none';
    addHistoryEntry(words.length);
    updateProgress();
    showToast('🎉 本单元单词已全部学完！');
    return;
  }
  const word = words[currentIndex];
  const knownWords = getKnownWords(currentGradeId);
  const isKnown = knownWords.includes(word.en);
  document.getElementById('wordEn').textContent = word.en;
  document.getElementById('cardFront').style.display = 'flex';
  document.getElementById('cardFront').style.flexDirection = 'column';
  document.getElementById('cardDetail').style.display = 'none';
  document.getElementById('actionButtons').style.display = 'flex';
  document.getElementById('learningStats').style.display = 'flex';
  const statusEl = document.getElementById('wordStatus');
  if (isKnown) {
    statusEl.textContent = '✅ 已掌握';
    statusEl.className = 'word-status known';
  } else {
    statusEl.textContent = '📖 待学习';
    statusEl.className = 'word-status new-word';
  }
  document.getElementById('detailEn').textContent = word.en;
  document.getElementById('detailPhonetic').textContent = word.phonetic;
  document.getElementById('detailCn').textContent = word.cn;
  document.getElementById('detailExample').textContent = word.example;
  document.getElementById('detailExampleCn').textContent = word.exampleCn || '';
  const speak = () => speakWord(word.en);
  document.getElementById('detailPhonetic').style.cursor = 'pointer';
  document.getElementById('detailPhonetic').onclick = speak;
  document.getElementById('detailEn').style.cursor = 'pointer';
  document.getElementById('detailEn').onclick = speak;
  const tipsEl = document.getElementById('detailTips');
  tipsEl.innerHTML = '🔊 点击单词或音标可听发音';
  tipsEl.style.cursor = 'pointer';
  tipsEl.onclick = speak;
  const inVocab = isInVocabBook(word.en, currentGradeId);
  const btn = document.getElementById('btnAddToVocab');
  btn.textContent = inVocab ? '✅ 已在生词本' : '📕 加入生词本';
  btn.disabled = inVocab;
  btn.style.opacity = inVocab ? '0.6' : '1';
  updateProgress();
  updateStats();
}

function getShuffledWords() {
  if (!isShuffled || shuffledIndices.length === 0) return currentWords;
  return shuffledIndices.map(i => currentWords[i]);
}

function shuffleWords() {
  if (currentWords.length === 0) return;
  if (!isShuffled) {
    shuffledIndices = currentWords.map((_, i) => i);
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }
    isShuffled = true;
    showToast('🔀 已打乱顺序');
  } else {
    isShuffled = false;
    shuffledIndices = [];
    showToast('↩️ 已恢复顺序');
  }
  currentIndex = 0;
  showWord();
}

function markKnown() {
  const words = getShuffledWords();
  if (currentIndex >= words.length) return;
  const word = words[currentIndex];
  addKnownWord(word.en, currentGradeId);
  addLearnedWord(word.en, currentGradeId);
  showToast(`✅ "${word.en}" 已标记为掌握`);
  setTimeout(() => { currentIndex++; showWord(); }, 300);
}

function showDetail() {
  const words = getShuffledWords();
  if (currentIndex >= words.length) return;
  const word = words[currentIndex];
  addLearnedWord(word.en, currentGradeId);
  document.getElementById('cardFront').style.display = 'none';
  document.getElementById('cardDetail').style.display = 'block';
  setTimeout(() => speakWord(word.en), 300);
  updateStats();
}

function hideDetail() {
  document.getElementById('cardFront').style.display = 'flex';
  document.getElementById('cardFront').style.flexDirection = 'column';
  document.getElementById('cardDetail').style.display = 'none';
}

function addToVocabBook() {
  const words = getShuffledWords();
  if (currentIndex >= words.length) return;
  const word = words[currentIndex];
  if (addWordToVocab(word, currentGradeId)) {
    showToast(`📕 "${word.en}" 已加入生词本`);
    document.getElementById('btnAddToVocab').textContent = '✅ 已在生词本';
    document.getElementById('btnAddToVocab').disabled = true;
    document.getElementById('btnAddToVocab').style.opacity = '0.6';
  }
  updateStats();
}

function nextWord() {
  const words = getShuffledWords();
  if (currentIndex >= words.length) return;
  const word = words[currentIndex];
  addLearnedWord(word.en, currentGradeId);
  currentIndex++;
  showWord();
}

function updateProgress() {
  const words = getShuffledWords();
  const total = words.length;
  const fill = document.getElementById('progressFill');
  if (total === 0) { fill.style.width = '0%'; return; }
  fill.style.width = Math.min((currentIndex / total) * 100, 100) + '%';
}

function updateStats() {
  const words = getShuffledWords();
  const total = words.length;
  const knownCount = getKnownCount(currentGradeId);
  const vocabCount = getVocabBook().length;
  document.getElementById('statProgress').textContent = `${Math.min(currentIndex, total)}/${total}`;
  document.getElementById('statKnown').textContent = `已掌握：${knownCount}`;
  document.getElementById('statVocab').textContent = `生词本：${vocabCount}`;
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// ====== 个人中心 ======
function showPersonalCenter() {
  navigateTo('pageProfile', getCurrentStudentInfo().name + ' · 个人中心');
  updateProfileData();
}

function updateProfileData() {
  const si = getCurrentStudentInfo();
  // 头像
  const avatarEl = document.getElementById('profileAvatar');
  avatarEl.innerHTML = `<span style="font-size:36px;">${si.emoji}</span>`;
  avatarEl.style.background = si.color + '30';
  // 性别主题
  const header = document.querySelector('.profile-header');
  header.classList.remove('girl-profile', 'boy-profile');
  header.classList.add(si.gender + '-profile');
  // 姓名
  document.getElementById('profileName').textContent = si.name + ' 的学习中心';
  document.getElementById('profileStudentBadge').textContent = '切换学生 →';
  document.getElementById('profileStudentBadge').style.color = si.color;
  // 统计
  document.getElementById('profileTotalLearned').textContent = getTotalLearnedCount();
  document.getElementById('profileTotalKnown').textContent = getAllKnownCount();
  document.getElementById('profileVocabCount').textContent = getVocabBook().length;
  document.getElementById('profileLearningDays').textContent = getLearningDays();
  document.getElementById('habitStreak').textContent = getStreak() + ' 天';
  document.getElementById('habitThisWeek').textContent = getThisWeekDays() + ' 天';
  document.getElementById('habitThisMonth').textContent = getThisMonthDays() + ' 天';
  renderVocabList();
  renderHistory();
  renderGradeProgress();
}

function renderVocabList() {
  const list = document.getElementById('vocabList');
  const empty = document.getElementById('vocabEmpty');
  const book = getVocabBook();
  if (book.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = book.map((word, idx) => {
    const gradeInfo = GRADES.find(g => g.id === word.gradeId);
    const gradeName = gradeInfo ? gradeInfo.name : '';
    return `<div class="vocab-item">
      <div class="vocab-item-left">
        <span class="vocab-item-en">${word.en}</span>
        <span class="vocab-item-cn">${word.cn}</span>
        <span class="vocab-item-grade">${gradeName}</span>
      </div>
      <div class="vocab-item-actions">
        <button class="btn btn-primary btn-sm" onclick="reviewSingleWord(${idx})">学习</button>
        <button class="btn btn-icon btn-sm" onclick="removeFromVocabList(${idx})" title="移除">✕</button>
      </div>
    </div>`;
  }).join('');
}

function removeFromVocabList(idx) {
  const book = getVocabBook();
  if (idx >= 0 && idx < book.length) {
    const word = book[idx];
    removeWordFromVocab(word.en, word.gradeId);
    renderVocabList();
    updateProfileData();
    showToast('已从生词本移除');
  }
}

function reviewSingleWord(idx) {
  const book = getVocabBook();
  if (idx < 0 || idx >= book.length) return;
  const word = book[idx];
  currentGradeId = word.gradeId;
  currentWords = getWordsForGrade(currentGradeId);
  const wordIndex = currentWords.findIndex(w => w.en === word.en);
  if (wordIndex >= 0) {
    currentIndex = wordIndex;
    isShuffled = false;
    shuffledIndices = [];
    navigateTo('pageLearning', getWordData(currentGradeId).name + ' - 生词复习');
    showWord();
    updateStats();
  }
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  const history = getHistory();
  if (history.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = history.slice(0, 14).map(h =>
    `<div class="history-item"><span class="history-date">${h.date}</span><span class="history-count">学习了 ${h.count} 个单词</span></div>`
  ).join('');
}

function renderGradeProgress() {
  const list = document.getElementById('gradeProgressList');
  list.innerHTML = GRADES.map(grade => {
    const words = getWordsForGrade(grade.id);
    const knownCount = getKnownCount(grade.id);
    const totalCount = words.length;
    const pct = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
    return `<div class="grade-progress-item">
      <span class="grade-progress-name">${grade.name}</span>
      <div class="grade-progress-bar-bg">
        <div class="grade-progress-bar-fill" style="width:${pct}%;background:${grade.color}"></div>
      </div>
      <span class="grade-progress-num">${knownCount}/${totalCount}</span>
    </div>`;
  }).join('');
}

function switchProfileTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  const tabId = 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1);
  const contentId = 'profile' + tab.charAt(0).toUpperCase() + tab.slice(1);
  document.getElementById(tabId).classList.add('active');
  document.getElementById(contentId).classList.add('active');
}

function clearAllData() {
  if (confirm('确定要清除 ' + getCurrentStudentInfo().name + ' 的所有学习数据吗？此操作不可恢复！')) {
    clearStorageData();
    renderGrades();
    updateProfileData();
    showToast('数据已清除');
  }
}

// ====== 生词本复习模式 ======
let reviewVocabList = [];
let reviewIndex = 0;
let reviewMastered = [];

function startReview() {
  const book = getVocabBook();
  if (book.length === 0) { showToast('生词本为空，先添加单词吧！'); return; }
  reviewVocabList = [...book];
  reviewIndex = 0;
  reviewMastered = [];
  navigateTo('pageReview', '生词本复习');
  showReviewWord();
  updateReviewStats();
  document.getElementById('reviewActions').style.display = 'flex';
  document.getElementById('reviewStats').style.display = 'flex';
  document.getElementById('reviewCardFront').style.display = 'flex';
  document.getElementById('reviewCardFront').style.flexDirection = 'column';
  document.getElementById('reviewDetail').style.display = 'none';
}

function addReviewButton() {
  const vocabTab = document.getElementById('profileVocab');
  const div = document.createElement('div');
  div.style.cssText = 'text-align:center;padding:12px 0;';
  div.innerHTML = '<button class="btn btn-success" onclick="startReview()" style="width:100%">📚 开始复习生词本</button>';
  vocabTab.insertBefore(div, vocabTab.firstChild);
}

function showReviewWord() {
  if (reviewIndex >= reviewVocabList.length) {
    document.getElementById('reviewWordEn').textContent = '🎉 复习完成！';
    document.getElementById('reviewCardFront').style.display = 'flex';
    document.getElementById('reviewCardFront').style.flexDirection = 'column';
    document.getElementById('reviewActions').style.display = 'none';
    document.getElementById('reviewDetail').style.display = 'none';
    document.getElementById('reviewStats').style.display = 'none';
    showToast('🎉 生词本复习完成！');
    return;
  }
  const word = reviewVocabList[reviewIndex];
  document.getElementById('reviewWordEn').textContent = word.en;
  document.getElementById('reviewCardFront').style.display = 'flex';
  document.getElementById('reviewCardFront').style.flexDirection = 'column';
  document.getElementById('reviewDetail').style.display = 'none';
  document.getElementById('reviewActions').style.display = 'flex';
  document.getElementById('reviewStats').style.display = 'flex';
  document.getElementById('reviewDetailEn').textContent = word.en;
  document.getElementById('reviewDetailPhonetic').textContent = word.phonetic;
  document.getElementById('reviewDetailCn').textContent = word.cn;
  document.getElementById('reviewDetailExample').textContent = word.example;
  document.getElementById('reviewDetailExampleCn').textContent = word.exampleCn || '';
  updateReviewStats();
}

function reviewKnown() {
  if (reviewIndex >= reviewVocabList.length) return;
  const word = reviewVocabList[reviewIndex];
  removeWordFromVocab(word.en, word.gradeId);
  addKnownWord(word.en, word.gradeId);
  reviewMastered.push(word);
  reviewIndex++;
  showReviewWord();
  showToast(`✅ 已掌握 "${word.en}"`);
}

function reviewShowDetail() {
  document.getElementById('reviewCardFront').style.display = 'none';
  document.getElementById('reviewDetail').style.display = 'block';
  const word = reviewVocabList[reviewIndex];
  if (word) setTimeout(() => speakWord(word.en), 300);
}

function reviewHideDetail() {
  document.getElementById('reviewCardFront').style.display = 'flex';
  document.getElementById('reviewCardFront').style.flexDirection = 'column';
  document.getElementById('reviewDetail').style.display = 'none';
}

function reviewNext() {
  if (reviewIndex >= reviewVocabList.length) return;
  reviewIndex++;
  showReviewWord();
}

function reviewRemoveFromVocab() {
  if (reviewIndex >= reviewVocabList.length) return;
  const word = reviewVocabList[reviewIndex];
  removeWordFromVocab(word.en, word.gradeId);
  reviewIndex++;
  showReviewWord();
  showToast(`已将 "${word.en}" 从生词本移除`);
}

function updateReviewStats() {
  const total = reviewVocabList.length;
  const mastered = reviewMastered.length;
  document.getElementById('reviewProgress').textContent = `${Math.min(reviewIndex, total)}/${total}`;
  document.getElementById('reviewMastered').textContent = `已掌握：${mastered}`;
}

// ====== 键盘快捷键 ======
document.addEventListener('keydown', (e) => {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  if (activePage.id === 'pageLearning') {
    if (e.key === '1') markKnown();
    else if (e.key === '2') showDetail();
    else if (e.key === '3' || e.key === ' ') { e.preventDefault(); nextWord(); }
    else if (e.key === 'Escape') {
      if (document.getElementById('cardDetail').style.display === 'block') hideDetail();
      else goBack();
    }
  } else if (activePage.id === 'pageReview') {
    if (e.key === '1') reviewKnown();
    else if (e.key === '2') reviewShowDetail();
    else if (e.key === '3' || e.key === ' ') { e.preventDefault(); reviewNext(); }
    else if (e.key === 'Escape') {
      if (document.getElementById('reviewDetail').style.display === 'block') reviewHideDetail();
      else goBack();
    }
  } else if (e.key === 'Escape') {
    const ap = document.querySelector('.page.active');
    if (ap && ap.id !== 'pageStudentSelect') goBack();
  }
});

// ====== 初始化 ======
document.addEventListener('DOMContentLoaded', () => {
  const savedStudent = getCurrentStudent();
  const studentExists = STUDENTS.some(s => s.id === savedStudent);
  if (savedStudent && studentExists) {
    // 已有学生，直接进入选年级
    setCurrentStudent(savedStudent);
    renderStudents();
    renderGrades();
    showPage('pageGradeSelect');
    const si = getCurrentStudentInfo();
    document.getElementById('navTitle').textContent = si.emoji + ' ' + si.name + ' · 选择年级';
  } else {
    // 首次使用，展示学生选择页
    renderStudents();
    showPage('pageStudentSelect');
    document.getElementById('navTitle').textContent = '英语单词打卡';
  }
  addReviewButton();
});
