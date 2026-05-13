import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LoadingState from "../../components/common/LoadingState";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getReferralDirects, getReferralInfo } from "../../services/neteApi";
import { readNetworkUserData } from "../../services/neteContracts";
import { formatTokenAmount, shortAddress } from "../../utils/formatters";

function toItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

export default function MyTeamPage() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();

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

  const currentLayers = useMemo(() => {
    if (!directCount) return t("modules.team.layers", { count: 0 });
    return directCount >= 8 ? t("modules.team.layersRange") : t("modules.team.layers", { count: Math.min(directCount, maxDepth || directCount) });
  }, [directCount, maxDepth, t]);

  const teamLoading = referralInfoQuery.isLoading || networkDataQuery.isLoading;
  const directListLoading = directListQuery.isLoading || teamLoading;

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
