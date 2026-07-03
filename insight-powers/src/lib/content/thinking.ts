export type ThinkingSeries = {
  id: string;
  title: string;
  /** 記事 frontmatter の series フィールドと一致させる */
  matchSeries: string;
  paragraphs?: readonly string[];
  emphasis?: readonly string[];
  closing?: readonly string[];
  closingEmphasis?: readonly string[];
  closingEnd?: readonly string[];
};

export const thinkingContent = {
  closingHeading: "問いが変われば未来も変わる。",
  pillars: [
    {
      id: "premise",
      title: "前提を照らす",
      paragraphs: [
        "私たちは問題を見ているようで、",
        "実は前提を見ている。",
      ],
      emphasis: [
        "なぜその問題を問題だと思うのか。",
        "なぜその選択肢しか見えないのか。",
      ],
      closing: ["前提が変われば問いが変わる。"],
    },
    {
      id: "question",
      title: "問いを創造する",
      opening: ["AIは答えを出す。", "しかし問いはつくらない。"],
      closing: [
        "経営とは答えを探すことではなく、",
        "向き合うべき問いを発見することである。",
      ],
    },
    {
      id: "judgment",
      title: "判断を引き受ける",
      paragraphs: [
        "経営とは判断である。",
        "そして意思決定とは、正しいこと同士の優先順位を決めることである。",
        "誰かが答えを与えてくれるわけではない。",
      ],
      emphasis: ["最後は自ら決め、", "その責任を引き受ける。"],
    },
    {
      id: "knowledge",
      title: "組織知へ昇華する",
      paragraphs: ["優れた意思決定を個人の能力で終わらせない。"],
      emphasis: [
        "問いを立てる力。",
        "判断する力。",
        "その背景にある思考。",
      ],
      closing: ["それらを組織の知として残していく。"],
    },
    {
      id: "ai-decision",
      title: "AI時代の意思決定論",
      paragraphs: [
        "AIは合理性を強化する。",
        "だが合理性を支える前提を問うのは人間である。",
        "未来を決めるのは答えではない。",
      ],
      emphasis: ["問いである。"],
    },
  ],
  series: [
    {
      id: "ai-decision",
      title: "AI時代の意思決定論",
      matchSeries: "AI時代の意思決定論",
      paragraphs: ["AIは合理性を強化する。", "しかし、"],
      emphasis: [
        "どの前提を置くのか。",
        "何を問いとして設定するのか。",
        "そして、どの判断を引き受けるのか。",
      ],
      closing: ["その責任は人間に残る。", "本連載では、", "生成AI時代において、"],
      closingEmphasis: [
        "前提はどのように形成されるのか。",
        "問いは誰が設計するのか。",
        "判断は誰が引き受けるのか。",
      ],
      closingEnd: ["その営みを考察する。"],
    },
  ] satisfies readonly ThinkingSeries[],
} as const;
