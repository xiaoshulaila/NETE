import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LoadingState from "../../components/common/LoadingState";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getPerformanceLegs, getPersonalPerformance, getReferralDownlines, getReferralInfo } from "../../services/neteApi";
import { readNetworkUserData } from "../../services/neteContracts";
import { formatTokenAmount, shortAddress } from "../../utils/formatters";

const performanceTabs = [
  { key: "miner", labelKey: "modules.team.performanceTabs.miner" },
  { key: "seed", labelKey: "modules.team.performanceTabs.seed" },
];
const PERFORMANCE_PAGE_SIZE = 10;

const performanceFieldMap = {
  miner: {
    own: ["miner_perf", "own_miner_perf", "miner_own_perf", "mining_own_perf", "own_mining_perf", "mining_perf", "own_perf"],
    team: ["subtree_miner_perf", "miner_team_perf", "team_miner_perf", "mining_team_perf", "team_mining_perf", "team_perf"],
    big: ["big_leg_miner_perf", "miner_big_leg_perf", "big_miner_perf", "mining_big_leg_perf", "big_mining_perf", "big_leg_perf"],
    small: ["small_leg_miner_perf", "miner_small_leg_perf", "small_miner_perf", "mining_small_leg_perf", "small_mining_perf", "small_leg_perf"],
  },
  seed: {
    own: ["presale_perf", "own_seed_perf", "seed_own_perf", "presale_own_perf", "own_presale_perf", "seed_perf"],
    team: ["subtree_seed_perf", "seed_team_perf", "team_seed_perf", "presale_team_perf", "team_presale_perf", "team_perf"],
    big: ["seed_big_leg_perf", "big_seed_perf", "presale_big_leg_perf", "big_presale_perf", "big_leg_perf"],
    small: ["small_leg_seed_perf", "seed_small_leg_perf", "small_seed_perf", "presale_small_leg_perf", "small_presale_perf"],
  },
};

function toItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.downlines)) return payload.downlines;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.downlines)) return payload.data.downlines;
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

function pickField(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== "") {
      return source[key];
    }
  }
  return undefined;
}

