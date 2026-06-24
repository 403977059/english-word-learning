/**
 * localStorage 数据管理 — 支持多学生隔离
 */

const STUDENTS = [
  { id: 'gyc', name: '郭雨晨', emoji: '👧', color: '#E056A0', gender: 'girl' },
  { id: 'gyl', name: '郭雨乐', emoji: '👦', color: '#2D98DA', gender: 'boy' }
];

const STUDENT_KEY = 'app_current_student';

const STORAGE_BASE = {
  VOCAB: 'vocab_book',
  KNOWN: 'known_words',
  LEARNED: 'learned_words',
  HISTORY: 'learning_history',
  PROGRESS: 'grade_progress',
};

// 获取当前学生 ID
function getCurrentStudent() {
  try {
    return localStorage.getItem(STUDENT_KEY);
  } catch { return null; }
}

function getCurrentStudentInfo() {
  const id = getCurrentStudent();
  return STUDENTS.find(s => s.id === id) || STUDENTS[0];
}

function setCurrentStudent(id) {
  localStorage.setItem(STUDENT_KEY, id);
}

// 学生隔离的存储 key
function sk(base) {
  const sid = getCurrentStudent();
  return sid + '_' + base;
}

// ====== 生词本 ======
function getVocabBook() {
  try { return JSON.parse(localStorage.getItem(sk(STORAGE_BASE.VOCAB))) || []; }
  catch { return []; }
}

function saveVocabBook(data) {
  localStorage.setItem(sk(STORAGE_BASE.VOCAB), JSON.stringify(data));
}

function addWordToVocab(word, gradeId) {
  const book = getVocabBook();
  if (book.some(w => w.en === word.en && w.gradeId === gradeId)) return false;
  book.push({ ...word, gradeId, addedAt: Date.now() });
  saveVocabBook(book);
  return true;
}

function removeWordFromVocab(en, gradeId) {
  let book = getVocabBook();
  book = book.filter(w => !(w.en === en && w.gradeId === gradeId));
  saveVocabBook(book);
}

function isInVocabBook(en, gradeId) {
  return getVocabBook().some(w => w.en === en && w.gradeId === gradeId);
}

// ====== 已掌握单词 ======
function getKnownWords(gradeId) {
  try {
    const data = JSON.parse(localStorage.getItem(sk(STORAGE_BASE.KNOWN))) || {};
    return data[gradeId] || [];
  } catch { return []; }
}

function addKnownWord(word, gradeId) {
  const data = JSON.parse(localStorage.getItem(sk(STORAGE_BASE.KNOWN))) || {};
  if (!data[gradeId]) data[gradeId] = [];
  if (!data[gradeId].includes(word)) {
    data[gradeId].push(word);
    localStorage.setItem(sk(STORAGE_BASE.KNOWN), JSON.stringify(data));
  }
}

function getKnownCount(gradeId) {
  return getKnownWords(gradeId).length;
}

function getAllKnownCount() {
  try {
    const data = JSON.parse(localStorage.getItem(sk(STORAGE_BASE.KNOWN))) || {};
    return Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
  } catch { return 0; }
}

// ====== 已学习单词 ======
function getLearnedWords(gradeId) {
  try {
    const data = JSON.parse(localStorage.getItem(sk(STORAGE_BASE.LEARNED))) || {};
    return data[gradeId] || [];
  } catch { return []; }
}

function addLearnedWord(word, gradeId) {
  const data = JSON.parse(localStorage.getItem(sk(STORAGE_BASE.LEARNED))) || {};
  if (!data[gradeId]) data[gradeId] = [];
  if (!data[gradeId].includes(word)) {
    data[gradeId].push(word);
    localStorage.setItem(sk(STORAGE_BASE.LEARNED), JSON.stringify(data));
  }
}

function getTotalLearnedCount() {
  try {
    const data = JSON.parse(localStorage.getItem(sk(STORAGE_BASE.LEARNED))) || {};
    return Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
  } catch { return 0; }
}

// ====== 学习历史 ======
function getHistory() {
  try { return JSON.parse(localStorage.getItem(sk(STORAGE_BASE.HISTORY))) || []; }
  catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(sk(STORAGE_BASE.HISTORY), JSON.stringify(history));
}

function addHistoryEntry(count) {
  const history = getHistory();
  const today = new Date().toISOString().split('T')[0];
  const existing = history.find(h => h.date === today);
  if (existing) {
    existing.count = Math.max(existing.count, count);
  } else {
    history.unshift({ date: today, count });
  }
  if (history.length > 60) history.length = 60;
  saveHistory(history);
}

function getLearningDays() { return getHistory().length; }

function getStreak() {
  const history = getHistory();
  if (history.length === 0) return 0;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const hasToday = history.some(h => h.date === todayStr);
  const hasYesterday = history.some(h => h.date === yesterdayStr);
  if (!hasToday && !hasYesterday) return 0;
  let checkDate = hasToday ? today : yesterday;
  let streak = 0;
  for (const h of history) {
    const hDate = new Date(h.date);
    const diff = Math.floor((checkDate - hDate) / (1000 * 60 * 60 * 24));
    if (diff === streak) { streak++; }
    else if (diff > streak) { break; }
  }
  return streak;
}

function getThisWeekDays() {
  const history = getHistory();
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const mondayStr = monday.toISOString().split('T')[0];
  return history.filter(h => h.date >= mondayStr).length;
}

function getThisMonthDays() {
  const history = getHistory();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().split('T')[0];
  return history.filter(h => h.date >= monthStartStr).length;
}

// ====== 清除数据（当前学生） ======
function clearStorageData() {
  Object.values(STORAGE_BASE).forEach(b => {
    localStorage.removeItem(sk(b));
  });
}

// ====== 清除所有学生数据（危险） ======
function clearAllStudentsData() {
  for (const s of STUDENTS) {
    Object.values(STORAGE_BASE).forEach(b => {
      localStorage.removeItem(s.id + '_' + b);
    });
  }
  localStorage.removeItem(STUDENT_KEY);
}
