// api/diagnose-recruit.js
// 採用版（就活者目線）の診断。api/diagnose.js（顧客軸）と同じ土台を流用しつつ、
// システムプロンプトと出力スキーマだけを採用版向けに差し替えている。
//
// 出力方式について：
// 以前はAIに「JSON形式のテキストをそのまま出力して」と指示していましたが、
// AIが文章中で引用符（" "）を使った際にエスケープを忘れると、JSONとして壊れてしまう問題がありました。
// そのため、Anthropic APIの「ツール（tool）」機能を使い、AIに決まった型（スキーマ）へ
// 値を当てはめてもらう方式に変更しています。これによりJSON構文エラーが構造的に発生しなくなります。

function buildSystemPrompt() {
  return [
"あなたは、中小企業の採用ブランディングと「AI検索最適化（AIO/GEO）」に精通した経営コンサルタントです。",
"ユーザーから提供される「企業名」「URL」「（あれば）サイトのテキスト」をもとに、就職・転職活動でAI（ChatGPT、Perplexity等）に相談する求職者に対して、この会社がどう見えるかを診断してください。",
"",
"■ サイト情報の取得について",
"- ユーザーがサイトのテキストを直接貼り付けている場合は、それを最優先の情報源として使ってください。",
"- サイトのテキストが提供されていない、または不十分な場合は、web_searchツールを使って提供されたURL（トップページ、代表挨拶・理念、会社情報、採用情報、CSR・取り組み等のページ）の内容をできる限り取得してください。",
"- 内容がほとんど得られなかった場合は、retrieval_successをfalseにし、retrieval_noteに理由を簡潔に記載してください。この場合、他の項目は無理に埋めず、簡潔な内容で構いません。",
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
"■ 出力方法（重要）",
"診断結果は、必ず `submit_diagnosis` というツールを1回だけ呼び出して提出してください。本文中にJSONやMarkdownのコードフェンスをテキストとして出力しないでください。",
"情報収集（web_search）が必要な場合は先にそれを行い、必要な情報が揃った時点で `submit_diagnosis` を呼び出して診断を完了させてください。",
"各項目の文章はできるだけ簡潔にし、スキーマの説明に記載した目安文字数を超えないようにしてください。",
"",
"文体は丁寧かつ客観的に。断定は避け、AIから見た推測であることが伝わるトーンにしてください。",
  ].join("\n");
}

const submitDiagnosisTool = {
  name: "submit_diagnosis",
  description: "採用軸のAIマッチング診断結果を、決まった形式で提出します。診断の最後に必ず1回だけ呼び出してください。",
  input_schema: {
    type: "object",
    properties: {
      retrieval_success: { type: "boolean", description: "サイト情報を十分に取得できた場合はtrue、できなかった場合はfalse" },
      retrieval_note: { type: "string", description: "取得できなかった場合の理由。成功時は空文字" },
      company_name: { type: "string", description: "企業名" },
      recruit_scores: {
        type: "object",
        properties: {
          competence: { type: "integer", minimum: 0, maximum: 10 },
          conviction: { type: "integer", minimum: 0, maximum: 10 },
          fit: { type: "integer", minimum: 0, maximum: 10 },
          info: { type: "integer", minimum: 0, maximum: 10 },
          rank: { type: "string", enum: ["A", "B", "C", "D"] },
          caveat: { type: "string", description: "高得点でも改善の余地がある旨を含む一文（60字程度）" },
        },
        required: ["competence", "conviction", "fit", "info", "rank", "caveat"],
      },
      conviction_text: { type: "string", description: "経営者のこだわりについて、公開情報から読み取れることをAIの推測として記述（180字程度、断定を避け「〜がうかがえます」等の推測トーン）" },
      environment_signals: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: { type: "string", description: "公開情報から推測できる働く環境のシグナルを1文で（60字程度、推測トーン）" },
      },
      fit_persona: {
        type: "object",
        properties: {
          good_fit: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: { type: "string", description: "相性が良さそうな人物像を短く（20字程度）" },
          },
          caution: {
            type: "array",
            minItems: 1,
            maxItems: 1,
            items: { type: "string", description: "合わない可能性がある人物像を短く、正直に（20字程度）" },
          },
        },
        required: ["good_fit", "caution"],
      },
      next_steps: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string", description: "1〜2行の具体的な提言" },
          },
          required: ["title", "description"],
        },
      },
      dna_bridge: { type: "string", description: "ここまでの結果は断片に過ぎず、企業理念や価値観を体系的に構造化する診断があると、より一貫した発信につながる、という一文（100字程度、売り込み口調は避ける）" },
    },
    required: [
      "retrieval_success", "retrieval_note", "company_name", "recruit_scores",
      "conviction_text", "environment_signals", "fit_persona", "next_steps", "dna_bridge",
    ],
  },
};

