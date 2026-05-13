import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LoadingState from "../../components/common/LoadingState";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getReferralDirects, getReferralInfo } from "../../services/neteApi";
import { bindReferrer, readNetworkUserData } from "../../services/neteContracts";
import { formatTokenAmount, isValidAddress, shortAddress } from "../../utils/formatters";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function hasReferrer(value) {
  const referrer = String(value || "").toLowerCase();
  return Boolean(referrer) && referrer !== ZERO_ADDRESS;
}

function toItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

export default function MyTeamPage() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();
  const queryClient = useQueryClient();

  const [referrerInput, setReferrerInput] = useState("");
  const [binding, setBinding] = useState(false);
  const [notice, setNotice] = useState("");
  const [copyNotice, setCopyNotice] = useState("");

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

  const directListQuery = useQuery({
    queryKey: ["nete", "referral-directs", wallet.currentAddress],
    queryFn: () => getReferralDirects(wallet.currentAddress, { page: 1, pageSize: 50 }).catch(() => []),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 15_000,
    retry: 0,
  });

  const referralInfo = referralInfoQuery.data || {};

  const directCount = Number(referralInfo.direct_count ?? 0);
  const totalPerformance = formatTokenAmount(referralInfo.subtree_perf ?? 0n, 18, 2);
  const ownPerformance = formatTokenAmount(referralInfo.own_perf ?? 0n, 18, 2);
  const smallLegPerformance = formatTokenAmount(referralInfo.small_leg_perf ?? 0n, 18, 2);
  const maxDepth = Number(referralInfo.max_depth ?? 0);
  const directMembers = useMemo(
    () => {
      const apiRows = toItems(directListQuery.data);
      if (apiRows.length > 0) return apiRows;
      return toItems(referralInfo.directs ?? referralInfo.direct_members ?? referralInfo.direct_list ?? referralInfo.children ?? referralInfo.members);
    },
    [directListQuery.data, referralInfo.children, referralInfo.direct_list, referralInfo.direct_members, referralInfo.directs, referralInfo.members],
  );
  const inviteLink = useMemo(() => {
    if (!wallet.currentAddress) return "--";
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin || "https://nete.io"}/?ref=${wallet.currentAddress}`;
  }, [wallet.currentAddress]);

  const currentLayers = useMemo(() => {
    if (!directCount) return t("modules.team.layers", { count: 0 });
    return directCount >= 8 ? t("modules.team.layersRange") : t("modules.team.layers", { count: Math.min(directCount, maxDepth || directCount) });
  }, [directCount, maxDepth, t]);

  const teamLoading = referralInfoQuery.isLoading || networkDataQuery.isLoading;
  const directListLoading = directListQuery.isLoading || teamLoading;
  const referrerBound = hasReferrer(referralInfo.referrer);
  const bindDisabled = !wallet.isConnected || binding || referrerBound;

  const copyInviteLink = async () => {
    if (!wallet.currentAddress || inviteLink === "--") return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyNotice(t("modules.team.messages.copied"));
    } catch {
      setCopyNotice(inviteLink);
    }
  };

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
      setCopyNotice("");
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
          <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.team.stats.zonePerformance")}</div>
          <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">
            {teamLoading ? <LoadingState compact /> : smallLegPerformance}
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
                <p>{t("modules.team.currentReferrer", { value: referrerBound ? shortAddress(referralInfo.referrer) : t("modules.team.unbound") })}</p>
                <p className="mt-2">{t("modules.team.ownPerformance", { value: ownPerformance })}</p>
                <p className="mt-2">{t("modules.team.smallLegPerformance", { value: smallLegPerformance })}</p>
                <p className="mt-2">{t("modules.team.inviteLink")}：<span className="font-mono text-[#caff00]">{inviteLink}</span></p>
                <button className="mt-3 inline-flex min-h-9 items-center justify-center rounded-full border border-[#caff00]/35 bg-[#caff00]/10 px-4 text-xs font-semibold text-[#caff00] disabled:cursor-not-allowed disabled:opacity-45" type="button" disabled={!wallet.currentAddress} onClick={copyInviteLink}>
                  {t("modules.team.copyInvite")}
                </button>
                {copyNotice ? <p className="mt-2 break-all text-xs text-white/70">{copyNotice}</p> : null}
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
                disabled={referrerBound}
              />
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#caff00] px-5 text-sm font-semibold tracking-wide text-black transition enabled:hover:shadow-[0_0_30px_rgba(202,255,0,0.45)] disabled:cursor-not-allowed disabled:opacity-45"
                type="button"
                onClick={handleBindReferrer}
                disabled={bindDisabled}
              >
                {binding ? t("modules.team.submitting") : referrerBound ? t("modules.team.bound") : t("modules.team.bind")}
              </button>
            </div>
            {notice ? <p className="mt-2 break-all text-xs text-white/70">{notice}</p> : null}
          </div>
        </div>
      </article>

      <article className="module-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold tracking-wide text-white md:text-xl">{t("modules.team.directListTitle")}</h2>
          <span className="text-xs text-white/50">{t("modules.team.directCountValue", { count: directCount })}</span>
        </div>
        <div className="module-table-wrap">
          <table className="module-table md:text-sm">
            <thead>
              <tr>
                <th>{t("modules.team.address")}</th>
                <th>{t("modules.team.performance")}</th>
                <th>{t("modules.team.level")}</th>
              </tr>
            </thead>
            <tbody>
              {directListLoading ? (
                <tr className="module-loading-row">
                  <td colSpan={3}>
                    <LoadingState variant="list" rows={4} cells={3} />
                  </td>
                </tr>
              ) : directMembers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-white/65">{t("modules.team.emptyDirects")}</td>
                </tr>
              ) : (
                directMembers.map((member, index) => {
                  const address = member.address ?? member.user ?? member.wallet ?? member.account ?? "";
                  const performance = member.performance ?? member.own_perf ?? member.total_perf ?? member.subtree_perf ?? 0n;
                  const level = member.level ?? member.user_level ?? member.vip_level ?? 0;
                  return (
                    <tr key={`${address || "direct"}-${index}`}>
                      <td className="font-mono text-xs text-[#caff00]">{address ? shortAddress(address) : "--"}</td>
                      <td>{formatTokenAmount(performance, 18, 2)} NETE</td>
                      <td>V{level}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
