/**
 * AI時代の意思決定設計 憲法 — 推論パイプライン
 * @see ../AI_DECISION_DESIGN_CONSTITUTION.md
 *
 * 主役は経営者。AIは最後の支援者。
 * JudgmentOS = Judgment（意思決定）全体を支えるOS。主役はJudgment。Decision Contextはそれを支える構造。
 * 一直線: Premise → Decision Context → Question → AI → Judgment
 */
(function (global) {
  'use strict';

  const AI_VERSION = 'constitution-v2-context';

  function detectProfile(text) {
    if (/LinkedIn/.test(text) && /営業/.test(text) && /関係/.test(text)) return 'sales_trust';
    if (/売|営業/.test(text) && !/関係|信頼|発信/.test(text)) return 'sales_force';
    if (/続け|継続|撤退/.test(text)) return 'continue';
    if (/データ|分析|AI/.test(text) && !/実現|ゴール|目指/.test(text)) return 'data_first';
    return 'general';
  }

  function summarize(text) {
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
    return lines.length >= 2 ? lines.slice(0, 2).join('\n') : (text.length > 80 ? text.slice(0, 80) + '…' : text);
  }

  function buildStructure(text, profile) {
    const decision = summarize(text);
    const profiles = {
      sales_trust: {
        premise: '価値が伝われば、信頼は自然に形成される。',
        visible: ['発信内容', '専門性', '継続', '実績', 'ネットワーク'],
        invisible: ['目的の明文化', '直接対話', '反対意見', '小さな実験', '既存顧客以外'],
        tensions: [
          { a: '価値は発信で伝えられる', b: '信頼は対話でしか確認できない' },
          { a: '営業色を出さない', b: '関係構築には接触が必要' },
          { a: '発信を磨けば前に進める', b: '誰に届けるかが決まっていない' }
        ]
      },
      sales_force: {
        premise: '売上不足の原因は、営業力の不足にある。',
        visible: ['KPI', '人数', 'パイプライン', '研修', '実行'],
        invisible: ['商品定義', '訴求', '価格', '買わない理由', '市場変化'],
        tensions: [
          { a: '打ち手を足せば数字は戻る', b: '商品·市場の根本がずれているかもしれない' },
          { a: '原因は営業側にある', b: '原因は別のところにあるかもしれない' }
        ]
      },
      continue: {
        premise: '続ける方向が、すでに決まっている。',
        visible: ['投資', '実績', '計画', '継続の論理'],
        invisible: ['撤退基準', '機会損失', '別の選択肢', '市場変化'],
        tensions: [
          { a: '粘れば道が開ける', b: '撤退の基準が見えていない' },
          { a: '過去の投資を無駄にしたくない', b: '続けることが最善とは限らない' }
        ]
      },
      data_first: {
        premise: 'データと分析が足りれば、正しい方向が見える。',
        visible: ['指標', 'ツール', '分析', '比較', '客観性'],
        invisible: ['ゴール', '測れない前提', '直接対話', '価値観'],
        tensions: [
          { a: '分析すれば迷いは減る', b: '何を実現したいかが先に必要かもしれない' },
          { a: '客観性が正しさに近い', b: '測れないものが判断の中心かもしれない' }
        ]
      },
      general: {
        premise: '与えられた情報で、判断に足りる。',
        visible: ['手元の情報', '論点', '整理'],
        invisible: ['目的の明文化', '反対意見', '未検証の前提'],
        tensions: [
          { a: '整理すれば方向が見える', b: '決めるべき論点がまだ違うかもしれない' }
        ]
      }
    };
    const p = profiles[profile] || profiles.general;
    return { decision, ...p };
  }

  /** 第7·8条 — 矛盾から問いを生む。思い込みは命名しない */
  function buildKeyQuestions(structure) {
    const questions = [];
    const tensions = structure.tensions || [];

    if (tensions[0]) {
      const t = tensions[0];
      questions.push(
        `「${t.a}」と「${t.b}」は、両立しないように見えます。\nこの矛盾を説明するとしたら、どんな前提があるでしょうか。`
      );
    }

    if (tensions[1]) {
      const t = tensions[1];
      questions.push(
        `「${t.a}」と「${t.b}」—— この緊張のどちらかが外れたら、判断はどう変わりますか。`
      );
    }

    questions.push(
      'この矛盾を解くために、いま判断しようとしていることは、本当に決めるべきことですか。',
      'その前提を持たない人は、同じ状況をどう判断しますか。',
      '半年後に振り返ったとき、本当に後悔するとしたら何ですか。'
    );

    return questions.slice(0, 5);
  }

  /** 第12条 — 検証を依頼する質問のみ */
  function buildAIVerificationPrompts(structure) {
    const tensions = structure.tensions || [];
    const prompts = [];

    tensions.slice(0, 2).forEach(t => {
      prompts.push(
        `「${t.a}」と「${t.b}」という矛盾を説明しうる前提は何か、検証の観点を整理してください。答えは不要です。`
      );
    });

    if (prompts.length < 2) {
      prompts.push(
        'いま考えている判断の前提を、反証できる観点から検証してください。答えは不要です。'
      );
    }

    prompts.push(
      'この前提を持たない人が、同じ状況をどう判断するか、検証材料として整理してください。'
    );

    return prompts.slice(0, 3);
  }

  /** 意思決定文脈 — 「今回の判断を見る限り」の仮説。断定しない */
  function buildDecisionContext(structure, profile, userPremise) {
    const catalog = {
      sales_trust: {
        achieve: '営業色を出さずに、潜在クライアントと関係を構築すること',
        protect: '専門家としての信頼と、発信の誠実さ',
        constraints: 'LinkedIn発信を主軸とし、売り込みと映らない方法で進めること',
        uncertain: '「営業」と「関係構築」の境界、および信頼の作り方',
        criteria: '信頼を損なわないこと'
      },
      sales_force: {
        achieve: '売上·数字を説明できる形で戻すこと',
        protect: 'これまでの営業投資と組織の実行力',
        constraints: '原因を営業側にあると見なし、まず打ち手を足す方向で進めること',
        uncertain: '原因が本当に営業力にあるのか、商品·市場側にあるのか',
        criteria: '説明可能な成果と、実行の再現性'
      },
      continue: {
        achieve: '開始した方向を途中で曲げずに前に進めること',
        protect: 'これまでの投資と、粘った判断であること',
        constraints: '続ける方向が既定で、撤退の選択肢を先に置かないこと',
        uncertain: 'いつ·どの基準で見直すべきか',
        criteria: '過去の投資を無駄にしないこと'
      },
      data_first: {
        achieve: 'データと分析から、納得できる方向を得ること',
        protect: '客観性と、思い込みではない判断であること',
        constraints: '測れるもの·分析できるものを中心に進めること',
        uncertain: '何を実現したいかが先に必要か、分析が先か',
        criteria: '説明可能で、根拠のある判断であること'
      },
      general: {
        achieve: '手元の情報を整理し、前に進める判断をすること',
        protect: '与えられた論点と、いま考えている枠組み',
        constraints: '渡された情報の範囲で判断を進めようとしていること',
        uncertain: '決めるべき論点が、本当にこれでよいか',
        criteria: '整理すれば方向が見える、という前提'
      }
    };

    const base = { ...(catalog[profile] || catalog.general) };

    if (userPremise && userPremise.trim()) {
      base.uncertain = `「${userPremise.trim()}」という前提が、本当に正しいかどうか`;
    }

    return base;
  }

  /** AIへ渡す意思決定文脈 — 質問ではない。映し出し·書き換え後の文脈 */
  function buildContextPrompt(ctx) {
    return `私は
${ctx.achieve}を実現したい。
${ctx.protect}を守りたい。
${ctx.constraints}という制約を受け入れている。
本当は${ctx.uncertain}に迷っている。
判断基準は${ctx.criteria}である。

この文脈を前提として
私に助言してください。`;
  }

  function runInference(text, userPremise) {
    const profile = detectProfile(text);
    const structure = buildStructure(text, profile);
    const key_questions = buildKeyQuestions(structure);
    const ai_verification_prompts = buildAIVerificationPrompts(structure);
    const decision_context = buildDecisionContext(structure, profile, userPremise);
    const context_prompt = buildContextPrompt(decision_context);

    return {
      profile,
      ...structure,
      key_questions,
      ai_verification_prompts,
      decision_context,
      context_prompt,
      ai_version: AI_VERSION
    };
  }

  const ConstitutionInference = {
    AI_VERSION,
    detectProfile,
    summarize,
    buildStructure,
    buildKeyQuestions,
    buildAIVerificationPrompts,
    buildDecisionContext,
    buildContextPrompt,
    runInference
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConstitutionInference;
  } else {
    global.ConstitutionInference = ConstitutionInference;
  }
})(typeof window !== 'undefined' ? window : globalThis);
