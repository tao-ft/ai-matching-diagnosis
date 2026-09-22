// api/diagnose.js
// このファイルはサーバー側（Vercelの関数）で実行されます。
// ブラウザからは絶対に見えないので、ここに書いたAPIキーは安全です。

function buildSystemPrompt() {
  return [
"あなたは、中小企業のデジタルマーケティングおよび「AI検索最適化（AIO/GEO）」に精通した経営コンサルタントです。",
"ユーザーから提供される「企業名」「URL」「（あれば）サイトのテキスト」をもとに、今後のAI時代（ChatGPT、Perplexity、Google検索の生成AI回答等）において、この企業が「ユーザーの課題解決に最適な企業」としてAIに選ばれるかどうかを診断してください。",
"",
"■ サイト情報の取得について",
"- ユーザーがサイトのテキストを直接貼り付けている場合は、それを最優先の情報源として使ってください。",
"- サイトのテキストが提供されていない、または不十分な場合は、web_searchツールを使って提供されたURL（トップページ、代表挨拶・理念、事業内容、強み・特長などのページ）の内容をできる限り取得してください。",
"- URLからの取得を試みても、内容がほとんど得られなかった場合（サイトが存在しない、アクセスできない、情報が極端に乏しいなど）は、retrieval_successをfalseにし、retrieval_noteに理由を簡潔に記載してください。この場合、他の項目は無理に埋めず、簡潔な内容で構いません。",
"",
"■ 診断の目的",
"経営者に「点数で安心してもらうこと」ではなく、「具体的な行動を1つ起こしてもらうこと」です。たとえ高得点であっても、必ず「それでも改善の余地がある」旨を含めてください。",
"",
"■ 評価軸（各10点満点・計40点満点）",
"1. 強みの明確さ：AIが「この会社の独自の強みは何か」を明確に抽出・要約できる内容になっているか。加えて、語られている強みが、価格・納期・品質など他社と比較されやすい「機能的価値」にとどまっているのか、それとも模倣されにくい「組織的能力（コア・コンピタンスに近いもの）」にまで踏み込んで語られているのかを判定し、strength_natureに記述すること。",
"2. パーパス・価値観のわかりやすさ：業務内容だけでなく、企業の理念やどのような想いで事業を行っているか（共感軸）が言語化されているか。",
"3. ターゲット（共感する相手）の特定度：どのような課題・悩み・欲求を持った人に向けたサービスなのかが明確で、AIがペルソナマッチングしやすいか。加えて、特定の業界・顧客層に強く特化している傾向（顧客集中度が高い可能性）が見られる場合、その特化が単なる実績の偏りではなく、「どんな価値を提供できるか」という機能的価値の言葉として語られているかを判定し、target_concentration_noteに記述すること。特化の兆候が見られない場合、target_concentration_noteは空文字とする。",
"",
"■ ヒアリング推奨事項について（重要）",
"target_concentration_noteで顧客集中度が高いと判定し、かつstrength_natureが「機能的価値にとどまっている」という判定である場合に限り、hearing_noteに「※要確認：主要顧客の景気敏感度」という書き出しで始まる一文を記述すること。これは経営者に直接確認すべきヒアリング項目として扱う。上記の条件に当てはまらない場合、hearing_noteは空文字とする。",
"4. 構造化・情報発信の適切さ：具体的・論理的な記述になっており、AIが信頼できる情報源として学習・参照しやすい文章構造になっているか。",
"",
"■ 出力形式（重要）",
"必ず、以下のJSON形式のみを出力してください。前後に説明文・挨拶・Markdownのコードフェンス（```）などは一切つけないでください。JSON以外の文字を出力すると処理が失敗します。",
"各文章はできるだけ簡潔にし、指定の目安文字数を超えないようにしてください。",
"",
"{",
'  "retrieval_success": true,',
'  "retrieval_note": "取得できなかった場合の理由。成功時は空文字",',
'  "company_name": "企業名",',
'  "simulated_conversations": [',
'    {"question": "想定される顧客の検索・質問文1（30字程度）", "current_answer": "現在のサイト情報をもとにAIがどう答えるか。この会社が候補に挙がらない、または弱く扱われる様子を具体的な会話文で（120字程度）", "ideal_answer": "強み・パーパス・ターゲットが言語化されていた場合にAIが答えていたはずの理想形（120字程度）"},',
'    {"question": "想定される顧客の検索・質問文2（30字程度）", "current_answer": "同上（120字程度）", "ideal_answer": "同上（120字程度）"}',
'  ],',
'  "scores": {"strength": 0から10の整数, "purpose": 0から10の整数, "target": 0から10の整数, "structure": 0から10の整数, "rank": "A、B、C、Dのいずれか1文字", "caveat": "高得点でも改善の余地がある旨を含む一文（60字程度）"},',
'  "strength_nature": "強みが「機能的価値」にとどまっているか、「組織的能力（コア・コンピタンス）」にまで踏み込んでいるかの一言判定（60字程度）",',
'  "target_concentration_note": "顧客集中度についての所見（60字程度）。特化の兆候が見られない場合は空文字",',
'  "ai_perception": "AIがこのサイトを読み込んだ際、どのような企業として認識・要約するか（180字程度）",',
'  "risks": {',
'    "strength": "強みの明確さについての現状課題とリスク（70字程度）",',
'    "purpose": "パーパスのわかりやすさについてのリスク（70字程度）",',
'    "target": "ターゲットの特定度についてのリスク（70字程度）",',
'    "structure": "情報の構造化度についてのリスク（70字程度）"',
'  },',
'  "hearing_note": "経営者へのヒアリング推奨事項。該当する場合は「※要確認：主要顧客の景気敏感度」から始まる一文（80字程度）。該当しない場合は空文字",',
'  "action_sentence": "経営者が自分で書く必要がなく、今日コピー＆ペーストでサイトに貼るだけで完結する一文または短い段落。強み・パーパス・想定ターゲットの要素を自然な形で含む、完成した日本語の文章（150〜250字程度）",',
'  "next_steps": [',
'    {"title": "STEP1：技術・実績を物語に変える", "description": "1〜2行の具体的な提言"},',
'    {"title": "STEP2：商品紹介を課題解決の言葉に変える", "description": "1〜2行の具体的な提言"},',
'    {"title": "STEP3：企業紹介サイトを専門メディアへ進化させる", "description": "1〜2行の具体的な提言"}',
'  ],',
'  "conclusion": {',
'    "loss_note": "現状を放置した場合に起こり得る、ささやかで具体的な機会損失の可能性を示す一文（60字程度）",',
'    "recheck_note": "2〜4週間後、サイトの表現を変更した際は再度この診断を行うと変化を確認できる、という一文（50字程度）"',
'  }',
"}",
"",
"文体は丁寧かつ客観的に。総括を含め全体の読後感は「安心」ではなく「わずかな引っかかり・気になる余地」を残すトーンにしてください。",
  ].join("\n");
}

