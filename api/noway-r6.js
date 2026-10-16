// NOWAY Tracker backend. The Arenyze credential lives in Vercel's encrypted
// ARENYZE_API_KEY environment variable, never in public HTML or JavaScript.
const API = "https://public-api.arenyze.com/r6/api/v2/profile";
const OPERATORS_API = "https://public-api.arenyze.com/r6/api/v2/operators";
const SUPABASE_AUTH = "https://vdipsufzlqmnprbjiojb.supabase.co/auth/v1/user";
const PUBLIC_KEY = "sb_publishable_sYb-pfY4GhRjeQzEBKa_kg__xIZUg7e";
const dataCache = new Map();
const quota = new Map();
const send = (res, code, body) => res.status(code).setHeader("Cache-Control", "no-store").setHeader("X-Content-Type-Options","nosniff").json(body);

module.exports = async function handler(req, res) {
  res.setHeader("Allow", "POST");
  if (req.method !== "POST") return send(res, 405, { error: "Método não permitido." });
  const auth = String(req.headers.authorization || "");
  if (!/^Bearer [A-Za-z0-9._~-]+$/.test(auth)) return send(res, 401, { error: "Entre no NOWAY ID para consultar o Tracker." });
  const body = typeof req.body === "string" ? (()=>{try{return JSON.parse(req.body)}catch{return null}})() : req.body;
  const name = typeof body?.player === "string" ? body.player.trim() : "";
  const platform = body?.platform;
  if (!/^[\p{L}\p{N}_.-]{2,48}$/u.test(name) || !["uplay","psn","xbl"].includes(platform))
    return send(res, 400, { error: "Informe um nome e uma plataforma válidos." });

  const credential = process.env.ARENYZE_API_KEY;
  if (!credential) return send(res, 503, {
    error: "API indisponível: configuração protegida ausente no servidor."
  });

  let uid;
  try {
    const verify = await fetch(SUPABASE_AUTH, {
      method: "GET",
      headers: { apikey: PUBLIC_KEY, authorization: auth },
      signal: AbortSignal.timeout(8500)
    });
    if (!verify.ok) return send(res, 401, { error: "Sessão expirada. Entre novamente no NOWAY ID." });
    const result = await verify.json();
    if (!result?.id) return send(res, 401, { error: "Sessão não reconhecida." });
    uid = result.id;
  } catch {
    return send(res, 503, { error: "Não foi possível validar sua sessão." });
  }

  const now = Date.now();
  const usage = quota.get(uid);
  if (usage && usage.expires > now && usage.count >= 20)
    return send(res, 429, { error: "Limite temporário de consultas. Aguarde alguns minutos." });
  quota.set(uid, { count: usage && usage.expires > now ? usage.count+1 : 1, expires: usage && usage.expires > now ? usage.expires : now + 300000 });
  if (quota.size > 500) quota.delete(quota.keys().next().value);

  const cacheKey = platform + ":" + name.toLowerCase();
  const saved = dataCache.get(cacheKey);
  if (saved && saved.expires > now)
    return send(res, 200, { source: "R6 Arenyze / Ubisoft", cached: true, fetchedAt: saved.fetchedAt, profile: saved.profile });

  const url = new URL(API);
  url.searchParams.set("nameOnPlatform", name);
  url.searchParams.set("platformType", platform);
  url.searchParams.set("platform_families", platform === "uplay" ? "pc" : "console");

  try {
    // Consulta complementar: no R6 V2 o headshot fica nos operadores.
    // Falha de operadores nao impede a consulta principal.
    const operatorsUrl = new URL(OPERATORS_API);
    operatorsUrl.searchParams.set("nameOnPlatform", name);
    operatorsUrl.searchParams.set("platformType", platform);
    operatorsUrl.searchParams.set("modes", "ranked");
    const headers = { "api-key": credential, accept: "application/json" };
    const [response, opsResponse] = await Promise.all([
      fetch(url, { headers, signal: AbortSignal.timeout(16000) }),
      fetch(operatorsUrl, { headers, signal: AbortSignal.timeout(12000) }).catch(() => null)
    ]);
    if (!response.ok) {
      const status = response.status === 404 ? 404 : response.status === 429 ? 429 : 502;
      const message = response.status === 404 ? "Jogador não encontrado."
        : response.status === 429 ? "A Arenyze atingiu o limite de consultas. Tente novamente mais tarde."
        : response.status === 401 || response.status === 403 ? "A chave da Arenyze foi recusada. Verifique sua conta."
        : "O serviço de estatísticas está temporariamente indisponível.";
      return send(res, status, { error: message });
    }
    const result = await response.json();
    if (!result || typeof result !== "object")
      return send(res, 502, { error: "O provedor retornou uma resposta inválida." });
    let operators = null;
    if (opsResponse?.ok) {
      try { operators = (await opsResponse.json())?.operators || null; } catch {}
    }
    const profile = {
      player: result.player || null,
      account: result.account || null,
      stats: result.stats || null,
      seasons: result.seasons || null,
      history: result.history || null,
      meta: result.meta || null,
      operators
    };
    const fetchedAt = new Date(now).toISOString();
    dataCache.set(cacheKey, { profile, fetchedAt, expires: now + 300000 });
    if (dataCache.size > 150) dataCache.delete(dataCache.keys().next().value);
    return send(res, 200, { source: "R6 Arenyze / Ubisoft", cached: false, fetchedAt, profile });
  } catch {
    return send(res, 503, { error: "Não foi possível consultar o R6 Arenyze agora." });
  }
};