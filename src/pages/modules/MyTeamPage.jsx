import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LoadingState from "../../components/common/LoadingState";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getPerformanceLegs, getReferralDirects, getReferralInfo } from "../../services/neteApi";
import { readNetworkUserData } from "../../services/neteContracts";
import { formatTokenAmount, shortAddress } from "../../utils/formatters";

const performanceTabs = [
  { key: "miner", labelKey: "modules.team.performanceTabs.miner" },
  { key: "seed", labelKey: "modules.team.performanceTabs.seed" },
];
const PERFORMANCE_PAGE_SIZE = 10;

const performanceFieldMap = {
  miner: {
    own: ["miner_own_perf", "own_miner_perf", "mining_own_perf", "own_mining_perf", "miner_perf", "mining_perf", "own_perf"],
    team: ["miner_team_perf", "team_miner_perf", "mining_team_perf", "team_mining_perf", "team_perf"],
    direct: ["miner_direct_perf", "direct_miner_perf", "mining_direct_perf", "direct_mining_perf", "direct_perf", "performance", "total_perf"],
    big: ["miner_big_leg_perf", "big_miner_perf", "mining_big_leg_perf", "big_mining_perf", "big_leg_perf"],
    small: ["miner_small_leg_perf", "small_miner_perf", "mining_small_leg_perf", "small_mining_perf", "small_leg_perf"],
  },
  seed: {
    own: ["seed_own_perf", "own_seed_perf", "presale_own_perf", "own_presale_perf", "seed_perf", "presale_perf"],
    team: ["seed_team_perf", "team_seed_perf", "presale_team_perf", "team_presale_perf", "team_perf"],
    direct: ["seed_direct_perf", "direct_seed_perf", "presale_direct_perf", "direct_presale_perf"],
    big: ["seed_big_leg_perf", "big_seed_perf", "presale_big_leg_perf", "big_presale_perf", "big_leg_perf"],
    small: ["seed_small_leg_perf", "small_seed_perf", "presale_small_leg_perf", "small_presale_perf"],
  },
};

const teamCountFieldMap = {
  miner: ["miner_team_count", "mining_team_count", "team_count", "subtree_count", "member_count", "downline_count", "direct_count"],
  seed: ["seed_team_count", "presale_team_count", "team_count", "subtree_count", "member_count", "downline_count", "direct_count"],
};

function toItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

function toTotalCount(payload) {
  const candidates = [
    payload?.total,
    payload?.total_count,
    payload?.totalCount,
    payload?.count,
    payload?.data?.total,
    payload?.data?.total_count,
    payload?.data?.totalCount,
    payload?.pagination?.total,
    payload?.data?.pagination?.total,
  ];
  const total = candidates.map(Number).find((value) => Number.isFinite(value) && value >= 0);
  return total ?? 0;
}

function toBigIntSafe(value) {
  if (typeof value === "bigint") return value;
  if (value === null || value === undefined || value === "") return 0n;
  try {
    return BigInt(String(value));
  } catch {
    return 0n;
  }
}

function pickBigIntCandidate(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== "") {
      return { found: true, value: toBigIntSafe(source[key]) };
    }
  }
  return { found: false, value: 0n };
}

function pickBigInt(source, keys) {
  return pickBigIntCandidate(source, keys).value;
}

function pickNumber(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== "") {
      const value = Number(source[key]);
      return Number.isFinite(value) ? value : 0;
    }
  }
  return 0;
}

function getMemberPerformance(member, type) {
  const fields = performanceFieldMap[type];
  const own = pickBigInt(member, fields.own);
  const direct = pickBigIntCandidate(member, fields.direct);
  const team = pickBigIntCandidate(member, fields.team);
  const big = pickBigIntCandidate(member, fields.big);
  const small = pickBigIntCandidate(member, fields.small);

  return {
    direct: direct.found ? direct.value : (big.found ? big.value : own),
    team: team.found ? team.value : small.value,
    teamCount: pickNumber(member, teamCountFieldMap[type]),
  };
}

