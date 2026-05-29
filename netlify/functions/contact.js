const REQUEST_TIMEOUT_MS = 12000;

function env(name) {
  return globalThis.Netlify?.env?.get(name) ?? process.env[name] ?? "";
}

function cleanUrl(value) {
  return String(value || "").replace(/\/$/, "");
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function publicError(status) {
  if (status === 404) return { code: "endpoint_unavailable", status };
  if (status === 429) return { code: "rate_limited", status };
  return { code: "submit_failed", status };
}

async function forwardContact(contactBaseUrl, payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${contactBaseUrl}/feedback/contact_us`, {
      body: JSON.stringify(payload),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });

    if (response.ok) {
      return { body: { ok: true }, status: response.status };
    }

    return { body: publicError(response.status), status: response.status };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") {
    return jsonResponse({ code: "method_not_allowed" }, 405);
  }

  const contactBaseUrl = cleanUrl(env("ANEWLUV_XANO_CONTACT_API_BASE_URL"));
  if (!contactBaseUrl) {
    return jsonResponse({ code: "endpoint_unavailable" }, 503);
  }

  const payload = await readJson(req);
  if (!payload?.description || !payload?.category || !payload?.subject) {
    return jsonResponse({ code: "invalid_request" }, 400);
  }

  try {
    const result = await forwardContact(contactBaseUrl, payload);
    return jsonResponse(result.body, result.status);
  } catch (error) {
    return jsonResponse(
      { code: error?.name === "AbortError" ? "timeout" : "network_error" },
      502,
    );
  }
};

export const config = {
  path: "/api/contact",
};