// 念のためのフォールバック：万一AIがツールを呼ばずテキストでJSONを返してきた場合に備える
function extractJsonFromText(text) {
  let t = text.trim();
  t = t.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('AIの応答からJSONを見つけられませんでした');
  return JSON.parse(t.slice(first, last + 1));
}

function extractResult(data) {
  const blocks = data.content || [];
  const toolBlock = blocks.find((b) => b.type === "tool_use" && b.name === "submit_diagnosis");
  if (toolBlock && toolBlock.input) {
    return toolBlock.input;
  }
  const textBlocks = blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  if (textBlocks.trim()) {
    return extractJsonFromText(textBlocks);
  }
  throw new Error("AIが診断結果を提出しませんでした（submit_diagnosisツールが呼び出されませんでした）");
}

// AIが指示通りの型（配列/オブジェクト）で項目を埋めてくれなかった場合に備え、
// 画面側が確実に扱える安全な形に補正する（特にretrieval_success:falseのケースで発生しやすい）。
function toArray(v) {
  return Array.isArray(v) ? v : [];
}
function toStr(v) {
  return typeof v === "string" ? v : (v == null ? "" : String(v));
}
function toObj(v) {
  return (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
}
function sanitizeResult(raw) {
  const r = toObj(raw);
  const recruitScores = toObj(r.recruit_scores);
  const fitPersona = toObj(r.fit_persona);
  return {
    retrieval_success: r.retrieval_success !== false,
    retrieval_note: toStr(r.retrieval_note),
    company_name: toStr(r.company_name),
    recruit_scores: {
      competence: typeof recruitScores.competence === "number" ? recruitScores.competence : 0,
      conviction: typeof recruitScores.conviction === "number" ? recruitScores.conviction : 0,
      fit: typeof recruitScores.fit === "number" ? recruitScores.fit : 0,
      info: typeof recruitScores.info === "number" ? recruitScores.info : 0,
      rank: toStr(recruitScores.rank) || "–",
      caveat: toStr(recruitScores.caveat),
    },
    conviction_text: toStr(r.conviction_text),
    environment_signals: toArray(r.environment_signals).map(toStr),
    fit_persona: {
      good_fit: toArray(fitPersona.good_fit).map(toStr),
      caution: toArray(fitPersona.caution).map(toStr),
    },
    next_steps: toArray(r.next_steps).map((s) => {
      const o = toObj(s);
      return { title: toStr(o.title), description: toStr(o.description) };
    }),
    dna_bridge: toStr(r.dna_bridge),
  };
}

async function callAnthropic(userContent, useWebSearch) {
  const tools = useWebSearch
    ? [{ type: "web_search_20250305", name: "web_search" }, submitDiagnosisTool]
    : [submitDiagnosisTool];

  const body = {
    model: "claude-sonnet-5",
    max_tokens: 6000,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: userContent }],
    tools,
  };

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
  return sanitizeResult(extractResult(data));
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

    const userLines = [`企業名: ${companyName}`, `URL: ${url}`];
    if (manualText && String(manualText).trim()) {
      userLines.push("", "【サイトのテキスト（ユーザーが貼り付けたもの）】", String(manualText).trim());
    }
    const userContent = userLines.join("\n");

    let result;
    try {
      result = await callAnthropic(userContent, true);
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
