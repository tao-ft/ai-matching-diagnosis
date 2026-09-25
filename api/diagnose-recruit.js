// api/diagnose-recruit.js
// 採用版（就活者目線）の診断。api/diagnose.js（顧客軸）と同じ土台を流用しつつ、
// システムプロンプトと出力スキーマだけを採用版向けに差し替えている。

function buildSystemPrompt() {
  return [
"あなたは、中小企業の採用ブランディングと「AI検索最適化（AIO/GEO）」に精通した経営コンサルタントです。",
"ユーザーから提供される「企業名」「URL」「（あれば）サイトのテキスト」をもとに、就職・転職活動でAI（ChatGPT、Perplexity等）に相談する求職者に対して、この会社がどう見えるかを診断してください。",
"",
"■ サイト情報の取得について",
"- サイトのテキストが提供されている場合は、それを最優先の情報源として使ってください。このテキストはページのHTMLから機械的に抽出したものであるため、ナビゲーションメニューやフッターなど本文以外の文字列が混ざっている場合がありますが、可能な範囲で本文とみられる内容（会社情報、代表挨拶、CSR・取り組み等）を中心に読み取ってください。",
"- サイトのテキストが提供されておらず、かつweb_searchツールが利用可能な場合は、それを使って提供されたURLの内容をできる限り取得してください。",
"- いずれの方法でも十分な情報が得られなかった場合は、retrieval_successをfalseにし、retrieval_noteに理由を簡潔に記載してください。この場合、他の項目は無理に埋めず、簡潔な内容で構いません。",
"",
"■ 診断の視点（重要）",
"この診断が拾うべきは、求人サイトに書かれる「先輩社員の声」「福利厚生一覧」のような、求職者向けに作られた情報ではありません。経営理念・代表挨拶・CSR活動・投資の重心など、採用目的では書かれていない情報の中から、経営者が無意識に持っている『こだわり』や『判断の癖』を拾い出してください。これらは断定ではなく、あくまで公開情報からの推測として記述してください。労働条件を保証するような断定表現は避けてください。",
"",
"■ 評価軸（各10点満点・計40点満点）",
"1. competence（コア・コンピタンスの明確さ）：強みを生み出す自社独自の力が、模倣困難性（他社に真似されにくいか）や市場展開力（他分野にも応用できるか）を含めて言語化・ストーリー化され、WEB上で表現されているか。単なる「強み」の記述にとどまっていないかを厳しく見る。",
"2. conviction（経営者のこだわりの言語化度）：経営理念や代表の発言から、経営者が何を大事にしているかが明確に読み取れるか。",
"3. fit（価値観の合う人の分かりやすさ）：どんな価値観・性格の人と相性が良さそうかを、AIが推測しやすいか。",
"4. info（働く環境情報の見つけやすさ）：働き方や職場環境に関する手がかりが、構造的に見つけやすいか。",
"",
"■ 出力形式（重要）",
"必ず、以下のJSON形式のみを出力してください。前後に説明文・挨拶・Markdownのコードフェンス（```）などは一切つけないでください。JSON以外の文字を出力すると処理が失敗します。",
"各文章はできるだけ簡潔にし、指定の目安文字数を超えないようにしてください。",
"",
"{",
'  "retrieval_success": true,',
'  "retrieval_note": "取得できなかった場合の理由。成功時は空文字",',
'  "company_name": "企業名",',
'  "recruit_scores": {"competence": 0から10の整数, "conviction": 0から10の整数, "fit": 0から10の整数, "info": 0から10の整数, "rank": "A、B、C、Dのいずれか1文字", "caveat": "高得点でも改善の余地がある旨を含む一文（60字程度）"},',
'  "conviction_text": "経営者のこだわりについて、公開情報から読み取れることをAIの推測として記述（180字程度、断定を避け「〜がうかがえます」等の推測トーン）",',
'  "environment_signals": ["公開情報から推測できる働く環境のシグナルを1文で（60字程度、推測トーン）を3つ"],',
'  "fit_persona": {"good_fit": ["相性が良さそうな人物像を短く（20字程度）を2つ"], "caution": ["合わない可能性がある人物像を短く、正直に（20字程度）を1つ"]},',
'  "next_steps": [',
'    {"title": "STEP1：こだわりのストーリー化", "description": "1〜2行の具体的な提言"},',
'    {"title": "STEP2：働く環境情報の可視化", "description": "1〜2行の具体的な提言"},',
'    {"title": "STEP3：向いている人／向いていない人の発信", "description": "1〜2行の具体的な提言"}',
'  ],',
'  "dna_bridge": "ここまでの結果は断片に過ぎず、企業理念や価値観を体系的に構造化する診断があると、より一貫した発信につながる、という一文（100字程度、売り込み口調は避ける）"',
"}",
"",
"文体は丁寧かつ客観的に。断定は避け、AIから見た推測であることが伝わるトーンにしてください。",
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
const { fetchSiteText } = require("./_fetchsite");

function buildUserContent(companyName, url, siteText, autoFetched) {
  const lines = [`企業名: ${companyName}`, `URL: ${url}`];
  if (siteText) {
    lines.push(
      "",
      autoFetched ? "【サイトのテキスト（サーバーが自動取得したもの）】" : "【サイトのテキスト（ユーザーが貼り付けたもの）】",
      siteText
    );
  }
  return lines.join("\n");
}

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
  if (!(await checkRateLimit(ip, "diagnose-recruit"))) {
    res.status(429).json({ error: "リクエストが多すぎます。しばらく時間をおいてから再度お試しください。" });
    return;
  }

  try {
    const { companyName, url, manualText } = req.body || {};
    if (!companyName || !url) {
      res.status(400).json({ error: "companyNameとurlは必須です" });
      return;
    }

    const hasManualText = !!(manualText && String(manualText).trim());

    // ステップ1：手動テキストが無ければ、まずサーバー側で直接URLを取得する
    let siteText = hasManualText ? String(manualText).trim() : null;
    let autoFetched = false;
    if (!siteText) {
      const fetched = await fetchSiteText(url);
      if (fetched) {
        siteText = fetched;
        autoFetched = true;
      }
    }

    let result;
    try {
      // サイトのテキストが手元にある場合はweb_searchツールなしで十分（高速・安定）。
      // 何も取得できていない場合のみ、予備手段としてweb_searchツールを使う。
      result = await callAnthropic(buildUserContent(companyName, url, siteText, autoFetched), !siteText);

      // それでも取得不十分だった場合、まだ試していない手段が残っていれば1回だけ再試行する
      if (!hasManualText && result.retrieval_success === false) {
        if (!autoFetched) {
          const fetched2 = await fetchSiteText(url);
          if (fetched2) {
            try {
              const retryResult = await callAnthropic(buildUserContent(companyName, url, fetched2, true), false);
              if (retryResult.retrieval_success !== false) result = retryResult;
            } catch (retryErr) {
              console.warn("再試行(直接取得後)に失敗しました。最初の結果を使用します。", retryErr.message);
            }
          }
        } else {
          try {
            const retryResult = await callAnthropic(buildUserContent(companyName, url, siteText, true), true);
            if (retryResult.retrieval_success !== false) result = retryResult;
          } catch (retryErr) {
            console.warn("再試行(web_search併用)に失敗しました。最初の結果を使用します。", retryErr.message);
          }
        }
      }
    } catch (firstErr) {
      console.warn("AI呼び出しに失敗。条件を変えて再試行します。", firstErr.message);
      try {
        result = await callAnthropic(buildUserContent(companyName, url, siteText, autoFetched), false);
        if (!hasManualText && !siteText && result.retrieval_success !== false) {
          result.retrieval_success = false;
          result.retrieval_note = "自動でのサイト取得機能が一時的に利用できませんでした。";
        }
      } catch (secondErr) {
        res.status(502).json({
          error: `1回目: ${firstErr.message} ／ 2回目: ${secondErr.message}`,
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
