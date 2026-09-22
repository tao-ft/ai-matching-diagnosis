// api/_ratelimit.js
// 共有のレート制限ヘルパー。
// ファイル名の先頭が「_」のため、Vercelはこれを独立したAPIエンドポイントとしては扱わない
//（diagnose.js / diagnose-recruit.js から読み込まれる共通部品）。
//
// 環境変数 UPSTASH_REDIS_REST_URL と UPSTASH_REDIS_REST_TOKEN が設定されていれば、
// Upstash Redisを使った本格的なレート制限（サーバーの再起動やインスタンスをまたいでも
// カウントが維持される）を行う。
// 未設定の場合は、従来通りサーバーメモリ内での簡易制限にフォールバックする
//（インスタンスが再起動すると内容がリセットされる簡易版）。

let upstashRatelimit = null;
let upstashInitTried = false;

function getUpstashRatelimit() {
  if (upstashInitTried) return upstashRatelimit;
  upstashInitTried = true;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  try {
    const { Ratelimit } = require("@upstash/ratelimit");
    const { Redis } = require("@upstash/redis");
    upstashRatelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(20, "1 h"), // 1時間あたり20回（IP×エンドポイントごと）
      analytics: true,
      prefix: "ai-matching-diagnosis",
    });
  } catch (err) {
    console.warn("Upstashの初期化に失敗しました。簡易レート制限にフォールバックします。", err.message);
    upstashRatelimit = null;
  }
  return upstashRatelimit;
}

// ---- フォールバック用（サーバーメモリ内、インスタンス単位・簡易版） ----
const memoryStore = new Map();
const MEMORY_MAX = 20;
const MEMORY_WINDOW_MS = 60 * 60 * 1000;

function checkMemoryRateLimit(key) {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now - entry.windowStart > MEMORY_WINDOW_MS) {
    memoryStore.set(key, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= MEMORY_MAX) return false;
  entry.count += 1;
  return true;
}

/**
 * @param {string} ip リクエスト元のIPアドレス
 * @param {string} routeKey エンドポイントを区別するための文字列（例: "diagnose", "diagnose-recruit"）
 * @returns {Promise<boolean>} true=許可 / false=制限超過
 */
async function checkRateLimit(ip, routeKey) {
  const key = `${routeKey}:${ip}`;
  const rl = getUpstashRatelimit();
  if (rl) {
    try {
      const { success } = await rl.limit(key);
      return success;
    } catch (err) {
      console.warn("Upstashへの問い合わせに失敗しました。簡易レート制限にフォールバックします。", err.message);
      return checkMemoryRateLimit(key);
    }
  }
  return checkMemoryRateLimit(key);
}

module.exports = { checkRateLimit };
