/**
 * JudgmentOS Version 1.3
 * 判断文脈を言語化し、AIとの対話を通じて自分自身の判断基準を育てる思考OS。
 * 順序: 本人 → 判断文脈 →（必要なら）問い → 文脈の更新 → 判断基準の言語化
 *
 * 循環の完成:
 * 考えている → AIへ渡す → AIから戻る → 育てる → 判断基準を未来の自分へ残す
 *
 * 「問い返す型」は削除せず将来拡張として保持する（標準フローには含めない）。
 */
(function () {
  'use strict';

  const INCLUDE_REPLY_PATTERN_IN_FLOW = false;

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

  const AI_PASS_CLOSING = '答えや正解を決めず、私が見落としている前提、別の立場からの見方、長期的な影響、リスク、まだ考えていない選択肢を示してください。決めるのは私です。';

  const DEMO = {
    concerns: [
      '新規事業を伸ばしたいが、進め方が定まらない',
      '社員の働き方改革を後退させたくない',
      '今年度は予算を増やせない'
    ]
  };

  function emptyCriteriaGrowth() {
    return {
      firstMe: '',
      nowMe: '',
      criteriaChange: '',
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
      || criteriaHighlight(growth)
    );
  }

  const state = {
    concerns: [],
    theme: '',
    achieve: '',
    protect: '',
    constraints: '',
    gapQuestions: [],
    gapInsights: {},
    missingArea: '',
    nextSentence: '',
    newJudgment: '',
    contextBefore: '',
    contextBeforeParts: null,
    aiReplyPaste: '',
    reflection: { newPerspective: '', discomfort: '', contextChange: '' },
    reflectionQ: 0,
    contextAfterText: '',
    criteriaGrowth: emptyCriteriaGrowth(),
    activeThemeId: null,
    activeEntryId: null,
    browseThemeId: null
  };

  let step = 1;
  let concernDraft = '';
  let viewMode = 'flow'; // flow | history | theme

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
      theme: state.theme.trim(),
      achieve: state.achieve.trim(),
      protect: state.protect.trim(),
      constraints: quoteLines(state.constraints)
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
    const b = buildMirrorB();
    const added = state.nextSentence.trim();
    let pack = `【今日のテーマ】
${b.theme}

【実現したいこと】
${b.achieve}

【守りたいもの】
${b.protect}

【無視できない条件】
${b.constraints.map(c => `· ${c}`).join('\n')}`;
    if (added) {
      pack += `

【問いを通じて加えた一文】
${added}`;
    }
    pack += `

【映し返し】
${buildReflection()}`;
    return pack;
  }

  function buildContextParts() {
    return {
      theme: state.theme.trim(),
      achieve: state.achieve.trim(),
      protect: state.protect.trim(),
      constraints: state.constraints.trim(),
      addedSentence: state.nextSentence.trim()
    };
  }

  function formatContextParts(parts) {
    if (!parts) return '';
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
  }

  function proposeAfterFromReflection() {
    const base = state.contextBefore || formatContextParts(buildContextParts());
    const change = (state.reflection.contextChange || '').trim();
    if (!change) return base;
    return `${base}

【AIの回答を受けて、足す・変える・残す】
${change}`;
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
        <h3>【今日のテーマ】</h3>
        <p>${escapeHtml(b.theme)}</p>
        <h3>【実現したいこと】</h3>
        <p class="font-semibold">「${escapeHtml(b.achieve)}」</p>
        <h3>【守りたいもの】</h3>
        <p class="font-semibold">「${escapeHtml(b.protect)}」</p>
        <p class="mt-2 text-sm">この二つを両立させながら考えることが、今回のテーマになりそうです。</p>
        <h3>【無視できない条件】</h3>
        <ul class="mt-1 space-y-1">${b.constraints.map(c => `<li>· ${escapeHtml(c)}</li>`).join('')}</ul>
      </div>`;
  }

  function trailHtml() {
    const parts = [];
    if (state.concerns.length) {
      parts.push(`<div><strong>気になっていること</strong><br>${state.concerns.map(c => `· ${escapeHtml(c)}`).join('<br>')}</div>`);
    }
    if (state.theme) parts.push(`<div class="mt-2"><strong>今日のテーマ</strong>：${escapeHtml(state.theme)}</div>`);
    if (state.achieve) parts.push(`<div class="mt-2"><strong>実現したいこと</strong>：${escapeHtml(state.achieve)}</div>`);
    if (state.protect) parts.push(`<div class="mt-2"><strong>守りたいもの</strong>：${escapeHtml(state.protect)}</div>`);
    if (state.constraints) {
      parts.push(`<div class="mt-2"><strong>制約</strong><br>${quoteLines(state.constraints).map(c => `· ${escapeHtml(c)}`).join('<br>')}</div>`);
    }
    if (!parts.length) return '';
    return `<div class="answered-trail">${parts.join('')}</div>`;
  }

  function currentPhase() {
    if (viewMode === 'history' || viewMode === 'theme') return null;
    if (step >= 1 && step <= 9) return 'think';
    if (step === 10) return 'think';
    if (step === 13) return 'pass';
    if (step === 14) return 'return';
    if (step === 15 || step === 16) return 'grow';
    if (step === 11 || step === 12) return 'grow';
    return 'think';
  }

  function phaseNavHtml() {
    const phase = currentPhase();
    if (!phase) return '';
    const items = [
      { id: 'think', label: '考えている' },
      { id: 'pass', label: 'AIへ渡す' },
      { id: 'return', label: 'AIから戻る' },
      { id: 'grow', label: '育てる' }
    ];
    return `<nav class="phase-nav" aria-label="いまの場所">
      ${items.map((it, i) => `
        <span class="phase-item${it.id === phase ? ' is-current' : ''}">${escapeHtml(it.label)}</span>
        ${i < items.length - 1 ? '<span class="phase-arrow" aria-hidden="true">→</span>' : ''}
      `).join('')}
    </nav>`;
  }

  function progressLabel() {
    const map = {
      1: '① 気になっていること',
      2: '② 今日のテーマ',
      3: '③ 実現したいこと',
      4: '④ 守りたいもの',
      5: '映し返し',
      6: '⑤ 条件・制約',
      7: 'いま言葉にしたものを見る',
      8: 'まだ言葉になっていない層',
      9: '次は、こう渡す',
      10: '問い返す型',
      13: 'AIへ渡す',
      14: 'AIから戻る',
      15: '判断文脈を育てる',
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
      concerns: [], theme: '', achieve: '', protect: '', constraints: '',
      gapQuestions: [], gapInsights: {}, missingArea: '', nextSentence: '', newJudgment: '',
      contextBefore: '', contextBeforeParts: null, aiReplyPaste: '',
      reflection: { newPerspective: '', discomfort: '', contextChange: '' },
      reflectionQ: 0, contextAfterText: '',
      criteriaGrowth: emptyCriteriaGrowth(),
      activeThemeId: null, activeEntryId: null, browseThemeId: null
    });
    concernDraft = '';
    viewMode = 'flow';
    step = 1;
  }

  function keepGrownContext() {
    const Store = window.JudgmentOSStore;
    if (!Store) return;
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
    document.getElementById('screen-landing').classList.add('hidden');
    const ws = document.getElementById('screen-workspace');
    ws.classList.remove('hidden');
    ws.classList.add('fade-in');
    updateParticipantChip();
  }

  function goLanding() {
    document.getElementById('screen-workspace').classList.add('hidden');
    document.getElementById('screen-invite')?.classList.add('hidden');
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

  /**
   * 初回のみ招待コード。認証済みならそのまま進む。
   * ?dev=1 / localStorage.judgmentos.dev=1 ではゲートをスキップ。
   */
  function withAccess(kind, onSuccess) {
    if (isDevMode()) {
      onSuccess();
      return;
    }
    const Access = window.JudgmentOSAccess;
    if (!Access) {
      showInviteGate(onSuccess);
      return;
    }
    if (Access.isAuthorized()) {
      Access.touch(kind || 'enter');
      updateParticipantChip();
      onSuccess();
      return;
    }
    showInviteGate(() => {
      Access.touch(kind || 'enter');
      onSuccess();
    });
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
    const input = document.getElementById('concern-input');
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
      state.concerns = [draft];
      state.theme = draft;
      concernDraft = '';
      step = 3;
      render();
    };
    const btnDev = document.getElementById('btn-dev-sample');
    if (btnDev) {
      btnDev.onclick = () => {
        state.concerns = [...DEMO.concerns];
        state.theme = DEMO.concerns[0];
        concernDraft = '';
        step = 2;
        render();
      };
    }
  }

  function render() {
    const root = document.getElementById('dialogue');
    if (viewMode === 'history') {
      renderHistoryList(root);
      return;
    }
    if (viewMode === 'theme') {
      renderThemeDetail(root);
      return;
    }
    const prog = `${phaseNavHtml()}<p class="step-progress"><em>JudgmentOS</em> · ${progressLabel()}</p>`;

    if (step === 1) {
      root.innerHTML = `
        <section class="card space-y-3">
          ${prog}
          <p class="q-title">今、仕事や経営で気になっていることは何ですか。</p>
          <p class="q-help">まだ判断にしなくて大丈夫です。今、気になっていることを書いてください。</p>
          <textarea id="concern-input" class="textarea">${escapeHtml(concernDraft)}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary w-full" ${concernDraft.trim() ? '' : 'disabled'}>次へ</button>
          ${isDevMode() ? `<button type="button" id="btn-dev-sample" class="btn btn-ghost w-full text-xs opacity-60">[開発] サンプルで進む</button>` : ''}
        </section>`;
      bindStep1();
      return;
    }

    if (step === 2) {
      if (state.concerns.length <= 1) {
        state.theme = state.concerns[0] || state.theme;
        step = 3;
        render();
        return;
      }
      root.innerHTML = `
        <section class="card space-y-3">
          ${prog}
          ${trailHtml()}
          <p class="q-title">その中で、今日いちばん深く考えたいテーマはどれですか。</p>
          <p class="q-help">一つ選んでください。</p>
          <div id="theme-options"></div>
          <button type="button" id="btn-next" class="btn btn-primary" disabled>次へ</button>
        </section>`;
      const box = document.getElementById('theme-options');
      state.concerns.forEach((c) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-option' + (state.theme === c ? ' selected' : '');
        btn.textContent = c;
        btn.onclick = () => {
          state.theme = c;
          box.querySelectorAll('.theme-option').forEach(el => el.classList.remove('selected'));
          btn.classList.add('selected');
          document.getElementById('btn-next').disabled = false;
        };
        box.appendChild(btn);
      });
      document.getElementById('btn-next').onclick = () => {
        if (!state.theme) return;
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
          <p class="q-title">そのテーマについて、あなたは何を実現したいですか。</p>
          <p class="q-help">解決策ではなく、向かいたい方向を、あなたの言葉で書いてください。</p>
          <textarea id="field-achieve" class="textarea">${escapeHtml(state.achieve)}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary">次へ</button>
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
          <p class="q-title">それを進める中で、何を守りたいですか。</p>
          <p class="q-help">人・関係・時間・信頼・文化など。崩したくないものを書いてください。</p>
          <textarea id="field-protect" class="textarea">${escapeHtml(state.protect)}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary">次へ</button>
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
            <p class="mt-4">この二つを両立させながら考えることが、<br>今回のテーマになりそうです。</p>
          </div>
          <button type="button" id="btn-next" class="btn btn-primary w-full">続きを考える</button>
        </section>`;
      document.getElementById('btn-next').onclick = () => { step = 6; render(); };
      return;
    }

    if (step === 6) {
      root.innerHTML = `
        <section class="card space-y-3">
          ${prog}
          ${trailHtml()}
          <p class="q-title">このテーマで無視できない条件や制約は何ですか。</p>
          <p class="q-help">予算・人数・期限・規程など。改行で複数書けます。</p>
          <textarea id="field-constraints" class="textarea">${escapeHtml(state.constraints)}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary">いま言葉にしたものを見る</button>
        </section>`;
      document.getElementById('btn-next').onclick = () => {
        const v = document.getElementById('field-constraints').value.trim();
        if (!v) { document.getElementById('field-constraints').focus(); return; }
        state.constraints = v;
        step = 7;
        render();
      };
      return;
    }

    if (step === 7) {
      root.innerHTML = `
        <section class="space-y-4 fade-in">
          ${prog}
          ${contextCardHtml()}
          <p class="text-sm text-[hsl(var(--muted-fg))] leading-relaxed px-1">
            判断の質は、この判断文脈の質で決まります。<br>
            答えを求める前に、置いたものを自分で確認してください。
          </p>
          <p class="text-xs text-[hsl(var(--muted-fg))] leading-relaxed px-1 -mt-2 opacity-90">
            この文脈が、AIや他者へ渡す前提になります。
          </p>
          <div class="flex flex-col gap-2">
            <button type="button" id="btn-gaps" class="btn btn-primary w-full">まだ言葉になっていない層へ進む</button>
            <button type="button" id="btn-update" class="btn btn-ghost w-full">次は、こう渡すへ</button>
          </div>
        </section>`;
      document.getElementById('btn-gaps').onclick = () => {
        state.gapQuestions = selectGapQuestions();
        state.gapInsights = {};
        step = 8;
        render();
      };
      document.getElementById('btn-update').onclick = () => { step = 9; render(); };
      return;
    }

    if (step === 8) {
      const gaps = state.gapQuestions.length ? state.gapQuestions : selectGapQuestions();
      state.gapQuestions = gaps;
      root.innerHTML = `
        <section class="space-y-4 fade-in">
          ${prog}
          <p class="q-title">まだ言葉になっていない判断文脈へ</p>
          <div class="gap-reassure">
            <p>正解はありません。</p>
            <p>全部に答える必要もありません。</p>
            <p class="mt-2">気になった問いだけ立ち止まり、<br>一文でも言葉が増えれば十分です。</p>
          </div>
          <p class="q-help">気づいたことを、一文だけ残してみてください。</p>
          ${gaps.map((g, i) => `
            <div class="gap-card">
              <p class="text-[0.625rem] font-bold tracking-wider text-[hsl(var(--primary))]">問い ${i + 1}</p>
              <p class="gap-note">${escapeHtml(g.note)}</p>
              <p class="gap-ask">${escapeHtml(g.ask)}</p>
              <label class="gap-insight-label" for="gap-insight-${i}">この問いで気づいたこと</label>
              <textarea id="gap-insight-${i}" class="textarea gap-insight" rows="2">${escapeHtml(state.gapInsights[g.key] || '')}</textarea>
            </div>`).join('')}
          <button type="button" id="btn-next" class="btn btn-primary w-full">判断文脈を育てる</button>
        </section>`;

      const collectInsights = () => {
        gaps.forEach((g, i) => {
          const el = document.getElementById(`gap-insight-${i}`);
          state.gapInsights[g.key] = (el?.value || '').trim();
        });
      };

      gaps.forEach((g, i) => {
        const el = document.getElementById(`gap-insight-${i}`);
        if (el) {
          el.oninput = () => {
            state.gapInsights[g.key] = el.value;
          };
        }
      });

      document.getElementById('btn-next').onclick = () => {
        collectInsights();
        const insights = filledGapInsights();
        if (insights.length) {
          state.missingArea = 'from_gaps';
          state.nextSentence = proposeSentenceFromInsights();
        }
        step = 9;
        render();
      };
      return;
    }

    if (step === 9) {
      const insights = filledGapInsights();

      // 問いからの気づきがある場合: それを見ながら一文を足す（中核体験）
      if (insights.length) {
        if (state.missingArea !== 'none' && state.missingArea !== 'from_gaps') {
          state.missingArea = 'from_gaps';
        }
        if (state.missingArea !== 'none' && !state.nextSentence.trim()) {
          state.nextSentence = proposeSentenceFromInsights();
        }
        root.innerHTML = `
          <section class="card space-y-3 fade-in">
            ${prog}
            ${gapInsightsTrailHtml()}
            <p class="q-title">次は、こう渡す。</p>
            <p class="q-help">上の気づきを見ながら、次に渡す判断文脈へ足す一文を整えてください。複数あるときは、いちばん渡したい一文に絞ります。</p>
            <textarea id="field-next" class="textarea">${escapeHtml(state.nextSentence)}</textarea>
            <div class="ai-block mt-3">
              <p class="text-[0.6875rem] font-bold text-[hsl(var(--primary))] mb-1">必要なら、気づきをAIで一文に統合する</p>
              <p class="mb-2 text-xs">JudgmentOSは答えを出しません。依頼文をコピーしてAIに渡すと、「判断文脈に加えるなら、この一文です。」の形で候補を返せます。採用するのは、あなたです。</p>
              <textarea id="integrate-pack" class="ai-prompt-box" readonly>${escapeHtml(buildInsightIntegratePrompt())}</textarea>
              <button type="button" id="btn-copy-integrate" class="btn btn-ghost mt-2 text-xs">統合用の依頼文をコピー</button>
              <span id="copy-integrate-toast" class="hidden text-xs text-[hsl(var(--primary))] ml-2">コピーしました</span>
            </div>
            <div class="flex flex-col gap-2 mt-2">
              <button type="button" id="btn-next" class="btn btn-primary w-full" disabled>この一文で判断文脈を育てる</button>
              <button type="button" id="btn-skip-add" class="btn btn-ghost w-full">今回はこのまま渡す</button>
            </div>
          </section>`;

        const nextBtn = document.getElementById('btn-next');
        const field = document.getElementById('field-next');
        const updateNextEnabled = () => {
          nextBtn.disabled = !(field && field.value.trim());
        };
        if (field) {
          field.oninput = () => {
            state.nextSentence = field.value;
            state.missingArea = 'from_gaps';
            updateNextEnabled();
          };
        }
        updateNextEnabled();

        document.getElementById('btn-skip-add').onclick = () => {
          state.missingArea = 'none';
          state.nextSentence = '';
          step = nextAfterContextUpdate();
          render();
        };

        const copyIntegrate = document.getElementById('btn-copy-integrate');
        if (copyIntegrate) {
          copyIntegrate.onclick = async () => {
            const text = buildInsightIntegratePrompt();
            try { await navigator.clipboard.writeText(text); }
            catch {
              document.getElementById('integrate-pack').select();
              document.execCommand('copy');
            }
            const toast = document.getElementById('copy-integrate-toast');
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 2000);
          };
        }

        nextBtn.onclick = () => {
          state.nextSentence = field.value.trim();
          if (!state.nextSentence) return;
          state.missingArea = 'from_gaps';
          step = nextAfterContextUpdate();
          render();
        };
        return;
      }

      // 問いをスキップした場合のフォールバック（判断文脈を更新する導線）
      const areas = [
        { id: 'achieve', label: '実現したいことの背景・誰のための実現か' },
        { id: 'protect', label: '守りたいものの対象（人・関係・制度）' },
        { id: 'constraints', label: '制約の意味（絶対か、仮定か、自分の上限か）' },
        { id: 'time', label: '時間軸（いつまでに、何をもって成功か）' },
        { id: 'other', label: 'その他（判断文脈に一文を足す）' },
        { id: 'none', label: '今回はこのまま渡す' }
      ];
      root.innerHTML = `
        <section class="card space-y-3 fade-in">
          ${prog}
          <p class="q-title">判断文脈を育てる</p>
          <p class="q-help">判断文脈は、一度で完成しません。いま足したい一文は、どの層に当たりますか。</p>
          <div class="choice-grid" id="missing-areas">
            ${areas.map(a => `
              <button type="button" class="choice-btn${state.missingArea === a.id ? ' selected' : ''}" data-id="${a.id}">${escapeHtml(a.label)}</button>
            `).join('')}
          </div>
          <div id="next-wrap" class="${state.missingArea && state.missingArea !== 'none' ? '' : 'hidden'}">
            <p class="q-title mt-4">次は、こう渡す。</p>
            <p class="q-help">次に渡す判断文脈へ、自分の言葉で一文を書いてください。</p>
            <textarea id="field-next" class="textarea">${escapeHtml(state.nextSentence)}</textarea>
          </div>
          <button type="button" id="btn-next" class="btn btn-primary" disabled>次へ</button>
        </section>`;

      const nextBtn = document.getElementById('btn-next');
      const updateNextEnabled = () => {
        if (state.missingArea === 'none') {
          nextBtn.disabled = false;
          return;
        }
        const field = document.getElementById('field-next');
        nextBtn.disabled = !(field && field.value.trim());
      };

      document.querySelectorAll('#missing-areas .choice-btn').forEach(btn => {
        btn.onclick = () => {
          state.missingArea = btn.dataset.id;
          if (btn.dataset.id === 'none') state.nextSentence = '';
          render();
        };
      });

      const field = document.getElementById('field-next');
      if (field) {
        field.oninput = () => {
          state.nextSentence = field.value;
          updateNextEnabled();
        };
      }
      updateNextEnabled();

      nextBtn.onclick = () => {
        if (state.missingArea !== 'none') {
          state.nextSentence = document.getElementById('field-next').value.trim();
          if (!state.nextSentence) return;
        }
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

    // AIへ渡す
    if (step === 13) {
      if (!state.contextBeforeParts) snapshotBeforePass();
      const parts = state.contextBeforeParts;
      root.innerHTML = `
        <section class="space-y-4 fade-in">
          ${prog}
          <p class="q-title">ここまでに、あなたが言葉にした判断文脈</p>
          <p class="q-help">この内容をAIへ渡すと、あなたが大切にしていること、守りたいもの、制約を前提に対話できます。</p>
          <div class="mirror-summary">
            <h3>【今日のテーマ】</h3>
            <p>${escapeHtml(parts.theme)}</p>
            <h3>【実現したいこと】</h3>
            <p class="font-semibold">「${escapeHtml(parts.achieve)}」</p>
            <h3>【守りたいもの】</h3>
            <p class="font-semibold">「${escapeHtml(parts.protect)}」</p>
            <h3>【無視できない条件・制約】</h3>
            <ul class="mt-1 space-y-1">${quoteLines(parts.constraints).map(c => `<li>· ${escapeHtml(c)}</li>`).join('')}</ul>
            ${parts.addedSentence ? `
              <h3>【問いを通じて加えた一文】</h3>
              <p class="font-semibold">「${escapeHtml(parts.addedSentence)}」</p>` : ''}
          </div>
          <div class="flex flex-col gap-2">
            <button type="button" id="btn-copy-ai" class="btn btn-primary w-full">AIへ渡す文面をコピー</button>
            <span id="copy-ai-toast" class="hidden text-xs text-center text-[hsl(var(--primary))]">コピーしました。任意のAIへ貼り付けてください。</span>
            <button type="button" id="btn-return" class="btn btn-ghost w-full">AIの答えを受けて、自分に戻る</button>
          </div>
        </section>`;
      document.getElementById('btn-copy-ai').onclick = () => copyText(buildAiPassText(), 'copy-ai-toast');
      document.getElementById('btn-return').onclick = () => {
        state.reflectionQ = 0;
        step = 14;
        render();
      };
      return;
    }

    // AIから戻る（3問を一問ずつ）
    if (step === 14) {
      const questions = [
        {
          key: 'newPerspective',
          title: 'AIの回答の中で、自分にはなかった視点は何でしたか。'
        },
        {
          key: 'discomfort',
          title: '納得できなかったこと、違和感が残ったことは何でしたか。'
        },
        {
          key: 'contextChange',
          title: 'その違和感や気づきを踏まえて、判断文脈に何を足す、変える、または残しますか。'
        }
      ];
      const q = Math.min(state.reflectionQ || 0, questions.length - 1);
      const current = questions[q];
      root.innerHTML = `
        <section class="card space-y-3 fade-in">
          ${prog}
          <p class="q-title">AIの答えを受けて、もう一度自分に戻る</p>
          <p class="q-help">ここではAIの答えを採点しません。AIの答えによって、自分の判断文脈のどこが揺れたか、深まったかを確かめます。</p>
          ${q === 0 ? `
            <label class="gap-insight-label" for="field-ai-paste">AIの回答（任意）</label>
            <p class="q-help">覚えておきたい箇所だけ貼り付けても構いません。空欄のままでも進めます。</p>
            <textarea id="field-ai-paste" class="textarea" rows="4">${escapeHtml(state.aiReplyPaste)}</textarea>
          ` : ''}
          <p class="text-[0.625rem] font-bold tracking-wider text-[hsl(var(--primary))]">問い ${q + 1} / 3</p>
          <p class="q-title mt-1">${escapeHtml(current.title)}</p>
          <p class="q-help">短い文章で構いません。</p>
          <textarea id="field-reflect" class="textarea" rows="3">${escapeHtml(state.reflection[current.key] || '')}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary w-full">${q < 2 ? '次の問いへ' : '判断文脈を見比べる'}</button>
        </section>`;
      const paste = document.getElementById('field-ai-paste');
      if (paste) {
        paste.oninput = () => { state.aiReplyPaste = paste.value; };
      }
      const field = document.getElementById('field-reflect');
      field.oninput = () => { state.reflection[current.key] = field.value; };
      document.getElementById('btn-next').onclick = () => {
        state.reflection[current.key] = field.value.trim();
        if (paste) state.aiReplyPaste = paste.value;
        if (q < 2) {
          state.reflectionQ = q + 1;
          render();
          return;
        }
        state.contextAfterText = proposeAfterFromReflection();
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
          <p class="q-help">AIへ渡す前と、回答を受けた後を見比べます。最終の言葉は、あなたが整えてください。</p>
          <div class="compare-grid">
            <div class="compare-col">
              <p class="compare-label">AIへ渡す前</p>
              <pre class="compare-body">${escapeHtml(before)}</pre>
            </div>
            <div class="compare-col compare-col-edit">
              <p class="compare-label">AIの回答を受けた後</p>
              <textarea id="field-after" class="textarea compare-edit">${escapeHtml(state.contextAfterText)}</textarea>
            </div>
          </div>
          <button type="button" id="btn-keep" class="btn btn-primary w-full">育てた判断文脈を残す</button>
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
              <li>事業化の方法ばかり考えていた。</li>
              <li>AIをどう使うかだけを考えていた。</li>
              <li>私は専門家として成功しようとしていた。</li>
            </ul>
            <textarea id="field-first-me" class="textarea" rows="3">${escapeHtml(g.firstMe || '')}</textarea>
          </div>

          <div class="grow-block">
            <p class="grow-block-title"><span class="grow-num" aria-hidden="true">②</span> 今の私は</p>
            <p class="grow-field-label">今の私は、どう考えるようになったか。</p>
            <ul class="field-examples" aria-label="例">
              <li>私は専門家ではなく、JudgmentOSという市場を創るファウンダーである。</li>
              <li>AIの答えより、自分の判断基準を育てることが重要だと思うようになった。</li>
            </ul>
            <textarea id="field-now-me" class="textarea" rows="3">${escapeHtml(g.nowMe || '')}</textarea>
          </div>

          <div class="grow-block grow-block-climax">
            <p class="grow-block-title"><span class="grow-num" aria-hidden="true">③</span> 一番大きく変わったこと</p>
            <p class="grow-field-label">今回、一番変化した判断基準は何ですか。</p>
            <p class="q-help field-example-block">
              例：事業化の方法を探していたが、<br>
              市場そのものを創ることが自分の役割だと思うようになった。
            </p>
            <textarea id="field-criteria-change" class="textarea" rows="4">${escapeHtml(g.criteriaChange || '')}</textarea>
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

      document.getElementById('btn-keep-criteria').onclick = () => {
        state.criteriaGrowth.firstMe = (document.getElementById('field-first-me').value || '').trim();
        state.criteriaGrowth.nowMe = (document.getElementById('field-now-me').value || '').trim();
        state.criteriaGrowth.criteriaChange = (document.getElementById('field-criteria-change').value || '').trim();
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
              JudgmentOSは、AIとの対話を通じて、<br>
              自分自身の判断基準を育てる思考OSです。
            </p>
          </div>
          ${keep ? `
            <div class="judgment-final">
              <p class="label">今回、一番変化した判断基準</p>
              <p class="judgment-display">${escapeHtml(keep)}</p>
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