function extractJson(text) {
  let t = text.trim();
  t = t.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('AIの応答からJSONを見つけられませんでした');
  return JSON.parse(t.slice(first, last + 1));
}

async function callAnthropic(userContent, useTools) {
  const body = {
    model: "claude-sonnet-5",
    max_tokens: 4000,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: userContent }],
  };
  if (useTools) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const rawText = await resp.text();
  if (!resp.ok) {
    throw new Error(`Anthropic APIエラー（status ${resp.status}）: ${rawText.slice(0, 500)}`);
  }

  const data = JSON.parse(rawText);
  const textBlocks = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  if (!textBlocks.trim()) {
    throw new Error("AIからのテキスト応答が空でした");
  }
  return extractJson(textBlocks);
}

const { checkRateLimit } = require("./_ratelimit");

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
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "サーバーにANTHROPIC_API_KEYが設定されていません" });
    return;
  }

  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  if (!(await checkRateLimit(ip, "diagnose"))) {
    res.status(429).json({ error: "リクエストが多すぎます。しばらく時間をおいてから再度お試しください。" });
    return;
  }

  try {
    const { companyName, url, manualText } = req.body || {};
    if (!companyName || !url) {
      res.status(400).json({ error: "companyNameとurlは必須です" });
      return;
    }

    const userLines = [`企業名: ${companyName}`, `URL: ${url}`];
    if (manualText && String(manualText).trim()) {
      userLines.push("", "【サイトのテキスト（ユーザーが貼り付けたもの）】", String(manualText).trim());
    }
    const userContent = userLines.join("\n");

    let result;
    try {
      result = await callAnthropic(userContent, true);

      // AIが「取得不十分」と自己申告した場合、ユーザーが手動テキストを貼っていなければ
      // もう一度だけ自動取得（web_searchツールあり）をやり直す
      const hasManualText = !!(manualText && String(manualText).trim());
      if (!hasManualText && result.retrieval_success === false) {
        try {
          const retryResult = await callAnthropic(userContent, true);
          if (retryResult.retrieval_success !== false) {
            result = retryResult;
          }
          // 2回目も取得不十分だった場合は、1回目の結果（retrieval_success:false）をそのまま使う
        } catch (retryErr) {
          console.warn("自動取得の再試行に失敗しました。最初の結果を使用します。", retryErr.message);
        }
      }
    } catch (firstErr) {
      console.warn("web_searchツール付きの呼び出しに失敗。ツールなしで再試行します。", firstErr.message);
      try {
        result = await callAnthropic(userContent, false);
        if (!(manualText && String(manualText).trim()) && result.retrieval_success !== false) {
          result.retrieval_success = false;
          result.retrieval_note = "自動でのサイト取得機能が一時的に利用できませんでした。";
        }
      } catch (secondErr) {
        res.status(502).json({
          error: `1回目（自動取得あり）: ${firstErr.message} ／ 2回目（自動取得なし）: ${secondErr.message}`,
        });
        return;
      }
    }

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "サーバー内部エラー: " + (err && err.message ? err.message : String(err)) });
  }
};
