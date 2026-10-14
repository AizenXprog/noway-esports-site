// Proxy seguro de status Twitch para a NOWAY. As credenciais permanecem na Vercel.
let cachedToken = "";
let tokenExpiresAt = 0;

async function getAppToken(clientId, clientSecret) {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials"
  });
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!response.ok) throw new Error("Twitch auth error " + response.status);
  const data = await response.json();
  if (!data.access_token) throw new Error("No Twitch token");
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + Math.max(60, Number(data.expires_in || 3600) - 120) * 1000;
  return cachedToken;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ configured: false, streams: [] });
  }
  const value = typeof req.query.channels === "string" ? req.query.channels : "";
  const channels = [...new Set(value.split(",").map(x => x.trim().toLowerCase()).filter(x => /^[a-z0-9_]{3,25}$/.test(x)))].slice(0, 20);
  if (channels.length === 0) return res.status(200).json({ configured: true, streams: [] });

  try {
    const token = await getAppToken(clientId, clientSecret);
    const params = new URLSearchParams();
    channels.forEach(name => params.append("user_login", name));
    const response = await fetch("https://api.twitch.tv/helix/streams?" + params.toString(), {
      headers: { "Client-Id": clientId, "Authorization": "Bearer " + token }
    });
    if (!response.ok) throw new Error("Twitch streams error " + response.status);
    const result = await response.json();
    const streams = (Array.isArray(result.data) ? result.data : []).map(stream => ({
      channel: stream.user_login,
      title: stream.title || "",
      game: stream.game_name || "",
      viewers: Number(stream.viewer_count || 0),
      thumbnail: typeof stream.thumbnail_url === "string"
        ? stream.thumbnail_url.replace("{width}", "640").replace("{height}", "360")
        : ""
    }));
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");
    return res.status(200).json({ configured: true, streams });
  } catch (error) {
    console.error("NOWAY Twitch status unavailable:", error.message);
    return res.status(503).json({ configured: true, streams: [], error: "Stream status temporarily unavailable" });
  }
};
