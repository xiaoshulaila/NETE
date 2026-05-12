import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LoadingState from "../../components/common/LoadingState";
import { leadershipLevels } from "../../data/mockData";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getIncomeOverview, getReferralInfo } from "../../services/neteApi";
import { readNetworkUserData } from "../../services/neteContracts";
import { formatTokenAmount } from "../../utils/formatters";

export default function VipPage() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();
  const levelRequirements = t("modules.vip.levelRequirements", { returnObjects: true });
  const levelBonusRatios = t("modules.vip.levelBonusRatios", { returnObjects: true });

  const incomeOverviewQuery = useQuery({
    queryKey: ["nete", "income-overview", wallet.currentAddress],
    queryFn: () => getIncomeOverview(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 15_000,
    retry: 1,
  });

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

  const currentLevel = incomeOverviewQuery.data?.user_level ?? networkDataQuery.data?.userLevel ?? 0;
  const zonePerformance = formatTokenAmount(referralInfoQuery.data?.small_leg_perf ?? 0n, 18, 2);
  const vipLoading = incomeOverviewQuery.isLoading || referralInfoQuery.isLoading || networkDataQuery.isLoading;

  return (
    <section className="module-page space-y-10">
      <header className="module-hero">
        <p className="module-eyebrow">NETE VIP</p>
        <h1 className="mt-3 font-display text-xl font-black tracking-tight text-white md:text-2xl">{t("modules.vip.title")}</h1>

        {!wallet.isConnected ? <p className="mt-4 text-xs text-white/65">{t("modules.vip.connectHint")}</p> : null}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <span className="text-sm text-white/60">{t("modules.vip.currentLevel")}</span>
            <strong className="mt-2 block font-display text-xl font-bold text-white md:text-2xl">
              {vipLoading ? <LoadingState compact /> : `V${currentLevel}`}
            </strong>
          </div>
          <div>
            <span className="text-sm text-white/60">{t("modules.vip.zonePerformance")}</span>
            <strong className="mt-2 block font-display text-xl font-bold text-white md:text-2xl">
              {vipLoading ? <LoadingState compact /> : `${zonePerformance} NETE`}
            </strong>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="module-stat-card p-3">
            <span className="text-xs text-white/55">{t("modules.vip.pendingDividend")}</span>
            <p className="mt-1 text-sm font-semibold text-[#00ffc2]">
              {vipLoading ? <LoadingState compact /> : `${formatTokenAmount(incomeOverviewQuery.data?.pending_dividend ?? 0n, 18, 4)} NETE`}
            </p>
          </div>
          <div className="module-stat-card p-3">
            <span className="text-xs text-white/55">{t("modules.vip.totalDividend")}</span>
            <p className="mt-1 text-sm font-semibold text-[#00ffc2]">
              {vipLoading ? <LoadingState compact /> : `${formatTokenAmount(incomeOverviewQuery.data?.dividend_income_total ?? 0n, 18, 4)} NETE`}
            </p>
          </div>
          <div className="module-stat-card p-3">
            <span className="text-xs text-white/55">{t("modules.vip.totalV9")}</span>
            <p className="mt-1 text-sm font-semibold text-[#00ffc2]">
              {vipLoading ? <LoadingState compact /> : `${formatTokenAmount(incomeOverviewQuery.data?.v9_income_total ?? 0n, 18, 4)} NETE`}
            </p>
          </div>
        </div>
      </header>

      <section className="vip-level-section">
        <h2 className="vip-level-title">{t("modules.vip.levelIntro")}</h2>
        <div className="vip-level-panel">
          <div className="vip-level-list">
            {leadershipLevels.map((row, index) => (
              <article className="vip-level-card" key={row.level}>
                <div className="vip-level-card-main">
                  <h3>{row.level}</h3>
                  <p>{levelRequirements[index] || row.requirement}</p>
                </div>
                <span className="vip-level-badge">{t("modules.vip.category")}</span>

                <div className="vip-level-grid">
                  <div className="vip-level-tile">
                    <span>{t("modules.vip.requirement")}</span>
                    <strong>{levelRequirements[index] || row.requirement}</strong>
                  </div>
                  <div className="vip-level-tile">
                    <span>{t("modules.vip.bonusRatio")}</span>
                    <strong className="is-accent">{levelBonusRatios[index] || row.bonusRatio}</strong>
                  </div>
                  <div className="vip-level-tile">
                    <span>{t("modules.vip.fixedReward")}</span>
                    <strong>{row.fixedReward.toLocaleString()}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