function pickAccountField(account, name, index) {
  if (!account) return undefined;
  if (account[name] !== undefined) return account[name];
  if (Array.isArray(account) && account[index] !== undefined) return account[index];
  return undefined;
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

function getMemberAddress(member) {
  if (typeof member === "string") return member;
  return member?.address ?? member?.user ?? member?.wallet ?? member?.account ?? "";
}

function toUnixSeconds(value) {
  if (value === null || value === undefined || value === "") return 0;
  const text = String(value).trim();
  const numeric = /^\d+$/.test(text) ? Number(text) : Number.NaN;
  const seconds = Number.isFinite(numeric) ? numeric : Math.floor(Date.parse(text) / 1000);

  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return seconds > 1_000_000_000_000 ? Math.floor(seconds / 1000) : Math.floor(seconds);
}

function getMemberJoinedAt(member) {
  const joinedAt = toUnixSeconds(pickField(member, [
    "joined_at",
    "joinedAt",
    "join_time",
    "joinTime",
    "bound_at",
    "boundAt",
    "created_at",
    "createdAt",
    "registered_at",
    "registeredAt",
    "updated_at",
    "updatedAt",
    "timestamp",
  ]));

  if (joinedAt > 0) return joinedAt;

  const account = member?.referralAccount ?? member?.referral_account;
  return toUnixSeconds(pickAccountField(account, "updatedAt", 3));
}

function getMemberPersonalPerformance(member, type) {
  return pickBigInt(member, performanceFieldMap[type].own);
}

function formatJoinedDate(seconds) {
  const value = Number(seconds || 0);
  if (!Number.isFinite(value) || value <= 0) return "--";
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return "--";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    queryKey: ["nete", "referral-downlines", wallet.currentAddress],
    queryFn: () => getReferralDownlines(wallet.currentAddress).catch(() => ({ downlines: [], total: 0 })),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 15_000,
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
  const visibleDirectMembers = useMemo(
    () => (
      clientPaginatedDirects
        ? directMembersSource.slice((performancePage - 1) * PERFORMANCE_PAGE_SIZE, performancePage * PERFORMANCE_PAGE_SIZE)
        : directMembersSource
    ),
    [clientPaginatedDirects, directMembersSource, performancePage],
  );
  const visibleDirectAddresses = useMemo(
    () => visibleDirectMembers.map(getMemberAddress).filter(Boolean),
    [visibleDirectMembers],
  );
  const directPerformanceQuery = useQuery({
    queryKey: ["nete", "referral-downline-performance", activePerformance, visibleDirectAddresses],
    queryFn: async () => {
      const rows = await Promise.all(visibleDirectAddresses.map(async (address) => {
        const [referral, personal, networkData] = await Promise.all([
          getReferralInfo(address).catch(() => ({})),
          getPersonalPerformance(address).catch(() => ({})),
          readNetworkUserData(address).catch(() => ({})),
        ]);
        return { address, ...referral, ...personal, referralAccount: networkData.referralAccount };
      }));
      return rows;
    },
    enabled: visibleDirectAddresses.length > 0,
    staleTime: 15_000,
    retry: 0,
  });
  const directPerformanceMap = useMemo(
    () => new Map((directPerformanceQuery.data || []).map((row) => [String(row.address).toLowerCase(), row])),
    [directPerformanceQuery.data],
  );
  const showPerformancePagination = !(directTotalCount > 0 && directTotalPages <= 1)
    && (performancePage > 1 || directTotalPages > 1 || directMembersSource.length >= PERFORMANCE_PAGE_SIZE);
  const canPerformancePrev = performancePage > 1 && !directListQuery.isFetching;
  const canPerformanceNext = !directListQuery.isFetching && (
    directTotalPages > 0
      ? performancePage < directTotalPages
      : directMembersSource.length === PERFORMANCE_PAGE_SIZE
  );

  const currentLayers = useMemo(() => t("modules.team.layers", { count: maxDepth }), [maxDepth, t]);

  const currentPerformanceFields = performanceFieldMap[activePerformance];
  const teamPerformanceCandidate = pickBigIntCandidate(referralInfo, currentPerformanceFields.team);
  const smallLegPerformanceCandidate = pickBigIntCandidate(referralInfo, currentPerformanceFields.small);
  const teamPerformance = teamPerformanceCandidate.found ? teamPerformanceCandidate.value : pickBigInt(performanceLegs, ["team_perf"]);
  const smallLegPerformance = smallLegPerformanceCandidate.found ? smallLegPerformanceCandidate.value : pickBigInt(performanceLegs, ["small_leg_perf"]);
  const fallbackBigLegPerformance = pickBigInt(performanceLegs, ["big_leg_perf"]);
  const bigLegPerformance = teamPerformance > smallLegPerformance ? teamPerformance - smallLegPerformance : fallbackBigLegPerformance;
  const directListLoading = directListQuery.isLoading || referralInfoQuery.isLoading || directPerformanceQuery.isLoading;
  const teamLoading = referralInfoQuery.isLoading || networkDataQuery.isLoading || performanceLegsQuery.isLoading;

  const renderPerformanceRows = () => {
    if (directListLoading) {
      return (
        <div className="team-performance-state">
          <LoadingState variant="list" rows={4} cells={3} />
        </div>
      );
    }

    if (visibleDirectMembers.length === 0) {
      return (
        <div className="team-performance-state">
          <div className="module-empty-state">{t("modules.team.emptyIncomeDetails")}</div>
        </div>
      );
    }

    return visibleDirectMembers.map((member, index) => {
      const address = getMemberAddress(member);
      const performanceSource = directPerformanceMap.get(String(address).toLowerCase()) || member;
      const personalPerformance = getMemberPersonalPerformance(performanceSource, activePerformance);
      const joinedAt = getMemberJoinedAt(performanceSource) || getMemberJoinedAt(member);

      return (
        <div className="team-performance-row" key={`${activePerformance}-${address || "direct"}-${index}`}>
          <span className="team-performance-cell team-address-cell font-mono text-xs text-[#caff00]" title={address || undefined}>{address ? shortAddress(address, 4, 4) : "--"}</span>
          <span className="team-performance-cell">{formatJoinedDate(joinedAt)}</span>
          <span className="team-performance-cell">{formatTokenAmount(personalPerformance, 18, 1)}</span>
        </div>
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
          <div className="team-performance-list" role="table">
            <div className="team-performance-row team-performance-head" role="row">
              <span className="team-performance-cell" role="columnheader">{t("modules.team.address")}</span>
              <span className="team-performance-cell" role="columnheader">{t("modules.team.joinedAt")}</span>
              <span className="team-performance-cell" role="columnheader">{t("modules.team.personalPerformance")}</span>
            </div>
            <div className="team-performance-body" role="rowgroup">{renderPerformanceRows()}</div>
          </div>
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
