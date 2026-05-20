import { useMemo, useState } from "react";
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

const performanceFieldMap = {
  miner: {
    own: ["miner_own_perf", "own_miner_perf", "mining_own_perf", "own_mining_perf", "miner_perf", "mining_perf", "own_perf"],
    team: ["miner_team_perf", "team_miner_perf", "mining_team_perf", "team_mining_perf", "team_perf"],
    direct: ["miner_direct_perf", "direct_miner_perf", "mining_direct_perf", "direct_mining_perf", "direct_perf", "performance", "total_perf"],
    small: ["miner_small_leg_perf", "small_miner_perf", "mining_small_leg_perf", "small_mining_perf", "small_leg_perf"],
  },
  seed: {
    own: ["seed_own_perf", "own_seed_perf", "presale_own_perf", "own_presale_perf", "seed_perf", "presale_perf"],
    team: ["seed_team_perf", "team_seed_perf", "presale_team_perf", "team_presale_perf", "team_perf"],
    direct: ["seed_direct_perf", "direct_seed_perf", "presale_direct_perf", "direct_presale_perf"],
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

function toBigIntSafe(value) {
  if (typeof value === "bigint") return value;
  if (value === null || value === undefined || value === "") return 0n;
  try {
    return BigInt(String(value));
  } catch {
    return 0n;
  }
}

function pickBigInt(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return toBigIntSafe(source[key]);
    }
  }
  return 0n;
}

function pickNumber(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      const value = Number(source[key]);
      return Number.isFinite(value) ? value : 0;
    }
  }
  return 0;
}

function getMemberPerformance(member, type) {
  const fields = performanceFieldMap[type];
  const own = pickBigInt(member, fields.own);

  return {
    direct: pickBigInt(member, fields.direct) || own,
    team: pickBigInt(member, fields.team),
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
    queryKey: ["nete", "referral-directs", wallet.currentAddress, activePerformance],
    queryFn: () => getReferralDirects(wallet.currentAddress, { page: 1, pageSize: 50, type: activePerformance }).catch(() => []),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 0,
    retry: 0,
  });

  const referralInfo = referralInfoQuery.data || {};
  const performanceLegs = performanceLegsQuery.data || {};
  const directCount = Number(referralInfo.direct_count ?? 0);
  const maxDepth = Number(referralInfo.max_depth ?? 0);
  const currentLevel = performanceLegs.user_level ?? referralInfo.user_level ?? networkDataQuery.data?.userLevel ?? 0;

  const directMembers = useMemo(
    () => {
      const apiRows = toItems(directListQuery.data);
      if (apiRows.length > 0) return apiRows;
      return getFallbackDirects(referralInfo, activePerformance);
    },
    [activePerformance, directListQuery.data, referralInfo],
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

    if (directMembers.length === 0) {
      return (
        <tr className="team-empty-row">
          <td colSpan={4}>
            <div className="module-empty-state">{t("modules.team.emptyIncomeDetails")}</div>
          </td>
        </tr>
      );
    }

    return directMembers.map((member, index) => {
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
              onClick={() => setActivePerformance(tab.key)}
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
      </article>
    </section>
  );
}
