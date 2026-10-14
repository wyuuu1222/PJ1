const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const toast = (message) => {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  window.clearTimeout(window.toastTimer);
  window.toastTimer = window.setTimeout(() => el.classList.remove('show'), 2800);
};

const viewNames = { dashboard: '工作總覽', translator: '合約翻譯', glossary: '術語辭典', history: '審閱紀錄', settings: '系統設定' };
const showView = (name) => {
  $$('.view').forEach((view) => { view.hidden = !view.id.startsWith(`${name}-`); });
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === name));
  $('#page-title').textContent = viewNames[name] || '工作總覽';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

$$('.nav-item').forEach((item) => item.addEventListener('click', (event) => {
  event.preventDefault();
  showView(item.dataset.view);
  history.replaceState(null, '', `#${item.dataset.view}`);
}));

$$('[data-view-link]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.viewLink)));
$$('[data-scroll-to]').forEach((button) => button.addEventListener('click', () => {
  const target = button.dataset.scrollTo;
  if (target === 'translator') showView('translator');
  else document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
}));

const uploadZone = $('#upload-zone');
const fileInput = $('#file-input');
const selectedFile = $('#selected-file');
const fileName = $('#file-name');
const fileSize = $('#file-size');
const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
const setFile = (file) => {
  if (!file) return;
  fileName.textContent = file.name;
  fileSize.textContent = `${formatSize(file.size)} · 已準備上傳`;
  selectedFile.hidden = false;
  toast(`已選取文件：${file.name}`);
};

$('#choose-file').addEventListener('click', (event) => { event.stopPropagation(); fileInput.click(); });
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') fileInput.click(); });
fileInput.addEventListener('change', () => setFile(fileInput.files[0]));
['dragenter', 'dragover'].forEach((eventName) => uploadZone.addEventListener(eventName, (event) => { event.preventDefault(); uploadZone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach((eventName) => uploadZone.addEventListener(eventName, (event) => { event.preventDefault(); uploadZone.classList.remove('dragging'); }));
uploadZone.addEventListener('drop', (event) => setFile(event.dataTransfer.files[0]));
$('#remove-file').addEventListener('click', () => { fileInput.value = ''; selectedFile.hidden = true; toast('已移除文件'); });

$('#translate-button').addEventListener('click', () => {
  const button = $('#translate-button');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<span>◌</span> 正在分析條款…';
  window.setTimeout(() => { button.disabled = false; button.innerHTML = original; toast('翻譯完成，已產生 12 項條款審閱提醒'); showView('translator'); }, 1600);
});

$('#export-button')?.addEventListener('click', () => toast('審閱版已準備完成（展示功能）'));
$('#dismiss-notice').addEventListener('click', (event) => event.currentTarget.closest('.notice-banner').remove());
$$('.confirm-alert').forEach((button) => button.addEventListener('click', () => { button.textContent = '已確認'; button.disabled = true; button.style.color = '#238b67'; toast('提醒已標記為確認'); }));
$$('.review-check').forEach((button) => button.addEventListener('click', () => { button.textContent = '✓ 已標記審閱'; button.disabled = true; toast('條款已標記為完成審閱'); }));

$('#glossary-search')?.addEventListener('input', (event) => {
  const query = event.target.value.trim().toLowerCase();
  $$('.glossary-card').forEach((card) => { card.hidden = query && !card.textContent.toLowerCase().includes(query); });
});

const initialView = window.location.hash.replace('#', '');
if (viewNames[initialView]) showView(initialView);
