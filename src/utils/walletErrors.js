function collectErrorParts(error, depth = 0) {
  if (!error || depth > 3) return [];
  if (typeof error === "string") return [error];
  if (typeof error !== "object") return [String(error)];

  const fields = [
    error.name,
    error.code,
    error.message,
    error.shortMessage,
    error.details,
    error.reason,
    error.data?.message,
    error.cause?.message,
    error.cause?.shortMessage,
    error.cause?.details,
    error.cause?.code,
  ];

  return [
    ...fields.filter((value) => value !== undefined && value !== null && value !== ""),
    ...collectErrorParts(error.cause, depth + 1),
  ];
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function getWalletErrorMessage(error, t, fallbackKey = "common.walletErrors.failed") {
  const text = collectErrorParts(error).join(" ").toLowerCase();
  const fallbackText = t(fallbackKey);

  if (includesAny(text, ["4001", "action_rejected", "userrejected", "user rejected", "user denied", "request rejected", "rejected by user", "cancelled by user", "canceled by user"])) {
    return t("common.walletErrors.rejected");
  }

  if (includesAny(text, ["insufficient funds", "insufficient balance", "not enough funds", "exceeds balance", "fee exceeds", "balance too low", "gas required exceeds allowance"])) {
    return t("common.walletErrors.insufficientGas");
  }

  if (includesAny(text, ["wrong chain", "switch chain", "unsupported chain", "chain mismatch", "unrecognized chain"])) {
    return t("common.walletErrors.wrongChain");
  }

  if (includesAny(text, ["no_provider", "provider not found", "connector not found", "no wallet connector", "wallet not found"])) {
    return t("common.walletErrors.noProvider");
  }

  if (includesAny(text, ["network error", "fetch failed", "failed to fetch", "timeout", "rpc", "http request failed", "disconnected"])) {
    return t("common.walletErrors.network");
  }

  if (includesAny(text, ["execution reverted", "estimate gas", "estimategas", "cannot estimate", "missing revert data", "call exception", "contract function reverted"])) {
    return t("common.walletErrors.contract");
  }

  return fallbackText || t("common.walletErrors.failed");
}