function getFallbackDirects(source, type) {
  if (type === "seed") {
    return toItems(source.seed_directs ?? source.seed_direct_members ?? source.presale_directs ?? source.presale_direct_members);
  }

  return toItems(
    source.miner_directs ??
    source.miner_direct_members ??
    source.mining_directs ??
    source.mining_direct_members ??
    source.directs ??
    source.direct_members ??
    source.direct_list ??
    source.children ??
    source.members
  );
}

function renderMetricHeader(label) {
  const text = String(label ?? "");
  const match = text.match(/^(.*?)(?:（(.+)）|\s*\((.+)\))$/);
  if (!match) return text;

  return (
    <span className="team-table-head-label">
      <span>{match[1]}</span>
      <small>{match[2] || match[3]}</small>
    </span>
  );
}

export default function MyTeamPage() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();
  const [activePerformance, setActivePerformance] = useState("miner");
  const [performancePage, setPerformancePage] = useState(1);

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

  const performanceLegsQuery = useQuery({
    queryKey: ["nete", "performance-legs", wallet.currentAddress],
    queryFn: () => getPerformanceLegs(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 15_000,
    retry: 1,
  });

  const directListQuery = useQuery({
    queryKey: ["nete", "referral-directs", wallet.currentAddress, activePerformance, performancePage],
    queryFn: () => getReferralDirects(wallet.currentAddress, { page: performancePage, pageSize: PERFORMANCE_PAGE_SIZE, type: activePerformance }).catch(() => []),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 0,
    retry: 0,
  });

  const referralInfo = referralInfoQuery.data || {};
  const performanceLegs = performanceLegsQuery.data || {};
  const directCount = Number(referralInfo.direct_count ?? 0);
  const maxDepth = Number(referralInfo.max_depth ?? 0);
  const currentLevel = performanceLegs.user_level ?? referralInfo.user_level ?? networkDataQuery.data?.userLevel ?? 0;

  useEffect(() => {
    setPerformancePage(1);
  }, [activePerformance, wallet.currentAddress]);

  const fallbackDirectMembers = useMemo(
    () => getFallbackDirects(referralInfo, activePerformance),
    [activePerformance, referralInfo],
  );
  const directApiRows = useMemo(() => toItems(directListQuery.data), [directListQuery.data]);
  const directMembersSource = directApiRows.length > 0 ? directApiRows : fallbackDirectMembers;
  const directTotalCount = toTotalCount(directListQuery.data);
  const clientPaginatedDirects = directMembersSource.length > PERFORMANCE_PAGE_SIZE;
  const directTotalPages = directTotalCount > 0
    ? Math.max(1, Math.ceil(directTotalCount / PERFORMANCE_PAGE_SIZE))
    : clientPaginatedDirects
      ? Math.max(1, Math.ceil(directMembersSource.length / PERFORMANCE_PAGE_SIZE))
      : 0;
  const visibleDirectMembers = clientPaginatedDirects
    ? directMembersSource.slice((performancePage - 1) * PERFORMANCE_PAGE_SIZE, performancePage * PERFORMANCE_PAGE_SIZE)
    : directMembersSource;
  const showPerformancePagination = !(directTotalCount > 0 && directTotalPages <= 1)
    && (performancePage > 1 || directTotalPages > 1 || directMembersSource.length >= PERFORMANCE_PAGE_SIZE);
  const canPerformancePrev = performancePage > 1 && !directListQuery.isFetching;
  const canPerformanceNext = !directListQuery.isFetching && (
    directTotalPages > 0
      ? performancePage < directTotalPages
      : directMembersSource.length === PERFORMANCE_PAGE_SIZE
  );

  const currentLayers = useMemo(() => t("modules.team.layers", { count: maxDepth }), [maxDepth, t]);

  const teamPerformance = pickBigInt(performanceLegs, ["team_perf"]);
  const smallLegPerformance = pickBigInt(performanceLegs, ["small_leg_perf"]);
  const bigLegPerformance = pickBigInt(performanceLegs, ["big_leg_perf"]);
  const directListLoading = directListQuery.isLoading || referralInfoQuery.isLoading;
  const teamLoading = referralInfoQuery.isLoading || networkDataQuery.isLoading || performanceLegsQuery.isLoading;

  const renderPerformanceRows = () => {
    if (directListLoading) {
      return (
        <tr className="module-loading-row">
          <td colSpan={4}>
            <LoadingState variant="list" rows={4} cells={4} />
          </td>
        </tr>
      );
    }

    if (visibleDirectMembers.length === 0) {
      return (
        <tr className="team-empty-row">
          <td colSpan={4}>
            <div className="module-empty-state">{t("modules.team.emptyIncomeDetails")}</div>
          </td>
        </tr>
      );
    }

    return visibleDirectMembers.map((member, index) => {
      const address = member.address ?? member.user ?? member.wallet ?? member.account ?? "";
      const performance = getMemberPerformance(member, activePerformance);

      return (
        <tr key={`${activePerformance}-${address || "direct"}-${index}`}>
          <td className="team-address-cell font-mono text-xs text-[#caff00]">{address ? shortAddress(address, 4, 4) : "--"}</td>
          <td>{performance.teamCount}</td>
          <td>{formatTokenAmount(performance.direct, 18, 1)}</td>
          <td>{formatTokenAmount(performance.team, 18, 1)}</td>
        </tr>
      );
    });
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
        <article className="team-level-banner">
          <span>{t("modules.team.stats.level")}</span>
          <strong>{teamLoading ? <LoadingState compact /> : `V${currentLevel}`}</strong>
        </article>
      </header>

      {!wallet.isConnected ? <p className="text-xs text-white/70">{t("modules.team.connectHint")}</p> : null}

      <div className="team-stats-grid">
        <article className="module-stat-card p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.team.stats.directs")}</div>
          <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">
            {teamLoading ? <LoadingState compact /> : directCount}
          </div>
        </article>
        <article className="module-stat-card p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.team.stats.layers")}</div>
          <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">
            {teamLoading ? <LoadingState compact /> : currentLayers}
          </div>
        </article>
        <article className="module-stat-card p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.team.stats.bigLegPerformance")}</div>
          <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">
            {teamLoading ? <LoadingState compact /> : formatTokenAmount(bigLegPerformance, 18, 2)}
          </div>
        </article>
        <article className="module-stat-card p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.team.stats.zonePerformance")}</div>
          <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">
            {teamLoading ? <LoadingState compact /> : formatTokenAmount(smallLegPerformance, 18, 2)}
          </div>
        </article>
      </div>

      <article className="module-card team-income-card">
        <div className="team-tabs" role="tablist" aria-label={t("modules.team.performanceTabLabel")}>
          {performanceTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activePerformance === tab.key}
              className={activePerformance === tab.key ? "is-active" : ""}
              onClick={() => {
                setActivePerformance(tab.key);
                setPerformancePage(1);
              }}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <div className="module-table-wrap">
          <table className="module-table team-performance-table md:text-sm">
            <thead>
              <tr>
                <th>{t("modules.team.address")}</th>
                <th>{t("modules.team.teamCount")}</th>
                <th>{renderMetricHeader(t("modules.team.directPerformance"))}</th>
                <th>{renderMetricHeader(t("modules.team.teamPerformance"))}</th>
              </tr>
            </thead>
            <tbody>{renderPerformanceRows()}</tbody>
          </table>
        </div>
        {showPerformancePagination ? (
          <div className="my-detail-pagination team-performance-pagination" aria-label={t("modules.team.pagination.label")}>
            <button
              type="button"
              disabled={!canPerformancePrev}
              onClick={() => setPerformancePage((page) => Math.max(1, page - 1))}
            >
              {t("modules.team.pagination.prev")}
            </button>
            <span>
              {directTotalPages > 0
                ? t("modules.team.pagination.pageWithTotal", { page: performancePage, total: directTotalPages })
                : t("modules.team.pagination.page", { page: performancePage })}
            </span>
            <button
              type="button"
              disabled={!canPerformanceNext}
              onClick={() => setPerformancePage((page) => page + 1)}
            >
              {t("modules.team.pagination.next")}
            </button>
          </div>
        ) : null}
      </article>
    </section>
  );
}
