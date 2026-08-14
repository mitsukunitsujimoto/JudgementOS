/**
 * JudgmentOS Version 2.0 第一段階（既定UI）
 * 見せる体験: 話す → 自分の基準が見える → AIに渡せる
 * 内部に残す: 実現×守る、制約、映し返し（確認）、掘る（なぜ守るか）、論点（核心の材料）、判断文脈、振り返り相当
 *
 * 残す: structure-intro / hypotheses / store / 招待・同意
 * UIから隠す: 映し返し・掘る・論点・判断文脈・振り返りの工程名
 * 会話へ吸収: 映し返し（203の自然な返し）、掘る（曖昧なときだけ205）
 * 裏側へ: 論点抽出・制約タグ・structure-intro
 * 任意化: 振り返り（210）
 * 統合: 固定5問を可変フォローへ。クライマックス＝判断原則→AIに渡す
 * 新設: infer-principle API、Layer1-3
 *
 * ?flow=classic で 1.5 画面（工程名つき）
 * ?flow=legacy で judgmentos-v12.legacy.js
 */
(function () {
  'use strict';

  const INCLUDE_REPLY_PATTERN_IN_FLOW = false;
  const APP_FLOW = 'v20';

  function useJos20Ui() {
    try {
      return new URLSearchParams(window.location.search).get('flow') !== 'classic';
    } catch (_) {
      return true;
    }
  }

  /**
   * 将来拡張 — シナリオ別・問い返す型ライブラリ
   * 例: AI / 部下 / お客様 / 上司 / 取締役会
   * 中核体験の検証後に、シナリオ選択として接続する想定。
   */
  const REPLY_PATTERN_LIBRARY = [
    {
      id: 'subordinate_ai',
      title: '部下がこう言ったとき。',
      quote: '「AIがこう言っています。」',
      help: 'あなたが自然に返す型です。一度、心の中で言ってみてください。',
      questions: [
        'AIに何を渡したの？',
        'その前に、自分自身と十分向き合った？',
        '実現したいこと、守りたいもの、制約まで渡した？'
      ]
    },
    {
      id: 'ai_direct',
      title: 'AIがこう言ってきたとき。',
      quote: '「最適解はこれです。」',
      help: '答えを受け取る前に、判断文脈を問い返す型です。',
      questions: [
        'この答えは、どの判断文脈を前提にしている？',
        '実現したいことと守りたいものは、渡されている？',
        'いま足りない判断文脈は何か？'
      ]
    },
    {
      id: 'customer',
      title: 'お客様がこう言ったとき。',
      quote: '「御社の提案はこうですよね。」',
      help: '相手の言葉の奥にある判断文脈を確かめる型です。',
      questions: [
        'お客様は、何を実現したいと言っている？',
        '何を守りたい／失いたくないと言っている？',
        '制約として置いている条件は何か？'
      ]
    },
    {
      id: 'boss',
      title: '上司がこう言ったとき。',
      quote: '「とりあえず進めて。」',
      help: '指示の手前にある判断文脈を言語化する型です。',
      questions: [
        'この指示で実現したいことは何か？',
        '進めるうえで守るものは何か？',
        '無視できない制約は何か？'
      ]
    },
    {
      id: 'board',
      title: '取締役会でこう言われたとき。',
      quote: '「その判断の根拠は？」',
      help: '説明の前に、渡す判断文脈を整える型です。',
      questions: [
        '実現したいことと守りたいものは、一言で言えるか？',
        '制約と前提は、どこまで共有されているか？',
        'まだ渡せていない判断文脈は何か？'
      ]
    }
  ];

  const AI_PASS_CLOSING = `答えや最適案は出さないでください。断定せず、論点として示してください。
目的は、気づいていない論点を掘り起こし、あとで振り返って最初の判断を見直す材料を渡すことです。決めるのは私です。

必ず次の形式だけで返してください。前置きや長い解説は不要です。各見出しの下に論点を1〜3個。
番号付きの行は必ず「論点1:」「論点2:」と書くこと。「仮説」という語は使わない（「仮説1:」も禁止）。

【見落としている前提】
論点1: （一文）
論点2: （一文）

【別の立場からの見方】
論点1: （一文）

【長期的な影響】
論点1: （一文）

【リスク】
論点1: （一文）

【まだ考えていない決定事項・選択肢】
論点1: （一文）

【入口の判断が、本当に問うべき判断に変わるとしたら】
候補1: （一文）
候補2: （一文）`;

  /** モデル／貼り付けの旧表記を論点に揃える */
  function normalizeRontenLabels(raw) {
    return String(raw || '')
      .replace(/\r\n/g, '\n')
      .replace(/仮説(\s*\d+\s*[:：])/g, '論点$1')
      .replace(/^仮説(\s*[:：])/gm, '論点$1');
  }

  const DEMO = {
    background: '来期のAI投資を、半年以内に効果を示せという圧力の中で承認するかどうか、現場から急かされている。',
    achieve: 'AIを使っても、経営判断の質と責任の所在が薄まらない形で導入する。',
    decision: '来期のAI投資を承認するか、見送りか、条件付きにするかを決める。',
    protect: '現場の自律と判断責任。顧客との信頼。答えに依存しない文化。',
    criteriaCore: '判断を引き受ける人が残り、短絡的な答えだけで決めないこと。',
    criteriaMust: '判断を引き受ける人が残ること。',
    criteriaWant: '半年以内に効果の兆しを示せること。',
    weightResolve: '効果の速さより、判断を引き受ける人が残るかを強く見る。最終判断は自分が引き受ける。'
  };

  function emptyCriteriaGrowth() {
    return {
      firstMe: '',
      nowMe: '',
      criteriaChange: '',
      truePurpose: '',
      // 旧データ互換（画面では使わない）
      changeTags: [],
      keyInsight: '',
      keepSentence: ''
    };
  }

  function criteriaHighlight(growth) {
    if (!growth) return '';
    return (growth.criteriaChange || growth.keepSentence || growth.keyInsight || '').trim();
  }

  function hasCriteriaReflection(growth) {
    if (!growth) return false;
    return !!(
      (growth.firstMe || '').trim()
      || (growth.nowMe || '').trim()
      || (growth.truePurpose || '').trim()
      || criteriaHighlight(growth)
    );
  }

  const state = {
    concerns: [],
    theme: '',
    background: '',
    achieve: '',
    decision: '',
    protect: '',
    criteriaCore: '',
    criteriaMust: '',
    criteriaWant: '',
    weightResolve: '',
    constraints: '',
    gapQuestions: [],
    gapInsights: {},
    missingArea: '',
    nextSentence: '',
    newJudgment: '',
    decisionInitial: '',
    contextBefore: '',
    contextBeforeParts: null,
    aiReplyPaste: '',
    hypotheses: [],
    selectedHypothesisIds: [],
    decisionCandidates: [],
    selectedDecisionCandidate: '',
    hypothesesContextKey: '',
    hypothesesStale: false,
    hypothesesSource: '', // 'b' | 'a'
    hypogenError: '',
    hypogenBusy: false,
    reflection: { newPerspective: '', discomfort: '', contextChange: '' },
    reflectionQ: 0,
    contextAfterText: '',
    criteriaGrowth: emptyCriteriaGrowth(),
    activeThemeId: null,
    activeEntryId: null,
    browseThemeId: null,
    judgmentSessionId: '',
    // 導入UX（テーマ選択 → 吐き出し → 自動構造化 → 映し返し）
    introCategoryId: '',
    introDump: '',
    introExtractSource: '',
    introConstraintTags: [],
    introBusy: false,
    introFetchStarted: false,
    introEditAchieve: false,
    introEditProtect: false,
    introChange: null, // { previousYou, nowSuggestion, source, pastDate } | null
    introDigDone: false,
    introDigFocusId: '',
    introDigNote: '',
    changeSummary: null, // { headline, beforeSummary, afterSummary, criteriaShift, takeaway, source }
    changeSummaryBusy: false,
    changeSummaryStarted: false,
    principle: '',
    principleEdited: '',
    principleFeedback: '',
    handoffText: '',
    judgmentCore: '',
    jos20Busy: false,
    jos20Started: false,
    jos20AskCount: 0,
    jos20AskKind: '',
    jos20WhyAsked: false,
    jos20BoundaryAsked: false,
    jos20BoundaryQuestion: '',
    jos20BoundaryAnswer: '',
    jos20DetectStarted: false
  };

  const INTRO_CATEGORIES = [
    { id: 'strategy', title: '戦略・投資・撤退', hint: '新規事業、予算配分、事業のやめ時' },
    { id: 'org', title: '組織・人・意思決定', hint: 'アサイン、評価、チームの衝突' },
    { id: 'ai_dissonance', title: 'AIや提案への『違和感』', hint: '上がってきた提案・AIの回答に納得がいかない' },
    { id: 'vague', title: 'とにかくモヤモヤしている', hint: 'テーマがまだ定まっていない' }
  ];

  /** 映し返し後に1回だけ回す「掘る場所」 */
  const INTRO_DIG_FOCUSES = [
    {
      id: 'realize',
      title: '実現したいことが、まだふわっとしている',
      hint: '向かいたい姿が、施策や数字の話に戻ってしまう',
      prompt: '「本当はこうなっていてほしい」を、施策名を使わずに一文で書いてください。'
    },
    {
      id: 'protect',
      title: '守りたいものが、後回しになっている',
      hint: '大切なものが見えていても、判断の前面に出ていない',
      prompt: 'この判断で崩したくないものを、人・関係・文化などの言葉で一文にしてください。'
    },
    {
      id: 'who',
      title: '誰の何に向き合っているかがぼやけている',
      hint: '相手や現場が見えないまま、打ち手の話になっている',
      prompt: 'いちばん影響を受ける人は誰で、その人にとって何がかかっているか、一文で書いてください。'
    }
  ];

  const HYPOGEN_KEY = 'judgmentos.v14.hypogen';
  const HYPOGEN_LIMIT_JUDGMENT = 3;
  const HYPOGEN_LIMIT_DAY = 10;

  let step = 201;
  let farthestStep = 201;
  let concernDraft = '';
  let viewMode = 'flow'; // flow | history | theme

  // 101–104 → 105–107（掘る循環1周）→ ⑥以降。旧①–⑤は履歴復帰用に残す
  const STEP_ORDER = [201, 202, 203, 204, 205, 211, 206, 207, 208, 209, 210, 101, 102, 103, 104, 105, 106, 107, 6, 7, 8, 9, 10, 13, 14, 17, 15, 16, 18, 11, 12, 1, 2, 3, 4, 5];

  function stepIndex(s) {
    return STEP_ORDER.indexOf(s);
  }

  function markFarthest() {
    if (stepIndex(step) > stepIndex(farthestStep)) farthestStep = step;
  }

  function hasReachedStep(target) {
    return stepIndex(farthestStep) >= stepIndex(target);
  }

  function previousStep(s) {
    const i = stepIndex(s);
    if (i > 0) return STEP_ORDER[i - 1];
    return null;
  }

  function phaseEntryStep(phaseId) {
    if (phaseId === 'think') return 101;
    if (phaseId === 'judge') {
      if (hasReachedStep(14) && (state.hypotheses.length || state.aiReplyPaste)) return 14;
      return 13;
    }
    // 旧 id 互換
    if (phaseId === 'pass' || phaseId === 'return') return phaseEntryStep('judge');
    if (phaseId === 'reflect' || phaseId === 'grow') return hasReachedStep(18) || hasReachedStep(16) ? (hasReachedStep(18) ? 18 : 16) : 15;
    return 101;
  }

  function canGoToPhase(phaseId) {
    if (phaseId === 'think') return true;
    if (phaseId === 'judge' || phaseId === 'pass' || phaseId === 'return') return hasReachedStep(13);
    if (phaseId === 'reflect' || phaseId === 'grow') return hasReachedStep(15);
    return false;
  }

  function goToPhase(phaseId) {
    if (!canGoToPhase(phaseId)) return;
    step = phaseEntryStep(phaseId);
    viewMode = 'flow';
    render();
  }

  function stepBackHtml() {
    if (previousStep(step) == null) return '';
    return `<button type="button" id="btn-step-back" class="step-back">← 前の画面に戻る</button>`;
  }

  function bindFlowNav() {
    document.querySelectorAll('[data-phase]').forEach((el) => {
      el.onclick = () => {
        const id = el.getAttribute('data-phase');
        if (!id || !canGoToPhase(id)) return;
        // 「考えている」はいつでも導入の先頭へ戻り、書き直せる
        if (id === 'think') {
          step = useJos20Ui() ? 201 : 101;
          render();
          return;
        }
        goToPhase(id);
      };
    });
    const back = document.getElementById('btn-step-back');
    if (back) {
      back.onclick = () => {
        const prev = previousStep(step);
        if (prev == null) return;
        step = prev;
        render();
      };
    }
  }

  function syncThemeFromBackground() {
    state.theme = (state.decision || state.background || '').trim();
    state.concerns = state.theme ? [state.theme] : [];
  }

  /** 旧ストア互換用に、判断基準まわりを constraints 文字列へ要約 */
  function criteriaAsConstraintsText() {
    const lines = [];
    if (state.criteriaCore.trim()) lines.push(`【いちばん大切】${state.criteriaCore.trim()}`);
    if (state.criteriaMust.trim()) lines.push(`【絶対に譲れない】${state.criteriaMust.trim()}`);
    if (state.criteriaWant.trim()) lines.push(`【できれば満たしたい】${state.criteriaWant.trim()}`);
    if (state.weightResolve.trim()) lines.push(`【いちばん強く効いていること／引き受ける範囲】${state.weightResolve.trim()}`);
    if (state.decision.trim()) lines.push(`【決めること】${state.decision.trim()}`);
    return lines.join('\n');
  }

  function ensureSentenceEnd(s) {
    const t = s.trim();
    if (!t) return '';
    return /[。．.!？?]$/.test(t) ? t : `${t}。`;
  }

  function filledGapInsights() {
    return state.gapQuestions
      .map((g, i) => ({
        key: g.key,
        index: i + 1,
        ask: g.ask,
        text: (state.gapInsights[g.key] || '').trim()
      }))
      .filter(x => x.text);
  }

  /** ローカル候補（AIではない）。複数あればいちばん具体的な一文を選ぶ */
  function proposeSentenceFromInsights() {
    const lines = filledGapInsights().map(x => x.text);
    if (!lines.length) return '';
    if (lines.length === 1) return ensureSentenceEnd(lines[0]);
    const best = lines.slice().sort((a, b) => b.length - a.length)[0];
    return ensureSentenceEnd(best);
  }

  function buildInsightIntegratePrompt() {
    const insights = filledGapInsights();
    const list = insights.map(x => `${x.index}. ${x.text}`).join('\n');
    return `【依頼】
以下は、JudgmentOSの問いに対して利用者が残した気づき（各一文）です。
これらを踏まえ、判断文脈に追加すべき一文だけを提案してください。
答えや診断ではなく、渡す判断文脈に足す一文にしてください。

出力は次の形式の一行だけにしてください。
判断文脈に加えるなら、この一文です。「（ここに一文）」

【既存の判断文脈】
${buildContextPack()}

【問いから生まれた気づき】
${list || '（なし）'}`;
  }

  function gapInsightsTrailHtml() {
    const insights = filledGapInsights();
    if (!insights.length) return '';
    return `<div class="answered-trail">
      <strong>この問いで気づいたこと</strong><br>
      ${insights.map(x => `<span class="block mt-1">問い${x.index} · ${escapeHtml(x.text)}</span>`).join('')}
    </div>`;
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function quoteLines(text) {
    return text.trim().split(/\n+/).map(l => l.trim()).filter(Boolean);
  }

  function buildMirrorA() {
    return { achieve: state.achieve.trim(), protect: state.protect.trim() };
  }

  function buildMirrorB() {
    return {
      theme: (state.background || state.theme).trim(),
      background: state.background.trim(),
      achieve: state.achieve.trim(),
      decision: state.decision.trim(),
      protect: state.protect.trim(),
      criteriaCore: state.criteriaCore.trim(),
      criteriaMust: state.criteriaMust.trim(),
      criteriaWant: state.criteriaWant.trim(),
      weightResolve: state.weightResolve.trim(),
      constraints: quoteLines(state.constraints || criteriaAsConstraintsText())
    };
  }

  function buildReflection() {
    const a = buildMirrorA();
    return `あなたは
「${a.achieve}」
と考えています。

一方で、
「${a.protect}」
と考えています。

この二つを両立させながら考えることが、今回のテーマになりそうです。`;
  }

  function buildContextPack() {
    return `${formatContextParts(buildContextParts())}

【いまの言葉を並べて見る】
${buildReflection()}`;
  }

  function buildContextParts() {
    syncThemeFromBackground();
    state.constraints = criteriaAsConstraintsText();
    return {
      theme: state.theme.trim(),
      background: state.background.trim(),
      achieve: state.achieve.trim(),
      decision: state.decision.trim(),
      protect: state.protect.trim(),
      criteriaCore: state.criteriaCore.trim(),
      criteriaMust: state.criteriaMust.trim(),
      criteriaWant: state.criteriaWant.trim(),
      weightResolve: state.weightResolve.trim(),
      constraints: state.constraints.trim(),
      addedSentence: state.nextSentence.trim(),
      flow: APP_FLOW
    };
  }

  function formatContextParts(parts) {
    if (!parts) return '';
    // v14
    if (parts.background || parts.decision || parts.criteriaCore || parts.criteriaMust || parts.flow === 'v14') {
      let t = `【いま判断しようとしていること】
${parts.decision || parts.theme || ''}

【背景（この判断が必要な理由）】
${parts.background || ''}

【本来実現したいこと（経営者として向かいたい姿）】
${parts.achieve || ''}

【守りたいもの・崩したくないもの】
${parts.protect || ''}

【いちばん大切にしたいこと】
${parts.criteriaCore || ''}

【そのうち、絶対に譲れないもの】
${parts.criteriaMust || '（未記入）'}

【できれば満たしたいもの】
${parts.criteriaWant || '（未記入）'}

【いちばん強く効いていること／引き受ける範囲】
${parts.weightResolve || ''}`;
      if ((parts.addedSentence || '').trim()) {
        t += `

【問いを通じて加えた一文】
${parts.addedSentence.trim()}`;
      }
      return t;
    }
    // legacy parts
    const constraints = quoteLines(parts.constraints || '');
    let t = `【今日のテーマ】
${parts.theme || ''}

【実現したいこと】
${parts.achieve || ''}

【守りたいもの】
${parts.protect || ''}

【無視できない条件】
${constraints.map(c => `· ${c}`).join('\n') || '·'}`;
    if ((parts.addedSentence || '').trim()) {
      t += `

【問いを通じて加えた一文】
${parts.addedSentence.trim()}`;
    }
    return t;
  }

  function buildAiPassText() {
    const parts = state.contextBeforeParts || buildContextParts();
    return `【JudgmentOS — 判断文脈】

ここまでに、私が言葉にした判断文脈です。
この内容を前提に対話してください。

${formatContextParts(parts)}

——
${AI_PASS_CLOSING}`;
  }

  function snapshotBeforePass() {
    state.contextBeforeParts = buildContextParts();
    state.contextBefore = formatContextParts(state.contextBeforeParts);
    if (!state.decisionInitial) {
      state.decisionInitial = (state.decision || '').trim();
    }
  }

  function proposeAfterFromReflection() {
    const base = state.contextBefore || formatContextParts(buildContextParts());
    const picked = (state.hypotheses || [])
      .filter((h) => state.selectedHypothesisIds.includes(h.id))
      .map((h) => `· [${h.category}] ${h.text}`);
    const note = (state.reflection.contextChange || '').trim();
    let t = base;
    if (picked.length) {
      t += `

【採った論点】
${picked.join('\n')}`;
    }
    if (note) {
      t += `

【自分の一言】
${note}`;
    }
    return t;
  }

  /** AIの番号付き論点／候補を読み取る（論点・仮説の両方の表記に対応） */
  function parseHypothesesFromAi(raw) {
    const text = (raw || '').replace(/\r\n/g, '\n').trim();
    if (!text) return { hypotheses: [], decisionCandidates: [] };
    const hypotheses = [];
    const decisionCandidates = [];
    let category = '論点';
    let inDecision = false;
    let n = 0;
    const lines = text.split('\n');
    for (const line0 of lines) {
      const line = line0.trim();
      if (!line) continue;
      const cat = line.match(/^【\s*([^】]+?)\s*】$/);
      if (cat) {
        category = cat[1].trim();
        inDecision = /持ち上が|本当に問うべき|判断しようとしていること|入口の判断/.test(category);
        continue;
      }
      let body = '';
      let m = line.match(/^(?:論点|仮説|候補)\s*\d+\s*[:：]\s*(.+)$/);
      if (m) body = m[1].trim();
      if (!body) {
        m = line.match(/^\d+\s*[\.\)、．]\s*(.+)$/);
        if (m) body = m[1].trim();
      }
      if (!body) {
        m = line.match(/^[-・*]\s*(.+)$/);
        if (m) body = m[1].trim();
      }
      if (!body || body.length < 4) continue;
      n += 1;
      if (inDecision) {
        decisionCandidates.push({ id: `dec-${decisionCandidates.length + 1}`, category, text: body });
      } else {
        hypotheses.push({ id: `hyp-${hypotheses.length + 1}`, category, text: body });
      }
    }
    // 見出しなしのフォールバック
    if (!hypotheses.length && !decisionCandidates.length) {
      text.split('\n').map((l) => l.trim()).filter((l) => l.length >= 12 && !/^#{1,3}\s/.test(l)).slice(0, 12).forEach((body, i) => {
        hypotheses.push({ id: `hyp-${i + 1}`, category: '論点', text: body.replace(/^[*-・]\s*/, '') });
      });
    }
    return { hypotheses, decisionCandidates };
  }

  function applyAiPasteParse(source) {
    state.aiReplyPaste = normalizeRontenLabels(state.aiReplyPaste);
    const parsed = parseHypothesesFromAi(state.aiReplyPaste);
    state.hypotheses = parsed.hypotheses;
    state.decisionCandidates = parsed.decisionCandidates;
    const ids = new Set(state.hypotheses.map((h) => h.id));
    state.selectedHypothesisIds = (state.selectedHypothesisIds || []).filter((id) => ids.has(id));
    if (source) state.hypothesesSource = source;
    markHypothesesFresh();
  }

  function ensureJudgmentSessionId() {
    if (!state.judgmentSessionId) {
      state.judgmentSessionId = `j-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }
    return state.judgmentSessionId;
  }

  function hypogenTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function hypogenJudgmentKey() {
    return state.activeEntryId || ensureJudgmentSessionId();
  }

  function loadHypogenUsage() {
    try {
      return JSON.parse(localStorage.getItem(HYPOGEN_KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function getHypogenCounts() {
    const data = loadHypogenUsage();
    const day = (data.days && data.days[hypogenTodayKey()]) || 0;
    const judgment = (data.judgments && data.judgments[hypogenJudgmentKey()]) || 0;
    return { day, judgment };
  }

  function canGenerateHypotheses() {
    const u = getHypogenCounts();
    if (u.judgment >= HYPOGEN_LIMIT_JUDGMENT) {
      return {
        ok: false,
        reason: `この判断では論点を出し直せる回数が上限（${HYPOGEN_LIMIT_JUDGMENT}回）です。文脈を直すか、自分のAIを使うか、別の判断でお試しください。`
      };
    }
    if (u.day >= HYPOGEN_LIMIT_DAY) {
      return {
        ok: false,
        reason: `本日の論点提示が上限（${HYPOGEN_LIMIT_DAY}回）です。明日またお試しいただくか、自分のAIをご利用ください。`
      };
    }
    return { ok: true, remainingJudgment: HYPOGEN_LIMIT_JUDGMENT - u.judgment };
  }

  function recordHypogenUse() {
    const data = loadHypogenUsage();
    if (!data.days) data.days = {};
    if (!data.judgments) data.judgments = {};
    const tk = hypogenTodayKey();
    const jk = hypogenJudgmentKey();
    data.days[tk] = (data.days[tk] || 0) + 1;
    data.judgments[jk] = (data.judgments[jk] || 0) + 1;
    try {
      localStorage.setItem(HYPOGEN_KEY, JSON.stringify(data));
    } catch (_) { /* ignore */ }
  }

  function contextFingerprint() {
    return formatContextParts(buildContextParts());
  }

  function markHypothesesFresh() {
    state.hypothesesContextKey = contextFingerprint();
    state.hypothesesStale = false;
  }

  function refreshHypothesesStaleFlag() {
    if (!state.hypotheses.length) {
      state.hypothesesStale = false;
      return false;
    }
    if (!state.hypothesesContextKey) {
      state.hypothesesStale = true;
      return true;
    }
    state.hypothesesStale = state.hypothesesContextKey !== contextFingerprint();
    return state.hypothesesStale;
  }

  function clearHypothesesForRegen() {
    state.hypotheses = [];
    state.selectedHypothesisIds = [];
    state.decisionCandidates = [];
    state.selectedDecisionCandidate = '';
    state.hypothesesStale = false;
    state.hypothesesContextKey = '';
    state.hypogenError = '';
  }

  function builtinAiAllowed() {
    const Access = window.JudgmentOSAccess;
    if (isDevMode()) return true;
    if (!Access || typeof Access.canUseBuiltinAi !== 'function') return false;
    return Access.canUseBuiltinAi();
  }

  async function requestBuiltinHypotheses(isRetry) {
    const gate = canGenerateHypotheses();
    if (!gate.ok) {
      return { ok: false, reason: gate.reason, code: 'LIMIT' };
    }
    if (!builtinAiAllowed()) {
      return {
        ok: false,
        reason: '外部AIへの送信に同意していないため、この画面で論点を出す機能は使えません。自分のChatGPTなどを使う方法へ。',
        code: 'NO_CONSENT'
      };
    }

    snapshotBeforePass();
    const contextText = formatContextParts(state.contextBeforeParts || buildContextParts());
    const Access = window.JudgmentOSAccess;
    const profile = Access && Access.getProfile ? Access.getProfile() : null;
    let inviteCode = (Access && Access.getInviteCode && Access.getInviteCode())
      || (profile && profile.inviteCode)
      || '';
    let inviteId = (Access && Access.getInviteId && Access.getInviteId())
      || (profile && profile.inviteId)
      || '';

    // ?dev=1 や旧データで id/code が食い違うと API が拒否するため揃える
    if (isDevMode() && (!inviteCode || inviteId === 'dev' || !inviteId)) {
      inviteCode = inviteCode || 'JOS-MONITOR-001';
      inviteId = 'monitor-001';
    }
    if (!inviteCode && inviteId && inviteId !== 'dev' && window.JudgmentOSInviteCodes) {
      const byId = window.JudgmentOSInviteCodes.findById(inviteId);
      if (byId && byId.code) inviteCode = byId.code;
    }
    if (inviteCode && window.JudgmentOSInviteCodes) {
      const hit = window.JudgmentOSInviteCodes.findByCode(inviteCode);
      if (hit && hit.id) inviteId = hit.id;
    }
    if (!inviteCode) {
      return {
        ok: false,
        reason: '招待情報を確認できません。トップから招待コードで入り直すか、?dev=1 でお試しください。',
        code: 'INVITE_MISSING'
      };
    }

    const payload = {
      contextText,
      inviteCode,
      inviteId,
      securityConsent: true
    };

    let res;
    try {
      res = await fetch('/api/generate-hypotheses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (_) {
      return {
        ok: false,
        reason: 'いまは論点を示せません。自分のChatGPTなどを使う方法をご利用ください。',
        code: 'NETWORK',
        retryable: true
      };
    }

    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }

    if (!res.ok || !data || !data.ok) {
      const retryable = !!(data && data.retryable) || res.status >= 500;
      if (retryable && !isRetry) {
        return requestBuiltinHypotheses(true);
      }
      return {
        ok: false,
        reason: (data && data.reason) || 'いまは論点を示せません。自分のChatGPTなどを使う方法へ。',
        code: (data && data.code) || 'ERROR',
        retryable
      };
    }

    state.aiReplyPaste = normalizeRontenLabels(data.text || '');
    applyAiPasteParse('b');
    if (!state.hypotheses.length && !state.decisionCandidates.length) {
      return {
        ok: false,
        reason: '論点の形式を読み取れませんでした。もう一度お試しいただくか、自分のChatGPTなどを使う方法へ。',
        code: 'PARSE_EMPTY',
        retryable: true
      };
    }
    recordHypogenUse();
    return { ok: true };
  }

  /** A非常口: 文面コピー → 貼って判定 */
  function renderPathACopy() {
    const root = document.getElementById('dialogue');
    if (!root) return;
    markFarthest();
    snapshotBeforePass();
    const parts = state.contextBeforeParts;
    const prog = `${phaseNavHtml()}${stepBackHtml()}<p class="step-progress"><em>JudgmentOS</em> · ${escapeHtml(progressLabel())}</p>`;
    root.innerHTML = `
      <section class="space-y-4 fade-in">
        ${prog}
        <p class="q-title">自分のAIへ渡す（コピーして使う）</p>
        <p class="q-help">いま言葉にした内容をコピーし、任意のAIに貼ってください。返ってきた論点を次で選びます。「いちばん良い案を出して」とは書かない依頼文です。</p>
        <div class="mirror-summary">
          <pre class="compare-body" style="white-space:pre-wrap">${escapeHtml(formatContextParts(parts))}</pre>
        </div>
        <div class="flex flex-col gap-2">
          <button type="button" id="btn-copy-ai" class="btn btn-primary w-full">AIへ渡す文面をコピー</button>
          <span id="copy-ai-toast" class="hidden text-xs text-center text-[hsl(var(--primary))]">コピーしました。返ってきた論点を次で貼り付けます。</span>
          <button type="button" id="btn-return" class="btn btn-ghost w-full">論点が返ってきたら、判定する</button>
          ${builtinAiAllowed() ? `<button type="button" id="btn-back-b" class="btn btn-ghost w-full">この画面で論点を出すに戻る</button>` : ''}
        </div>
      </section>`;
    document.getElementById('btn-copy-ai').onclick = () => copyText(buildAiPassText(), 'copy-ai-toast');
    document.getElementById('btn-return').onclick = () => {
      state.pathAMode = true;
      state.hypothesesSource = 'a';
      step = 14;
      render();
    };
    const backB = document.getElementById('btn-back-b');
    if (backB) {
      backB.onclick = () => {
        state.pathAMode = false;
        step = 13;
        render();
      };
    }
    bindFlowNav();
  }

  /** 固定一覧ではない。置かれた言葉から問いを動的に選ぶ（4〜6） */
  function selectGapQuestions() {
    const a = state.achieve;
    const p = state.protect;
    const c = state.constraints;
    const t = state.theme;
    const all = `${a}\n${p}\n${c}\n${t}`;
    const pool = [
      {
        key: 'achieve_unsaid',
        note: `いま「${a}」と置かれています。`,
        ask: 'この実現が果たされたとき、自分以外の誰の何が変わっている想定ですか。それは言葉になっていますか。'
      },
      {
        key: 'protect_who',
        note: `いま「${p}」と置かれています。`,
        ask: '守ろうとしているのは、制度・数字・それとも特定の人との関係ですか。守る対象は、十分に言葉になっていますか。'
      },
      {
        key: 'both',
        note: '実現したいことと、守りたいものを並べました。',
        ask: 'どちらかが遅れたとしても「まだ自分の判断だ」と言える条件は、置かれていますか。'
      },
      {
        key: 'constraint_meaning',
        note: '制約が置かれています。',
        ask: 'この制約は、変えられない事実ですか。自分が課した上限ですか。それとも、まだ確かめていない仮定ですか。'
      },
      {
        key: 'time',
        note: '時間の層は、まだ言葉になりきっていないことがあります。',
        ask: '一年後に同じ言葉で振り返ったとき、今の実現と守るは、同じ重みで残っていますか。'
      },
      {
        key: 'whose_success',
        note: '成功の定義は、しばしば暗黙のままです。',
        ask: 'この判断の成功を、最終的に誰が認める想定ですか。それは渡す文脈に入っていますか。'
      },
      {
        key: 'not_chosen',
        note: '置かれていない選択も、文脈の一部です。',
        ask: 'いま意識的に選ばなかった道は何ですか。選ばなかった理由は、渡す文脈に書けますか。'
      }
    ];

    if (/社員|働き方|組織|文化|人材/.test(all)) {
      pool.push({
        key: 'people',
        note: '人と組織に触れる言葉があります。',
        ask: 'いちばん影響を受ける人は、この判断文脈を読んで、何を不安に感じるでしょうか。'
      });
    }
    if (/予算|人員|コスト|採用|増やせない/.test(all)) {
      pool.push({
        key: 'resource',
        note: '資源の限界に触れる言葉があります。',
        ask: '交渉できる制約と、絶対に触れない制約の境目は、言葉になっていますか。'
      });
    }
    if (/顧客|市場|売上|事業|成長|伸ば/.test(all)) {
      pool.push({
        key: 'market',
        note: '事業・成長に触れる言葉があります。',
        ask: '「伸びた」の定義は、売上・信頼・学習のどれですか。それは渡す文脈にありますか。'
      });
    }

    let seed = 0;
    for (let i = 0; i < all.length; i++) seed = (seed + all.charCodeAt(i) * (i + 1)) % 997;
    const shuffled = pool.slice().sort((x, y) => {
      const hx = (seed + x.key.length * 17) % 97;
      const hy = (seed + y.key.length * 31) % 97;
      return hx - hy;
    });
    const count = 4 + (seed % 3);
    const seen = new Set();
    const out = [];
    for (const q of shuffled) {
      if (seen.has(q.key)) continue;
      seen.add(q.key);
      out.push(q);
      if (out.length >= count) break;
    }
    return out;
  }

  function contextCardHtml() {
    const b = buildMirrorB();
    return `
      <div class="mirror-summary">
        <h3>【いま言葉にしたこと】</h3>
        <p class="text-[0.75rem] text-[hsl(var(--muted-fg))] mb-2">JudgmentOSでは、これを<strong>判断文脈</strong>と呼びます。渡す前に、まず見てください。</p>
        <h3>【いま判断しようとしていること】</h3>
        <p class="font-semibold">「${escapeHtml(b.decision || b.theme)}」</p>
        <h3>【背景】</h3>
        <p>${escapeHtml(b.background)}</p>
        <h3>【本来実現したいこと】</h3>
        <p class="font-semibold">「${escapeHtml(b.achieve)}」</p>
        <h3>【守りたいもの】</h3>
        <p class="font-semibold">「${escapeHtml(b.protect)}」</p>
        <p class="mt-2 text-sm">この二つを両立させながら考えることが、今回の判断の核になりそうです。</p>
        <h3>【いちばん大切にしたいこと】</h3>
        <p class="font-semibold">「${escapeHtml(b.criteriaCore)}」</p>
        ${b.criteriaMust ? `<h3>【絶対に譲れないもの】</h3><p>${escapeHtml(b.criteriaMust)}</p>` : ''}
        ${b.criteriaWant ? `<h3>【できれば満たしたいもの】</h3><p>${escapeHtml(b.criteriaWant)}</p>` : ''}
        <h3>【いちばん強く効いていること／引き受ける範囲】</h3>
        <p>${escapeHtml(b.weightResolve)}</p>
      </div>`;
  }

  function trailHtml() {
    const parts = [];
    if (state.decision) parts.push(`<div><strong>判断しようとしていること</strong>：${escapeHtml(state.decision)}</div>`);
    if (state.background) parts.push(`<div class="mt-2"><strong>背景</strong>：${escapeHtml(state.background)}</div>`);
    if (state.achieve) parts.push(`<div class="mt-2"><strong>本来実現したいこと</strong>：${escapeHtml(state.achieve)}</div>`);
    if (state.protect) parts.push(`<div class="mt-2"><strong>守りたいもの</strong>：${escapeHtml(state.protect)}</div>`);
    if (state.criteriaCore) parts.push(`<div class="mt-2"><strong>いちばん大切</strong>：${escapeHtml(state.criteriaCore)}</div>`);
    if (state.criteriaMust) parts.push(`<div class="mt-2"><strong>譲れない</strong>：${escapeHtml(state.criteriaMust)}</div>`);
    if (state.criteriaWant) parts.push(`<div class="mt-2"><strong>できれば</strong>：${escapeHtml(state.criteriaWant)}</div>`);
    if (state.weightResolve) parts.push(`<div class="mt-2"><strong>強く効いていること／引き受ける範囲</strong>：${escapeHtml(state.weightResolve)}</div>`);
    if (!parts.length) return '';
    return `<div class="answered-trail">${parts.join('')}</div>`;
  }

  function currentPhase() {
    if (viewMode === 'history' || viewMode === 'theme') return null;
    if (step >= 1 && step <= 10) return 'think';
    if (step === 13 || step === 14 || step === 17) return 'judge';
    if (step === 15 || step === 16 || step === 18 || step === 11 || step === 12) return 'reflect';
    return 'think';
  }

  function phaseNavHtml() {
    const phase = currentPhase();
    if (!phase) return '';
    const items = [
      { id: 'think', label: '考えている' },
      { id: 'judge', label: '論点を判定' },
      { id: 'reflect', label: '振り返る' }
    ];
    return `<nav class="phase-nav" aria-label="画面の移動">
      ${items.map((it, i) => {
        const reachable = canGoToPhase(it.id);
        const current = it.id === phase;
        const cls = `phase-item${current ? ' is-current' : ''}${reachable ? ' is-reachable' : ''}`;
        const title = reachable
          ? (it.id === 'think' ? '考えているに戻り、内容を修正できます。直すと論点は無効になります。' : `${it.label}へ移動`)
          : 'まだ到達していません';
        return `
        <button type="button" class="${cls}" data-phase="${it.id}" ${reachable ? '' : 'disabled'} title="${escapeHtml(title)}">${escapeHtml(it.label)}</button>
        ${i < items.length - 1 ? '<span class="phase-arrow" aria-hidden="true">→</span>' : ''}`;
      }).join('')}
    </nav>`;
  }

  function progressLabel() {
    const map = {
      201: '話してみる',
      202: '整理しています',
      203: '向かいたいこと',
      204: '守りたいこと',
      205: 'なぜ守るか',
      211: '一つ確認',
      206: '動かせない条件',
      207: '基準を言葉にしています',
      208: '判断原則',
      209: 'AIに渡す',
      210: 'もう少し振り返る',
      101: 'テーマを選ぶ',
      102: '頭の中を出す',
      103: '思考を分類中',
      104: '映し返し',
      105: '掘る場所を選ぶ',
      106: '少しだけ掘る',
      107: '軸を見なおす',
      1: '① いま判断しようとしていること',
      2: '② 背景',
      3: '③ 本来実現したいこと',
      17: '判断しようとしていることは変わったか',
      4: '④ 守りたいもの',
      5: 'いまの言葉を並べて見る',
      6: 'いちばん大切にしたいこと',
      7: '譲れない／できれば（任意）',
      8: '強く効いていること／引き受ける範囲',
      9: 'いま言葉にしたものを見る',
      10: '問い返す型',
      13: '論点を示す',
      14: '論点を判定する',
      15: '判断文脈を見比べる',
      16: '判断の変化を振り返る',
      18: '思考の変化サマリー',
      11: '私はこう判断する',
      12: '一段深くなった'
    };
    return map[step] || '';
  }

  function introCategory() {
    return INTRO_CATEGORIES.find((c) => c.id === state.introCategoryId) || null;
  }

  function introDigFocus() {
    return INTRO_DIG_FOCUSES.find((f) => f.id === state.introDigFocusId) || null;
  }

  function finishIntroIntoCriteria() {
    if (state.introConstraintTags.length && !state.criteriaWant.trim()) {
      state.criteriaWant = state.introConstraintTags.join('／');
    }
    if (state.introChange && state.introChange.nowSuggestion) {
      if (!state.criteriaGrowth) state.criteriaGrowth = emptyCriteriaGrowth();
      if (!state.criteriaGrowth.nowMe) {
        state.criteriaGrowth.nowMe = state.introChange.nowSuggestion;
      }
      if (!state.criteriaGrowth.firstMe && state.introChange.previousYou) {
        state.criteriaGrowth.firstMe = state.introChange.previousYou;
      }
    }
    if (state.introDigNote) {
      const focus = introDigFocus();
      const tag = focus ? `【掘り下げ: ${focus.title}】\n${state.introDigNote}` : state.introDigNote;
      if (!state.background.includes(state.introDigNote)) {
        state.background = [state.background.trim(), tag].filter(Boolean).join('\n\n');
      }
    }
    syncThemeFromBackground();
    step = 6;
    render();
  }

  function applyDigNoteToAxis() {
    const note = (state.introDigNote || '').trim();
    if (!note) return;
    if (state.introDigFocusId === 'realize') state.achieve = note;
    if (state.introDigFocusId === 'protect') state.protect = note;
    if (state.introDigFocusId === 'who') {
      const line = note.slice(0, 120);
      if (!state.decision.trim() || state.decision.length < 8) state.decision = line;
      else if (!state.decision.includes(line.slice(0, 20))) {
        state.decision = `${state.decision.trim()}／${line}`;
      }
    }
  }

  /** 画面上で意味が切れないよう、主要語の定義を明示する */
  function axisWordDefsHtml(opts) {
    const showMirror = !opts || opts.mirror !== false;
    const showDig = opts && opts.dig;
    return `
      <aside class="term-defs" role="note" aria-label="ことばの意味">
        <p class="term-defs-heading">ことばの意味</p>
        <dl class="term-defs-dl">
          <div>
            <dt>実現したいこと</dt>
            <dd>今この判断で、向かいたい変化・到達したい姿</dd>
          </div>
          <div>
            <dt>守りたいもの</dt>
            <dd>その変化を進めるときに、崩したくないもの・失いたくないもの・そう見られたくないもの</dd>
          </div>
          ${showMirror ? `
          <div>
            <dt>映し返し</dt>
            <dd>吐き出した言葉を、答えや最適案ではなく、「実現」と「守る」の二軸に整理して見せ返すこと</dd>
          </div>` : ''}
          ${showDig ? `
          <div>
            <dt>掘る</dt>
            <dd>ふわっとしている一点だけを短く言葉にし、上の二軸をはっきりさせること。全部を深くする作業ではない</dd>
          </div>` : ''}
        </dl>
      </aside>`;
  }

  function axisLabelAchieveHtml() {
    return `
      <p class="axis-label">実現したいこと</p>
      <p class="axis-def">今この判断で、向かいたい変化・到達したい姿</p>`;
  }

  function axisLabelProtectHtml() {
    return `
      <p class="axis-label">守りたいもの</p>
      <p class="axis-def">その変化を進めるときに、崩したくないもの・失いたくないもの・そう見られたくないもの</p>`;
  }

  function balanceBoardHtml() {
    const a = (state.achieve || '').trim();
    const p = (state.protect || '').trim();
    return `
      <div class="balance-board" aria-hidden="true">
        <div class="balance-pan">
          <p class="balance-pan-label">実現</p>
          <p class="balance-pan-hint">向かいたい変化</p>
          <p class="balance-pan-text">${escapeHtml(a ? (a.length > 56 ? `${a.slice(0, 54)}…` : a) : '（未設定）')}</p>
        </div>
        <div class="balance-center">
          <div class="balance-beam"></div>
          <div class="balance-fulcrum"></div>
          <p class="balance-caption">この緊張を見る</p>
        </div>
        <div class="balance-pan">
          <p class="balance-pan-label">守る</p>
          <p class="balance-pan-hint">崩したくないもの</p>
          <p class="balance-pan-text">${escapeHtml(p ? (p.length > 56 ? `${p.slice(0, 54)}…` : p) : '（未設定）')}</p>
        </div>
      </div>`;
  }

  function mockStructureIntroLocal() {
    const text = String(state.introDump || '').replace(/\s+/g, ' ').trim();
    const snippet = text.length > 48 ? `${text.slice(0, 48)}…` : text;
    const id = state.introCategoryId;
    const table = {
      strategy: {
        realization: snippet
          ? `${snippet}を踏まえ、将来の打ち手を自分の基準で決められる状態にしたい`
          : '投資や撤退の判断を、数字だけでなく自分の基準で決められる状態にしたい',
        protection: '現場の判断責任と、安易な拡大・縮小で失われる信頼',
        constraints_recommend: ['予算の上限', '撤退の条件', '時間軸']
      },
      org: {
        realization: snippet
          ? `${snippet}を整理し、人と組織の意思決定が噛み合う形にしたい`
          : '人と組織の意思決定が噛み合い、衝突が建設的になる状態にしたい',
        protection: '一人ひとりの尊厳と、チームの信頼関係',
        constraints_recommend: ['役割の明確さ', '評価の公正', '対話の時間']
      },
      ai_dissonance: {
        realization: snippet
          ? `「${snippet}」という違和感を言葉にし、問い返せる判断軸を持ちたい`
          : 'AIや提案の答えに飲み込まれず、自分の問い返しができる状態にしたい',
        protection: '判断を引き受ける人の責任と、答え依存にしない文化',
        constraints_recommend: ['説明可能性', '最終判断者', '前提の共有']
      },
      vague: {
        realization: snippet
          ? `${snippet}の奥にある、本当に向かいたい姿をはっきりさせたい`
          : 'モヤモヤの奥にある、本当に向かいたい姿をはっきりさせたい',
        protection: '焦って結論を急がず、自分の感覚を粗末にしないこと',
        constraints_recommend: ['今は決めなくてよい範囲', '最低限守りたいこと']
      }
    };
    return table[id] || table.vague;
  }

  async function requestStructureIntro() {
    const Access = window.JudgmentOSAccess;
    const profile = Access && Access.getProfile ? Access.getProfile() : null;
    const payload = {
      categoryId: state.introCategoryId,
      dumpText: state.introDump,
      inviteCode: (Access && Access.getInviteCode && Access.getInviteCode()) || (profile && profile.inviteCode) || '',
      inviteId: (Access && Access.getInviteId && Access.getInviteId()) || (profile && profile.inviteId) || '',
      securityConsent: !!(Access && Access.canUseBuiltinAi && Access.canUseBuiltinAi())
    };
    try {
      const res = await fetch('/api/structure-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok && data.realization && data.protection) {
        return {
          realization: data.realization,
          protection: data.protection,
          constraints_recommend: Array.isArray(data.constraints_recommend) ? data.constraints_recommend : [],
          source: data.source || 'model'
        };
      }
    } catch (_) { /* fall through */ }
    const m = mockStructureIntroLocal();
    return { ...m, source: 'mock' };
  }

  function applyIntroExtraction(extracted) {
    state.achieve = (extracted.realization || '').trim();
    state.protect = (extracted.protection || '').trim();
    state.introConstraintTags = (extracted.constraints_recommend || []).slice();
    state.introExtractSource = extracted.source || '';
    const cat = introCategory();
    state.theme = cat ? cat.title : state.theme;
    state.background = state.introDump.trim();
    if (!state.decision.trim()) {
      const firstLine = state.introDump.split(/\n/).map((l) => l.trim()).find(Boolean) || '';
      state.decision = firstLine.slice(0, 120) || (cat ? `${cat.title}について向き合う` : 'いまの判断');
    }
    state.decisionInitial = state.decision;
  }

  function buildPastLogSummaryLocal(packed) {
    if (!packed || !packed.entry) return '';
    const entry = packed.entry;
    const g = entry.criteriaGrowth || {};
    const themeTitle = (packed.theme && packed.theme.title) || entry.theme || '';
    return [
      themeTitle ? `テーマ: ${themeTitle}` : '',
      entry.achieve ? `実現したいこと: ${entry.achieve}` : '',
      entry.protect ? `守りたいもの: ${entry.protect}` : '',
      entry.constraints ? `制約: ${entry.constraints}` : '',
      g.criteriaChange ? `判断基準の変化: ${g.criteriaChange}` : '',
      g.truePurpose ? `本当の目的: ${g.truePurpose}` : '',
      g.nowMe ? `当時の自分: ${g.nowMe}` : '',
      g.firstMe ? `最初の自分: ${g.firstMe}` : '',
      (entry.contextAfter || entry.contextBefore)
        ? `判断文脈:\n${String(entry.contextAfter || entry.contextBefore).slice(0, 1200)}`
        : ''
    ].filter(Boolean).join('\n');
  }

  function getLatestPastLog() {
    const Store = window.JudgmentOSStore;
    if (!Store || typeof Store.getLatestEntry !== 'function') return null;
    return Store.getLatestEntry();
  }

  function mockStructureChangeLocal(pastSummary) {
    const pastLine = String(pastSummary || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(' ');
    return {
      previousYou: pastLine
        ? `以前のあなたは、次のような軸で考えていました。${pastLine}`
        : '以前のあなたは、そのときの判断文脈のなかで、実現と守るのバランスを探っていました。',
      nowSuggestion: (state.achieve && state.protect)
        ? `今のあなたは、「${state.achieve}」を目指しつつ、「${state.protect}」を崩さないことを、よりはっきり言葉にしようとしているようです。`
        : '今のあなたは、前回より自分の言葉で軸を言い直そうとしているようです。'
    };
  }

  async function requestStructureChange(pastSummary) {
    const Access = window.JudgmentOSAccess;
    const profile = Access && Access.getProfile ? Access.getProfile() : null;
    const cat = introCategory();
    const payload = {
      pastSummary,
      currentDump: state.introDump,
      realization: state.achieve,
      protection: state.protect,
      categoryLabel: cat ? `${cat.title}（${cat.hint}）` : '',
      inviteCode: (Access && Access.getInviteCode && Access.getInviteCode()) || (profile && profile.inviteCode) || '',
      inviteId: (Access && Access.getInviteId && Access.getInviteId()) || (profile && profile.inviteId) || '',
      securityConsent: !!(Access && Access.canUseBuiltinAi && Access.canUseBuiltinAi())
    };
    try {
      const res = await fetch('/api/structure-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok && data.previous_you && data.now_suggestion) {
        return {
          previousYou: data.previous_you,
          nowSuggestion: data.now_suggestion,
          source: data.source || 'model'
        };
      }
    } catch (_) { /* fall through */ }
    return { ...mockStructureChangeLocal(pastSummary), source: 'mock' };
  }

  async function runIntroPipeline() {
    const extracted = await requestStructureIntro();
    applyIntroExtraction(extracted);
    state.introChange = null;
    const past = getLatestPastLog();
    if (past && past.entry) {
      const pastSummary = buildPastLogSummaryLocal(past);
      if (pastSummary.trim()) {
        const change = await requestStructureChange(pastSummary);
        const Store = window.JudgmentOSStore;
        state.introChange = {
          previousYou: change.previousYou,
          nowSuggestion: change.nowSuggestion,
          source: change.source || '',
          pastDate: Store && past.entry.createdAt
            ? Store.formatDateJa(past.entry.createdAt)
            : ''
        };
      }
    }
  }

  function bindSpeechMic(textarea, btn) {
    if (!textarea || !btn) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      btn.classList.add('hidden');
      btn.title = 'このブラウザでは音声入力に対応していません';
      return;
    }
    const rec = new SR();
    rec.lang = 'ja-JP';
    rec.continuous = true;
    rec.interimResults = false;
    let listening = false;
    const setListening = (on) => {
      listening = on;
      btn.classList.toggle('is-listening', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? '聞き取り中（タップで停止）' : 'マイクで話す';
    };
    btn.onclick = () => {
      if (listening) {
        try { rec.stop(); } catch (_) { /* ignore */ }
        return;
      }
      try { rec.start(); } catch (_) { /* ignore */ }
    };
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (ev) => {
      let chunk = '';
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        if (ev.results[i].isFinal) chunk += ev.results[i][0].transcript;
      }
      if (!chunk) return;
      const cur = textarea.value;
      textarea.value = `${cur}${cur && !/\s$/.test(cur) ? '\n' : ''}${chunk}`;
      textarea.dispatchEvent(new Event('input'));
    };
  }

  async function requestSummarizeChange() {
    const Access = window.JudgmentOSAccess;
    const profile = Access && Access.getProfile ? Access.getProfile() : null;
    const g = state.criteriaGrowth || emptyCriteriaGrowth();
    const payload = {
      theme: state.theme,
      achieve: state.achieve,
      protect: state.protect,
      firstMe: g.firstMe || '',
      nowMe: g.nowMe || '',
      criteriaChange: g.criteriaChange || '',
      truePurpose: g.truePurpose || '',
      inviteCode: (Access && Access.getInviteCode && Access.getInviteCode()) || (profile && profile.inviteCode) || '',
      inviteId: (Access && Access.getInviteId && Access.getInviteId()) || (profile && profile.inviteId) || '',
      securityConsent: !!(Access && Access.canUseBuiltinAi && Access.canUseBuiltinAi())
    };
    const localMock = () => {
      const first = (payload.firstMe || '').trim();
      const now = (payload.nowMe || '').trim();
      const change = (payload.criteriaChange || '').trim();
      const purpose = (payload.truePurpose || '').trim();
      return {
        headline: change
          ? (change.length > 42 ? `${change.slice(0, 40)}…` : change)
          : '判断の軸が、言葉として残せるところまで近づいた',
        beforeSummary: first
          ? `以前のあなたは、次のように考えていました。${first}`
          : '以前のあなたは、まだ判断の軸を十分には言葉にしていませんでした。',
        afterSummary: now
          ? `今のあなたは、次のように考えるようになっています。${now}`
          : '今のあなたは、実現したいことと守りたいものを並べて見られるようになっています。',
        criteriaShift: change
          ? `いちばん大きく変わったのは、次の判断基準です。${change}`
          : '判断の重みの置き方が、以前よりはっきりしてきています。',
        takeaway: purpose
          ? `次に提案やAIの答えを見るとき、「${purpose}」に照らして問い返す。`
          : '次に提案やAIの答えを見るとき、今日残した判断基準で一度問い返す。',
        source: 'mock'
      };
    };
    try {
      const res = await fetch('/api/summarize-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok && data.headline && data.before_summary && data.after_summary) {
        return {
          headline: data.headline,
          beforeSummary: data.before_summary,
          afterSummary: data.after_summary,
          criteriaShift: data.criteria_shift || data.headline,
          takeaway: data.takeaway || '',
          source: data.source || 'model'
        };
      }
    } catch (_) { /* fall through */ }
    return localMock();
  }

  function persistChangeSummary(summary) {
    const Store = window.JudgmentOSStore;
    if (!Store || !summary) return;
    const growth = Object.assign({}, state.criteriaGrowth || emptyCriteriaGrowth(), {
      changeSummary: summary
    });
    state.criteriaGrowth = growth;
    if (state.activeThemeId && state.activeEntryId) {
      Store.updateEntry(state.activeThemeId, state.activeEntryId, {
        criteriaGrowth: growth
      });
    }
  }

  function nextAfterContextUpdate() {
    snapshotBeforePass();
    return 13;
  }

  /** @param {typeof REPLY_PATTERN_LIBRARY[0]} pattern */
  function replyPatternHtml(pattern) {
    return `
      <p class="q-title">${escapeHtml(pattern.title)}</p>
      <p class="text-sm leading-relaxed border-l-2 border-[hsl(var(--primary)/0.5)] pl-3 my-2">
        ${escapeHtml(pattern.quote)}
      </p>
      <p class="q-help">${escapeHtml(pattern.help)}</p>
      <ol class="mgmt-list list-decimal pl-5">
        ${pattern.questions.map(q => `<li>${escapeHtml(q)}</li>`).join('')}
      </ol>`;
  }

  function resetState() {
    Object.assign(state, {
      concerns: [], theme: '',
      background: '', achieve: '', decision: '', protect: '',
      criteriaCore: '', criteriaMust: '', criteriaWant: '', weightResolve: '',
      constraints: '',
      gapQuestions: [], gapInsights: {}, missingArea: '', nextSentence: '', newJudgment: '',
      decisionInitial: '',
      contextBefore: '', contextBeforeParts: null, aiReplyPaste: '',
      hypotheses: [], selectedHypothesisIds: [], decisionCandidates: [], selectedDecisionCandidate: '',
      hypothesesContextKey: '', hypothesesStale: false, hypothesesSource: '',
      hypogenError: '', hypogenBusy: false, pathAMode: false,
      judgmentSessionId: '',
      reflection: { newPerspective: '', discomfort: '', contextChange: '' },
      reflectionQ: 0, contextAfterText: '',
      criteriaGrowth: emptyCriteriaGrowth(),
      activeThemeId: null, activeEntryId: null, browseThemeId: null,
      introCategoryId: '', introDump: '', introExtractSource: '',
      introConstraintTags: [], introBusy: false, introFetchStarted: false,
      introEditAchieve: false, introEditProtect: false,
      introChange: null,
      introDigDone: false, introDigFocusId: '', introDigNote: '',
      changeSummary: null, changeSummaryBusy: false, changeSummaryStarted: false,
      principle: '', principleEdited: '', principleFeedback: '',
      handoffText: '', judgmentCore: '', jos20Busy: false, jos20Started: false,
      jos20AskCount: 0, jos20AskKind: '', jos20WhyAsked: false,
      jos20BoundaryAsked: false, jos20BoundaryQuestion: '', jos20BoundaryAnswer: '',
      jos20DetectStarted: false
    });
    concernDraft = '';
    viewMode = 'flow';
    step = useJos20Ui() ? 201 : 101;
    farthestStep = step;
  }

  function keepGrownContext() {
    const Store = window.JudgmentOSStore;
    if (!Store) return;
    syncThemeFromBackground();
    state.constraints = criteriaAsConstraintsText();
    const result = Store.appendEntry({
      theme: state.theme,
      concerns: state.concerns.slice(),
      achieve: state.achieve,
      protect: state.protect,
      constraints: state.constraints,
      gapQuestions: state.gapQuestions.map(g => ({ key: g.key, ask: g.ask })),
      gapInsights: filledGapInsights().map(x => ({ key: x.key, text: x.text })),
      contextBefore: state.contextBefore,
      contextBeforeParts: state.contextBeforeParts,
      aiReplyPaste: state.aiReplyPaste,
      reflection: { ...state.reflection },
      contextAfter: state.contextAfterText,
      contextAfterParts: null,
      newJudgment: state.newJudgment,
      criteriaGrowth: null
    });
    state.activeThemeId = result.themeId;
    state.activeEntryId = result.entryId;
  }

  function keepCriteriaGrowth() {
    const Store = window.JudgmentOSStore;
    if (!Store) return;
    const growth = {
      firstMe: (state.criteriaGrowth.firstMe || '').trim(),
      nowMe: (state.criteriaGrowth.nowMe || '').trim(),
      criteriaChange: (state.criteriaGrowth.criteriaChange || '').trim(),
      truePurpose: (state.criteriaGrowth.truePurpose || '').trim(),
      changeTags: Array.isArray(state.criteriaGrowth.changeTags)
        ? state.criteriaGrowth.changeTags.slice()
        : [],
      keyInsight: (state.criteriaGrowth.keyInsight || '').trim(),
      keepSentence: (state.criteriaGrowth.keepSentence || '').trim()
    };
    state.criteriaGrowth = growth;
    if (state.activeThemeId && state.activeEntryId) {
      Store.updateEntry(state.activeThemeId, state.activeEntryId, {
        criteriaGrowth: growth,
        newJudgment: state.newJudgment
      });
      return;
    }
    syncThemeFromBackground();
    state.constraints = criteriaAsConstraintsText();
    const result = Store.appendEntry({
      theme: state.theme,
      concerns: state.concerns.slice(),
      achieve: state.achieve,
      protect: state.protect,
      constraints: state.constraints,
      gapQuestions: state.gapQuestions.map(g => ({ key: g.key, ask: g.ask })),
      gapInsights: filledGapInsights().map(x => ({ key: x.key, text: x.text })),
      contextBefore: state.contextBefore,
      contextBeforeParts: state.contextBeforeParts,
      aiReplyPaste: state.aiReplyPaste,
      reflection: { ...state.reflection },
      contextAfter: state.contextAfterText,
      contextAfterParts: null,
      newJudgment: state.newJudgment,
      criteriaGrowth: growth
    });
    state.activeThemeId = result.themeId;
    state.activeEntryId = result.entryId;
  }

  function initialContextMirrorHtml() {
    const before = state.contextBefore
      || formatContextParts(state.contextBeforeParts || buildContextParts());
    const themeLine = state.theme || (state.contextBeforeParts && state.contextBeforeParts.theme) || '';
    return `
      <div class="seed-mirror" aria-readonly="true">
        ${themeLine ? `<p class="seed-mirror-theme">${escapeHtml(themeLine)}</p>` : ''}
        <pre class="compare-body">${escapeHtml(before || '（まだ言葉が残っていません）')}</pre>
      </div>`;
  }

  function criteriaGrowthSummaryHtml(growth) {
    if (!growth) return '';
    const rows = [];
    if (growth.firstMe) {
      rows.push(`<p class="text-sm mt-2"><strong>あの時の私は、どう考えていたか</strong><br>${escapeHtml(growth.firstMe)}</p>`);
    }
    if (growth.nowMe) {
      rows.push(`<p class="text-sm mt-2"><strong>今の私は、どう考えるようになったか</strong><br>${escapeHtml(growth.nowMe)}</p>`);
    }
    if (growth.criteriaChange) {
      rows.push(`<p class="text-sm mt-2 criteria-keep-line"><strong>今回、一番変化した判断基準</strong><br>${escapeHtml(growth.criteriaChange)}</p>`);
    }
    if (growth.truePurpose) {
      rows.push(`<p class="text-sm mt-2"><strong>最初は言葉になっていなかった本当の目的</strong><br>${escapeHtml(growth.truePurpose)}</p>`);
    }
    // 旧データ
    if (!growth.criteriaChange && growth.keyInsight) {
      rows.push(`<p class="text-sm mt-2"><strong>今回一番の気づき</strong><br>${escapeHtml(growth.keyInsight)}</p>`);
    }
    if (!growth.criteriaChange && growth.keepSentence) {
      rows.push(`<p class="text-sm mt-2 criteria-keep-line"><strong>次の判断でも忘れたくない一文</strong><br>${escapeHtml(growth.keepSentence)}</p>`);
    }
    if (!rows.length) return '';
    return `
      <div class="criteria-history mt-3">
        <p class="compare-label">今回はっきりした判断基準</p>
        ${rows.join('')}
      </div>`;
  }

  function loadEntryIntoState(theme, entry) {
    resetState();
    state.activeThemeId = theme.id;
    state.activeEntryId = entry.id;
    state.concerns = Array.isArray(entry.concerns) ? entry.concerns.slice() : [];
    state.theme = entry.theme || theme.title;
    state.achieve = entry.achieve || '';
    state.protect = entry.protect || '';
    state.constraints = entry.constraints || '';
    const parts = entry.contextBeforeParts || {};
    state.background = parts.background || entry.theme || theme.title || '';
    state.decision = parts.decision || '';
    state.criteriaCore = parts.criteriaCore || '';
    state.criteriaMust = parts.criteriaMust || '';
    state.criteriaWant = parts.criteriaWant || '';
    state.weightResolve = parts.weightResolve || '';
    state.gapQuestions = Array.isArray(entry.gapQuestions) ? entry.gapQuestions.slice() : [];
    state.gapInsights = {};
    (entry.gapInsights || []).forEach(g => { state.gapInsights[g.key] = g.text; });
    state.nextSentence = (entry.contextBeforeParts && entry.contextBeforeParts.addedSentence) || '';
    state.contextBefore = entry.contextBefore || '';
    state.contextBeforeParts = entry.contextBeforeParts || buildContextParts();
    state.aiReplyPaste = entry.aiReplyPaste || '';
    state.reflection = Object.assign(
      { newPerspective: '', discomfort: '', contextChange: '' },
      entry.reflection || {}
    );
    state.contextAfterText = entry.contextAfter || entry.contextBefore || '';
    state.newJudgment = entry.newJudgment || '';
    state.criteriaGrowth = Object.assign(emptyCriteriaGrowth(), entry.criteriaGrowth || {});
    state.principle = entry.principle || '';
    state.principleEdited = entry.principleEdited || entry.principle || '';
    state.principleFeedback = entry.principleFeedback || '';
    state.handoffText = entry.handoffText || '';
    state.judgmentCore = entry.judgmentCore || '';
    state.introDump = entry.concerns && entry.concerns[0] ? String(entry.concerns[0]) : (entry.theme || '');
    state.introDigNote = entry.whyProtect || '';
    state.jos20BoundaryAnswer = entry.boundary || '';
  }

  function enterWorkspace() {
    document.getElementById('screen-invite')?.classList.add('hidden');
    document.getElementById('screen-security')?.classList.add('hidden');
    document.getElementById('screen-landing').classList.add('hidden');
    const ws = document.getElementById('screen-workspace');
    ws.classList.remove('hidden');
    ws.classList.add('fade-in');
    updateParticipantChip();
  }

  function goLanding() {
    document.getElementById('screen-workspace').classList.add('hidden');
    document.getElementById('screen-invite')?.classList.add('hidden');
    document.getElementById('screen-security')?.classList.add('hidden');
    document.getElementById('screen-landing').classList.remove('hidden');
    viewMode = 'flow';
    updateHistoryButton();
    updateParticipantChip();
  }

  function updateParticipantChip() {
    const chip = document.getElementById('participant-chip');
    if (!chip) return;
    const Access = window.JudgmentOSAccess;
    const name = Access && Access.isAuthorized() ? Access.getDisplayName() : '';
    if (name) {
      chip.textContent = name;
      chip.classList.remove('hidden');
    } else {
      chip.textContent = '';
      chip.classList.add('hidden');
    }
  }

  function showInviteGate(onSuccess) {
    const landing = document.getElementById('screen-landing');
    const invite = document.getElementById('screen-invite');
    const ws = document.getElementById('screen-workspace');
    if (!invite) {
      onSuccess();
      return;
    }
    landing?.classList.add('hidden');
    ws?.classList.add('hidden');
    document.getElementById('screen-security')?.classList.add('hidden');
    invite.classList.remove('hidden');
    invite.classList.add('fade-in');

    const codeEl = document.getElementById('invite-code');
    const nameEl = document.getElementById('invite-name');
    const errEl = document.getElementById('invite-error');
    const submit = document.getElementById('btn-invite-submit');
    const back = document.getElementById('btn-invite-back');
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.add('hidden');
    }
    if (codeEl && !codeEl.value) codeEl.focus();

    const finish = () => {
      const Access = window.JudgmentOSAccess;
      if (!Access) {
        errEl.textContent = '認証モジュールを読み込めませんでした。';
        errEl.classList.remove('hidden');
        return;
      }
      const result = Access.activate({
        code: codeEl?.value || '',
        displayName: nameEl?.value || ''
      });
      if (!result.ok) {
        if (errEl) {
          errEl.textContent = result.reason || '招待コードを確認してください。';
          errEl.classList.remove('hidden');
        }
        return;
      }
      invite.classList.add('hidden');
      updateHistoryButton();
      updateParticipantChip();
      onSuccess();
    };

    if (submit) submit.onclick = finish;
    if (back) {
      back.onclick = () => {
        invite.classList.add('hidden');
        landing?.classList.remove('hidden');
      };
    }
    [codeEl, nameEl].forEach(el => {
      if (!el) return;
      el.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finish();
        }
      };
    });
  }

  function showSecurityGate(onSuccess) {
    const landing = document.getElementById('screen-landing');
    const invite = document.getElementById('screen-invite');
    const security = document.getElementById('screen-security');
    const ws = document.getElementById('screen-workspace');
    if (!security) {
      onSuccess();
      return;
    }
    landing?.classList.add('hidden');
    invite?.classList.add('hidden');
    ws?.classList.add('hidden');
    security.classList.remove('hidden');
    security.classList.add('fade-in');

    const accept = document.getElementById('btn-security-accept');
    const decline = document.getElementById('btn-security-decline');
    const Access = window.JudgmentOSAccess;

    const done = (value) => {
      if (Access && typeof Access.setSecurityConsent === 'function') {
        Access.setSecurityConsent(value);
      }
      security.classList.add('hidden');
      updateParticipantChip();
      onSuccess();
    };

    if (accept) accept.onclick = () => done('accepted');
    if (decline) decline.onclick = () => done('declined');
  }

  /**
   * 招待 → セキュリティ同意 → 本編。
   * ?dev=1 / localStorage.judgmentos.dev=1 では招待をスキップ（同意は未決なら表示）。
   */
  function withAccess(kind, onSuccess) {
    const Access = window.JudgmentOSAccess;
    const afterAuth = () => {
      if (Access) Access.touch(kind || 'enter');
      updateParticipantChip();
      if (isDevMode()) {
        // 開発時は同意済み扱いにしてBを試せる
        if (Access && typeof Access.setSecurityConsent === 'function' && !Access.hasSecurityDecision()) {
          Access.setSecurityConsent('accepted');
        }
        onSuccess();
        return;
      }
      if (!Access || typeof Access.hasSecurityDecision !== 'function') {
        onSuccess();
        return;
      }
      if (Access.hasSecurityDecision()) {
        onSuccess();
        return;
      }
      showSecurityGate(onSuccess);
    };

    if (isDevMode()) {
      afterAuth();
      return;
    }
    if (!Access) {
      showInviteGate(afterAuth);
      return;
    }
    if (Access.isAuthorized()) {
      afterAuth();
      return;
    }
    showInviteGate(afterAuth);
  }

  function updateHistoryButton() {
    const btn = document.getElementById('btn-open-history');
    if (!btn || !window.JudgmentOSStore) return;
    const n = window.JudgmentOSStore.listThemesForUi().length;
    btn.classList.toggle('hidden', n === 0);
  }

  async function copyText(text, toastId) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 2000);
    }
  }

  function isDevMode() {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('dev') === '1' || q.get('admin') === '1') return true;
      return localStorage.getItem('judgmentos.dev') === '1';
    } catch (_) {
      return false;
    }
  }

  function bindStep1() {
    const input = document.getElementById('field-decision');
    const nextBtn = document.getElementById('btn-next');
    const syncNext = () => {
      nextBtn.disabled = !(input && input.value.trim());
    };
    if (input) {
      input.oninput = () => {
        concernDraft = input.value;
        syncNext();
      };
    }
    nextBtn.onclick = () => {
      const draft = (input?.value || '').trim();
      if (!draft) {
        input?.focus();
        return;
      }
      state.decision = draft;
      syncThemeFromBackground();
      concernDraft = '';
      step = 2;
      render();
    };
    const btnDev = document.getElementById('btn-dev-sample');
    if (btnDev) {
      btnDev.onclick = () => {
        state.background = DEMO.background;
        state.achieve = DEMO.achieve;
        state.decision = DEMO.decision;
        state.protect = DEMO.protect;
        state.criteriaCore = DEMO.criteriaCore;
        state.criteriaMust = DEMO.criteriaMust;
        state.criteriaWant = DEMO.criteriaWant;
        state.weightResolve = DEMO.weightResolve;
        syncThemeFromBackground();
        concernDraft = '';
        step = 9;
        render();
      };
    }
  }

  function jos20StageHtml(n) {
    const items = [
      { id: 1, label: '話す' },
      { id: 2, label: '基準が見える' },
      { id: 3, label: 'AIに渡せる' }
    ];
    return `<div class="jos20-stages" aria-label="いまの段階">
      ${items.map((it) => `<span class="jos20-stage${n === it.id ? ' is-current' : ''}${n > it.id ? ' is-done' : ''}">${escapeHtml(it.label)}</span>`).join('<span class="jos20-stage-gap" aria-hidden="true">·</span>')}
    </div>`;
  }

  function jos20Shell(stage, inner) {
    return `
      <section class="jos20-card space-y-4 fade-in">
        ${jos20StageHtml(stage)}
        ${inner}
      </section>`;
  }

  function persistJos20Entry() {
    const Store = window.JudgmentOSStore;
    if (!Store) return;
    syncThemeFromBackground();
    const principle = (state.principleEdited || state.principle || '').trim();
    const growth = Object.assign({}, state.criteriaGrowth || emptyCriteriaGrowth(), {
      nowMe: principle,
      criteriaChange: state.judgmentCore || '',
      truePurpose: state.protect || ''
    });
    state.criteriaGrowth = growth;
    const payload = {
      jos20: true,
      theme: state.theme,
      concerns: state.concerns.slice(),
      achieve: state.achieve,
      protect: state.protect,
      constraints: state.constraints,
      whyProtect: state.introDigNote,
      boundary: state.jos20BoundaryAnswer,
      judgmentCore: state.judgmentCore,
      principle,
      principleEdited: principle,
      principleFeedback: state.principleFeedback,
      handoffText: state.handoffText,
      gapQuestions: [],
      gapInsights: [],
      contextBefore: formatContextParts(state.contextBeforeParts || buildContextParts()),
      contextBeforeParts: state.contextBeforeParts || buildContextParts(),
      contextAfter: state.handoffText,
      newJudgment: principle,
      criteriaGrowth: growth
    };
    if (state.activeThemeId && state.activeEntryId) {
      Store.updateEntry(state.activeThemeId, state.activeEntryId, payload);
      return;
    }
    const result = Store.appendEntry(payload);
    state.activeThemeId = result.themeId;
    state.activeEntryId = result.entryId;
  }

  async function requestInferPrinciple() {
    const Access = window.JudgmentOSAccess;
    const profile = Access && Access.getProfile ? Access.getProfile() : null;
    const ronten = (state.hypotheses || []).slice(0, 6).map((h) => h.text).filter(Boolean).join('\n');
    const payload = {
      dump: state.introDump,
      achieve: state.achieve,
      protect: state.protect,
      whyProtect: state.introDigNote,
      boundary: state.jos20BoundaryAnswer,
      constraints: state.constraints,
      ronten,
      inviteCode: (Access && Access.getInviteCode && Access.getInviteCode()) || (profile && profile.inviteCode) || '',
      inviteId: (Access && Access.getInviteId && Access.getInviteId()) || (profile && profile.inviteId) || '',
      securityConsent: builtinAiAllowed()
    };
    try {
      const res = await fetch('/api/infer-principle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok && data.principle && data.handoff) {
        return {
          principle: data.principle,
          core: data.core || '',
          handoff: data.handoff,
          source: data.source || 'model'
        };
      }
    } catch (_) { /* fall through */ }
    const protect = state.protect || '崩したくないもの';
    const achieve = state.achieve || '向かいたい変化';
    return {
      principle: `今回の対話からは、あなたは「${protect}」を損なわない範囲で、「${achieve}」へ進もうとしているように見えます。`,
      core: `「${achieve}」と「${protect}」の両立が、今回の判断の核です。`,
      handoff: `私は今回の判断において、短期的な収益性だけでなく、次を重視しています。
実現したいこと：${achieve}
守りたいもの：${protect}
${state.constraints ? `動かせない条件：${state.constraints}\n` : ''}
以下のテーマを検討する際には、この判断基準を前提として、複数の選択肢を示してください。
各選択肢について、
・期待できる成果
・失う可能性のあるもの
・主なリスク
・長期的な信頼への影響
を整理してください。
最終判断は私が行います。`,
      source: 'mock'
    };
  }

  async function requestDetectBoundary() {
    const Access = window.JudgmentOSAccess;
    const profile = Access && Access.getProfile ? Access.getProfile() : null;
    const payload = {
      dump: state.introDump,
      achieve: state.achieve,
      protect: state.protect,
      whyProtect: state.introDigNote,
      inviteCode: (Access && Access.getInviteCode && Access.getInviteCode()) || (profile && profile.inviteCode) || '',
      inviteId: (Access && Access.getInviteId && Access.getInviteId()) || (profile && profile.inviteId) || '',
      securityConsent: builtinAiAllowed()
    };
    try {
      const res = await fetch('/api/detect-boundary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        return {
          needsQuestion: !!data.needs_question,
          question: String(data.question || '').trim()
        };
      }
    } catch (_) { /* fall through */ }
    const blob = `${state.introDump} ${state.achieve} ${state.protect} ${state.introDigNote}`;
    if (/失われ.*なら|選ばない|たとえ.{0,12}でも|譲れない/.test(blob)) {
      return { needsQuestion: false, question: '' };
    }
    const protect = state.protect || '守りたいもの';
    return {
      needsQuestion: !jos20Thin(state.achieve) && !jos20Thin(state.protect),
      question: `一つだけ確認させてください。すべてを同時には満たせないとしたら、「${protect}」が失われる選択はしない、ということでよいですか。違うなら、失われたら選ばないものは何でしょう？`
    };
  }

  async function runJos20Synthesize() {
    if (state.jos20Started) return;
    state.jos20Started = true;
    state.jos20Busy = true;
    state.introDigFocusId = 'protect';
    applyDigNoteToAxis();
    if (state.introConstraintTags.length && !state.constraints.trim()) {
      state.constraints = state.introConstraintTags.join('／');
    }
    if (state.constraints.trim() && !state.criteriaWant.trim()) {
      state.criteriaWant = state.constraints.trim();
    }
    state.criteriaCore = [state.achieve, state.protect].filter(Boolean).join('／');
    state.criteriaMust = state.protect;
    state.weightResolve = state.introDigNote
      ? `守る理由：${state.introDigNote}`
      : '';
    syncThemeFromBackground();
    snapshotBeforePass();
    try {
      if (builtinAiAllowed()) {
        try {
          await requestBuiltinHypotheses(false);
        } catch (_) { /* 論点は内部材料 */ }
      }
      const inferred = await requestInferPrinciple();
      state.principle = inferred.principle;
      state.principleEdited = inferred.principle;
      state.judgmentCore = inferred.core
        || ((state.hypotheses[0] && state.hypotheses[0].text) ? state.hypotheses[0].text : state.criteriaCore);
      state.handoffText = inferred.handoff;
      persistJos20Entry();
    } catch (_) {
      const inferred = await requestInferPrinciple();
      state.principle = inferred.principle;
      state.principleEdited = inferred.principle;
      state.judgmentCore = inferred.core || state.criteriaCore;
      state.handoffText = inferred.handoff;
      persistJos20Entry();
    }
    state.jos20Busy = false;
    step = 208;
    render();
  }

  function jos20Thin(s) {
    const t = String(s || '').replace(/\s+/g, ' ').trim();
    if (t.length < 16) return true;
    if (/未抽出|未設定/.test(t)) return true;
    return false;
  }

  function jos20HasReasonCue() {
    return /ので|だから|ため|から、|理由/.test(`${state.protect} ${state.introDigNote}`);
  }

  function jos20FillConstraintsQuietly() {
    if (state.introConstraintTags.length && !String(state.constraints || '').trim()) {
      state.constraints = state.introConstraintTags.join('／');
    }
  }

  /** 追加質問は「基準がまだ曖昧なときだけ」。最大2問。 */
  function jos20GoNextTalkOrSynthesize() {
    jos20FillConstraintsQuietly();
    const asks = state.jos20AskCount || 0;
    if (jos20Thin(state.achieve) && asks < 2 && state.jos20AskKind !== 'realize') {
      state.jos20AskKind = 'realize';
      step = 204;
      render();
      return;
    }
    if (jos20Thin(state.protect) && asks < 2 && state.jos20AskKind !== 'protect') {
      state.jos20AskKind = 'protect';
      step = 204;
      render();
      return;
    }
    if (
      !jos20Thin(state.achieve)
      && !jos20Thin(state.protect)
      && !state.jos20BoundaryAsked
    ) {
      step = 211;
      render();
      return;
    }
    state.jos20Started = false;
    step = 207;
    render();
  }

  function bindJos20TextNext(fieldId, assign, nextStep, minLen) {
    const ta = document.getElementById(fieldId);
    const next = document.getElementById('btn-next');
    const need = minLen == null ? 2 : minLen;
    const sync = () => {
      if (next) next.disabled = !((ta && ta.value.trim().length >= need));
    };
    if (ta) {
      ta.oninput = () => {
        assign(ta.value);
        sync();
      };
      bindSpeechMic(ta, document.getElementById('btn-mic'));
    }
    sync();
    if (next) {
      next.onclick = () => {
        const v = (ta?.value || '').trim();
        if (v.length < need) {
          ta?.focus();
          return;
        }
        assign(v);
        step = nextStep;
        render();
      };
    }
  }

  function renderJos20(root) {
    if (step === 201) {
      root.innerHTML = jos20Shell(1, `
        <p class="q-title">今、どんなことが気になっていますか？</p>
        <p class="q-help">まとまっていなくて構いません。案件の話で大丈夫です。</p>
        <textarea id="field-intro-dump" class="textarea textarea-dump" rows="6" placeholder="例）売上は伸ばしたいが、儲け主義に見られてブランドを損ねたくない">${escapeHtml(state.introDump)}</textarea>
        <div class="dump-actions">
          <button type="button" id="btn-mic" class="btn btn-ghost mic-btn" aria-pressed="false">マイクで話す</button>
          <button type="button" id="btn-next" class="btn btn-primary" ${state.introDump.trim().length >= 4 ? '' : 'disabled'}>話し終わる</button>
        </div>
      `);
      bindJos20TextNext('field-intro-dump', (v) => { state.introDump = v; }, 202, 4);
      return true;
    }

    if (step === 202) {
      root.innerHTML = jos20Shell(1, `
        <div class="extract-spinner" aria-hidden="true"></div>
        <p class="q-title" style="text-align:center;margin-bottom:0">話の軸を整えています…</p>
        <p class="q-help" style="text-align:center;margin-bottom:0">答えは出しません。</p>
      `);
      if (!state.introFetchStarted) {
        state.introFetchStarted = true;
        if (!state.introCategoryId) state.introCategoryId = 'vague';
        runIntroPipeline().then(() => {
          step = 203;
          render();
        }).catch(() => {
          step = 203;
          render();
        });
      }
      return true;
    }

    if (step === 203) {
      const editing = state.introEditAchieve || state.introEditProtect;
      root.innerHTML = jos20Shell(1, `
        <p class="q-title">今のお話から、こう見えます</p>
        <p class="q-help">答えではありません。向かいたいことと、失いたくないことの両立です。</p>
        ${editing ? `
          <label class="field-label">向かいたいこと</label>
          <textarea id="field-achieve" class="textarea" rows="3">${escapeHtml(state.achieve)}</textarea>
          <label class="field-label" style="margin-top:0.75rem">失いたくないこと</label>
          <textarea id="field-protect" class="textarea" rows="3">${escapeHtml(state.protect)}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary w-full mt-3">直した</button>
        ` : `
          <div class="layer-card">
            <p class="text-sm leading-relaxed text-slate-200">
              <strong>「${escapeHtml(state.achieve || '（まだ言葉になっていない）')}」</strong>を実現したい一方で、<br>
              <strong>「${escapeHtml(state.protect || '（まだ言葉になっていない）')}」</strong>は失いたくないように見えます。
            </p>
            ${state.judgmentCore ? '' : ''}
          </div>
          <p class="q-help" style="margin-top:0.5rem">判断の中心は、この両立にありそうです。</p>
          <button type="button" id="btn-ok" class="btn btn-primary w-full">この理解で進む</button>
          <button type="button" id="btn-edit" class="btn btn-ghost w-full">少し違う</button>
        `}
      `);
      if (editing) {
        const a = document.getElementById('field-achieve');
        const p = document.getElementById('field-protect');
        document.getElementById('btn-next').onclick = () => {
          if (a) state.achieve = a.value.trim();
          if (p) state.protect = p.value.trim();
          state.introEditAchieve = false;
          state.introEditProtect = false;
          jos20GoNextTalkOrSynthesize();
        };
      } else {
        document.getElementById('btn-ok').onclick = () => jos20GoNextTalkOrSynthesize();
        document.getElementById('btn-edit').onclick = () => {
          state.introEditAchieve = true;
          state.introEditProtect = true;
          render();
        };
      }
      return true;
    }

    if (step === 204) {
      const realize = state.jos20AskKind === 'realize';
      root.innerHTML = jos20Shell(1, `
        <p class="q-title">${realize
          ? '向かいたいことは、もう少し言うと何ですか？'
          : 'それでも、失いたくないものはありますか？'}</p>
        <p class="q-help">工程ではありません。いまの話を、もう一文だけはっきりさせます。</p>
        <textarea id="field-follow" class="textarea" rows="4">${escapeHtml(realize ? state.achieve : state.protect)}</textarea>
        <div class="dump-actions">
          <button type="button" id="btn-mic" class="btn btn-ghost mic-btn" aria-pressed="false">マイクで話す</button>
          <button type="button" id="btn-next" class="btn btn-primary">進む</button>
        </div>
      `);
      const ta = document.getElementById('field-follow');
      bindSpeechMic(ta, document.getElementById('btn-mic'));
      document.getElementById('btn-next').onclick = () => {
        const v = (ta?.value || '').trim();
        if (v.length < 2) { ta?.focus(); return; }
        if (realize) state.achieve = v;
        else state.protect = v;
        state.jos20AskCount = (state.jos20AskCount || 0) + 1;
        jos20GoNextTalkOrSynthesize();
      };
      return true;
    }

    if (step === 205) {
      root.innerHTML = jos20Shell(1, `
        <p class="q-title">それを守りたいのは、なぜでしょう？</p>
        <p class="q-help">一文で構いません。わからなければ、感じていることで大丈夫です。</p>
        <textarea id="field-why" class="textarea" rows="4">${escapeHtml(state.introDigNote)}</textarea>
        <div class="dump-actions">
          <button type="button" id="btn-mic" class="btn btn-ghost mic-btn" aria-pressed="false">マイクで話す</button>
          <button type="button" id="btn-next" class="btn btn-primary">進む</button>
        </div>
        <button type="button" id="btn-skip" class="btn btn-ghost w-full">今は飛ばす</button>
      `);
      const ta = document.getElementById('field-why');
      bindSpeechMic(ta, document.getElementById('btn-mic'));
      const finishWhy = (v) => {
        state.introDigNote = v;
        state.introDigFocusId = 'protect';
        state.introDigDone = true;
        state.jos20WhyAsked = true;
        applyDigNoteToAxis();
        state.jos20AskCount = (state.jos20AskCount || 0) + 1;
        jos20GoNextTalkOrSynthesize();
      };
      document.getElementById('btn-next').onclick = () => {
        const v = (ta?.value || '').trim();
        if (v.length < 2) { ta?.focus(); return; }
        finishWhy(v);
      };
      document.getElementById('btn-skip').onclick = () => {
        state.jos20WhyAsked = true;
        state.jos20AskCount = (state.jos20AskCount || 0) + 1;
        jos20GoNextTalkOrSynthesize();
      };
      return true;
    }

    if (step === 211) {
      const waiting = state.jos20DetectStarted && !state.jos20BoundaryQuestion && !state.jos20BoundaryAsked;
      if (!state.jos20BoundaryQuestion && !state.jos20DetectStarted) {
        root.innerHTML = jos20Shell(1, `
          <div class="extract-spinner" aria-hidden="true"></div>
          <p class="q-title" style="text-align:center;margin-bottom:0">話を見つめています…</p>
          <p class="q-help" style="text-align:center;margin-bottom:0">答えは出しません。</p>
        `);
        state.jos20DetectStarted = true;
        requestDetectBoundary().then((det) => {
          if (det && det.needsQuestion && det.question) {
            state.jos20BoundaryQuestion = det.question;
            render();
            return;
          }
          state.jos20BoundaryAsked = true;
          state.jos20Started = false;
          step = 207;
          render();
        }).catch(() => {
          state.jos20BoundaryAsked = true;
          state.jos20Started = false;
          step = 207;
          render();
        });
        return true;
      }
      if (waiting) {
        root.innerHTML = jos20Shell(1, `
          <div class="extract-spinner" aria-hidden="true"></div>
          <p class="q-title" style="text-align:center;margin-bottom:0">話を見つめています…</p>
        `);
        return true;
      }
      root.innerHTML = jos20Shell(1, `
        <p class="q-title">一つだけ確認させてください。</p>
        <p class="q-help">${escapeHtml(state.jos20BoundaryQuestion)}</p>
        <textarea id="field-boundary" class="textarea" rows="4" placeholder="失われたら選ばないこと、で構いません">${escapeHtml(state.jos20BoundaryAnswer)}</textarea>
        <div class="dump-actions">
          <button type="button" id="btn-mic" class="btn btn-ghost mic-btn" aria-pressed="false">マイクで話す</button>
          <button type="button" id="btn-next" class="btn btn-primary">進む</button>
        </div>
        <button type="button" id="btn-skip" class="btn btn-ghost w-full">今は飛ばす</button>
      `);
      const ta = document.getElementById('field-boundary');
      bindSpeechMic(ta, document.getElementById('btn-mic'));
      const doneBoundary = (v) => {
        state.jos20BoundaryAnswer = v;
        if (v && !state.introDigNote.trim()) state.introDigNote = v;
        state.jos20BoundaryAsked = true;
        state.jos20Started = false;
        step = 207;
        render();
      };
      document.getElementById('btn-next').onclick = () => {
        const v = (ta?.value || '').trim();
        if (v.length < 2) { ta?.focus(); return; }
        doneBoundary(v);
      };
      document.getElementById('btn-skip').onclick = () => doneBoundary('');
      return true;
    }

    if (step === 206) {
      jos20FillConstraintsQuietly();
      state.jos20Started = false;
      step = 207;
      render();
      return true;
    }

    if (step === 207) {
      root.innerHTML = jos20Shell(2, `
        <div class="extract-spinner" aria-hidden="true"></div>
        <p class="q-title" style="text-align:center;margin-bottom:0">判断の基準を言葉にしています…</p>
        <p class="q-help" style="text-align:center;margin-bottom:0">決めるのは、あなたです。</p>
      `);
      runJos20Synthesize();
      return true;
    }

    if (step === 208) {
      const principle = state.principleEdited || state.principle;
      root.innerHTML = jos20Shell(2, `
        <p class="q-title">あなたの判断原則</p>
        <p class="q-help">今回の対話から見えた、何で決めるかです。</p>
        ${state.judgmentCore ? `<p class="q-help">今のお話で、判断の中心はここにありそうです。<br><strong class="text-[hsl(var(--foreground))]">${escapeHtml(state.judgmentCore)}</strong></p>` : ''}
        <div class="layer-card layer-card-accent">
          ${state.principleFeedback === 'edit' ? `
            <textarea id="field-principle" class="textarea" rows="5">${escapeHtml(principle)}</textarea>
            <button type="button" id="btn-save-principle" class="btn btn-primary w-full mt-2">この言葉にする</button>
          ` : `
            <p class="layer-principle">${escapeHtml(principle)}</p>
            <div class="fb-row">
              <button type="button" class="btn btn-primary fb-btn" data-fb="yes">その通り</button>
              <button type="button" class="btn btn-ghost fb-btn" data-fb="diff">少し違う</button>
            </div>
          `}
        </div>
      `);
      root.querySelectorAll('[data-fb]').forEach((btn) => {
        btn.onclick = () => {
          const fb = btn.getAttribute('data-fb');
          if (fb === 'diff') {
            state.principleFeedback = 'edit';
            render();
            return;
          }
          state.principleFeedback = 'yes';
          persistJos20Entry();
          step = 209;
          render();
        };
      });
      const saveP = document.getElementById('btn-save-principle');
      if (saveP) {
        saveP.onclick = () => {
          const v = (document.getElementById('field-principle')?.value || '').trim();
          if (v) {
            state.principleEdited = v;
            state.principle = v;
          }
          state.principleFeedback = 'edit-saved';
          persistJos20Entry();
          step = 209;
          render();
        };
      }
      return true;
    }

    if (step === 209) {
      root.innerHTML = jos20Shell(3, `
        <p class="q-title">AIに渡す</p>
        <p class="q-help">この判断基準を前提に、選択肢を出してもらう文です。最終判断はあなたが行います。</p>
        <textarea id="field-handoff" class="ai-prompt-box" rows="12">${escapeHtml(state.handoffText)}</textarea>
        <button type="button" id="btn-copy-handoff" class="btn btn-primary w-full mt-2">コピーする</button>
        <span id="copy-handoff-toast" class="hidden text-xs text-center text-[hsl(var(--primary))] block mt-2">コピーしました</span>
        <button type="button" id="btn-reflect" class="btn btn-ghost w-full">もう少し振り返る</button>
        <button type="button" id="btn-home" class="btn btn-ghost w-full">トップへ</button>
      `);
      const ho = document.getElementById('field-handoff');
      if (ho) ho.oninput = () => { state.handoffText = ho.value; };
      document.getElementById('btn-copy-handoff').onclick = () => {
        state.handoffText = (document.getElementById('field-handoff')?.value || state.handoffText);
        persistJos20Entry();
        copyText(state.handoffText, 'copy-handoff-toast');
      };
      document.getElementById('btn-reflect').onclick = () => {
        step = 210;
        render();
      };
      document.getElementById('btn-home').onclick = () => goLanding();
      return true;
    }

    if (step === 210) {
      const g = state.criteriaGrowth || emptyCriteriaGrowth();
      root.innerHTML = jos20Shell(2, `
        <p class="q-title">もう少し振り返る</p>
        <p class="q-help">必須ではありません。残しておきたい変化だけ、短く。</p>
        <label class="field-label">最初の私は</label>
        <textarea id="field-first" class="textarea" rows="2">${escapeHtml(g.firstMe || '')}</textarea>
        <label class="field-label">今の私は</label>
        <textarea id="field-now" class="textarea" rows="2">${escapeHtml(g.nowMe || '')}</textarea>
        <label class="field-label">一番変わった判断基準</label>
        <textarea id="field-chg" class="textarea" rows="2">${escapeHtml(g.criteriaChange || '')}</textarea>
        <label class="field-label">本当の目的</label>
        <textarea id="field-purpose" class="textarea" rows="2">${escapeHtml(g.truePurpose || '')}</textarea>
        <button type="button" id="btn-save-ref" class="btn btn-primary w-full">残して戻る</button>
        <button type="button" id="btn-skip-ref" class="btn btn-ghost w-full">戻る</button>
      `);
      document.getElementById('btn-save-ref').onclick = () => {
        state.criteriaGrowth = Object.assign(emptyCriteriaGrowth(), g, {
          firstMe: (document.getElementById('field-first')?.value || '').trim(),
          nowMe: (document.getElementById('field-now')?.value || '').trim(),
          criteriaChange: (document.getElementById('field-chg')?.value || '').trim(),
          truePurpose: (document.getElementById('field-purpose')?.value || '').trim()
        });
        persistJos20Entry();
        step = 209;
        render();
      };
      document.getElementById('btn-skip-ref').onclick = () => {
        step = 209;
        render();
      };
      return true;
    }

    return false;
  }

  function render() {
    renderInner();
    if (viewMode === 'flow') {
      markFarthest();
      bindFlowNav();
    }
  }

  function renderInner() {
    const root = document.getElementById('dialogue');
    if (viewMode === 'history') {
      renderHistoryList(root);
      return;
    }
    if (viewMode === 'theme') {
      renderThemeDetail(root);
      return;
    }
    const prog = `${phaseNavHtml()}${stepBackHtml()}<p class="step-progress"><em>JudgmentOS</em> · ${progressLabel()}</p>`;

    if (useJos20Ui() && step >= 201 && step <= 211) {
      renderJos20(root);
      return;
    }

    // —— 導入UX STEP1: テーマ選択（ワンタップ）——
    if (step === 101) {
      root.innerHTML = `
        <section class="card space-y-4 fade-in">
          ${prog}
          <p class="q-title">今、どのことで頭を悩ませていますか？</p>
          <p class="q-help">まずは近いものを一つ選んでください。あとから言葉は整えられます。</p>
          <div class="theme-card-grid" id="intro-cat-grid">
            ${INTRO_CATEGORIES.map((c) => `
              <button type="button" class="theme-card${state.introCategoryId === c.id ? ' selected' : ''}" data-cid="${escapeHtml(c.id)}">
                <span class="theme-card-title">${escapeHtml(c.title)}</span>
                <span class="theme-card-hint">${escapeHtml(c.hint)}</span>
              </button>
            `).join('')}
          </div>
          ${isDevMode() ? `<button type="button" id="btn-dev-sample" class="btn btn-ghost w-full text-xs opacity-60">[開発] サンプルで進む</button>` : ''}
        </section>`;
      root.querySelectorAll('#intro-cat-grid .theme-card').forEach((btn) => {
        btn.onclick = () => {
          state.introCategoryId = btn.getAttribute('data-cid') || '';
          step = 102;
          render();
        };
      });
      const btnDev = document.getElementById('btn-dev-sample');
      if (btnDev) {
        btnDev.onclick = () => {
          state.introCategoryId = 'ai_dissonance';
          state.background = DEMO.background;
          state.achieve = DEMO.achieve;
          state.decision = DEMO.decision;
          state.protect = DEMO.protect;
          state.criteriaCore = DEMO.criteriaCore;
          state.criteriaMust = DEMO.criteriaMust;
          state.criteriaWant = DEMO.criteriaWant;
          state.weightResolve = DEMO.weightResolve;
          syncThemeFromBackground();
          step = 9;
          render();
        };
      }
      return;
    }

    // —— 導入UX STEP2: 吐き出し（音声／殴り書き）——
    if (step === 102) {
      const cat = introCategory();
      root.innerHTML = `
        <section class="card space-y-3 fade-in">
          ${prog}
          <p class="q-title">頭の中にあることを、そのまま出してください。</p>
          <p class="q-help">${cat ? `テーマ: ${escapeHtml(cat.title)} — ` : ''}まとまっていなくて構いません。次の画面で、次の二軸に整理して<strong>映し返し</strong>ます。</p>
          ${axisWordDefsHtml()}
          <textarea id="field-intro-dump" class="textarea textarea-dump" rows="7" placeholder="例）売上は伸ばしたいが、儲け主義に見られてブランドを損ねたくない、など。頭の中をそのまま。">${escapeHtml(state.introDump)}</textarea>
          <div class="dump-actions">
            <button type="button" id="btn-mic" class="btn btn-ghost mic-btn" aria-pressed="false">マイクで話す</button>
            <button type="button" id="btn-next" class="btn btn-primary" ${state.introDump.trim().length >= 4 ? '' : 'disabled'}>これで分類する</button>
          </div>
        </section>`;
      const ta = document.getElementById('field-intro-dump');
      const next = document.getElementById('btn-next');
      const mic = document.getElementById('btn-mic');
      if (ta) {
        ta.oninput = () => {
          state.introDump = ta.value;
          if (next) next.disabled = ta.value.trim().length < 4;
        };
      }
      bindSpeechMic(ta, mic);
      if (next) {
        next.onclick = () => {
          const v = (ta?.value || '').trim();
          if (v.length < 4) {
            ta?.focus();
            return;
          }
          state.introDump = v;
          state.introBusy = true;
          state.introFetchStarted = false;
          step = 103;
          render();
        };
      }
      return;
    }

    // —— 導入UX STEP3: 自動構造化（＋過去があれば変化抽出）——
    if (step === 103) {
      const pastPacked = getLatestPastLog();
      const hasPast = !!(pastPacked && pastPacked.entry);
      root.innerHTML = `
        <section class="card space-y-4 fade-in extract-loading" aria-live="polite">
          ${prog}
          <div class="extract-spinner" aria-hidden="true"></div>
          <p class="q-title" style="text-align:center;margin-bottom:0">${hasPast ? '変化を読み取り中...' : '思考を分類中...'}</p>
          <p class="q-help" style="text-align:center;margin-bottom:0">${hasPast
            ? '前回の判断ログと、いまの言葉を見比べています。'
            : '「実現」（向かいたい変化）と「守る」（崩したくないもの）を抜き出しています。'}</p>
        </section>`;
      if (!state.introFetchStarted) {
        state.introFetchStarted = true;
        state.introBusy = true;
        runIntroPipeline().then(() => {
          if (step !== 103) return;
          state.introBusy = false;
          state.introFetchStarted = false;
          state.introEditAchieve = false;
          state.introEditProtect = false;
          step = 104;
          render();
        });
      }
      return;
    }

    // —— 導入UX STEP4: 映し返し（過去ログがあれば変化の提示）——
    if (step === 104) {
      const tags = state.introConstraintTags || [];
      const change = state.introChange;
      const primaryLabel = change ? 'この変化を認めて進める' : 'この軸で進める';
      root.innerHTML = `
        <section class="space-y-4 fade-in reveal-in">
          ${prog}
          ${change ? `
            <p class="q-title">以前の軸と、今のあなた</p>
            <p class="q-help">残してある判断ログと、今回の言葉を見比べた<strong>映し返し</strong>です。${change.pastDate ? `（前回: ${escapeHtml(change.pastDate)}）` : ''}</p>
            ${axisWordDefsHtml()}
            <div class="change-pair">
              <div class="change-card change-card-past reveal-card">
                <p class="axis-label">以前の軸</p>
                <p class="change-kicker">以前のあなた</p>
                <p class="axis-body">${escapeHtml(change.previousYou)}</p>
              </div>
              <div class="change-card change-card-now reveal-card reveal-card-delay">
                <p class="axis-label">今のAIからの提示</p>
                <p class="change-kicker">今のあなたは、こうでは？</p>
                <p class="axis-body">${escapeHtml(change.nowSuggestion)}</p>
              </div>
            </div>
            <p class="q-help" style="margin-top:0.25rem">あわせて、今回抜き出した軸も確認できます。</p>
          ` : `
            <p class="q-title">この2つのバランスを取ることが、今回のテーマですね？</p>
            <p class="q-help">これは<strong>映し返し</strong>です。吐き出しを「実現」と「守る」に整理して見せています。答えや最適案ではありません。違うところだけ直して進んでください。</p>
            ${axisWordDefsHtml()}
          `}
          ${balanceBoardHtml()}
          <div class="axis-pair">
            <div class="axis-card reveal-card">
              ${axisLabelAchieveHtml()}
              ${state.introEditAchieve
                ? `<textarea id="field-edit-achieve" class="textarea" rows="3">${escapeHtml(state.achieve)}</textarea>`
                : `<p class="axis-body">「${escapeHtml(state.achieve || '（未抽出）')}」</p>`}
              <button type="button" id="btn-edit-achieve" class="btn btn-ghost w-full mt-2">${state.introEditAchieve ? '反映する' : '微修正'}</button>
            </div>
            <div class="axis-card reveal-card reveal-card-delay">
              ${axisLabelProtectHtml()}
              ${state.introEditProtect
                ? `<textarea id="field-edit-protect" class="textarea" rows="3">${escapeHtml(state.protect)}</textarea>`
                : `<p class="axis-body">「${escapeHtml(state.protect || '（未抽出）')}」</p>`}
              <button type="button" id="btn-edit-protect" class="btn btn-ghost w-full mt-2">${state.introEditProtect ? '反映する' : '微修正'}</button>
            </div>
          </div>
          ${tags.length ? `
            <div class="constraint-suggest">
              <p class="grow-field-label">意識するとよい制約（参考）</p>
              <div class="tag-row">${tags.map((t) => `<span class="soft-tag">${escapeHtml(t)}</span>`).join('')}</div>
            </div>
          ` : ''}
          ${!state.introDigDone ? `
            <button type="button" id="btn-dig" class="btn btn-primary w-full" ${state.achieve.trim() && state.protect.trim() ? '' : 'disabled'}>いちばんぼやけているところを掘る</button>
            <button type="button" id="btn-next" class="btn btn-ghost w-full" ${state.achieve.trim() && state.protect.trim() ? '' : 'disabled'}>${escapeHtml(primaryLabel)}（掘らずに進む）</button>
          ` : `
            <button type="button" id="btn-next" class="btn btn-primary w-full" ${state.achieve.trim() && state.protect.trim() ? '' : 'disabled'}>${escapeHtml(primaryLabel)}</button>
          `}
          <button type="button" id="btn-redump" class="btn btn-ghost w-full">吐き出しに戻る</button>
        </section>`;
      const editA = document.getElementById('btn-edit-achieve');
      const editP = document.getElementById('btn-edit-protect');
      if (editA) {
        editA.onclick = () => {
          if (state.introEditAchieve) {
            const v = (document.getElementById('field-edit-achieve')?.value || '').trim();
            if (v) state.achieve = v;
            state.introEditAchieve = false;
          } else {
            state.introEditAchieve = true;
          }
          render();
        };
      }
      if (editP) {
        editP.onclick = () => {
          if (state.introEditProtect) {
            const v = (document.getElementById('field-edit-protect')?.value || '').trim();
            if (v) state.protect = v;
            state.introEditProtect = false;
          } else {
            state.introEditProtect = true;
          }
          render();
        };
      }
      const btnDig = document.getElementById('btn-dig');
      if (btnDig) {
        btnDig.onclick = () => {
          if (!state.achieve.trim() || !state.protect.trim()) return;
          step = 105;
          render();
        };
      }
      document.getElementById('btn-next').onclick = () => {
        if (!state.achieve.trim() || !state.protect.trim()) return;
        finishIntroIntoCriteria();
      };
      document.getElementById('btn-redump').onclick = () => {
        state.introChange = null;
        step = 102;
        render();
      };
      return;
    }

    // —— 映し返し後: 掘る場所を選ぶ（最大1周）——
    if (step === 105) {
      root.innerHTML = `
        <section class="card space-y-4 fade-in">
          ${prog}
          <p class="q-title">いま一番ぼやけているのは、どれですか？</p>
          <p class="q-help">答えを選ぶのではなく、<strong>いま掘る場所</strong>を選びます。1つだけ。</p>
          ${axisWordDefsHtml({ mirror: false, dig: true })}
          ${balanceBoardHtml()}
          <div class="theme-card-grid" id="dig-focus-grid">
            ${INTRO_DIG_FOCUSES.map((f) => `
              <button type="button" class="theme-card${state.introDigFocusId === f.id ? ' selected' : ''}" data-fid="${escapeHtml(f.id)}">
                <span class="theme-card-title">${escapeHtml(f.title)}</span>
                <span class="theme-card-hint">${escapeHtml(f.hint)}</span>
              </button>
            `).join('')}
          </div>
          <button type="button" id="btn-skip-dig" class="btn btn-ghost w-full">掘らずに進む</button>
        </section>`;
      root.querySelectorAll('#dig-focus-grid .theme-card').forEach((btn) => {
        btn.onclick = () => {
          state.introDigFocusId = btn.getAttribute('data-fid') || '';
          step = 106;
          render();
        };
      });
      document.getElementById('btn-skip-dig').onclick = () => finishIntroIntoCriteria();
      return;
    }

    // —— 少しだけ掘る ——
    if (step === 106) {
      const focus = introDigFocus();
      if (!focus) {
        step = 105;
        render();
        return;
      }
      root.innerHTML = `
        <section class="card space-y-3 fade-in">
          ${prog}
          <p class="q-title">${escapeHtml(focus.title)}</p>
          <p class="q-help">${escapeHtml(focus.prompt)}</p>
          <textarea id="field-dig-note" class="textarea" rows="4" placeholder="一文で構いません。">${escapeHtml(state.introDigNote)}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary w-full" ${state.introDigNote.trim().length >= 4 ? '' : 'disabled'}>軸に戻して見なおす</button>
          <button type="button" id="btn-back-dig" class="btn btn-ghost w-full">掘る場所を選びなおす</button>
        </section>`;
      const ta = document.getElementById('field-dig-note');
      const next = document.getElementById('btn-next');
      if (ta) {
        ta.oninput = () => {
          state.introDigNote = ta.value;
          if (next) next.disabled = ta.value.trim().length < 4;
        };
      }
      if (next) {
        next.onclick = () => {
          const v = (ta?.value || '').trim();
          if (v.length < 4) {
            ta?.focus();
            return;
          }
          state.introDigNote = v;
          applyDigNoteToAxis();
          state.introDigDone = true;
          state.introEditAchieve = false;
          state.introEditProtect = false;
          step = 107;
          render();
        };
      }
      document.getElementById('btn-back-dig').onclick = () => {
        step = 105;
        render();
      };
      return;
    }

    // —— 掘ったあとの再映し返し（ミニ図つき）——
    if (step === 107) {
      const focus = introDigFocus();
      root.innerHTML = `
        <section class="space-y-4 fade-in reveal-in">
          ${prog}
          <p class="q-title">掘ったあと、軸はどう見えますか？</p>
          <p class="q-help">選んだ場所の言葉を軸に反映した<strong>映し返し</strong>です。違うところだけ直して進んでください。</p>
          ${axisWordDefsHtml()}
          ${balanceBoardHtml()}
          ${focus && state.introDigNote ? `
            <div class="dig-echo">
              <p class="axis-label">いま掘ったこと</p>
              <p class="change-kicker">${escapeHtml(focus.title)}</p>
              <p class="axis-body">「${escapeHtml(state.introDigNote)}」</p>
            </div>
          ` : ''}
          <div class="axis-pair">
            <div class="axis-card reveal-card">
              ${axisLabelAchieveHtml()}
              ${state.introEditAchieve
                ? `<textarea id="field-edit-achieve" class="textarea" rows="3">${escapeHtml(state.achieve)}</textarea>`
                : `<p class="axis-body">「${escapeHtml(state.achieve || '（未抽出）')}」</p>`}
              <button type="button" id="btn-edit-achieve" class="btn btn-ghost w-full mt-2">${state.introEditAchieve ? '反映する' : '微修正'}</button>
            </div>
            <div class="axis-card reveal-card reveal-card-delay">
              ${axisLabelProtectHtml()}
              ${state.introEditProtect
                ? `<textarea id="field-edit-protect" class="textarea" rows="3">${escapeHtml(state.protect)}</textarea>`
                : `<p class="axis-body">「${escapeHtml(state.protect || '（未抽出）')}」</p>`}
              <button type="button" id="btn-edit-protect" class="btn btn-ghost w-full mt-2">${state.introEditProtect ? '反映する' : '微修正'}</button>
            </div>
          </div>
          <button type="button" id="btn-next" class="btn btn-primary w-full">この軸で進める</button>
          <button type="button" id="btn-redig" class="btn btn-ghost w-full">掘る場所を変えずに言い直す</button>
        </section>`;
      const editA = document.getElementById('btn-edit-achieve');
      const editP = document.getElementById('btn-edit-protect');
      if (editA) {
        editA.onclick = () => {
          if (state.introEditAchieve) {
            const v = (document.getElementById('field-edit-achieve')?.value || '').trim();
            if (v) state.achieve = v;
            state.introEditAchieve = false;
          } else state.introEditAchieve = true;
          render();
        };
      }
      if (editP) {
        editP.onclick = () => {
          if (state.introEditProtect) {
            const v = (document.getElementById('field-edit-protect')?.value || '').trim();
            if (v) state.protect = v;
            state.introEditProtect = false;
          } else state.introEditProtect = true;
          render();
        };
      }
      document.getElementById('btn-next').onclick = () => finishIntroIntoCriteria();
      document.getElementById('btn-redig').onclick = () => {
        step = 106;
        render();
      };
      return;
    }

    if (step === 1) {
      const draft = concernDraft || state.decision;
      root.innerHTML = `
        <section class="card space-y-3">
          ${prog}
          <p class="q-title">今、あなたは何を判断しようとしていますか。</p>
          <p class="q-help">重要性の大小は問いません。「最適を決める」ではなく、いま向き合っている判断・分岐を一文で。例: 来期AI投資を承認するか見送るか／この提案を引き受けるか問い直すか。</p>
          <textarea id="field-decision" class="textarea" rows="3">${escapeHtml(draft)}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary w-full" ${draft.trim() ? '' : 'disabled'}>次へ</button>
          ${isDevMode() ? `<button type="button" id="btn-dev-sample" class="btn btn-ghost w-full text-xs opacity-60">[開発] サンプルで進む</button>` : ''}
        </section>`;
      bindStep1();
      return;
    }

    if (step === 2) {
      root.innerHTML = `
        <section class="card space-y-3">
          ${prog}
          ${trailHtml()}
          <p class="q-title">いま、この判断が必要な理由は何ですか。</p>
          <p class="q-help">向かいたい姿や結論ではなく、「なぜ今、向き合うのか」を書いてください。きっかけ、圧力、放っておけない事情で構いません。</p>
          <textarea id="field-background" class="textarea">${escapeHtml(state.background)}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary w-full">次へ</button>
        </section>`;
      document.getElementById('btn-next').onclick = () => {
        const v = document.getElementById('field-background').value.trim();
        if (!v) { document.getElementById('field-background').focus(); return; }
        state.background = v;
        step = 3;
        render();
      };
      return;
    }

    if (step === 3) {
      root.innerHTML = `
        <section class="card space-y-3">
          ${prog}
          ${trailHtml()}
          <p class="q-title">経営者として、本来実現したいことは何ですか。</p>
          ${axisWordDefsHtml({ mirror: false })}
          <p class="q-help">施策や数字の目標そのものより、その先で<strong>向かいたい変化・到達したい姿</strong>を書いてください。大きな言葉で構いません。</p>
          <textarea id="field-achieve" class="textarea">${escapeHtml(state.achieve)}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary w-full">次へ</button>
        </section>`;
      document.getElementById('btn-next').onclick = () => {
        const v = document.getElementById('field-achieve').value.trim();
        if (!v) { document.getElementById('field-achieve').focus(); return; }
        state.achieve = v;
        step = 4;
        render();
      };
      return;
    }

    if (step === 4) {
      root.innerHTML = `
        <section class="card space-y-3">
          ${prog}
          ${trailHtml()}
          <p class="q-title">守りたいもの、崩したくないものはありますか。</p>
          ${axisWordDefsHtml({ mirror: false })}
          <p class="q-help">実現したい変化を進めるとき、<strong>崩したくないもの・失いたくないもの・そう見られたくないもの</strong>を書いてください。人・関係・信頼・文化・ブランドなど。</p>
          <textarea id="field-protect" class="textarea">${escapeHtml(state.protect)}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary w-full">次へ</button>
        </section>`;
      document.getElementById('btn-next').onclick = () => {
        const v = document.getElementById('field-protect').value.trim();
        if (!v) { document.getElementById('field-protect').focus(); return; }
        state.protect = v;
        step = 5;
        render();
      };
      return;
    }

    if (step === 5) {
      const m = buildMirrorA();
      root.innerHTML = `
        <section class="space-y-3">
          ${prog}
          <div class="mirror-card fade-in">
            <p class="mirror-label">いまの言葉を並べて見る（映し返し）</p>
            ${axisWordDefsHtml()}
            <p>あなたは、実現したいこととして</p>
            <p class="quote">「${escapeHtml(m.achieve)}」</p>
            <p>と考えています。</p>
            <p class="mt-3">一方で、守りたいものとして</p>
            <p class="quote">「${escapeHtml(m.protect)}」</p>
            <p>と考えています。</p>
            <p class="mt-4">この二つを両立させながら考えることが、<br>今回の判断の核になりそうです。</p>
          </div>
          <button type="button" id="btn-next" class="btn btn-primary w-full">大切にしたいことへ</button>
        </section>`;
      document.getElementById('btn-next').onclick = () => { step = 6; render(); };
      return;
    }

    if (step === 6) {
      root.innerHTML = `
        <section class="card space-y-3">
          ${prog}
          ${trailHtml()}
          <p class="q-title">この決定で、いちばん大切にしたいことは何ですか。</p>
          <p class="q-help">判断基準という難しい言葉でなくて構いません。いまのあなたが、この決定でいちばん大切にしたいことを書いてください。</p>
          <textarea id="field-core" class="textarea" rows="4">${escapeHtml(state.criteriaCore)}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary w-full">次へ</button>
        </section>`;
      document.getElementById('btn-next').onclick = () => {
        const v = document.getElementById('field-core').value.trim();
        if (!v) { document.getElementById('field-core').focus(); return; }
        state.criteriaCore = v;
        step = 7;
        render();
      };
      return;
    }

    if (step === 7) {
      root.innerHTML = `
        <section class="card space-y-4">
          ${prog}
          ${trailHtml()}
          <p class="q-title">いま書いたことのなかで、もう少し分けてみますか。</p>
          <p class="q-help">空欄のままで次へ進んで構いません。分かることだけ書いてください。</p>
          <div>
            <p class="grow-field-label">そのうち、絶対に譲れないものはありますか。</p>
            <textarea id="field-must" class="textarea" rows="3">${escapeHtml(state.criteriaMust)}</textarea>
          </div>
          <div>
            <p class="grow-field-label">できれば満たしたいものはありますか。</p>
            <textarea id="field-want" class="textarea" rows="3">${escapeHtml(state.criteriaWant)}</textarea>
          </div>
          <button type="button" id="btn-next" class="btn btn-primary w-full">次へ</button>
        </section>`;
      document.getElementById('btn-next').onclick = () => {
        state.criteriaMust = document.getElementById('field-must').value.trim();
        state.criteriaWant = document.getElementById('field-want').value.trim();
        step = 8;
        render();
      };
      return;
    }

    if (step === 8) {
      root.innerHTML = `
        <section class="card space-y-3">
          ${prog}
          ${trailHtml()}
          <p class="q-title">いま挙げたなかで、いちばん強く効いているものは何ですか。<br>また、この判断の結果を、どこまで自分の責任として引き受けますか。</p>
          <p class="q-help">二つまとめて書いて構いません。例: 「効果の速さより、守るべき信頼の方が強い。最終判断は自分が引き受ける。」</p>
          <textarea id="field-weight" class="textarea" rows="4">${escapeHtml(state.weightResolve)}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary w-full">いま言葉にしたものを見る</button>
        </section>`;
      document.getElementById('btn-next').onclick = () => {
        const v = document.getElementById('field-weight').value.trim();
        if (!v) { document.getElementById('field-weight').focus(); return; }
        state.weightResolve = v;
        syncThemeFromBackground();
        state.constraints = criteriaAsConstraintsText();
        step = 9;
        render();
      };
      return;
    }

    if (step === 9) {
      root.innerHTML = `
        <section class="space-y-4 fade-in">
          ${prog}
          ${contextCardHtml()}
          <p class="text-sm text-[hsl(var(--muted-fg))] leading-relaxed px-1">
            判断の質は、この判断文脈の質で決まります。<br>
            答えを求める前に、置いたものを自分で確認してください。
          </p>
          <p class="text-xs text-[hsl(var(--muted-fg))] leading-relaxed px-1 -mt-2 opacity-90">
            次は、この判断文脈を前提に<strong>論点</strong>を示します（答え・最適案ではありません）。
          </p>
          <button type="button" id="btn-pass" class="btn btn-primary w-full">論点を判定するへ</button>
        </section>`;
      document.getElementById('btn-pass').onclick = () => {
        ensureJudgmentSessionId();
        step = nextAfterContextUpdate();
        render();
      };
      return;
    }

    // 将来拡張: シナリオ別・問い返す型（V1.2モニターの標準フローではスキップ）
    if (step === 10) {
      if (!INCLUDE_REPLY_PATTERN_IN_FLOW) {
        step = 13;
        render();
        return;
      }
      const pattern = REPLY_PATTERN_LIBRARY[0];
      root.innerHTML = `
        <section class="card space-y-4 fade-in">
          ${prog}
          ${replyPatternHtml(pattern)}
          <button type="button" id="btn-next" class="btn btn-primary w-full">この型を受け取った</button>
        </section>`;
      document.getElementById('btn-next').onclick = () => {
        step = 13;
        render();
      };
      return;
    }

    // 論点を示す（B主経路 / A非常口）
    if (step === 13) {
      snapshotBeforePass();
      refreshHypothesesStaleFlag();
      const parts = state.contextBeforeParts;
      const allowB = builtinAiAllowed();
      const usage = getHypogenCounts();
      const err = state.hypogenError || '';
      const busy = state.hypogenBusy;
      root.innerHTML = `
        <section class="space-y-4 fade-in">
          ${prog}
          <p class="q-title">ここまでに、あなたが言葉にした判断文脈</p>
          <p class="q-help">論点は答えではありません。気づいていなかった点を、いま言葉にした内容に照らして採る／捨てるためのものです。あとで振り返り、最初の判断を見直す材料になります。</p>
          <div class="mirror-summary">
            <pre class="compare-body" style="white-space:pre-wrap">${escapeHtml(formatContextParts(parts))}</pre>
          </div>
          ${state.hypothesesStale ? `
            <p class="q-help" style="color:hsl(var(--warning, 38 92% 50%));">判断文脈が変わったため、以前の論点は無効です。出し直すか、自分のAIを使ってください。</p>
          ` : ''}
          ${err ? `<p class="invite-error" role="alert">${escapeHtml(err)}</p>` : ''}
          <div class="flex flex-col gap-2">
            ${allowB ? `
              <button type="button" id="btn-gen-b" class="btn btn-primary w-full" ${busy ? 'disabled' : ''}>
                ${busy ? '論点を探しています…' : (state.hypotheses.length && !state.hypothesesStale ? '論点を出し直す' : '論点を示す')}
              </button>
              <p class="text-xs text-center text-[hsl(var(--muted-fg))]">この判断 ${usage.judgment}/${HYPOGEN_LIMIT_JUDGMENT} 回 · 本日 ${usage.day}/${HYPOGEN_LIMIT_DAY} 回</p>
            ` : `
              <p class="q-help">この画面で論点を出す機能は、データ送信に同意した方のみ使えます。下の「自分のAIを使う」で進められます。</p>
            `}
            <button type="button" id="btn-path-a" class="btn btn-ghost w-full">自分のChatGPTなどを使う</button>
            ${state.hypotheses.length && !state.hypothesesStale ? `
              <button type="button" id="btn-to-judge" class="btn btn-ghost w-full">すでに出ている論点を判定する</button>
            ` : ''}
          </div>
        </section>`;

      const goJudge = () => {
        state.reflectionQ = 0;
        state.hypogenError = '';
        step = 14;
        render();
      };

      const genBtn = document.getElementById('btn-gen-b');
      if (genBtn) {
        genBtn.onclick = async () => {
          if (state.hypogenBusy) return;
          state.hypogenError = '';
          state.hypogenBusy = true;
          render();
          if (state.hypothesesStale) clearHypothesesForRegen();
          const result = await requestBuiltinHypotheses(false);
          state.hypogenBusy = false;
          if (!result.ok) {
            state.hypogenError = result.reason || '論点を示せませんでした。';
            render();
            return;
          }
          goJudge();
        };
      }
      document.getElementById('btn-path-a').onclick = () => {
        state.hypogenError = '';
        state.pathAMode = true;
        renderPathACopy();
      };
      const toJudge = document.getElementById('btn-to-judge');
      if (toJudge) toJudge.onclick = goJudge;
      return;
    }

    // 論点を判定（採否）
    if (step === 14) {
      refreshHypothesesStaleFlag();
      if (state.hypothesesStale) {
        state.hypogenError = '判断文脈が変わったため、論点は無効です。出し直してください。';
        step = 13;
        render();
        return;
      }
      if (state.aiReplyPaste && /仮説\s*\d*\s*[:：]/.test(state.aiReplyPaste)) {
        state.aiReplyPaste = normalizeRontenLabels(state.aiReplyPaste);
      }
      if (!state.hypotheses.length && state.aiReplyPaste.trim()) applyAiPasteParse(state.hypothesesSource || 'a');
      const hyps = state.hypotheses || [];
      const selected = new Set(state.selectedHypothesisIds || []);
      const showPaste = state.hypothesesSource === 'a' || state.pathAMode || !hyps.length;
      root.innerHTML = `
        <section class="card space-y-4 fade-in">
          ${prog}
          <p class="q-title">論点を、あなたが判定する</p>
          <p class="q-help">論点は答えではありません。採る・捨てる・残す一言だけを決めるのは、あなたです。あとで振り返り、最初の判断を見直す材料です。</p>
          ${showPaste ? `
          <div>
            <label class="gap-insight-label" for="field-ai-paste">AIから返ってきた論点（貼り付け）</label>
            <p class="q-help">自分のAIから返ってきた本文を貼り、「論点を読み取る」を押してください。</p>
            <textarea id="field-ai-paste" class="textarea" rows="8">${escapeHtml(state.aiReplyPaste)}</textarea>
            <button type="button" id="btn-parse" class="btn btn-ghost w-full mt-2">論点を読み取る</button>
          </div>
          ` : ''}
          ${hyps.length ? `
            <div>
              <p class="grow-field-label">気になった論点を選ぶ（複数可）</p>
              <div class="choice-grid" id="hyp-list">
                ${hyps.map((h) => `
                  <label class="choice-btn${selected.has(h.id) ? ' selected' : ''}" style="display:block;cursor:pointer;text-align:left;">
                    <input type="checkbox" data-hid="${escapeHtml(h.id)}" ${selected.has(h.id) ? 'checked' : ''} style="margin-right:0.4rem;">
                    <span class="text-[0.625rem] font-bold tracking-wider text-[hsl(var(--primary))]">${escapeHtml(h.category)}</span><br>
                    <span class="text-sm">${escapeHtml(h.text)}</span>
                  </label>
                `).join('')}
              </div>
            </div>
            <div>
              <p class="grow-field-label">自分の一言（任意）</p>
              <p class="q-help">採った論点への補足や、捨てた理由など。空欄でも進めます。</p>
              <textarea id="field-reflect" class="textarea" rows="2">${escapeHtml(state.reflection.contextChange || '')}</textarea>
            </div>
          ` : `
            <p class="q-help">まだ論点がありません。「論点を示す」に戻るか、上で貼り付けて読み取ってください。</p>
          `}
          <div class="flex flex-col gap-2">
            <button type="button" id="btn-next" class="btn btn-primary w-full" ${hyps.length ? '' : 'disabled'}>本当に問うべき判断へ</button>
            <button type="button" id="btn-back-gen" class="btn btn-ghost w-full">論点を示すに戻る</button>
          </div>
        </section>`;

      const paste = document.getElementById('field-ai-paste');
      if (paste) {
        paste.oninput = () => { state.aiReplyPaste = paste.value; };
        const parseBtn = document.getElementById('btn-parse');
        if (parseBtn) {
          parseBtn.onclick = () => {
            state.aiReplyPaste = paste.value;
            if (!state.aiReplyPaste.trim()) {
              paste.focus();
              return;
            }
            applyAiPasteParse('a');
            state.pathAMode = false;
            render();
          };
        }
      }
      document.querySelectorAll('#hyp-list input[type="checkbox"]').forEach((box) => {
        box.onchange = () => {
          const id = box.getAttribute('data-hid');
          const set = new Set(state.selectedHypothesisIds || []);
          if (box.checked) set.add(id);
          else set.delete(id);
          state.selectedHypothesisIds = Array.from(set);
          const label = box.closest('label');
          if (label) label.classList.toggle('selected', box.checked);
        };
      });
      const field = document.getElementById('field-reflect');
      if (field) {
        field.oninput = () => { state.reflection.contextChange = field.value; };
      }
      document.getElementById('btn-next').onclick = () => {
        if (!state.hypotheses.length || state.hypothesesStale) return;
        if (field) state.reflection.contextChange = field.value.trim();
        state.contextAfterText = proposeAfterFromReflection();
        step = 17;
        render();
      };
      document.getElementById('btn-back-gen').onclick = () => {
        step = 13;
        render();
      };
      return;
    }

    // 掘り下げのあと：①「判断しようとしていること」の更新（講演導線の核）
    if (step === 17) {
      const initial = (state.decisionInitial
        || (state.contextBeforeParts && state.contextBeforeParts.decision)
        || state.decision
        || '').trim();
      const candidates = state.decisionCandidates || [];
      root.innerHTML = `
        <section class="card space-y-4 fade-in">
          ${prog}
          <p class="q-title">最初に置いた「判断しようとしていること」は、<br>いまも同じですか。</p>
          <p class="q-help">AIの候補は論点です。採る・直す・同じまま進む、をあなたが決めてください。</p>
          <div class="mirror-summary">
            <p class="compare-label">最初に置いた判断</p>
            <p class="font-semibold">「${escapeHtml(initial || '（未記入）')}」</p>
          </div>
          ${candidates.length ? `
            <div>
              <p class="grow-field-label">AIが示した、本当に問うべき判断の候補</p>
              <div class="choice-grid" id="decision-cands">
                ${candidates.map((c) => `
                  <button type="button" class="choice-btn${state.selectedDecisionCandidate === c.id ? ' selected' : ''}" data-cid="${escapeHtml(c.id)}">${escapeHtml(c.text)}</button>
                `).join('')}
              </div>
            </div>
          ` : ''}
          <div>
            <p class="grow-field-label">いま、判断しようとしていること</p>
            <textarea id="field-decision-now" class="textarea" rows="3">${escapeHtml(state.decision)}</textarea>
          </div>
          <button type="button" id="btn-next" class="btn btn-primary w-full">判断文脈を見比べる</button>
        </section>`;
      const fieldNow = document.getElementById('field-decision-now');
      document.querySelectorAll('#decision-cands .choice-btn').forEach((btn) => {
        btn.onclick = () => {
          const id = btn.getAttribute('data-cid');
          const hit = candidates.find((c) => c.id === id);
          if (!hit) return;
          state.selectedDecisionCandidate = id;
          fieldNow.value = hit.text;
          document.querySelectorAll('#decision-cands .choice-btn').forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
        };
      });
      document.getElementById('btn-next').onclick = () => {
        const v = (fieldNow.value || '').trim();
        if (!v) {
          fieldNow.focus();
          return;
        }
        state.decision = v;
        syncThemeFromBackground();
        state.constraints = criteriaAsConstraintsText();
        const base = proposeAfterFromReflection();
        if (initial && v !== initial) {
          state.contextAfterText = `${base}

【掘り下げ後の、本当に問うべき判断】
最初：「${initial}」
いま：「${v}」`;
        } else {
          state.contextAfterText = base;
        }
        step = 15;
        render();
      };
      return;
    }

    // 育てる（渡す前 / 渡した後）
    if (step === 15) {
      const before = state.contextBefore || formatContextParts(state.contextBeforeParts || buildContextParts());
      if (!state.contextAfterText) state.contextAfterText = proposeAfterFromReflection();
      root.innerHTML = `
        <section class="space-y-4 fade-in">
          ${prog}
          <p class="q-title">判断文脈を更新する</p>
          <p class="q-help">論点を見る前と、採る・捨てるのあとを見比べます。最終の言葉は、あなたが整えてください。</p>
          <div class="compare-grid">
            <div class="compare-col">
              <p class="compare-label">論点を見る前</p>
              <pre class="compare-body">${escapeHtml(before)}</pre>
            </div>
            <div class="compare-col compare-col-edit">
              <p class="compare-label">採る・捨てるのあと</p>
              <textarea id="field-after" class="textarea compare-edit">${escapeHtml(state.contextAfterText)}</textarea>
            </div>
          </div>
          <button type="button" id="btn-keep" class="btn btn-primary w-full">判断文脈を残す</button>
        </section>`;
      const after = document.getElementById('field-after');
      after.oninput = () => { state.contextAfterText = after.value; };
      document.getElementById('btn-keep').onclick = () => {
        state.contextAfterText = after.value.trim() || before;
        keepGrownContext();
        step = 16;
        render();
      };
      return;
    }

    // 判断の変化を振り返る（V1.3 · 体験のクライマックス）
    if (step === 16) {
      const g = state.criteriaGrowth;
      root.innerHTML = `
        <section class="space-y-5 fade-in criteria-reflect">
          ${prog}
          <div class="criteria-reflect-head">
            <p class="q-title">JudgmentOSに向き合う前と後で、<br>あなたの判断はどう変わりましたか。</p>
            <p class="q-help">
              AIの回答を書く場所ではありません。<br>
              あなた自身の考え方、判断基準、立ち位置がどのように変わったかを振り返り、言葉にしてください。
            </p>
          </div>

          <div class="grow-block">
            <p class="grow-block-title"><span class="grow-num" aria-hidden="true">①</span> 最初の私は</p>
            <p class="q-help">JudgmentOSに向き合う前に、あなたが置いたテーマと判断文脈です。（編集できません）</p>
            ${initialContextMirrorHtml()}
            <p class="grow-field-label">あの時の私は、どう考えていたか。</p>
            <p class="q-help">当時の自分の考え方や前提を書いてください。</p>
            <ul class="field-examples" aria-label="例">
              <li>投資の可否と、効果の出し方ばかり考えていた。</li>
              <li>AIをどう使うかだけを考えていた。</li>
              <li>現場の要望に応えることが、自分の役割だと思っていた。</li>
            </ul>
            <textarea id="field-first-me" class="textarea" rows="3">${escapeHtml(g.firstMe || '')}</textarea>
          </div>

          <div class="grow-block">
            <p class="grow-block-title"><span class="grow-num" aria-hidden="true">②</span> 今の私は</p>
            <p class="grow-field-label">今の私は、どう考えるようになったか。</p>
            <ul class="field-examples" aria-label="例">
              <li>効果の前に、誰が判断を引き受けるかを決めることが先だと考えるようになった。</li>
              <li>AIの答えより、自分の判断基準を言葉にすることが重要だと思うようになった。</li>
            </ul>
            <textarea id="field-now-me" class="textarea" rows="3">${escapeHtml(g.nowMe || '')}</textarea>
          </div>

          <div class="grow-block grow-block-climax">
            <p class="grow-block-title"><span class="grow-num" aria-hidden="true">③</span> 一番大きく変わったこと</p>
            <p class="grow-field-label">今回、一番変化した判断基準は何ですか。</p>
            <p class="q-help field-example-block">
              例：半年で効果を出すことより、<br>
              判断を引き受ける人が残るかどうかを、第一基準にする。
            </p>
            <textarea id="field-criteria-change" class="textarea" rows="4">${escapeHtml(g.criteriaChange || '')}</textarea>
          </div>

          <div class="grow-block">
            <p class="grow-block-title"><span class="grow-num" aria-hidden="true">④</span> 本当の目的</p>
            <p class="grow-field-label">今回、最初は言葉になっていなかった本当の目的は何でしたか。</p>
            <p class="q-help">効率化や期限の向こうで、自分は何を守り、何を実現したかったか。</p>
            <p class="q-help field-example-block">
              例：AI導入そのものではなく、<br>
              答えに依存しない判断の文化を残すことが目的だった。
            </p>
            <textarea id="field-true-purpose" class="textarea" rows="3">${escapeHtml(g.truePurpose || '')}</textarea>
          </div>

          <p class="criteria-reflect-footer q-help">
            JudgmentOSが最後に残すものは、AIの回答ではありません。<br>
            「自分は何が変わったのか」を、未来の自分へ残します。
          </p>

          <button type="button" id="btn-keep-criteria" class="btn btn-primary w-full">この判断基準を未来の自分へ残す</button>
        </section>`;

      const bind = (id, key) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.oninput = () => { state.criteriaGrowth[key] = el.value; };
      };
      bind('field-first-me', 'firstMe');
      bind('field-now-me', 'nowMe');
      bind('field-criteria-change', 'criteriaChange');
      bind('field-true-purpose', 'truePurpose');

      document.getElementById('btn-keep-criteria').onclick = () => {
        state.criteriaGrowth.firstMe = (document.getElementById('field-first-me').value || '').trim();
        state.criteriaGrowth.nowMe = (document.getElementById('field-now-me').value || '').trim();
        state.criteriaGrowth.criteriaChange = (document.getElementById('field-criteria-change').value || '').trim();
        state.criteriaGrowth.truePurpose = (document.getElementById('field-true-purpose').value || '').trim();
        keepCriteriaGrowth();
        state.changeSummary = null;
        state.changeSummaryBusy = true;
        state.changeSummaryStarted = false;
        step = 18;
        render();
      };
      return;
    }

    // 思考の変化サマリー（振り返り直後 · 印刷可）
    if (step === 18) {
      const s = state.changeSummary;
      if (!s) {
        root.innerHTML = `
          <section class="card space-y-4 fade-in extract-loading" aria-live="polite">
            ${prog}
            <div class="extract-spinner" aria-hidden="true"></div>
            <p class="q-title" style="text-align:center;margin-bottom:0">思考の変化をまとめています…</p>
            <p class="q-help" style="text-align:center;margin-bottom:0">あなたが書いた振り返りから、印刷用のサマリーを作ります。</p>
          </section>`;
        if (!state.changeSummaryStarted) {
          state.changeSummaryStarted = true;
          requestSummarizeChange().then((summary) => {
            if (step !== 18) return;
            state.changeSummary = summary;
            state.changeSummaryBusy = false;
            persistChangeSummary(summary);
            render();
          });
        }
        return;
      }

      const Access = window.JudgmentOSAccess;
      const who = Access && Access.isAuthorized() ? Access.getDisplayName() : '';
      const when = new Date();
      const dateLabel = `${when.getFullYear()}/${when.getMonth() + 1}/${when.getDate()}`;
      root.innerHTML = `
        <section class="space-y-4 fade-in">
          ${prog}
          <div class="no-print flex flex-col sm:flex-row gap-2">
            <button type="button" id="btn-print-summary" class="btn btn-primary w-full">このサマリーを印刷する</button>
            <button type="button" id="btn-to-outro" class="btn btn-ghost w-full">続けて余韻へ</button>
          </div>
          <article class="print-sheet change-summary-sheet" aria-label="思考の変化サマリー">
            <header class="print-sheet-head">
              <p class="print-kicker">JudgmentOS · 思考の変化サマリー</p>
              <h2 class="print-title">${escapeHtml(s.headline)}</h2>
              <p class="print-meta">${escapeHtml(state.theme || '（テーマ）')}${who ? ` · ${escapeHtml(who)}` : ''} · ${escapeHtml(dateLabel)}</p>
            </header>
            <div class="print-compare">
              <div class="print-col print-col-past">
                <p class="print-label">以前の考え方</p>
                <p class="print-body">${escapeHtml(s.beforeSummary)}</p>
              </div>
              <div class="print-col print-col-now">
                <p class="print-label">今の考え方</p>
                <p class="print-body">${escapeHtml(s.afterSummary)}</p>
              </div>
            </div>
            <div class="print-block">
              <p class="print-label">判断基準の変化</p>
              <p class="print-body print-emphasis">${escapeHtml(s.criteriaShift)}</p>
            </div>
            ${(state.criteriaGrowth.truePurpose || '').trim() ? `
              <div class="print-block">
                <p class="print-label">本当の目的</p>
                <p class="print-body">${escapeHtml(state.criteriaGrowth.truePurpose.trim())}</p>
              </div>
            ` : ''}
            <div class="print-block print-takeaway">
              <p class="print-label">次に問い返すときの一文</p>
              <p class="print-body">${escapeHtml(s.takeaway)}</p>
            </div>
            <footer class="print-foot">
              AIの答えが変わったのではありません。あなた自身の判断基準が、言葉として残りました。
            </footer>
          </article>
          <div class="no-print flex flex-col gap-2">
            <button type="button" id="btn-to-outro-2" class="btn btn-primary w-full">この変化を携えて進む</button>
          </div>
        </section>`;
      const goOutro = () => {
        step = 12;
        render();
      };
      document.getElementById('btn-print-summary').onclick = () => {
        window.print();
      };
      document.getElementById('btn-to-outro').onclick = goOutro;
      document.getElementById('btn-to-outro-2').onclick = goOutro;
      return;
    }

    if (step === 11) {
      root.innerHTML = `
        <section class="card space-y-3 fade-in">
          ${prog}
          <p class="q-title">私はこう判断する</p>
          <p class="q-help">任意です。持ち帰るものは、答えではなく、あなた自身の判断です。</p>
          <textarea id="field-judgment" class="textarea">${escapeHtml(state.newJudgment)}</textarea>
          <div class="flex flex-wrap gap-2">
            <button type="button" id="btn-finish" class="btn btn-primary">判断を言葉にする</button>
            <button type="button" id="btn-skip-j" class="btn btn-ghost">判断は後で</button>
          </div>
        </section>`;
      document.getElementById('btn-finish').onclick = () => {
        const v = document.getElementById('field-judgment').value.trim();
        if (!v) { document.getElementById('field-judgment').focus(); return; }
        state.newJudgment = v;
        const Store = window.JudgmentOSStore;
        if (Store && state.activeThemeId && state.activeEntryId) {
          Store.updateEntry(state.activeThemeId, state.activeEntryId, { newJudgment: v });
        }
        step = 12;
        render();
      };
      document.getElementById('btn-skip-j').onclick = () => {
        step = 12;
        render();
      };
      return;
    }

    if (step === 12) {
      const keep = criteriaHighlight(state.criteriaGrowth);
      root.innerHTML = `
        <section class="space-y-4 fade-in">
          ${prog}
          <div class="brand-outro">
            <div class="brand-outro-final">
              <p>判断基準が、</p>
              <p class="you">一段深くなりました。</p>
            </div>
            <p class="brand-outro-takeaway">
              AIの答えが変わったのではありません。<br>
              あなた自身の判断基準が更新されました。<br><br>
              次に誰かが提案やAIの答えを持ってきたとき、<br>
              今日残した判断基準で問い返せそうか、<br>
              一度だけ考えてみてください。<br><br>
              JudgmentOSは、AIと向き合うために、<br>
              自分自身の判断基準を言葉にする思考OSです。
            </p>
          </div>
          ${keep ? `
            <div class="judgment-final">
              <p class="label">今回、一番変化した判断基準</p>
              <p class="judgment-display">${escapeHtml(keep)}</p>
            </div>` : ''}
          ${(state.criteriaGrowth.truePurpose || '').trim() ? `
            <div class="judgment-final">
              <p class="label">最初は言葉になっていなかった本当の目的</p>
              <p class="judgment-display">${escapeHtml(state.criteriaGrowth.truePurpose.trim())}</p>
            </div>` : ''}
          ${state.newJudgment ? `
            <div class="judgment-final">
              <p class="label">あなたの判断</p>
              <p class="judgment-display">${escapeHtml(state.newJudgment)}</p>
            </div>` : ''}
          <div class="flex flex-col gap-2">
            <button type="button" id="btn-optional-j" class="btn btn-ghost w-full">私はこう判断する（任意）</button>
            <button type="button" id="btn-history" class="btn btn-ghost w-full">残した判断文脈と基準</button>
            <button type="button" id="btn-restart" class="btn btn-primary w-full">もう一度、考え始める</button>
            <button type="button" id="btn-home" class="btn btn-ghost w-full">トップへ</button>
          </div>
        </section>`;
      document.getElementById('btn-optional-j').onclick = () => {
        step = 11;
        render();
      };
      document.getElementById('btn-history').onclick = () => {
        viewMode = 'history';
        render();
      };
      document.getElementById('btn-restart').onclick = () => {
        resetState();
        render();
      };
      document.getElementById('btn-home').onclick = () => goLanding();
      return;
    }
  }

  function renderHistoryList(root) {
    const Store = window.JudgmentOSStore;
    const themes = Store ? Store.listThemesForUi() : [];
    root.innerHTML = `
      <section class="space-y-3 fade-in">
        <p class="step-progress"><em>JudgmentOS</em> · 残した判断文脈と基準</p>
        <p class="q-title">残した判断文脈と基準</p>
        <p class="q-help">残しているのはAIの答えではありません。残した判断文脈と、今回はっきりした判断基準です。同じテーマを深めるときは、新しい履歴として残ります。</p>
        ${themes.length === 0 ? `<p class="q-help">まだ残した判断文脈・判断基準はありません。</p>` : `
          <div class="history-list">
            ${themes.map(t => {
              const theme = Store.getTheme(t.id);
              const latest = theme && theme.entries.length
                ? theme.entries[theme.entries.length - 1]
                : null;
              const keep = latest ? criteriaHighlight(latest.criteriaGrowth) : '';
              const hasCriteria = hasCriteriaReflection(latest && latest.criteriaGrowth);
              return `
              <button type="button" class="history-item" data-id="${escapeHtml(t.id)}">
                <span class="history-date">${escapeHtml(Store.formatDateJa(t.latestAt))}</span>
                <span class="history-title">${escapeHtml(t.title)}</span>
                <span class="history-meta">${t.entryCount > 1 ? `${t.entryCount}回の記録` : '1回'}${hasCriteria ? ' · 判断基準あり' : ''}</span>
                ${keep ? `<span class="history-keep">${escapeHtml(keep)}</span>` : ''}
              </button>`;
            }).join('')}
          </div>`}
        <button type="button" id="btn-back-flow" class="btn btn-ghost w-full">戻る</button>
      </section>`;
    root.querySelectorAll('.history-item').forEach(btn => {
      btn.onclick = () => {
        state.browseThemeId = btn.dataset.id;
        viewMode = 'theme';
        render();
      };
    });
    document.getElementById('btn-back-flow').onclick = () => {
      viewMode = 'flow';
      if (step < 1) step = 1;
      render();
    };
  }

  function renderThemeDetail(root) {
    const Store = window.JudgmentOSStore;
    const theme = Store && state.browseThemeId ? Store.getTheme(state.browseThemeId) : null;
    if (!theme) {
      viewMode = 'history';
      render();
      return;
    }
    const entries = theme.entries.slice().reverse();
    root.innerHTML = `
      <section class="space-y-3 fade-in">
        <p class="step-progress"><em>JudgmentOS</em> · 残した履歴</p>
        <p class="q-title">${escapeHtml(theme.title)}</p>
        <p class="q-help">同じテーマでも、上書きせずに残しています。判断文脈と、はっきりした判断基準の両方を見返せます。</p>
        <div class="history-list">
          ${entries.map(e => `
            <div class="history-entry card">
              <p class="history-date">${escapeHtml(Store.formatDateJa(e.createdAt))} · ${e.entryNumber}回目${e.participantName ? ` · ${escapeHtml(e.participantName)}` : ''}</p>
              <p class="compare-label mt-3">残した判断文脈</p>
              <p class="text-sm mt-2"><strong>実現</strong>：${escapeHtml(e.achieve || '—')}</p>
              <p class="text-sm"><strong>守る</strong>：${escapeHtml(e.protect || '—')}</p>
              ${e.contextAfter || e.contextBefore ? `<pre class="compare-body mt-2">${escapeHtml(e.contextAfter || e.contextBefore)}</pre>` : ''}
              ${criteriaGrowthSummaryHtml(e.criteriaGrowth)}
              <div class="flex flex-wrap gap-2 mt-3">
                <button type="button" class="btn btn-primary btn-resume" data-entry="${escapeHtml(e.id)}">この言葉から続ける</button>
              </div>
            </div>
          `).join('')}
        </div>
        <button type="button" id="btn-back-list" class="btn btn-ghost w-full">一覧へ</button>
      </section>`;
    root.querySelectorAll('.btn-resume').forEach(btn => {
      btn.onclick = () => {
        const packed = Store.getEntry(theme.id, btn.dataset.entry);
        if (!packed) return;
        loadEntryIntoState(packed.theme, packed.entry);
        if (packed.entry.jos20 || packed.entry.handoffText || packed.entry.principle) {
          step = packed.entry.handoffText ? 209 : 208;
        } else {
          const done = hasCriteriaReflection(packed.entry.criteriaGrowth);
          if (packed.entry.contextAfter && !done) {
            state.contextAfterText = packed.entry.contextAfter;
            step = 16;
          } else if (done) {
            step = 12;
          } else if (packed.entry.contextBefore) {
            step = 13;
          } else {
            step = packed.entry.achieve ? 7 : 1;
          }
        }
        viewMode = 'flow';
        render();
      };
    });
    document.getElementById('btn-back-list').onclick = () => {
      viewMode = 'history';
      render();
    };
  }

  document.getElementById('btn-enter').addEventListener('click', () => {
    withAccess('enter', () => {
      enterWorkspace();
      resetState();
      render();
    });
  });

  /** 履歴はブラウザ内の保存を見るだけ。招待・同意は新規判断の入口だけにかける */
  function openHistoryView(fromLanding) {
    const Access = window.JudgmentOSAccess;
    if (Access && Access.isAuthorized()) Access.touch('history');
    if (fromLanding) enterWorkspace();
    viewMode = 'history';
    render();
  }

  const btnHistory = document.getElementById('btn-open-history');
  if (btnHistory) {
    btnHistory.addEventListener('click', () => openHistoryView(true));
  }

  const btnHeaderHistory = document.getElementById('btn-header-history');
  if (btnHeaderHistory) {
    btnHeaderHistory.addEventListener('click', () => openHistoryView(false));
  }

  if (!useJos20Ui()) {
    step = 101;
    farthestStep = 101;
  }
  updateHistoryButton();
  updateParticipantChip();
})();
