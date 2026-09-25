// api/_fetchsite.js
// 指定されたURLのページをサーバー側で直接取得し、簡易的にプレーンテキストへ変換する。
// ファイル名の先頭が「_」のため、Vercelはこれを独立したAPIエンドポイントとしては扱わない。
//
// これまではAI自身（web_searchツール）にサイトの巡回を任せていたが、
// 巡回に失敗する頻度が高くなったため、まずサーバー側で確実に1ページ取得する方式に変更した。
// web_searchツールは、この直接取得が失敗した場合の予備手段として残している。

const MAX_TEXT_LENGTH = 8000;
const FETCH_TIMEOUT_MS = 8000;

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * 指定URLのページを取得し、プレーンテキストを返す。
 * 何らかの理由で取得できない場合は、例外を投げずnullを返す。
 */
async function fetchSiteText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AIMatchingDiagnosisBot/1.0; +https://ai-matching-diagnosis.vercel.app/)",
        "Accept-Language": "ja,en;q=0.8",
      },
    });
    if (!resp.ok) return null;

    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return null;
    }

    const html = await resp.text();
    const text = htmlToText(html);
    if (!text || text.length < 100) return null;

    return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchSiteText };
