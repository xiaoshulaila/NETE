import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LoadingState from "../../components/common/LoadingState";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getReferralInfo } from "../../services/neteApi";
import { bindReferrer, readNetworkUserData } from "../../services/neteContracts";
import { formatTokenAmount, isValidAddress, shortAddress } from "../../utils/formatters";

export default function MyTeamPage() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();
  const queryClient = useQueryClient();

  const [referrerInput, setReferrerInput] = useState("");
  const [binding, setBinding] = useState(false);
  const [notice, setNotice] = useState("");

  const referralInfoQuery = useQuery({
    queryKey: ["nete", "referral-info", wallet.currentAddress],
    queryFn: () => getReferralInfo(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 15_000,
    retry: 1,
  });

  const networkDataQuery = useQuery({
    queryKey: ["nete", "network-data", wallet.currentAddress],
    queryFn: () => readNetworkUserData(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 15_000,
    retry: 1,
  });

  const referralInfo = referralInfoQuery.data || {};

  const directCount = Number(referralInfo.direct_count ?? 0);
  const totalPerformance = formatTokenAmount(referralInfo.subtree_perf ?? 0n, 18, 2);
  const ownPerformance = formatTokenAmount(referralInfo.own_perf ?? 0n, 18, 2);
  const smallLegPerformance = formatTokenAmount(referralInfo.small_leg_perf ?? 0n, 18, 2);
  const maxDepth = Number(referralInfo.max_depth ?? 0);

  const currentLayers = useMemo(() => {
    if (!directCount) return t("modules.team.layers", { count: 0 });
    return directCount >= 8 ? t("modules.team.layersRange") : t("modules.team.layers", { count: Math.min(directCount, maxDepth || directCount) });
  }, [directCount, maxDepth, t]);

  const teamLoading = referralInfoQuery.isLoading || networkDataQuery.isLoading;
  const bindDisabled = !wallet.isConnected || binding || Boolean(referralInfo.referrer);

  const handleBindReferrer = async () => {
    const referrer = referrerInput.trim();

    if (!wallet.isConnected) {
      setNotice(t("modules.team.messages.connectWallet"));
      return;
    }
    if (!isValidAddress(referrer)) {
      setNotice(t("modules.team.messages.invalidAddress"));
      return;
    }
    if (referrer.toLowerCase() === String(wallet.currentAddress || "").toLowerCase()) {
      setNotice(t("modules.team.messages.selfAddress"));
      return;
    }

    try {
      setBinding(true);
      setNotice("");
      await wallet.ensureCorrectChain();
      const tx = await bindReferrer(wallet.currentAddress, referrer);
      setNotice(t("modules.team.messages.success", { hash: tx.hash }));
      setReferrerInput("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nete", "referral-info", wallet.currentAddress] }),
        queryClient.invalidateQueries({ queryKey: ["nete", "network-data", wallet.currentAddress] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("modules.team.messages.failed");
      setNotice(message);
    } finally {
      setBinding(false);
    }
  };

  return (
    <section className="module-page space-y-6">
      <header className="module-hero">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-3xl">
            <p className="module-eyebrow">NETE NETWORK</p>
            <h1 className="font-display text-2xl font-black tracking-tight text-white md:text-3xl">{t("modules.team.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/80">{t("modules.team.desc")}</p>
          </div>
        </div>
      </header>

      {!wallet.isConnected ? <p className="text-xs text-white/70">{t("modules.team.connectHint")}</p> : null}

      <div className="grid grid-cols-2 gap-3">
        <article className="module-stat-card p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.team.stats.directs")}</div>
          <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">
            {teamLoading ? <LoadingState compact /> : directCount}
          </div>
        </article>
        <article className="module-stat-card p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.team.stats.performance")}</div>
          <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">
            {teamLoading ? <LoadingState compact /> : totalPerformance}
          </div>
        </article>
        <article className="module-stat-card p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.team.stats.layers")}</div>
          <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">
            {teamLoading ? <LoadingState compact /> : currentLayers}
          </div>
        </article>
        <article className="module-stat-card p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.team.stats.level")}</div>
          <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">
            {teamLoading ? <LoadingState compact /> : `V${networkDataQuery.data?.userLevel ?? 0}`}
          </div>
        </article>
      </div>

      <article className="module-card p-5">
        <h2 className="font-display text-base font-bold tracking-wide text-white md:text-xl">{t("modules.team.referralTitle")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="module-stat-card p-4 text-sm text-white/85">
            {teamLoading ? (
              <LoadingState compact />
            ) : (
              <>
                <p>{t("modules.team.currentReferrer", { value: referralInfo.referrer ? shortAddress(referralInfo.referrer) : t("modules.team.unbound") })}</p>
                <p className="mt-2">{t("modules.team.ownPerformance", { value: ownPerformance })}</p>
                <p className="mt-2">{t("modules.team.smallLegPerformance", { value: smallLegPerformance })}</p>
              </>
            )}
          </div>

          <div className="module-stat-card p-4">
            <p className="text-sm text-white/75">{t("modules.team.bindOnce")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="module-input flex-1"
                placeholder={t("modules.team.inputPlaceholder")}
                value={referrerInput}
                onChange={(event) => setReferrerInput(event.target.value)}
                disabled={Boolean(referralInfo.referrer)}
              />
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#caff00] px-5 text-sm font-semibold tracking-wide text-black transition enabled:hover:shadow-[0_0_30px_rgba(202,255,0,0.45)] disabled:cursor-not-allowed disabled:opacity-45"
                type="button"
                onClick={handleBindReferrer}
                disabled={bindDisabled}
              >
                {binding ? t("modules.team.submitting") : referralInfo.referrer ? t("modules.team.bound") : t("modules.team.bind")}
              </button>
            </div>
            {notice ? <p className="mt-2 break-all text-xs text-white/70">{notice}</p> : null}
          </div>
        </div>
      </article>
    </section>
  );
}
