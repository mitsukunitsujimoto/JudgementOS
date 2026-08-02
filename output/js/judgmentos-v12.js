/**
 * JudgmentOS Version 1.4（考えている＝6問）
 * 建付け: AIと向き合う → 判断基準を明確に → 必要な問いに答える（答えは出さない）
 *
 * 1 背景 → 2 実現 → 3 決定事項 → 4 守る → 映し返し
 * → 5 判断基準（譲れない／できれば）→ 6 重み・覚悟 → 判断文脈 → AIへ渡す → …
 *
 * 旧フロー（気になること〜ギャップ問い）に戻す:
 *   - ?flow=legacy で judgmentos-v12.legacy.js を読み込む（index.html）
 *   - または output/js/judgmentos-v12.legacy.js を参照
 */
(function () {
  'use strict';

  const INCLUDE_REPLY_PATTERN_IN_FLOW = false;
  const APP_FLOW = 'v14';

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

  const AI_PASS_CLOSING = `答えや最適案は出さないでください。断定せず、仮説として示してください。
目的は、私の判断基準をより明らかにすることです。決めるのは私です。

必ず次の形式だけで返してください。前置きや長い解説は不要です。各見出しの下に仮説を1〜3個。

【見落としている前提】
仮説1: （一文）
仮説2: （一文）

【別の立場からの見方】
仮説1: （一文）

【長期的な影響】
仮説1: （一文）

【リスク】
仮説1: （一文）

【まだ考えていない決定事項・選択肢】
仮説1: （一文）

【いま判断しようとしていることが持ち上がるとしたら】
候補1: （一文）
候補2: （一文）`;

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
    judgmentSessionId: ''
  };

  const HYPOGEN_KEY = 'judgmentos.v14.hypogen';
  const HYPOGEN_LIMIT_JUDGMENT = 3;
  const HYPOGEN_LIMIT_DAY = 10;

  let step = 1;
  let farthestStep = 1;
  let concernDraft = '';
  let viewMode = 'flow'; // flow | history | theme

  const STEP_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 17, 15, 16, 11, 12];

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
    if (phaseId === 'think') return 1;
    if (phaseId === 'judge') {
      if (hasReachedStep(14) && (state.hypotheses.length || state.aiReplyPaste)) return 14;
      return 13;
    }
    // 旧 id 互換
    if (phaseId === 'pass' || phaseId === 'return') return phaseEntryStep('judge');
    if (phaseId === 'reflect' || phaseId === 'grow') return hasReachedStep(16) ? 16 : 15;
    return 1;
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
        // 「考えている」はいつでも先頭へ戻り、書き直せる
        if (id === 'think') {
          step = 1;
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

【映し返し】
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

【採った仮説】
${picked.join('\n')}`;
    }
    if (note) {
      t += `

【自分の一言】
${note}`;
    }
    return t;
  }

  /** AIの番号付き仮説／候補を読み取る（形式が崩れていても行頭番号や「仮説n:」を拾う） */
  function parseHypothesesFromAi(raw) {
    const text = (raw || '').replace(/\r\n/g, '\n').trim();
    if (!text) return { hypotheses: [], decisionCandidates: [] };
    const hypotheses = [];
    const decisionCandidates = [];
    let category = '仮説';
    let inDecision = false;
    let n = 0;
    const lines = text.split('\n');
    for (const line0 of lines) {
      const line = line0.trim();
      if (!line) continue;
      const cat = line.match(/^【\s*([^】]+?)\s*】$/);
      if (cat) {
        category = cat[1].trim();
        inDecision = /持ち上が|判断しようとしていること/.test(category);
        continue;
      }
      let body = '';
      let m = line.match(/^(?:仮説|候補)\s*\d+\s*[:：]\s*(.+)$/);
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
    // 見出しなしのフォールバック: ある程度の長さの行を仮説扱い
    if (!hypotheses.length && !decisionCandidates.length) {
      text.split('\n').map((l) => l.trim()).filter((l) => l.length >= 12 && !/^#{1,3}\s/.test(l)).slice(0, 12).forEach((body, i) => {
        hypotheses.push({ id: `hyp-${i + 1}`, category: '仮説', text: body.replace(/^[*-・]\s*/, '') });
      });
    }
    return { hypotheses, decisionCandidates };
  }

  function applyAiPasteParse(source) {
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
        reason: `この判断では仮説を出し直せる回数が上限（${HYPOGEN_LIMIT_JUDGMENT}回）です。文脈を直すか、自分のAIを使うか、別の判断でお試しください。`
      };
    }
    if (u.day >= HYPOGEN_LIMIT_DAY) {
      return {
        ok: false,
        reason: `本日の仮説生成が上限（${HYPOGEN_LIMIT_DAY}回）です。明日またお試しいただくか、自分のAIをご利用ください。`
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
        reason: '外部AIへの送信に同意していないため、内蔵の仮説生成は使えません。自分のAIを使う方法へ。',
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
        reason: 'いまは仮説を出せません。自分のAIを使う方法（A）をご利用ください。',
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
        reason: (data && data.reason) || 'いまは仮説を出せません。自分のAIを使う方法（A）へ。',
        code: (data && data.code) || 'ERROR',
        retryable
      };
    }

    state.aiReplyPaste = data.text || '';
    applyAiPasteParse('b');
    if (!state.hypotheses.length && !state.decisionCandidates.length) {
      return {
        ok: false,
        reason: '仮説の形式を読み取れませんでした。もう一度お試しいただくか、自分のAIを使う方法（A）へ。',
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
        <p class="q-title">自分のAIへ渡す（非常口）</p>
        <p class="q-help">判断文脈をコピーし、任意のAIに貼ってください。返ってきた仮説を次で判定します。最適案は求めない依頼文です。</p>
        <div class="mirror-summary">
          <pre class="compare-body" style="white-space:pre-wrap">${escapeHtml(formatContextParts(parts))}</pre>
        </div>
        <div class="flex flex-col gap-2">
          <button type="button" id="btn-copy-ai" class="btn btn-primary w-full">AIへ渡す文面をコピー</button>
          <span id="copy-ai-toast" class="hidden text-xs text-center text-[hsl(var(--primary))]">コピーしました。返ってきた仮説を次で貼り付けます。</span>
          <button type="button" id="btn-return" class="btn btn-ghost w-full">仮説が返ってきたら、判定する</button>
          ${builtinAiAllowed() ? `<button type="button" id="btn-back-b" class="btn btn-ghost w-full">内蔵の仮説生成に戻る</button>` : ''}
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
    if (step === 15 || step === 16 || step === 11 || step === 12) return 'reflect';
    return 'think';
  }

  function phaseNavHtml() {
    const phase = currentPhase();
    if (!phase) return '';
    const items = [
      { id: 'think', label: '考えている' },
      { id: 'judge', label: '仮説を判定' },
      { id: 'reflect', label: '振り返る' }
    ];
    return `<nav class="phase-nav" aria-label="画面の移動">
      ${items.map((it, i) => {
        const reachable = canGoToPhase(it.id);
        const current = it.id === phase;
        const cls = `phase-item${current ? ' is-current' : ''}${reachable ? ' is-reachable' : ''}`;
        const title = reachable
          ? (it.id === 'think' ? '考えているに戻り、内容を修正できます。直すと仮説は無効になります。' : `${it.label}へ移動`)
          : 'まだ到達していません';
        return `
        <button type="button" class="${cls}" data-phase="${it.id}" ${reachable ? '' : 'disabled'} title="${escapeHtml(title)}">${escapeHtml(it.label)}</button>
        ${i < items.length - 1 ? '<span class="phase-arrow" aria-hidden="true">→</span>' : ''}`;
      }).join('')}
    </nav>`;
  }

  function progressLabel() {
    const map = {
      1: '① いま判断しようとしていること',
      2: '② 背景',
      3: '③ 本来実現したいこと',
      17: '判断しようとしていることは変わったか',
      4: '④ 守りたいもの',
      5: '映し返し',
      6: '⑤ いちばん大切にしたいこと',
      7: '譲れない／できれば（任意）',
      8: '⑥ 強く効いていること／引き受ける範囲',
      9: 'いま言葉にしたものを見る',
      10: '問い返す型',
      13: '仮説を示す',
      14: '仮説を判定する',
      15: '判断文脈を見比べる',
      16: '判断の変化を振り返る',
      11: '私はこう判断する',
      12: '一段深くなった'
    };
    return map[step] || '';
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
      activeThemeId: null, activeEntryId: null, browseThemeId: null
    });
    concernDraft = '';
    viewMode = 'flow';
    step = 1;
    farthestStep = 1;
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
        <p class="compare-label">今回育った判断基準</p>
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
          <p class="q-help">いまの施策や数字の目標ではなく、その先で向かいたい姿を書いてください。大きな言葉（社内融和、地域との共生、再生、社会貢献など）で構いません。この判断の手段的なゴールではなく、あなたが経営者として本当に向かいたいものをあぶり出します。</p>
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
          <p class="q-help">人・関係・時間・信頼・文化など。大切にしたいことを書く前に、守るものを言葉にしてください。</p>
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
            <p class="mirror-label">映し返し</p>
            <p>あなたは</p>
            <p class="quote">「${escapeHtml(m.achieve)}」</p>
            <p>と考えています。</p>
            <p class="mt-3">一方で、</p>
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
            次は、この判断文脈を前提に<strong>仮説</strong>を出します（答え・最適案ではありません）。
          </p>
          <button type="button" id="btn-pass" class="btn btn-primary w-full">仮説を判定するへ</button>
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

    // 仮説を示す（B主経路 / A非常口）
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
          <p class="q-help">仮説は答えではありません。判断文脈に照らして、採る／捨てるための見立てです。</p>
          <div class="mirror-summary">
            <pre class="compare-body" style="white-space:pre-wrap">${escapeHtml(formatContextParts(parts))}</pre>
          </div>
          ${state.hypothesesStale ? `
            <p class="q-help" style="color:hsl(var(--warning, 38 92% 50%));">判断文脈が変わったため、以前の仮説は無効です。出し直すか、自分のAIを使ってください。</p>
          ` : ''}
          ${err ? `<p class="invite-error" role="alert">${escapeHtml(err)}</p>` : ''}
          <div class="flex flex-col gap-2">
            ${allowB ? `
              <button type="button" id="btn-gen-b" class="btn btn-primary w-full" ${busy ? 'disabled' : ''}>
                ${busy ? '仮説を生成しています…' : (state.hypotheses.length && !state.hypothesesStale ? '仮説を出し直す' : '仮説を示す')}
              </button>
              <p class="text-xs text-center text-[hsl(var(--muted-fg))]">この判断 ${usage.judgment}/${HYPOGEN_LIMIT_JUDGMENT} 回 · 本日 ${usage.day}/${HYPOGEN_LIMIT_DAY} 回</p>
            ` : `
              <p class="q-help">内蔵の仮説生成は、データ送信に同意した方のみ使えます。下の「自分のAIを使う」で進められます。</p>
            `}
            <button type="button" id="btn-path-a" class="btn btn-ghost w-full">自分のAIを使う（A）</button>
            ${state.hypotheses.length && !state.hypothesesStale ? `
              <button type="button" id="btn-to-judge" class="btn btn-ghost w-full">すでに出ている仮説を判定する</button>
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
            state.hypogenError = result.reason || '仮説を出せませんでした。';
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

    // 仮説を判定（採否）
    if (step === 14) {
      refreshHypothesesStaleFlag();
      if (state.hypothesesStale) {
        state.hypogenError = '判断文脈が変わったため、仮説は無効です。出し直してください。';
        step = 13;
        render();
        return;
      }
      if (!state.hypotheses.length && state.aiReplyPaste.trim()) applyAiPasteParse(state.hypothesesSource || 'a');
      const hyps = state.hypotheses || [];
      const selected = new Set(state.selectedHypothesisIds || []);
      const showPaste = state.hypothesesSource === 'a' || state.pathAMode || !hyps.length;
      root.innerHTML = `
        <section class="card space-y-4 fade-in">
          ${prog}
          <p class="q-title">仮説を、あなたが判定する</p>
          <p class="q-help">仮説は答えではありません。採る・捨てる・残す一言だけを決めるのは、あなたです。</p>
          ${showPaste ? `
          <div>
            <label class="gap-insight-label" for="field-ai-paste">AIから返ってきた仮説（貼り付け）</label>
            <p class="q-help">自分のAIから返ってきた本文を貼り、「仮説を読み取る」を押してください。</p>
            <textarea id="field-ai-paste" class="textarea" rows="8">${escapeHtml(state.aiReplyPaste)}</textarea>
            <button type="button" id="btn-parse" class="btn btn-ghost w-full mt-2">仮説を読み取る</button>
          </div>
          ` : ''}
          ${hyps.length ? `
            <div>
              <p class="grow-field-label">刺さった仮説を選ぶ（複数可）</p>
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
              <p class="q-help">採った仮説への補足や、捨てた理由など。空欄でも進めます。</p>
              <textarea id="field-reflect" class="textarea" rows="2">${escapeHtml(state.reflection.contextChange || '')}</textarea>
            </div>
          ` : `
            <p class="q-help">まだ仮説がありません。「仮説を示す」に戻るか、上で貼り付けて読み取ってください。</p>
          `}
          <div class="flex flex-col gap-2">
            <button type="button" id="btn-next" class="btn btn-primary w-full" ${hyps.length ? '' : 'disabled'}>判断の持ち上がりへ</button>
            <button type="button" id="btn-back-gen" class="btn btn-ghost w-full">仮説を示すに戻る</button>
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
          <p class="q-help">AIの候補は仮説です。採る・直す・同じまま進む、をあなたが決めてください。</p>
          <div class="mirror-summary">
            <p class="compare-label">最初に置いた判断</p>
            <p class="font-semibold">「${escapeHtml(initial || '（未記入）')}」</p>
          </div>
          ${candidates.length ? `
            <div>
              <p class="grow-field-label">AIが示した、持ち上がりの候補</p>
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

【掘り下げ後に持ち上がった判断】
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
          <p class="q-help">仮説を見る前と、採否のあとを見比べます。最終の言葉は、あなたが整えてください。</p>
          <div class="compare-grid">
            <div class="compare-col">
              <p class="compare-label">仮説を見る前</p>
              <pre class="compare-body">${escapeHtml(before)}</pre>
            </div>
            <div class="compare-col compare-col-edit">
              <p class="compare-label">採否のあと</p>
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
        step = 12;
        render();
      };
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
            <button type="button" id="btn-history" class="btn btn-ghost w-full">これまで育てた判断文脈と基準</button>
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
        <p class="step-progress"><em>JudgmentOS</em> · これまで育てた判断文脈と基準</p>
        <p class="q-title">これまで育てた判断文脈と基準</p>
        <p class="q-help">残しているのはAIの答えではありません。育てた判断文脈と、今回育った判断基準です。同じテーマを深めるときは、新しい履歴として残ります。</p>
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
                <span class="history-meta">${t.entryCount > 1 ? `${t.entryCount}回の育ち` : '1回'}${hasCriteria ? ' · 判断基準あり' : ''}</span>
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
        <p class="step-progress"><em>JudgmentOS</em> · 育ちの履歴</p>
        <p class="q-title">${escapeHtml(theme.title)}</p>
        <p class="q-help">同じテーマでも、上書きせずに残しています。判断文脈と、育った判断基準の両方を見返せます。</p>
        <div class="history-list">
          ${entries.map(e => `
            <div class="history-entry card">
              <p class="history-date">${escapeHtml(Store.formatDateJa(e.createdAt))} · ${e.entryNumber}回目${e.participantName ? ` · ${escapeHtml(e.participantName)}` : ''}</p>
              <p class="compare-label mt-3">育てた判断文脈</p>
              <p class="text-sm mt-2"><strong>実現</strong>：${escapeHtml(e.achieve || '—')}</p>
              <p class="text-sm"><strong>守る</strong>：${escapeHtml(e.protect || '—')}</p>
              ${e.contextAfter || e.contextBefore ? `<pre class="compare-body mt-2">${escapeHtml(e.contextAfter || e.contextBefore)}</pre>` : ''}
              ${criteriaGrowthSummaryHtml(e.criteriaGrowth)}
              <div class="flex flex-wrap gap-2 mt-3">
                <button type="button" class="btn btn-primary btn-resume" data-entry="${escapeHtml(e.id)}">この言葉から、もう一度育てる</button>
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
        // 続き：文脈は残っているが判断基準未完なら基準へ。完了済みなら余韻へ。
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

  const btnHistory = document.getElementById('btn-open-history');
  if (btnHistory) {
    btnHistory.addEventListener('click', () => {
      withAccess('history', () => {
        enterWorkspace();
        viewMode = 'history';
        render();
      });
    });
  }

  const btnHeaderHistory = document.getElementById('btn-header-history');
  if (btnHeaderHistory) {
    btnHeaderHistory.addEventListener('click', () => {
      withAccess('history', () => {
        viewMode = 'history';
        render();
      });
    });
  }

  updateHistoryButton();
  updateParticipantChip();
})();
