// api/lead.js
// 採用版レポートの「改善提案」を開く前に取得するメールアドレスを受け取る。
//
// 現状はログに出力するだけの最小実装です。実運用では、環境変数 LEAD_WEBHOOK_URL に
// Google Apps Script や Zapier、Formspreeなどのwebhook URLを設定すると、そこへ
// 自動転送されます（スプレッドシートやメール通知への連携はそちら側で設定してください）。

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "POSTメソッドのみ対応しています" });
    return;
  }

  const { email, companyName, url, source } = req.body || {};
  if (!email || !String(email).includes("@")) {
    res.status(400).json({ error: "有効なメールアドレスを入力してください" });
    return;
  }

  const lead = {
    email: String(email).trim(),
    companyName: companyName || "",
    url: url || "",
    source: source || "recruit-report",
    receivedAt: new Date().toISOString(),
  };

  console.log("[lead]", JSON.stringify(lead));

  if (process.env.LEAD_WEBHOOK_URL) {
    try {
      await fetch(process.env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch (err) {
      console.error("LEAD_WEBHOOK_URLへの転送に失敗しました:", err.message);
      // 転送に失敗してもユーザー側の体験は止めない
    }
  }

  res.status(200).json({ ok: true });
};
