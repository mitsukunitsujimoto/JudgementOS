type ProseBlock = { type: "prose"; text: string };
type EmphasisBlock = { type: "emphasis"; items: readonly string[] };

export type AboutBlock = ProseBlock | EmphasisBlock;

export type AboutSection = {
  id: string;
  title: string;
  blocks: readonly AboutBlock[];
};

export const aboutContent = {
  label: "ABOUT",
  name: "辻本 光邦",
  nameReading: "つじもと みつくに",
  profile: [
    "富士通株式会社、米国ケプナー・トリゴー社パートナー／日本支社長、日本マイクロソフト執行役員を経て独立。",
    "35年以上にわたり、企業の問題解決、意思決定、人材育成、組織変革に携わってきた。",
    "現在は株式会社インサイトパワーズ代表として、経営層・事業責任者・管理職を対象に、意思決定変革、人材育成、組織変革を支援している。",
  ],
  sections: [
    {
      id: "realization",
      title: "私が気づいたこと",
      blocks: [
        {
          type: "prose",
          text: "長年、企業の問題解決や意思決定に携わる中で、あることに気づいた。",
        },
        {
          type: "prose",
          text: "多くの組織は問題を解決できないのではない。",
        },
        {
          type: "prose",
          text: "問題を見ているようで、実は「当たり前」を見ていないのである。",
        },
        {
          type: "prose",
          text: "マイクロソフト時代、外部企業から提携や連携の提案をいただく機会が数多くあった。",
        },
        {
          type: "prose",
          text: "私はその際、必ず尋ねる質問があった。",
        },
        {
          type: "prose",
          text: "「御社の強みは何ですか。」",
        },
        { type: "prose", text: "すると、" },
        {
          type: "emphasis",
          items: ["ブランド力", "知名度", "安心感", "地域とのつながり"],
        },
        {
          type: "prose",
          text: "といった答えが返ってくる。",
        },
        {
          type: "prose",
          text: "しかし私が知りたかったのは、その言葉ではない。",
        },
        {
          type: "emphasis",
          items: [
            "なぜそれを強みだと思うのか。",
            "顧客にどのような価値をもたらしているのか。",
            "競合は真似できないのか。",
            "その強みは本当に顧客に選ばれる理由になっているのか。",
          ],
        },
        {
          type: "prose",
          text: "私が興味を持っていたのは、事実そのものではない。",
        },
        {
          type: "prose",
          text: "事実の背後にある前提である。",
        },
        {
          type: "prose",
          text: "人や組織が無意識に信じている当たり前である。",
        },
      ],
    },
    {
      id: "premise-changes-future",
      title: "前提が変わると未来が変わる",
      blocks: [
        { type: "prose", text: "ある企業では、" },
        {
          type: "emphasis",
          items: [
            "「顧客は既存事業者を選ぶ」",
            "「実績のない私たちには大型案件は取れない」",
            "「どうせ無理だ」",
          ],
        },
        {
          type: "prose",
          text: "という空気が組織の中に存在していた。",
        },
        { type: "prose", text: "しかし、それは事実ではなかった。" },
        { type: "prose", text: "誰も疑わなくなった前提だった。" },
        { type: "prose", text: "私はその前提を問い直した。" },
        {
          type: "emphasis",
          items: [
            "顧客は本当に既存事業者を選び続けるのか。",
            "顧客は何を評価しているのか。",
            "私たちが勝てる理由は本当に存在しないのか。",
          ],
        },
        {
          type: "prose",
          text: "議論を重ねた結果、組織の見方が変わった。",
        },
        {
          type: "prose",
          text: "組織の見方が変わると行動が変わる。その結果、それまで不可能だと思われていた大型案件の受注につながった。",
        },
        { type: "prose", text: "私はこの経験を通じて確信した。" },
        {
          type: "prose",
          text: "組織を制約しているのは能力不足ではない。",
        },
        {
          type: "prose",
          text: "多くの場合、見えなくなった前提である。",
        },
      ],
    },
    {
      id: "zero-to-one",
      title: "私が惹かれるのは0から1である",
      blocks: [
        {
          type: "prose",
          text: "私は0から1を生み出す仕事に強く惹かれる。",
        },
        { type: "prose", text: "1の世界には前提がある。" },
        {
          type: "emphasis",
          items: ["成功事例がある。", "競合がいる。", "改善の方向も見える。"],
        },
        { type: "prose", text: "しかし0には何もない。" },
        {
          type: "emphasis",
          items: ["前例もない。", "正解もない。"],
        },
        {
          type: "prose",
          text: "だから人は過去の成功体験や既存の常識に頼ろうとする。",
        },
        {
          type: "prose",
          text: "だが、新しい価値はそこからは生まれない。",
        },
        {
          type: "prose",
          text: "トヨタ自動車の近健太社長は、",
        },
        {
          type: "prose",
          text: "「過去の方程式に依存していては、新しいことはできない」",
        },
        {
          type: "prose",
          text: "という趣旨の発言をしている。",
        },
        { type: "prose", text: "私も同じことを感じている。" },
        {
          type: "prose",
          text: "本当に難しいのは問題を解決することではない。",
        },
        {
          type: "prose",
          text: "誰も見たことのない可能性を構想することだ。",
        },
        {
          type: "prose",
          text: "そのためには、当たり前になった前提を疑わなければならない。",
        },
      ],
    },
    {
      id: "ai-era",
      title: "AI時代に問われるもの",
      blocks: [
        { type: "prose", text: "生成AIは驚くほど優秀である。" },
        {
          type: "prose",
          text: "情報を整理し、分析し、選択肢を示し、文章を作ることもできる。",
        },
        { type: "prose", text: "しかしAIは前提を選ばない。" },
        { type: "prose", text: "問いを設計しない。" },
        { type: "prose", text: "判断を引き受けない。" },
        { type: "prose", text: "AIは合理性を強化する。" },
        {
          type: "prose",
          text: "しかし、その合理性を支えている前提を照らすことはできない。",
        },
        {
          type: "prose",
          text: "だからこそ、これからの時代に重要になるのは、",
        },
        {
          type: "emphasis",
          items: [
            "前提を照らすこと。",
            "問いを設計すること。",
            "そして判断を引き受けること。",
          ],
        },
        {
          type: "prose",
          text: "私は現在、このテーマを中心に、経営者や事業責任者との対話を続けている。",
        },
        {
          type: "emphasis",
          items: [
            "組織が本当に向き合うべき課題を発見し、",
            "新しい可能性を構想し、",
            "未来を切り拓くために。",
          ],
        },
      ],
    },
  ] satisfies readonly AboutSection[],
} as const;
