/**
 * JudgmentOS Version 1.2
 * 判断文脈を言語化し、その質を高め続ける思考OS。
 * 順序: 本人 → 判断文脈 →（必要なら）問い → 文脈の更新 → 判断
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'judgmentos-v1.2-sessions';

  const DEMO = {
    concerns: [
      '新規事業を伸ばしたいが、進め方が定まらない',
      '社員の働き方改革を後退させたくない',
      '今年度は予算を増やせない'
    ]
  };

  const state = {
    concerns: [],
    theme: '',
    achieve: '',
    protect: '',
    constraints: '',
    gapQuestions: [],
    missingArea: '',
    nextSentence: '',
    newJudgment: ''
  };

  let step = 1;
  let concernDraft = '';

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
    return `【今日のテーマ】
${b.theme}

【実現したいこと】
${b.achieve}

【守りたいもの】
${b.protect}

【無視できない条件】
${b.constraints.map(c => `· ${c}`).join('\n')}

【映し返し】
${buildReflection()}`;
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
        note: '時間の層は、まだ薄いことがあります。',
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
        <h3>【いま置いた判断文脈】</h3>
        <p class="text-[0.75rem] text-[hsl(var(--muted-fg))] mb-2">渡す前に、まずこれを見てください。</p>
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

  function progressLabel() {
    const map = {
      1: '① 気になっていること',
      2: '② 今日のテーマ',
      3: '③ 実現したいこと',
      4: '④ 守りたいもの',
      5: '映し返し',
      6: '⑤ 条件・制約',
      7: '判断文脈を見る',
      8: 'まだ言葉になっていない層',
      9: '判断文脈を更新する',
      10: '問い返す型',
      11: '新しい判断',
      12: '余韻'
    };
    return map[step] || '';
  }

  function resetState() {
    Object.assign(state, {
      concerns: [], theme: '', achieve: '', protect: '', constraints: '',
      gapQuestions: [], missingArea: '', nextSentence: '', newJudgment: ''
    });
    concernDraft = '';
    step = 1;
  }

  function saveSession() {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    history.unshift({
      date: new Date().toISOString(),
      version: '1.2',
      theme: state.theme,
      achieve: state.achieve,
      protect: state.protect,
      constraints: state.constraints,
      missingArea: state.missingArea,
      nextSentence: state.nextSentence,
      newJudgment: state.newJudgment,
      gapKeys: state.gapQuestions.map(g => g.key),
      context_pack: buildContextPack()
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
  }

  function paintConcernList() {
    const list = document.getElementById('concern-list');
    if (!list) return;
    list.innerHTML = state.concerns.map((c, i) => `
      <div class="concern-chip">
        <span class="flex-1">· ${escapeHtml(c)}</span>
        <button type="button" data-i="${i}" aria-label="削除">削除</button>
      </div>`).join('');
    list.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        state.concerns.splice(Number(btn.dataset.i), 1);
        render();
      };
    });
  }

  function addConcernFromInput() {
    const el = document.getElementById('concern-input');
    const v = (el?.value || '').trim();
    if (!v) return;
    if (!state.concerns.includes(v)) state.concerns.push(v);
    concernDraft = '';
    if (el) el.value = '';
    render();
  }

  function bindStep1() {
    document.getElementById('btn-add-concern').onclick = addConcernFromInput;
    document.getElementById('btn-next').onclick = () => {
      const draft = document.getElementById('concern-input')?.value.trim();
      if (draft && !state.concerns.includes(draft)) state.concerns.push(draft);
      if (!state.concerns.length) return;
      concernDraft = '';
      step = 2;
      render();
    };
    document.getElementById('btn-sample').onclick = () => {
      state.concerns = [...DEMO.concerns];
      concernDraft = '';
      render();
    };
    document.getElementById('concern-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addConcernFromInput();
      }
    });
  }

  function render() {
    const root = document.getElementById('dialogue');
    const prog = `<p class="step-progress"><em>JudgmentOS</em> · ${progressLabel()}</p>`;

    if (step === 1) {
      root.innerHTML = `
        <section class="card space-y-3">
          ${prog}
          <p class="q-title">今、仕事や経営で気になっていることは何ですか。</p>
          <p class="q-help">いくつでも書いてください。まだ「判断」にしなくて大丈夫です。</p>
          <div id="concern-list" class="concern-list"></div>
          <textarea id="concern-input" class="textarea" placeholder="例：新規事業の進め方が定まらない">${escapeHtml(concernDraft)}</textarea>
          <div class="flex flex-wrap gap-2">
            <button type="button" id="btn-add-concern" class="btn btn-ghost">リストに追加</button>
            <button type="button" id="btn-next" class="btn btn-primary" ${state.concerns.length === 0 ? 'disabled' : ''}>次へ</button>
            <button type="button" id="btn-sample" class="btn btn-ghost">デモ用サンプル</button>
          </div>
        </section>`;
      paintConcernList();
      bindStep1();
      return;
    }

    if (step === 2) {
      if (state.concerns.length === 1) {
        state.theme = state.concerns[0];
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
          <textarea id="field-achieve" class="textarea" placeholder="例：新規事業を伸ばしたい">${escapeHtml(state.achieve)}</textarea>
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
          <textarea id="field-protect" class="textarea" placeholder="例：社員の働き方改革も守りたい">${escapeHtml(state.protect)}</textarea>
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
          <textarea id="field-constraints" class="textarea" placeholder="例：今年度の予算は増やせない">${escapeHtml(state.constraints)}</textarea>
          <button type="button" id="btn-next" class="btn btn-primary">判断文脈を見る</button>
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
          <div class="flex flex-col gap-2">
            <button type="button" id="btn-gaps" class="btn btn-primary w-full">まだ言葉になっていない層へ進む</button>
            <button type="button" id="btn-update" class="btn btn-ghost w-full">判断文脈を更新する</button>
          </div>
          <div class="ai-block">
            <p class="text-[0.6875rem] font-bold text-[hsl(var(--primary))] mb-1">必要なら、この文脈を外へ渡す</p>
            <p class="mb-2 text-xs">渡す前に内容を見てください。コピーは任意です。</p>
            <textarea id="context-pack" class="ai-prompt-box" readonly>${escapeHtml(buildContextPack())}</textarea>
            <button type="button" id="btn-copy" class="btn btn-ghost mt-2 text-xs">判断文脈をコピー</button>
            <span id="copy-toast" class="hidden text-xs text-[hsl(var(--primary))] ml-2">コピーしました</span>
          </div>
        </section>`;
      document.getElementById('btn-gaps').onclick = () => {
        state.gapQuestions = selectGapQuestions();
        step = 8;
        render();
      };
      document.getElementById('btn-update').onclick = () => { step = 9; render(); };
      document.getElementById('btn-copy').onclick = async () => {
        const text = buildContextPack();
        try { await navigator.clipboard.writeText(text); }
        catch {
          document.getElementById('context-pack').select();
          document.execCommand('copy');
        }
        const toast = document.getElementById('copy-toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2000);
      };
      return;
    }

    if (step === 8) {
      const gaps = state.gapQuestions.length ? state.gapQuestions : selectGapQuestions();
      state.gapQuestions = gaps;
      root.innerHTML = `
        <section class="space-y-4 fade-in">
          ${prog}
          <p class="q-title">まだ言葉になっていない判断文脈へ</p>
          <p class="q-help">答えではありません。いま置いた言葉の隙間に触れる問いです。毎回同じ一覧にはなりません。</p>
          ${gaps.map((g, i) => `
            <div class="gap-card">
              <p class="text-[0.625rem] font-bold tracking-wider text-[hsl(var(--primary))]">問い ${i + 1}</p>
              <p class="gap-note">${escapeHtml(g.note)}</p>
              <p class="gap-ask">${escapeHtml(g.ask)}</p>
            </div>`).join('')}
          <button type="button" id="btn-next" class="btn btn-primary w-full">何を渡せていたかを見る</button>
        </section>`;
      document.getElementById('btn-next').onclick = () => { step = 9; render(); };
      return;
    }

    if (step === 9) {
      const areas = [
        { id: 'achieve', label: '実現したいことの背景・誰のための実現か' },
        { id: 'protect', label: '守りたいものの対象（人・関係・制度）' },
        { id: 'constraints', label: '制約の意味（絶対か、仮定か、自分の上限か）' },
        { id: 'time', label: '時間軸（いつまでに、何をもって成功か）' },
        { id: 'other', label: 'その他（次の一文で書く）' },
        { id: 'none', label: '今回は足さない' }
      ];
      root.innerHTML = `
        <section class="card space-y-3 fade-in">
          ${prog}
          <p class="q-title">自分は、何を渡せていなかったか。</p>
          <p class="q-help">成功は、便利さではありません。判断文脈のどこが薄かったかに気付くことです。</p>
          <div class="choice-grid" id="missing-areas">
            ${areas.map(a => `
              <button type="button" class="choice-btn${state.missingArea === a.id ? ' selected' : ''}" data-id="${a.id}">${escapeHtml(a.label)}</button>
            `).join('')}
          </div>
          <div id="next-wrap" class="${state.missingArea && state.missingArea !== 'none' ? '' : 'hidden'}">
            <p class="q-title mt-4">次は、こう渡す。</p>
            <p class="q-help">判断文脈に足す一文を、自分の言葉で書いてください。</p>
            <textarea id="field-next" class="textarea" placeholder="例：伸びたの定義は、売上より既存顧客からの紹介件数とする。">${escapeHtml(state.nextSentence)}</textarea>
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
        step = 10;
        render();
      };
      return;
    }

    if (step === 10) {
      root.innerHTML = `
        <section class="card space-y-4 fade-in">
          ${prog}
          <p class="q-title">部下がこう言ったとき。</p>
          <p class="text-sm leading-relaxed border-l-2 border-[hsl(var(--primary)/0.5)] pl-3 my-2">
            「AIがこう言っています。」
          </p>
          <p class="q-help">あなたが自然に返す型です。一度、心の中で言ってみてください。</p>
          <ol class="mgmt-list list-decimal pl-5">
            <li>AIに何を渡したの？</li>
            <li>その前に、自分自身と十分向き合った？</li>
            <li>実現したいこと、守りたいもの、制約まで渡した？</li>
          </ol>
          <button type="button" id="btn-next" class="btn btn-primary w-full">この型を受け取った</button>
        </section>`;
      document.getElementById('btn-next').onclick = () => {
        step = 11;
        render();
      };
      return;
    }

    if (step === 11) {
      root.innerHTML = `
        <section class="card space-y-3 fade-in">
          ${prog}
          ${state.nextSentence ? `<div class="answered-trail"><strong>次に足す一文</strong><br>${escapeHtml(state.nextSentence)}</div>` : ''}
          <p class="q-title">私はこう判断する</p>
          <p class="q-help">任意です。持ち帰るものは、答えではなく、あなた自身の判断です。</p>
          <textarea id="field-judgment" class="textarea" placeholder="私は、…と判断する。">${escapeHtml(state.newJudgment)}</textarea>
          <div class="flex flex-wrap gap-2">
            <button type="button" id="btn-finish" class="btn btn-primary">判断を残す</button>
            <button type="button" id="btn-skip-j" class="btn btn-ghost">判断は後で · 余韻へ</button>
          </div>
        </section>`;
      document.getElementById('btn-finish').onclick = () => {
        const v = document.getElementById('field-judgment').value.trim();
        if (!v) { document.getElementById('field-judgment').focus(); return; }
        state.newJudgment = v;
        saveSession();
        step = 12;
        render();
      };
      document.getElementById('btn-skip-j').onclick = () => {
        saveSession();
        step = 12;
        render();
      };
      return;
    }

    if (step === 12) {
      root.innerHTML = `
        <section class="space-y-4 fade-in">
          ${state.newJudgment ? `
            <div class="judgment-final">
              <p class="label">あなたの新しい判断</p>
              <p class="judgment-display">${escapeHtml(state.newJudgment)}</p>
            </div>
            <div class="arrow">↓</div>` : ''}
          ${state.nextSentence ? `
            <div class="mirror-card">
              <p class="mirror-label">次に渡す判断文脈へ</p>
              <p class="quote">「${escapeHtml(state.nextSentence)}」</p>
            </div>
            <div class="arrow">↓</div>` : ''}
          <div class="brand-outro">
            <div class="brand-outro-final">
              <p>判断の質は、</p>
              <p>判断文脈の質で決まります。</p>
              <p class="mt-4 you">決めるのも、渡すのも、あなたです。</p>
            </div>
            <p class="brand-outro-takeaway">
              成功とは、便利さではありません。<br>
              <strong>何を渡せていたか</strong>に気付き、<br>
              <strong>次はこう渡す</strong>と決めること。<br><br>
              もっと判断文脈を整えてから、<br>
              外へ渡そう。
            </p>
          </div>
          <button type="button" id="btn-restart" class="btn btn-ghost w-full">はじめから置く</button>
        </section>`;
      document.getElementById('btn-restart').onclick = () => {
        resetState();
        render();
      };
    }
  }

  document.getElementById('btn-enter').addEventListener('click', () => {
    document.getElementById('screen-landing').classList.add('hidden');
    const ws = document.getElementById('screen-workspace');
    ws.classList.remove('hidden');
    ws.classList.add('fade-in');
    resetState();
    render();
  });
})();
