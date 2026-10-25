// api/diagnose.js
// このファイルはサーバー側（Vercelの関数）で実行されます。
// ブラウザからは絶対に見えないので、ここに書いたAPIキーは安全です。
//
// 出力方式について：
// 以前はAIに「JSON形式のテキストをそのまま出力して」と指示していましたが、
// AIが文章中で引用符（" "）を使った際にエスケープを忘れると、JSONとして壊れてしまう問題がありました。
// そのため、Anthropic APIの「ツール（tool）」機能を使い、AIに決まった型（スキーマ）へ
// 値を当てはめてもらう方式に変更しています。これによりJSON構文エラーが構造的に発生しなくなります。

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
"1. 強みの明確さ：AIが「この会社の独自の強みは何か」を明確に抽出・要約できる内容になっているか。",
"2. パーパス・価値観のわかりやすさ：業務内容だけでなく、企業の理念やどのような想いで事業を行っているか（共感軸）が言語化されているか。",
"3. ターゲット（共感する相手）の特定度：どのような課題・悩み・欲求を持った人に向けたサービスなのかが明確で、AIがペルソナマッチングしやすいか。",
"4. 構造化・情報発信の適切さ：具体的・論理的な記述になっており、AIが信頼できる情報源として学習・参照しやすい文章構造になっているか。",
"",
"■ 出力方法（重要）",
"診断結果は、必ず `submit_diagnosis` というツールを1回だけ呼び出して提出してください。本文中にJSONやMarkdownのコードフェンスをテキストとして出力しないでください。",
"情報収集（web_search）が必要な場合は先にそれを行い、必要な情報が揃った時点で `submit_diagnosis` を呼び出して診断を完了させてください。",
"各項目の文章はできるだけ簡潔にし、スキーマの説明に記載した目安文字数を超えないようにしてください。",
"",
"文体は丁寧かつ客観的に。総括を含め全体の読後感は「安心」ではなく「わずかな引っかかり・気になる余地」を残すトーンにしてください。",
  ].join("\n");
}

const submitDiagnosisTool = {
  name: "submit_diagnosis",
  description: "顧客軸のAIマッチング診断結果を、決まった形式で提出します。診断の最後に必ず1回だけ呼び出してください。",
  input_schema: {
    type: "object",
    properties: {
      retrieval_success: { type: "boolean", description: "サイト情報を十分に取得できた場合はtrue、できなかった場合はfalse" },
      retrieval_note: { type: "string", description: "取得できなかった場合の理由。成功時は空文字" },
      company_name: { type: "string", description: "企業名" },
      simulated_conversations: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: {
          type: "object",
          properties: {
            question: { type: "string", description: "想定される顧客の検索・質問文（30字程度）" },
            current_answer: { type: "string", description: "現在のサイト情報をもとにAIがどう答えるか。この会社が候補に挙がらない、または弱く扱われる様子を具体的な会話文で（120字程度）" },
            ideal_answer: { type: "string", description: "強み・パーパス・ターゲットが言語化されていた場合にAIが答えていたはずの理想形（120字程度）" },
          },
          required: ["question", "current_answer", "ideal_answer"],
        },
      },
      scores: {
        type: "object",
        properties: {
          strength: { type: "integer", minimum: 0, maximum: 10 },
          purpose: { type: "integer", minimum: 0, maximum: 10 },
          target: { type: "integer", minimum: 0, maximum: 10 },
          structure: { type: "integer", minimum: 0, maximum: 10 },
          rank: { type: "string", enum: ["A", "B", "C", "D"] },
          caveat: { type: "string", description: "高得点でも改善の余地がある旨を含む一文（60字程度）" },
        },
        required: ["strength", "purpose", "target", "structure", "rank", "caveat"],
      },
      ai_perception: { type: "string", description: "AIがこのサイトを読み込んだ際、どのような企業として認識・要約するか（180字程度）" },
      risks: {
        type: "object",
        properties: {
          strength: { type: "string", description: "強みの明確さについての現状課題とリスク（70字程度）" },
          purpose: { type: "string", description: "パーパスのわかりやすさについてのリスク（70字程度）" },
          target: { type: "string", description: "ターゲットの特定度についてのリスク（70字程度）" },
          structure: { type: "string", description: "情報の構造化度についてのリスク（70字程度）" },
        },
        required: ["strength", "purpose", "target", "structure"],
      },
      action_sentence: { type: "string", description: "経営者が自分で書く必要がなく、今日コピー＆ペーストでサイトに貼るだけで完結する一文または短い段落。強み・パーパス・想定ターゲットの要素を自然な形で含む、完成した日本語の文章（150〜250字程度）" },
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
      conclusion: {
        type: "object",
        properties: {
          loss_note: { type: "string", description: "現状を放置した場合に起こり得る、ささやかで具体的な機会損失の可能性を示す一文（60字程度）" },
          recheck_note: { type: "string", description: "2〜4週間後、サイトの表現を変更した際は再度この診断を行うと変化を確認できる、という一文（50字程度）" },
        },
        required: ["loss_note", "recheck_note"],
      },
    },
    required: [
      "retrieval_success", "retrieval_note", "company_name", "simulated_conversations",
      "scores", "ai_perception", "risks", "action_sentence", "next_steps", "conclusion",
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
  const scores = toObj(r.scores);
  const risks = toObj(r.risks);
  const conclusion = toObj(r.conclusion);
  return {
    retrieval_success: r.retrieval_success !== false,
    retrieval_note: toStr(r.retrieval_note),
    company_name: toStr(r.company_name),
    simulated_conversations: toArray(r.simulated_conversations).map((s) => {
      const o = toObj(s);
      return { question: toStr(o.question), current_answer: toStr(o.current_answer), ideal_answer: toStr(o.ideal_answer) };
    }),
    scores: {
      strength: typeof scores.strength === "number" ? scores.strength : 0,
      purpose: typeof scores.purpose === "number" ? scores.purpose : 0,
      target: typeof scores.target === "number" ? scores.target : 0,
      structure: typeof scores.structure === "number" ? scores.structure : 0,
      rank: toStr(scores.rank) || "–",
      caveat: toStr(scores.caveat),
    },
    ai_perception: toStr(r.ai_perception),
    risks: {
      strength: toStr(risks.strength),
      purpose: toStr(risks.purpose),
      target: toStr(risks.target),
      structure: toStr(risks.structure),
    },
    action_sentence: toStr(r.action_sentence),
    next_steps: toArray(r.next_steps).map((s) => {
      const o = toObj(s);
      return { title: toStr(o.title), description: toStr(o.description) };
    }),
    conclusion: {
      loss_note: toStr(conclusion.loss_note),
      recheck_note: toStr(conclusion.recheck_note),
    },
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
