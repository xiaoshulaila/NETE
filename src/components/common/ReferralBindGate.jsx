import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getReferralInfo } from "../../services/neteApi";
import { bindReferrer, readNetworkReferrer } from "../../services/neteContracts";
import { isValidAddress } from "../../utils/formatters";
import { getWalletErrorMessage } from "../../utils/walletErrors";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function hasReferrer(value) {
  const referrer = String(value || "").toLowerCase();
  return Boolean(referrer) && referrer !== ZERO_ADDRESS;
}

function isAlreadyBoundError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.includes("AlreadyBound") || message.includes("0x682a9065");
}

function getBindErrorMessage(error, t) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (isAlreadyBoundError(error)) return t("modules.team.messages.alreadyBound");
  if (message.includes("SelfReferral")) return t("modules.team.messages.selfAddress");
  if (message.includes("ZeroAddress")) return t("modules.team.messages.zeroAddress");
  if (message.includes("CircularReferral")) return t("modules.team.messages.circularReferral");
  return getWalletErrorMessage(error, t, "modules.team.messages.failed");
}

export default function ReferralBindGate() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [referrerInput, setReferrerInput] = useState("");
  const [binding, setBinding] = useState(false);
  const [bindNotice, setBindNotice] = useState("");
  const [bindModalDismissed, setBindModalDismissed] = useState(false);
  const [boundWalletAddress, setBoundWalletAddress] = useState("");

  const urlReferrer = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("ref") || params.get("invite") || "";
  }, [location.search]);

  useEffect(() => {
    if (urlReferrer) {
      setReferrerInput(urlReferrer.trim());
    }
  }, [urlReferrer]);

  const referralInfoQuery = useQuery({
    queryKey: ["nete", "referral-info", wallet.currentAddress],
    queryFn: () => getReferralInfo(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 15_000,
    retry: 1,
  });
  const networkReferrerQuery = useQuery({
    queryKey: ["nete", "network-referrer", wallet.currentAddress],
    queryFn: () => readNetworkReferrer(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 15_000,
    retry: 1,
  });

  const locallyBound = Boolean(wallet.currentAddress)
    && boundWalletAddress.toLowerCase() === String(wallet.currentAddress).toLowerCase();
  const referrerLoading = referralInfoQuery.isLoading || networkReferrerQuery.isLoading;
  const referrerError = referralInfoQuery.isError && networkReferrerQuery.isError;
  const referrerMissing = !hasReferrer(networkReferrerQuery.data) && !hasReferrer(referralInfoQuery.data?.referrer);
  const shouldShowBindModal = wallet.isConnected
    && !referrerLoading
    && !referrerError
    && !bindModalDismissed
    && !locallyBound
    && referrerMissing;

  useEffect(() => {
    setBindModalDismissed(false);
    setBindNotice("");
    setBoundWalletAddress("");
  }, [wallet.currentAddress]);

  useEffect(() => {
    if (!bindNotice) return undefined;
    const timer = window.setTimeout(() => setBindNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [bindNotice]);

  useEffect(() => {
    if (!bindModalDismissed || !wallet.isConnected || referrerLoading || referrerError || locallyBound || !referrerMissing) {
      return undefined;
    }

    const timer = window.setTimeout(() => setBindModalDismissed(false), 1800);
    return () => window.clearTimeout(timer);
  }, [bindModalDismissed, locallyBound, referrerError, referrerLoading, referrerMissing, wallet.isConnected]);

  const handleBindReferrer = async () => {
    const referrer = referrerInput.trim();

    if (!isValidAddress(referrer)) {
      setBindNotice(t("modules.team.messages.invalidAddress"));
      return;
    }
    if (!hasReferrer(referrer)) {
      setBindNotice(t("modules.team.messages.zeroAddress"));
      return;
    }
    if (referrer.toLowerCase() === String(wallet.currentAddress || "").toLowerCase()) {
      setBindNotice(t("modules.team.messages.selfAddress"));
      return;
    }

    try {
      setBinding(true);
      setBindNotice("");
      await wallet.ensureCorrectChain();
      await bindReferrer(wallet.currentAddress, referrer);
      setBoundWalletAddress(wallet.currentAddress || "");
      setReferrerInput("");
      setBindModalDismissed(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nete", "referral-info", wallet.currentAddress] }),
        queryClient.invalidateQueries({ queryKey: ["nete", "network-referrer", wallet.currentAddress] }),
        queryClient.invalidateQueries({ queryKey: ["nete", "network-data", wallet.currentAddress] }),
      ]);
    } catch (error) {
      if (isAlreadyBoundError(error)) {
        setBoundWalletAddress(wallet.currentAddress || "");
        setBindNotice(t("modules.team.messages.alreadyBound"));
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["nete", "referral-info", wallet.currentAddress] }),
          queryClient.invalidateQueries({ queryKey: ["nete", "network-referrer", wallet.currentAddress] }),
          queryClient.invalidateQueries({ queryKey: ["nete", "network-data", wallet.currentAddress] }),
        ]);
        return;
      }
      setBindNotice(getBindErrorMessage(error, t));
    } finally {
      setBinding(false);
    }
  };

  if (!shouldShowBindModal) return null;

  return (
    <div className="fixed inset-0 z-[650] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation">
      <article className="relative w-full max-w-[420px] rounded-[20px] border border-white/10 bg-[#111713] p-5 text-white shadow-[0_26px_80px_rgba(0,0,0,0.58)]" role="dialog" aria-modal="true" aria-label={t("modules.team.bindPromptTitle")}>
        <button
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-white/70 transition hover:text-white"
          type="button"
          onClick={() => setBindModalDismissed(true)}
          aria-label={t("modules.team.closeBindPrompt")}
        >
          <Icon icon="solar:close-circle-outline" width="1em" height="1em" />
        </button>
        <p className="module-eyebrow pr-10">NETE INVITE</p>
        <h2 className="mt-3 pr-10 font-display text-xl font-black text-white">{t("modules.team.bindPromptTitle")}</h2>
        <p className="mt-2 pr-8 text-sm leading-6 text-white/70">{t("modules.team.bindPromptDesc")}</p>
        <div className="mt-4 space-y-3">
          <input
            className="module-input"
            placeholder={t("modules.team.inputPlaceholder")}
            value={referrerInput}
            onChange={(event) => setReferrerInput(event.target.value)}
          />
          <button
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#caff00] px-5 text-sm font-semibold tracking-wide text-black transition disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            disabled={binding}
            onClick={handleBindReferrer}
          >
            {binding ? t("modules.team.submitting") : t("modules.team.bind")}
          </button>
        </div>
        {bindNotice ? <p className="mt-3 break-all text-xs leading-5 text-white/70">{bindNotice}</p> : null}
      </article>
    </div>
  );
}
