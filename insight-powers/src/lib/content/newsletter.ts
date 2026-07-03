export const newsletterContent = {
  title: "判断を引き受ける人へ",
  body: {
    opening: ["AIは分析する。", "AIは選択肢を示す。"],
    transition: "しかし、",
    questions: [
      "何を問題と捉えるのか。",
      "どの前提で考えるのか。",
      "どの未来を選ぶのか。",
    ],
    closing: "その判断は、人間に残されている。",
    experience: ["私は35年以上、", "問題解決と意思決定に携わってきた。"],
    letterIntro: "このレターでは、",
    themes: ["前提を照らす", "問いを設計する", "判断を引き受ける"],
    letterClosing: "というテーマについて考察をお届けする。",
    pdfOffer: {
      lead: "登録者には限定PDF",
      titleLines: [
        "『AI時代の意思決定",
        "前提を照らし、問いを設計し、判断を引き受ける』",
      ],
      suffix: "をお送りします。",
    },
  },
  pdf: {
    filename: "judgment-leaders-guide.pdf",
    downloadLabel: "PDFをダウンロード",
  },
  form: {
    emailLabel: "メールアドレス",
    submitLabel: "【登録する】",
    submittingLabel: "送信中...",
    frequencyNote: "月2〜4回程度お届けします。",
    unsubscribeNote: "いつでも解除できます。",
    successMessage:
      "ご登録ありがとうございます。下記より限定資料をダウンロードできます。",
    errorMessage: "送信に失敗しました。時間をおいて再度お試しください。",
  },
} as const;
