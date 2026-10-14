const $ = (selector) => document.querySelector(selector);

const sourceLanguage = $('#source-language');
const targetLanguage = $('#target-language');
const sourceText = $('#source-text');
const translateButton = $('#translate-button');
const copyButton = $('#copy-button');
const clearButton = $('#clear-button');
const status = $('#status');
const emptyState = $('#empty-state');
const comparison = $('#comparison');
const comparisonHead = $('#comparison-head');
const comparisonList = $('#comparison-list');
const hintEmpty = $('#hint-empty');
const reviewHints = $('#review-hints');

const languageLabels = {
  'zh-Hant': '繁體中文',
  en: '英文',
  ja: '日文',
};

const legalDictionary = {
  en: {
    'shall': '應',
    'must': '應',
    'confidential information': '機密資訊',
    'terminate': '終止',
    'liability': '責任',
    'indemnify': '賠償',
    'governing law': '準據法',
    'dispute resolution': '爭議解決',
    'payment': '付款',
    'within': '於',
  },
  'zh-Hant': {
    '應': 'shall',
    '機密資訊': 'Confidential Information',
    '終止': 'terminate',
    '責任': 'liability',
    '賠償': 'indemnify',
    '準據法': 'governing law',
    '爭議解決': 'dispute resolution',
    '付款': 'payment',
  },
};

const hintRules = [
  {
    title: '義務（Obligation）',
    keywords: [/\bshall\b/i, /\bmust\b/i, /應/, /不得/],
    message: '條款可能含強制義務語氣，可能需要確認義務範圍、履行條件與違約後果。',
  },
  {
    title: '權利（Rights）',
    keywords: [/\bright\b/i, /得以/, /有權/],
    message: '條款可能涉及權利行使，可能需要確認觸發要件、限制條件與通知程序。',
  },
  {
    title: '期限（Term）',
    keywords: [/\bday\b/i, /\bmonth\b/i, /\byear\b/i, /期限/, /日內/, /期間/],
    message: '條款可能涉及期限設定，可能需要確認起算點、展延機制與逾期效果。',
  },
  {
    title: '付款（Payment）',
    keywords: [/\bpayment\b/i, /\bfee\b/i, /\busd\b/i, /付款/, /費用/, /金額/],
    message: '條款可能涉及付款條件，可能需要確認幣別、稅務、付款時點與遲延責任。',
  },
  {
    title: '責任限制（Limitation of Liability）',
    keywords: [/liability/i, /責任限制/, /間接損害/, /consequential/i],
    message: '條款可能涉及責任限制，可能需要確認責任上限、排除範圍與例外情形。',
  },
  {
    title: '終止（Termination）',
    keywords: [/terminate/i, /termination/i, /終止/, /解除/],
    message: '條款可能涉及終止機制，可能需要確認終止事由、補救期間與終止後義務。',
  },
  {
    title: '保密（Confidentiality）',
    keywords: [/confidential/i, /non-disclosure/i, /保密/, /機密/],
    message: '條款可能涉及保密義務，可能需要確認資訊範圍、允許揭露例外與保存期間。',
  },
  {
    title: '準據法（Governing Law）',
    keywords: [/governing law/i, /準據法/, /applicable law/i],
    message: '條款可能涉及準據法安排，可能需要確認法域選擇與強制規範衝突風險。',
  },
  {
    title: '爭議解決（Dispute Resolution）',
    keywords: [/arbitration/i, /court/i, /dispute/i, /爭議解決/, /仲裁/, /管轄法院/],
    message: '條款可能涉及爭議解決程序，可能需要確認管轄、仲裁地與程序語言。',
  },
];

let lastTranslation = '';

const setStatus = (message, tone = '') => {
  status.textContent = message;
  status.className = `status ${tone}`.trim();
};

const splitClauses = (text) => text
  .split(/(?<=[。.!?;；])\s+/)
  .map((item) => item.trim())
  .filter(Boolean);

