import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import GlobalHeader from "./GlobalHeader";
import FooterSection from "../landing/FooterSection";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getReferralInfo } from "../../services/neteApi";
import { bindReferrer } from "../../services/neteContracts";
import { isValidAddress } from "../../utils/formatters";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function hasReferrer(value) {
  const referrer = String(value || "").toLowerCase();
  return Boolean(referrer) && referrer !== ZERO_ADDRESS;
}

export default function AppShell() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [referrerInput, setReferrerInput] = useState("");
  const [binding, setBinding] = useState(false);
  const [bindNotice, setBindNotice] = useState("");
  const [bindModalDismissed, setBindModalDismissed] = useState(false);

  const urlReferrer = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("ref") || params.get("invite") || "";
  }, [location.search]);

  useEffect(() => {
    if (urlReferrer && !referrerInput) {
      setReferrerInput(urlReferrer);
    }
  }, [referrerInput, urlReferrer]);

  const referralInfoQuery = useQuery({
    queryKey: ["nete", "referral-info", wallet.currentAddress],
    queryFn: () => getReferralInfo(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 15_000,
    retry: 1,
  });

  const referrerMissing = !hasReferrer(referralInfoQuery.data?.referrer);
  const shouldShowBindModal = wallet.isConnected
    && !referralInfoQuery.isLoading
    && !referralInfoQuery.isError
    && !bindModalDismissed
    && referrerMissing;

  useEffect(() => {
    setBindModalDismissed(false);
  }, [wallet.currentAddress]);

  useEffect(() => {
    if (!bindModalDismissed || !wallet.isConnected || referralInfoQuery.isLoading || referralInfoQuery.isError || !referrerMissing) {
      return undefined;
    }

    const timer = window.setTimeout(() => setBindModalDismissed(false), 1800);
    return () => window.clearTimeout(timer);
  }, [bindModalDismissed, referralInfoQuery.isError, referralInfoQuery.isLoading, referrerMissing, wallet.isConnected]);

  const handleBindReferrer = async () => {
    const referrer = referrerInput.trim();

    if (!isValidAddress(referrer)) {
      setBindNotice(t("modules.team.messages.invalidAddress"));
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
      setReferrerInput("");
      setBindModalDismissed(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nete", "referral-info", wallet.currentAddress] }),
        queryClient.invalidateQueries({ queryKey: ["nete", "network-data", wallet.currentAddress] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("modules.team.messages.failed");
      setBindNotice(message);
    } finally {
      setBinding(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#070a09] text-white"
      style={{
        backgroundImage:
          "radial-gradient(circle at top left, rgba(108, 77, 255, 0.18), transparent 28%), radial-gradient(circle at top right, rgba(118, 245, 196, 0.12), transparent 24%), linear-gradient(180deg, #09100d 0%, #060807 100%)",
      }}
    >
      <GlobalHeader />

      <div className="mx-auto w-full max-w-[430px] px-3 py-4" style={{ paddingTop: "calc(var(--nav-height) + 0.75rem)" }}>
        <Outlet />
      </div>

      <FooterSection />

      {shouldShowBindModal ? (
        <div className="fixed inset-0 z-[650] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation">
          <article className="relative w-full max-w-[420px] rounded-[20px] border border-white/10 bg-[#111713] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.58)]" role="dialog" aria-modal="true" aria-label={t("modules.team.bindPromptTitle")}>
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
      ) : null}
    </div>
  );
}
