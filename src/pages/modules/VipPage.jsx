import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { leadershipLevels } from "../../data/mockData";
import vipImage from "../../assets/images/vip.png";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getIncomeOverview, getReferralInfo } from "../../services/neteApi";
import { readNetworkUserData } from "../../services/neteContracts";
import { formatTokenAmount } from "../../utils/formatters";

const vipBenefits = [
  { icon: "solar:headphones-round-outline" },
  { icon: "solar:users-group-two-rounded-outline" },
  { icon: "solar:gift-outline" },
  { icon: "solar:document-text-outline" },
  { icon: "solar:balloon-outline" },
  { icon: "solar:shield-check-outline" },
];

export default function VipPage() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();
  const upgradeNotes = t("modules.vip.upgradeNotes", { returnObjects: true });
  const glossary = t("modules.vip.glossary", { returnObjects: true });
  const benefits = t("modules.vip.benefits", { returnObjects: true });
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

  return (
    <section className="space-y-10">
      <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,520px)] lg:items-center">
        <div className="max-w-3xl">
          <p className="font-display text-base font-bold uppercase tracking-[0.12em] text-[#caff00] md:text-lg">NETE VIP</p>
          <h1 className="mt-3 font-display text-xl font-black tracking-tight text-white md:text-2xl">{t("modules.vip.title")}</h1>

          {!wallet.isConnected ? <p className="mt-4 text-xs text-white/65">{t("modules.vip.connectHint")}</p> : null}

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <span className="text-sm text-white/60">{t("modules.vip.currentLevel")}</span>
              <strong className="mt-2 block font-display text-xl font-bold text-white md:text-2xl">V{currentLevel}</strong>
            </div>
            <div>
              <span className="text-sm text-white/60">{t("modules.vip.zonePerformance")}</span>
              <strong className="mt-2 block font-display text-xl font-bold text-white md:text-2xl">{zonePerformance} NETE</strong>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-transparent p-3">
              <span className="text-xs text-white/55">{t("modules.vip.pendingDividend")}</span>
              <p className="mt-1 text-sm font-semibold text-[#00ffc2]">{formatTokenAmount(incomeOverviewQuery.data?.pending_dividend ?? 0n, 18, 4)} NETE</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-transparent p-3">
              <span className="text-xs text-white/55">{t("modules.vip.totalDividend")}</span>
              <p className="mt-1 text-sm font-semibold text-[#00ffc2]">{formatTokenAmount(incomeOverviewQuery.data?.dividend_income_total ?? 0n, 18, 4)} NETE</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-transparent p-3">
              <span className="text-xs text-white/55">{t("modules.vip.totalV9")}</span>
              <p className="mt-1 text-sm font-semibold text-[#00ffc2]">{formatTokenAmount(incomeOverviewQuery.data?.v9_income_total ?? 0n, 18, 4)} NETE</p>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[520px] lg:mx-0" aria-hidden="true">
          <img className="max-h-[220px] w-full object-contain" src={vipImage} alt="" />
        </div>
      </header>

      <section>
        <h2 className="mb-6 mt-20 text-center font-display text-xl font-black tracking-tight text-[#caff00] md:text-2xl">{t("modules.vip.levelIntro")}</h2>
        <div className="rounded-2xl border border-white/10 bg-transparent">
          <div className="flex flex-wrap gap-6 border-b border-white/10 px-5 py-5 text-white/55 md:px-10" role="tablist" aria-label={t("modules.vip.levelIntro")}>
            <button
              className="relative pb-2 text-sm font-semibold text-white transition after:absolute after:-bottom-[21px] after:left-0 after:right-0 after:h-[3px] after:rounded-full after:bg-white after:content-[''] md:text-sm"
              role="tab"
              type="button"
              aria-selected="true"
            >
              {t("modules.vip.category")}
            </button>
          </div>

          <div className="hidden overflow-x-auto p-5 md:block md:p-10">
            <ul className="min-w-[980px] overflow-hidden rounded-2xl border border-white/10">
              <li className="grid grid-cols-[170px_1fr_190px_220px_120px] bg-white/5 px-6 py-4 text-sm font-semibold text-white/80">
                <span>{t("modules.vip.level")}</span>
                <span>{t("modules.vip.requirement")}</span>
                <span>{t("modules.vip.bonusRatio")}</span>
                <span>{t("modules.vip.fixedReward")}</span>
                <span>{t("modules.vip.action")}</span>
              </li>
              {leadershipLevels.map((row, index) => (
                <li key={row.level} className="grid grid-cols-[170px_1fr_190px_220px_120px] border-t border-white/10 px-6 py-4 text-sm text-white/85">
                  <span>
                    <span className="inline-flex min-w-[62px] items-center justify-center rounded-full border border-[#caff00]/45 bg-[#caff00]/10 px-3 py-1 text-sm font-semibold text-[#caff00]">
                      {row.level}
                    </span>
                  </span>
                  <span>{levelRequirements[index] || row.requirement}</span>
                  <span className="font-semibold text-[#00ffc2]">{levelBonusRatios[index] || row.bonusRatio}</span>
                  <span>{row.fixedReward.toLocaleString()}</span>
                  <span>
                    <button className="inline-flex min-h-10 min-w-[92px] items-center justify-center rounded-full bg-[#caff00] px-4 text-sm font-semibold text-black transition hover:shadow-[0_0_25px_rgba(202,255,0,0.45)]" type="button">
                      {t("modules.vip.view")}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="space-y-2 p-4 md:hidden">
            {leadershipLevels.map((row, index) => (
              <li key={`mobile-${row.level}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex min-w-[56px] items-center justify-center rounded-full border border-[#caff00]/45 bg-[#caff00]/10 px-3 py-1 text-xs font-semibold text-[#caff00]">
                    {row.level}
                  </span>
                  <button className="inline-flex min-h-8 min-w-[74px] items-center justify-center rounded-full bg-[#caff00] px-3 text-xs font-semibold text-black" type="button">
                    {t("modules.vip.view")}
                  </button>
                </div>
                <div className="mt-3 space-y-1.5 text-[11px] text-white/75">
                  <p>
                    <span className="text-white/55">{t("modules.vip.requirement")}:</span>
                    {levelRequirements[index] || row.requirement}
                  </p>
                  <p>
                    <span className="text-white/55">{t("modules.vip.bonusRatio")}:</span>
                    <span className="font-semibold text-[#00ffc2]">{levelBonusRatios[index] || row.bonusRatio}</span>
                  </p>
                  <p>
                    <span className="text-white/55">{t("modules.vip.fixedReward")}:</span>
                    {row.fixedReward.toLocaleString()} NETE
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-16 md:space-y-20">
        <article>
          <h3 className="mb-8 font-display text-xl font-bold text-white md:text-2xl">{t("modules.vip.upgradeTitle")}</h3>
          <ul className="list-disc space-y-3 pl-6 text-sm leading-relaxed text-white/65 marker:text-white/65">
            {upgradeNotes.map((item, index) => (
              <li key={item}>
                {item}
                {index === upgradeNotes.length - 1 ? <span className="ml-2 text-[#caff00] underline decoration-dotted underline-offset-4">{t("modules.vip.submit")}</span> : null}
              </li>
            ))}
          </ul>
        </article>

        <article>
          <h3 className="mb-8 font-display text-xl font-bold text-white md:text-2xl">{t("modules.vip.glossaryTitle")}</h3>
          <ul className="list-disc space-y-3 pl-6 text-sm leading-relaxed text-white/65 marker:text-white/65">
            {glossary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article>
          <h3 className="mb-8 font-display text-xl font-bold text-white md:text-2xl">{t("modules.vip.benefitsTitle")}</h3>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {vipBenefits.map((item, index) => (
              <article
                key={item.icon}
                className="flex min-h-[70px] items-center gap-4 rounded-[22px] bg-[#14141b] px-5 py-3 text-sm text-white md:min-h-[70px] md:gap-4 md:px-6 md:py-3 md:text-sm"
              >
                <span className="shrink-0 text-[1.4rem] text-white/95 md:text-[1.4rem]" aria-hidden="true">
                  <Icon icon={item.icon} width="1em" height="1em" />
                </span>
                <p className="font-medium tracking-wide text-white/92">{benefits[index]}</p>
              </article>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