const applyDictionary = (text, dictionary) => {
  let translated = text;
  Object.entries(dictionary).forEach(([source, target]) => {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'gi');
    translated = translated.replace(pattern, target);
  });
  return translated;
};

const buildMockTranslation = (clause, from, to) => {
  if (from === to) {
    return `【同語言檢視】${clause}`;
  }

  if (from === 'en' && to === 'zh-Hant') {
    const converted = applyDictionary(clause, legalDictionary.en);
    return `【法律語境示範譯文】${converted}`;
  }

  if (from === 'zh-Hant' && to === 'en') {
    const converted = applyDictionary(clause, legalDictionary['zh-Hant']);
    return `[Legal-style draft] ${converted}`;
  }

  return `【Mock 譯文】此為 ${languageLabels[from]}→${languageLabels[to]} 的示範輸出，正式案件可能需要確認專有名詞與法律語氣：${clause}`;
};

const detectHints = (text) => hintRules
  .filter((rule) => rule.keywords.some((keyword) => keyword.test(text)))
  .map(({ title, message }) => ({ title, message }));

const renderComparison = (clauses, translations, from, to) => {
  comparisonHead.innerHTML = `<span>原文（${languageLabels[from]}）</span><span>譯文（${languageLabels[to]}）</span>`;
  comparisonList.innerHTML = clauses
    .map((clause, index) => `<li><div class="clause-row"><p class="clause-cell">${clause}</p><p class="clause-cell">${translations[index]}</p></div></li>`)
    .join('');
  emptyState.hidden = true;
  comparison.hidden = false;
};

const renderHints = (hints) => {
  if (!hints.length) {
    reviewHints.hidden = true;
    hintEmpty.hidden = false;
    return;
  }

  reviewHints.innerHTML = hints
    .map((hint) => `<li><strong>${hint.title}</strong><span>${hint.message}</span></li>`)
    .join('');

  hintEmpty.hidden = true;
  reviewHints.hidden = false;
};

const translateWorkflow = () => {
  const rawText = sourceText.value.trim();
  const from = sourceLanguage.value;
  const to = targetLanguage.value;

  if (!rawText) {
    setStatus('請先輸入原始合約條款，再執行翻譯。', 'error');
    sourceText.focus();
    return;
  }

  if (from === to) {
    setStatus('原文語言與目標語言相同，系統將以同語言檢視模式呈現。', 'error');
  }

  translateButton.disabled = true;
  translateButton.textContent = '處理中…';
  setStatus('正在產生 mock/demo 翻譯與審閱提示，請稍候…');

  window.setTimeout(() => {
    const clauses = splitClauses(rawText);
    const translations = clauses.map((clause) => buildMockTranslation(clause, from, to));
    const hints = detectHints(rawText);

    lastTranslation = translations.join('\n');
    renderComparison(clauses, translations, from, to);
    renderHints(hints);

    setStatus('已完成翻譯與審閱提示生成（mock/demo）。請逐句審閱並由法律專業人士確認。', 'ok');
    translateButton.disabled = false;
    translateButton.textContent = '開始翻譯與審閱';
  }, 700);
};

const copyTranslation = async () => {
  if (!lastTranslation) {
    setStatus('目前沒有可複製的譯文，請先執行翻譯。', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(lastTranslation);
    setStatus('譯文已複製到剪貼簿。', 'ok');
  } catch (error) {
    setStatus('無法直接存取剪貼簿，請手動選取譯文後複製。', 'error');
  }
};

const clearAll = () => {
  sourceText.value = '';
  lastTranslation = '';
  comparison.hidden = true;
  emptyState.hidden = false;
  reviewHints.hidden = true;
  hintEmpty.hidden = false;
  sourceLanguage.value = 'en';
  targetLanguage.value = 'zh-Hant';
  setStatus('已清除內容。您可以輸入新的條款進行翻譯。');
  sourceText.focus();
};

translateButton.addEventListener('click', translateWorkflow);
copyButton.addEventListener('click', copyTranslation);
clearButton.addEventListener('click', clearAll);

sourceText.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    translateWorkflow();
  }
});
