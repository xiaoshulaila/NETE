import { NETE_API_BASE } from "../config/neteRuntime";

function normalizePath(path) {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

function toApiUrl(path, query) {
  const normalizedPath = normalizePath(path).replace(/^\//, "");
  const base = NETE_API_BASE.startsWith("http")
    ? NETE_API_BASE
    : `${window.location.origin}${NETE_API_BASE}/`;
  const baseUrl = new URL(base.endsWith("/") ? base : `${base}/`);
  const url = new URL(normalizedPath, baseUrl);

  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return NETE_API_BASE.startsWith("http") ? url.toString() : `${url.pathname}${url.search}`;
}

async function request(path, { method = "GET", query, body } = {}) {
  const response = await fetch(toApiUrl(path, query), {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const detail = data?.message || data?.error || `HTTP ${response.status}`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Object.prototype.hasOwnProperty.call(data, "data") &&
    data.data !== null &&
    data.data !== undefined
  ) {
    return data.data;
  }

  return data;
}

export async function getRuntimeConfig() {
  return request("/v1/config/runtime");
}

export async function getPublicOrders({ page = 1, pageSize = 20 } = {}) {
  return request("/v1/orders/public", {
    query: { page, page_size: pageSize },
  });
}

export async function getMySellOrders(user, { page = 1, pageSize = 20 } = {}) {
  return request(`/v1/orders/public/${user}`, {
    query: { page, page_size: pageSize },
  });
}

export async function getMyTakenOrders(user, { page = 1, pageSize = 20 } = {}) {
  return request(`/v1/orders/taken/${user}`, {
    query: { page, page_size: pageSize },
  });
}

export async function getOrderDetail(orderId) {
  return request(`/v1/orders/${orderId}`);
}

export async function getReferralInfo(user) {
  return request("/v1/referral/info", { query: { user } });
}

export async function getReferralDirects(user, { page = 1, pageSize = 50 } = {}) {
  return request("/v1/referral/directs", {
    query: { user, page, page_size: pageSize },
  });
}

export async function getIncomeOverview(user) {
  return request("/v1/income/overview", { query: { user } });
}

export async function getIncomeLedger(user, { page = 1, pageSize = 20 } = {}) {
  return request("/v1/income/ledger", {
    query: { user, page, page_size: pageSize },
  });
}

export async function getClaimMessage(type, payload) {
  if (!["referral", "dividend", "v9"].includes(type)) {
    throw new Error("Invalid claim type");
  }
  return request(`/v1/${type}/claim-message`, {
    method: "POST",
    body: payload,
  });
}
