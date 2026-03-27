// Cloudflare Worker — Lark API Proxy + OAuth
// 環境変数: LARK_APP_ID, LARK_APP_SECRET
// ============================================================

const LARK_BASE_URL = "https://open.larksuite.com/open-apis";

let cachedToken = null;
let tokenExpireAt = 0;

async function getTenantAccessToken(appId, appSecret) {
  const now = Date.now();
  if (cachedToken && now < tokenExpireAt) return cachedToken;
  const res = await fetch(`${LARK_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Token error: ${data.msg}`);
  cachedToken = data.tenant_access_token;
  tokenExpireAt = now + (data.expire - 60) * 1000;
  return cachedToken;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    try {
      // ===== Lark OAuthコード→ユーザートークン交換 =====
      if (action === "auth") {
        const code = url.searchParams.get("code");
        if (!code) return json({ error: "code is required" }, 400);

        const appTokenRes = await fetch(`${LARK_BASE_URL}/auth/v3/app_access_token/internal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app_id: env.LARK_APP_ID, app_secret: env.LARK_APP_SECRET }),
        });
        const appTokenData = await appTokenRes.json();
        if (appTokenData.code !== 0) {
          return json({ error: "app_access_token failed: " + appTokenData.msg }, 500);
        }

        const authRes = await fetch(`${LARK_BASE_URL}/authen/v1/oidc/access_token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${appTokenData.app_access_token}`,
          },
          body: JSON.stringify({ grant_type: "authorization_code", code }),
        });
        const authData = await authRes.json();
        if (authData.code !== 0) return json({ error: authData.msg, raw: authData }, 401);

        // ユーザー情報取得（アバターURL含む）
        const userRes = await fetch(`${LARK_BASE_URL}/authen/v1/user_info`, {
          headers: { Authorization: `Bearer ${authData.data.access_token}` },
        });
        const userData = await userRes.json();

        return json({
          access_token: authData.data.access_token,
          user: userData.code === 0 ? {
            name: userData.data.name,
            en_name: userData.data.en_name,
            avatar: userData.data.avatar_url,
            open_id: userData.data.open_id,
          } : {}
        });
      }

      // ===== デバッグ用（認証不要）=====
      if (action === "debug") {
        const appToken = url.searchParams.get("app_token");
        const tableId = url.searchParams.get("table_id");
        const pageSize = url.searchParams.get("page_size") || "3";
        const tenantToken = await getTenantAccessToken(env.LARK_APP_ID, env.LARK_APP_SECRET);
        const dataRes = await fetch(`${LARK_BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/records/search?page_size=${pageSize}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${tenantToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        return json(await dataRes.json());
      }

      // ===== レコード作成（POST） =====
      if (action === "create") {
        const body = await request.json();
        const { app_token, table_id, fields } = body;
        if (!app_token || !table_id || !fields) return json({ error: "app_token, table_id, fields required" }, 400);
        const tenantToken = await getTenantAccessToken(env.LARK_APP_ID, env.LARK_APP_SECRET);
        const res = await fetch(`${LARK_BASE_URL}/bitable/v1/apps/${app_token}/tables/${table_id}/records`, {
          method: "POST",
          headers: { Authorization: `Bearer ${tenantToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ fields }),
        });
        return json(await res.json());
      }

      // ===== レコード更新（PATCH） =====
      if (action === "update") {
        let body;
        try {
          const rawText = await request.text();
          body = JSON.parse(rawText);
        } catch (parseErr) {
          return json({ error: "JSON parse error: " + parseErr.message }, 400);
        }
        const { app_token, table_id, record_id, fields } = body;
        if (!app_token || !table_id || !record_id || !fields) return json({ error: "app_token, table_id, record_id, fields required" }, 400);
        const tenantToken = await getTenantAccessToken(env.LARK_APP_ID, env.LARK_APP_SECRET);
        const res = await fetch(`${LARK_BASE_URL}/bitable/v1/apps/${app_token}/tables/${table_id}/records/${record_id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${tenantToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ fields }),
        });
        return json(await res.json());
      }

      // ===== Baseデータ取得 =====
      const appToken = url.searchParams.get("app_token");
      const tableId = url.searchParams.get("table_id");
      const pageSize = url.searchParams.get("page_size") || "500";
      const pageToken = url.searchParams.get("page_token") || "";
      if (!appToken || !tableId) {
        return json({ error: "app_token and table_id are required" }, 400);
      }

      // Tenant tokenでBaseにアクセス（認証チェックなし・高速）
      const tenantToken = await getTenantAccessToken(env.LARK_APP_ID, env.LARK_APP_SECRET);
      let path = `/bitable/v1/apps/${appToken}/tables/${tableId}/records/search?page_size=${pageSize}`;
      if (pageToken) path += `&page_token=${pageToken}`;

      const dataRes = await fetch(`${LARK_BASE_URL}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tenantToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      return json(await dataRes.json());

    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};