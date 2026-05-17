import { formatUnits, hexToString, isAddress, isHex, parseUnits } from "viem";

export const TOKEN_DECIMALS = 18;

export function toAddress(value) {
  if (!value || typeof value !== "string") return "";
  return value.trim();
}

export function isValidAddress(value) {
  try {
    return isAddress(toAddress(value));
  } catch {
    return false;
  }
}

export function shortAddress(value, left = 6, right = 4) {
  const address = toAddress(value);
  if (!address || address.length < left + right + 2) return "--";
  return `${address.slice(0, left)}...${address.slice(-right)}`;
}

export function formatOrderNo(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (!isHex(text)) return text;

  try {
    const decoded = hexToString(text, { size: 32 }).replace(/\0/g, "").trim();
    return decoded && /^[\x20-\x7E]+$/.test(decoded)
      ? decoded
      : text.replace(/^0x/i, "").slice(0, 10).toLowerCase();
  } catch {
    return text.replace(/^0x/i, "").slice(0, 10).toLowerCase();
  }
}

export function parseTokenInput(value, decimals = TOKEN_DECIMALS) {
  const text = String(value ?? "").trim();
  if (!text) return 0n;
  return parseUnits(text, decimals);
}

export function formatTokenAmount(value, decimals = TOKEN_DECIMALS, fractionDigits = 4) {
  const raw = typeof value === "bigint" ? value : BigInt(String(value || 0));
  const normalized = formatUnits(raw, decimals);
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return normalized;
  return numeric.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatPercentBps(bps) {
  const raw = typeof bps === "bigint" ? Number(bps) : Number(bps || 0);
  return `${(raw / 100).toFixed(2)}%`;
}

export function toBigInt(value) {
  if (typeof value === "bigint") return value;
  if (value === null || value === undefined || value === "") return 0n;
  return BigInt(String(value));
}

export function formatUnixTime(seconds) {
  const value = Number(seconds || 0);
  if (!Number.isFinite(value) || value <= 0) return "--";
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("zh-CN", { hour12: false });
}

export function clampText(value, fallback = "--") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function formatSignedAmount(amountText) {
  if (!amountText) return "0";
  if (amountText.startsWith("-")) return amountText;
  if (amountText.startsWith("+")) return amountText;
  return `+${amountText}`;
}
