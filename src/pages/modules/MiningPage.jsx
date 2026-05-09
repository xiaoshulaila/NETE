import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { NETE_CHAIN, getContractConfigMissingKeys, isContractConfigReady } from "../../config/neteRuntime";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getRuntimeConfig } from "../../services/neteApi";
import { activateMiner, approveNeteToCore, claimReward, readTierConfigs, readUserMiningData, withdrawProfit } from "../../services/neteContracts";
import { formatTokenAmount } from "../../utils/formatters";

const MINING_VIEWS = [
  { key: "buy-miners", labelKey: "modules.mining.tabs.buyMiners" },
  { key: "my-miners", labelKey: "modules.mining.tabs.myMiners" },
  { key: "rules", labelKey: "modules.mining.tabs.rules" },
];
const MINING_CONTRACT_KEYS = ["neteToken", "neteCore"];

function parsePercent(rateText) {
  const parsed = Number(String(rateText || "").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDaysByEpoch(endAt) {
  if (!endAt) return 0;
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = Number(endAt) - nowSec;
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400);
}

export default function MiningPage() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState("buy-miners");
  const [selectedModel, setSelectedModel] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState("1");
  const [acceptedAgreement, setAcceptedAgreement] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [txMessage, setTxMessage] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [claimingId, setClaimingId] = useState("");
  const [withdrawingId, setWithdrawingId] = useState("");

  const tiersQuery = useQuery({
    queryKey: ["nete", "miner-tiers"],
    queryFn: () => readTierConfigs(20),
    staleTime: 15_000,
    retry: 1,
  });

  const miningDataQuery = useQuery({
    queryKey: ["nete", "mining", wallet.currentAddress],
    queryFn: () => readUserMiningData(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 10_000,
    retry: 1,
  });

  const runtimeConfigQuery = useQuery({
    queryKey: ["nete", "runtime-config"],
    queryFn: getRuntimeConfig,
    staleTime: 20_000,
    retry: 1,
  });

  const machineModels = useMemo(
    () =>
      (tiersQuery.data || []).map((tier) => ({
        model: t("modules.mining.modelName", { amount: formatTokenAmount(tier.principal, 18, 0) }),
        price: Number(tier.principalText),
        principalWei: tier.principal,
        unitCount: tier.maxSlots,
        periodDays: tier.cycleDays,
        returnRate: tier.returnRateText,
        extendDays: tier.extendDays,
        maxPeriodDays: tier.maxDays,
        withdrawFee: Number((tier.feeBps / 100).toFixed(2)),
        remaining: tier.maxSlots,
        tierIndex: tier.tierIndex,
      })),
    [t, tiersQuery.data],
  );

  const purchasedMachines = useMemo(() => {
    const tiersMap = new Map(machineModels.map((model) => [model.tierIndex, model]));
    const positions = miningDataQuery.data?.positions || [];

    return positions.map((position) => {
      const tier = tiersMap.get(position.tierIndex);
      const cycleTotal = position.cycleTotalDays > 0 ? position.cycleTotalDays : 1;
      const cycleCurrent = Math.max(0, Math.min(position.cyclePassedDays, cycleTotal));

      return {
        model: tier?.model || `T${position.tierIndex}`,
        quantity: 1,
        cycleProgress: t("modules.mining.units.positionProgress", { current: cycleCurrent, total: cycleTotal }),
        output: `${formatTokenAmount(position.grossClaimed, 18, 4)} NETE`,
        pending: `${formatTokenAmount(position.pendingReward, 18, 4)} NETE`,
        profit: `${formatTokenAmount(position.profit, 18, 4)} NETE`,
        profitWei: position.profit,
        remainingDays: formatDaysByEpoch(position.endAt),
        positionId: position.positionId,
        cycleCurrent,
        cycleTotal,
      };
    });
  }, [machineModels, miningDataQuery.data, t]);

  const airdropMachineStatus = useMemo(() => {
    const info = miningDataQuery.data?.airdropInfo;
    const related = (miningDataQuery.data?.positions || []).find((item) => item.positionId === String(info?.positionId || ""));

    return {
      synthesized: Boolean(info?.composed),
      permanent: Boolean(info?.promoted),
      validityLeftDays: info?.expireAt ? formatDaysByEpoch(Number(info.expireAt)) : 0,
      produced: related ? `${formatTokenAmount(related.grossClaimed, 18, 4)} NETE` : "0 NETE",
      triggerGiftRule: t("modules.mining.rules.giftRuleValue"),
    };
  }, [miningDataQuery.data, t]);

  const amountValue = Number(purchaseAmount);
  const isAmountValid = Number.isInteger(amountValue) && amountValue >= 1;

  const projectedCost = useMemo(() => {
    if (!selectedModel || !isAmountValid) return 0;
    return selectedModel.price * amountValue;
  }, [amountValue, isAmountValid, selectedModel]);

  const projectedOutput = useMemo(() => {
    if (!selectedModel || !isAmountValid) return 0;
    return projectedCost * (parsePercent(selectedModel.returnRate) / 100);
  }, [isAmountValid, projectedCost, selectedModel]);

  const summaryCards = useMemo(() => {
    const holdings = purchasedMachines.length;
    const totalOutputValue = purchasedMachines.reduce((sum, item) => {
      const raw = Number(item.output.replace(/[^\d.]/g, ""));
      return sum + (Number.isFinite(raw) ? raw : 0);
    }, 0);

    const avgProgress = purchasedMachines.length
      ? Math.round(
          purchasedMachines.reduce((sum, item) => sum + Math.round((item.cycleCurrent / item.cycleTotal) * 100), 0) / purchasedMachines.length,
        )
      : 0;

    const avgRemaining = purchasedMachines.length
      ? Math.round(purchasedMachines.reduce((sum, item) => sum + item.remainingDays, 0) / purchasedMachines.length)
      : 0;

    return [
      { label: t("modules.mining.summary.holdings"), value: t("modules.mining.units.machines", { count: holdings }) },
      { label: t("modules.mining.summary.positions"), value: t("modules.mining.units.positions", { count: holdings }) },
      { label: t("modules.mining.summary.output"), value: `${totalOutputValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} NETE`, accent: true },
      { label: t("modules.mining.summary.avgProgress"), value: `${avgProgress}%` },
      { label: t("modules.mining.summary.avgRemaining"), value: t("modules.mining.units.days", { count: avgRemaining }) },
      { label: t("modules.mining.summary.airdrop"), value: airdropMachineStatus.permanent ? t("modules.mining.statuses.permanent") : t("modules.mining.statuses.notPermanent") },
    ];
  }, [airdropMachineStatus.permanent, purchasedMachines, t]);

  const planStats = useMemo(() => {
    const maxRate = machineModels.reduce((max, item) => Math.max(max, parsePercent(item.returnRate)), 0);
    const minDays = machineModels.reduce((min, item) => Math.min(min, item.periodDays), Number.POSITIVE_INFINITY);
    const maxDays = machineModels.reduce((max, item) => Math.max(max, item.periodDays), 0);

    return {
      modelCount: machineModels.length,
      maxRate,
      cycleRange: machineModels.length ? t("modules.mining.units.cycleRange", { min: minDays, max: maxDays }) : "--",
    };
  }, [machineModels, t]);

  const miningConfigMessage = useMemo(() => {
    const missingKeys = getContractConfigMissingKeys(MINING_CONTRACT_KEYS);
    if (!isContractConfigReady(MINING_CONTRACT_KEYS)) {
      return t("modules.mining.buy.missingContracts", { keys: missingKeys.join(", ") });
    }

    if (tiersQuery.isError) {
      const message = tiersQuery.error instanceof Error ? tiersQuery.error.message : "";
      return t("modules.mining.buy.loadFailed", { message });
    }

    return t("modules.mining.buy.emptyDesc", { chain: NETE_CHAIN.name });
  }, [t, tiersQuery.error, tiersQuery.isError]);

  const portfolioRows = useMemo(
    () =>
      purchasedMachines.map((item, index) => {
        const progressPercent = Math.round((item.cycleCurrent / item.cycleTotal) * 100);
        return {
          ...item,
          recordId: `POS-${String(index + 1).padStart(3, "0")}`,
          progressPercent,
        };
      }),
    [purchasedMachines],
  );

  function openPurchaseModal(model = machineModels[0]) {
    if (!model) return;
    setSelectedModel(model);
    setPurchaseAmount("1");
    setAcceptedAgreement(false);
    setModelPickerOpen(false);
    setTxMessage("");
  }

  function closePurchaseModal() {
    setSelectedModel(null);
    setPurchaseAmount("1");
    setAcceptedAgreement(false);
    setModelPickerOpen(false);
  }

  function openAgreementModal() {
    setAgreementOpen(true);
  }

  function closeAgreementModal() {
    setAgreementOpen(false);
  }

  function openAgreementFromPurchase() {
    closePurchaseModal();
    setAgreementOpen(true);
  }

  const repurchasePaused = Boolean(runtimeConfigQuery.data?.repurchase_paused);
  const canSubmitPurchase = Boolean(selectedModel) && isAmountValid && acceptedAgreement && wallet.isConnected && !purchasing && !repurchasePaused;

  const handlePurchase = async () => {
    if (!canSubmitPurchase || !selectedModel) return;

    try {
      setPurchasing(true);
      setTxMessage("");
      await wallet.ensureCorrectChain();

      const totalApprove = selectedModel.principalWei * BigInt(amountValue);
      await approveNeteToCore(wallet.currentAddress, totalApprove);

      let latestHash = "";
      for (let index = 0; index < amountValue; index += 1) {
        const tx = await activateMiner(wallet.currentAddress, selectedModel.tierIndex);
        latestHash = tx.hash;
      }

      setTxMessage(t("modules.mining.messages.purchaseSuccess", { hash: latestHash }));
      await queryClient.invalidateQueries({ queryKey: ["nete", "mining", wallet.currentAddress] });
      closePurchaseModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("modules.mining.messages.purchaseFailed");
      setTxMessage(message);
    } finally {
      setPurchasing(false);
    }
  };

  const handleClaim = async (positionId) => {
    if (!wallet.isConnected || !positionId || claimingId || withdrawingId) return;

    try {
      setClaimingId(positionId);
      setTxMessage("");
      await wallet.ensureCorrectChain();
      const tx = await claimReward(wallet.currentAddress, positionId);
      setTxMessage(t("modules.mining.messages.claimSuccess", { hash: tx.hash }));
      await queryClient.invalidateQueries({ queryKey: ["nete", "mining", wallet.currentAddress] });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("modules.mining.messages.claimFailed");
      setTxMessage(message);
    } finally {
      setClaimingId("");
    }
  };

  const handleWithdraw = async (positionId, amount) => {
    if (!wallet.isConnected || !positionId || amount <= 0n || withdrawingId || claimingId) return;

    try {
      setWithdrawingId(positionId);
      setTxMessage("");
      await wallet.ensureCorrectChain();
      const tx = await withdrawProfit(wallet.currentAddress, positionId, amount);
      setTxMessage(t("modules.mining.messages.withdrawSuccess", { hash: tx.hash }));
      await queryClient.invalidateQueries({ queryKey: ["nete", "mining", wallet.currentAddress] });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("modules.mining.messages.withdrawFailed");
      setTxMessage(message);
    } finally {
      setWithdrawingId("");
    }
  };

  return (
    <section className="mining-page">
      <header className="mining-view-tabs" role="tablist" aria-label={t("nav.mining")}>
        {MINING_VIEWS.map((tab) => (
          <button
            key={tab.key}
            className={activeView === tab.key ? "mining-view-tab is-active" : "mining-view-tab"}
            type="button"
            role="tab"
            aria-selected={activeView === tab.key}
            onClick={() => setActiveView(tab.key)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </header>

      {txMessage ? <p className="mt-3 text-xs text-white/75 break-all">{txMessage}</p> : null}
      {wallet.isConnected ? null : <p className="mt-2 text-xs text-white/65">{t("modules.mining.messages.connectFirst")}</p>}

      {activeView === "my-miners" ? (
        <div className="mining-view-panel">
          <div className="mining-hero mining-hero--portfolio">
            <div className="mining-hero__inner">
              <div className="mining-hero__main">
                <p className="mining-eyebrow">{t("modules.mining.portfolio.eyebrow")}</p>
                <h1>{t("modules.mining.portfolio.title")}</h1>
                <p>{t("modules.mining.portfolio.desc")}</p>
                <div className="mining-hero__actions">
                  <button type="button" className="mining-btn mining-btn--primary" onClick={() => setActiveView("buy-miners")}>{t("modules.mining.portfolio.buyButton")}</button>
                  <button type="button" className="mining-btn mining-btn--ghost" onClick={openAgreementModal}>{t("modules.mining.portfolio.rulesButton")}</button>
                </div>
              </div>
              <aside className="mining-side-card">
                <p className="mining-eyebrow">ON-CHAIN</p>
                <h2>{t("modules.mining.portfolio.addressStatus")}</h2>
                <div className="mining-side-grid">
                  <div><span>{t("modules.mining.portfolio.walletAddress")}</span><strong>{wallet.shortAddress}</strong></div>
                  <div><span>{t("modules.mining.portfolio.positionCount")}</span><strong>{t("modules.mining.units.positions", { count: portfolioRows.length })}</strong></div>
                  <div><span>{t("modules.mining.portfolio.airdropStatus")}</span><strong>{airdropMachineStatus.synthesized ? t("modules.mining.statuses.synthesized") : t("modules.mining.statuses.notSynthesized")}</strong></div>
                  <div><span>{t("modules.mining.portfolio.networkStatus")}</span><strong>{wallet.isWrongChain ? t("modules.mining.statuses.wrongChain") : t("modules.mining.statuses.normal")}</strong></div>
                </div>
              </aside>
            </div>
          </div>

          <section className="mining-section">
            <div className="mining-section__head">
              <div>
                <h3>{t("modules.mining.portfolio.overviewTitle")}</h3>
                <p>{t("modules.mining.portfolio.overviewDesc")}</p>
              </div>
            </div>
            <div className="mining-summary-strip">
              {summaryCards.map((card) => (
                <article key={card.label} className="mining-summary-card">
                  <span>{card.label}</span>
                  <strong className={card.accent ? "is-accent" : ""}>{card.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="mining-section">
            <div className="mining-section__head">
              <div>
                <h3>{t("modules.mining.portfolio.listTitle")}</h3>
                <p>{t("modules.mining.portfolio.listDesc")}</p>
              </div>
            </div>
            <div className="mining-panel-card">
              <div className="mining-portfolio-list">
                {portfolioRows.length === 0 ? (
                  <article className="mining-portfolio-item">
                    <div className="mining-portfolio-item__top">
                      <div>
                        <div className="mining-portfolio-item__title"><h4>{t("modules.mining.portfolio.emptyTitle")}</h4></div>
                        <div className="mining-portfolio-item__meta"><span>{t("modules.mining.portfolio.emptyDesc")}</span></div>
                      </div>
                    </div>
                  </article>
                ) : (
                  portfolioRows.map((machine) => (
                    <article key={machine.positionId} className="mining-portfolio-item">
                      <div className="mining-portfolio-item__top">
                        <div>
                          <div className="mining-portfolio-item__title">
                            <h4>{machine.model}</h4>
                            <span className="mining-chip">{machine.recordId}</span>
                          </div>
                          <div className="mining-portfolio-item__meta">
                            <span>{t("modules.mining.portfolio.produced")} {machine.output}</span>
                            <span>{t("modules.mining.portfolio.pending")} {machine.pending}</span>
                            <span>{t("modules.mining.portfolio.profit")} {machine.profit}</span>
                          </div>
                        </div>
                        <span className="mining-chip mining-chip--status">{t("modules.mining.statuses.running")}</span>
                      </div>

                      <div className="mining-progress">
                        <div className="mining-progress__track">
                          <span className="mining-progress__fill" style={{ width: `${machine.progressPercent}%` }}></span>
                        </div>
                      </div>

                      <div className="mining-portfolio-grid">
                        <div className="mining-info-tile">
                          <span>{t("modules.mining.portfolio.cycleProgress")}</span>
                          <strong>{t("modules.mining.units.positionProgress", { current: machine.cycleCurrent, total: machine.cycleTotal })}</strong>
                        </div>
                        <div className="mining-info-tile">
                          <span>{t("modules.mining.portfolio.remainingCycle")}</span>
                          <strong>{t("modules.mining.units.days", { count: machine.remainingDays })}</strong>
                        </div>
                        <div className="mining-info-tile">
                          <span>{t("modules.mining.portfolio.positionId")}</span>
                          <strong className="is-accent">#{machine.positionId}</strong>
                        </div>
                        <div className="mining-info-tile mining-info-tile--action">
                          <button
                            className="mining-btn mining-btn--inline"
                            type="button"
                            disabled={claimingId === machine.positionId || !wallet.isConnected || Boolean(withdrawingId)}
                            onClick={() => handleClaim(machine.positionId)}
                          >
                            {claimingId === machine.positionId ? t("modules.mining.portfolio.claiming") : t("modules.mining.portfolio.claim")}
                          </button>
                        </div>
                        <div className="mining-info-tile mining-info-tile--action">
                          <button
                            className="mining-btn mining-btn--inline"
                            type="button"
                            disabled={withdrawingId === machine.positionId || !wallet.isConnected || machine.profitWei <= 0n || Boolean(claimingId)}
                            onClick={() => handleWithdraw(machine.positionId, machine.profitWei)}
                          >
                            {withdrawingId === machine.positionId ? t("modules.mining.portfolio.withdrawing") : t("modules.mining.portfolio.withdraw")}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeView === "buy-miners" ? (
        <div className="mining-view-panel">
          <div className="mining-hero mining-hero--buy">
            <div className="mining-hero__inner">
              <div className="mining-hero__main">
                <p className="mining-eyebrow">{t("modules.mining.buy.eyebrow")}</p>
                <h1>{t("modules.mining.buy.title")}</h1>
                <p>{t("modules.mining.buy.desc")}</p>
              </div>

              <div className="mining-stats-strip">
                <article className="mining-stat-card"><span>{t("modules.mining.buy.modelCount")}</span><strong>{planStats.modelCount}</strong></article>
                <article className="mining-stat-card"><span>{t("modules.mining.buy.maxRate")}</span><strong className="is-accent">{planStats.maxRate}%</strong></article>
                <article className="mining-stat-card"><span>{t("modules.mining.buy.cycleRange")}</span><strong>{planStats.cycleRange}</strong></article>
                <article className="mining-stat-card"><span>{t("modules.mining.buy.action")}</span><strong>{t("modules.mining.buy.actionValue")}</strong></article>
              </div>
            </div>
          </div>

          <section className="mining-section">
            <div className="mining-section__head">
              <div>
                <h3>{t("modules.mining.buy.listTitle")}</h3>
                <p>{t("modules.mining.buy.listDesc")}</p>
              </div>
            </div>
            <div className="mining-panel-card">
              <div className="mining-plan-list">
                {tiersQuery.isLoading ? (
                  <article className="mining-plan-item"><div><h4>{t("modules.mining.buy.loadingTitle")}</h4><p>{t("modules.mining.buy.loadingDesc", { chain: NETE_CHAIN.name })}</p></div></article>
                ) : tiersQuery.isError || machineModels.length === 0 ? (
                  <article className="mining-plan-item">
                    <div>
                      <h4>{tiersQuery.isError ? t("modules.mining.buy.loadFailedTitle") : t("modules.mining.buy.emptyTitle")}</h4>
                      <p>{miningConfigMessage}</p>
                    </div>
                  </article>
                ) : (
                  machineModels.map((model) => (
                    <article key={model.tierIndex} className="mining-plan-item">
                      <div>
                        <h4>{model.model}</h4>
                        <p>{model.price} NETE</p>
                      </div>

                      <div className="mining-plan-grid">
                        <div className="mining-info-tile"><span>{t("modules.mining.buy.totalRate")}</span><strong className="is-accent">{model.returnRate}</strong></div>
                        <div className="mining-info-tile"><span>{t("modules.mining.buy.unitLimit")}</span><strong>{t("modules.mining.units.machines", { count: model.unitCount })}</strong></div>
                        <div className="mining-info-tile"><span>{t("modules.mining.buy.cycle")}</span><strong>{t("modules.mining.units.days", { count: model.periodDays })}</strong></div>
                        <div className="mining-info-tile"><span>{t("modules.mining.buy.withdrawFee")}</span><strong>{model.withdrawFee}%</strong></div>
                      </div>

                      <div className="mining-plan-action">
                        <button
                          className="mining-btn mining-btn--primary"
                          type="button"
                          onClick={() => openPurchaseModal(model)}
                          disabled={!wallet.isConnected || repurchasePaused}
                        >
                          {t("modules.mining.buy.actionValue")}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeView === "rules" ? (
        <div className="mining-view-panel">
          <div className="mining-hero mining-hero--rules">
            <div className="mining-hero__inner">
              <div className="mining-hero__main">
                <p className="mining-eyebrow">{t("modules.mining.rules.eyebrow")}</p>
                <h1>{t("modules.mining.rules.title")}</h1>
                <p>{t("modules.mining.rules.desc")}</p>
                <div className="mining-hero__actions">
                  <button type="button" className="mining-btn mining-btn--primary" onClick={openAgreementModal}>{t("modules.mining.rules.fullProtocol")}</button>
                </div>
              </div>

              <div className="mining-stats-strip">
                <article className="mining-stat-card"><span>{t("modules.mining.rules.viewMode")}</span><strong>{t("modules.mining.rules.splitView")}</strong></article>
                <article className="mining-stat-card"><span>{t("modules.mining.rules.positionMode")}</span><strong>{t("modules.mining.rules.rowRecords")}</strong></article>
                <article className="mining-stat-card"><span>{t("modules.mining.rules.buyList")}</span><strong>{t("modules.mining.rules.onchainConfig")}</strong></article>
                <article className="mining-stat-card"><span>{t("modules.mining.rules.cycleField")}</span><strong>{t("modules.mining.rules.keepVisible")}</strong></article>
              </div>
            </div>
          </div>

          <section className="mining-section">
            <div className="mining-section__head">
              <div>
                <h3>{t("modules.mining.rules.titleShort")}</h3>
                <p>{t("modules.mining.rules.descShort")}</p>
              </div>
            </div>

            <div className="mining-rules-grid">
              <article className="mining-rule-card">
                <span className="mining-rule-card__index">01</span>
                <h4>{t("modules.mining.rules.airdropTitle")}</h4>
                <p>{t("modules.mining.rules.synthesized")}：{airdropMachineStatus.synthesized ? t("modules.mining.statuses.synthesized") : t("modules.mining.statuses.notSynthesized")}</p>
                <p>{t("modules.mining.rules.permanent")}：{airdropMachineStatus.permanent ? t("modules.mining.statuses.permanent") : t("modules.mining.statuses.notPermanent")}</p>
                <p>{t("modules.mining.rules.validityLeft")}：{t("modules.mining.units.days", { count: airdropMachineStatus.validityLeftDays })}</p>
                <p>{t("modules.mining.rules.produced")}：{airdropMachineStatus.produced}</p>
                <p>{t("modules.mining.rules.giftRule")}：{airdropMachineStatus.triggerGiftRule}</p>
              </article>

              <article className="mining-rule-card">
                <span className="mining-rule-card__index">02</span>
                <h4>{t("modules.mining.rules.outputWalletTitle")}</h4>
                <ul>
                  {t("modules.mining.rules.outputWalletRules", { returnObjects: true }).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="mining-rule-card">
                <span className="mining-rule-card__index">03</span>
                <h4>{t("modules.mining.rules.reductionTitle")}</h4>
                <ul>
                  {t("modules.mining.rules.reductionRules", { returnObjects: true }).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <ul>
                  {t("modules.mining.rules.feeRules", { returnObjects: true }).map((row) => (
                    <li key={row.item}>{row.item}：{row.ratio}（{row.use}）</li>
                  ))}
                </ul>
              </article>
            </div>
          </section>
        </div>
      ) : null}

      {selectedModel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-2 pb-2 pt-2 backdrop-blur-sm md:items-center md:bg-black/75 md:px-2 md:py-4" onClick={closePurchaseModal} role="presentation">
          <article
            className="mobile-drawer-enter max-h-[70dvh] w-full max-w-[760px] overflow-y-auto rounded-t-[20px] rounded-b-none border border-white/10 bg-[#141419] p-4 text-white shadow-[0_25px_80px_rgba(0,0,0,0.55)] md:max-h-[92vh] md:rounded-[24px] md:p-5"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedModel.model} ${t("modules.mining.modal.subscribe")}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ff9900] text-base font-bold text-white">B</span>
                <h3 className="font-display text-lg font-bold tracking-tight text-white md:text-xl">{selectedModel.model} {t("modules.mining.modal.subscribe")}</h3>
              </div>
              <button className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xl leading-none text-white/70 transition hover:bg-white/10 hover:text-white" type="button" onClick={closePurchaseModal} aria-label={t("modules.mining.modal.close")}>
                <Icon icon="solar:close-circle-outline" width="1em" height="1em" />
              </button>
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-white/90">{t("modules.mining.modal.model")}</label>
              <div className="relative mt-2">
                <button
                  className="flex h-11 w-full items-center justify-between rounded-xl border border-white/20 bg-black/35 px-3 text-left text-sm font-semibold text-white transition hover:border-white/35"
                  type="button"
                  onClick={() => setModelPickerOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={modelPickerOpen}
                >
                  <span className="truncate">{selectedModel.model} - {selectedModel.price} NETE</span>
                  <span className={`ml-3 shrink-0 text-base text-white/70 transition-transform ${modelPickerOpen ? "rotate-180" : ""}`} aria-hidden="true">
                    <Icon icon="solar:alt-arrow-down-outline" width="1em" height="1em" />
                  </span>
                </button>

                {modelPickerOpen ? (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/15 bg-[#1a1a22] shadow-[0_16px_50px_rgba(0,0,0,0.55)]">
                    <div className="max-h-56 overflow-y-auto py-1.5" role="listbox" aria-label={t("modules.mining.modal.picker")}>
                      {machineModels.map((model) => {
                        const active = selectedModel.tierIndex === model.tierIndex;
                        return (
                          <button
                            key={model.tierIndex}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${active ? "bg-[#caff00]/12 text-[#dcff64]" : "text-white/90 hover:bg-white/5"}`}
                            type="button"
                            onClick={() => {
                              setSelectedModel(model);
                              setPurchaseAmount("1");
                              setAcceptedAgreement(false);
                              setModelPickerOpen(false);
                            }}
                            role="option"
                            aria-selected={active}
                          >
                            <span className="truncate">{model.model} - {model.price} NETE</span>
                            {active ? (
                              <span className="ml-3 shrink-0 text-base text-[#caff00]" aria-hidden="true">
                                <Icon icon="solar:check-circle-bold" width="1em" height="1em" />
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-base font-semibold text-white/90">{t("modules.mining.modal.referenceRate")}</div>
              <div className="mt-1.5 inline-flex items-center rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/85">{t("modules.mining.modal.onchainRules")}</div>
              <p className="mt-1.5 font-display text-2xl font-black text-[#caff00]">{selectedModel.returnRate}</p>
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold text-white/90" htmlFor="mining-purchase-input">{t("modules.mining.modal.quantity")}</label>
              <div className="mt-2 flex h-12 items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4">
                <input
                  id="mining-purchase-input"
                  className="w-full bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/45"
                  type="number"
                  min="1"
                  step="1"
                  value={purchaseAmount}
                  onChange={(event) => setPurchaseAmount(event.target.value)}
                  placeholder={t("modules.mining.modal.minPlaceholder")}
                />
                <span className="shrink-0 text-sm font-semibold text-white/65">{t("modules.mining.modal.unit")}</span>
              </div>
            </div>

            <section className="mt-6">
              <h4 className="text-2xl font-black leading-none text-white">{t("modules.mining.modal.calculator")}</h4>
              <div className="mt-3 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-xs md:grid-cols-2 md:text-sm">
                <div>
                  <p className="text-white/55">{t("modules.mining.modal.estimatedCost")}</p>
                  <p className="mt-1 text-base font-semibold text-white">{isAmountValid ? `${projectedCost.toLocaleString()} NETE` : "--"}</p>
                </div>
                <div>
                  <p className="text-white/55">{t("modules.mining.modal.estimatedOutput")}</p>
                  <p className="mt-1 text-base font-semibold text-[#caff00]">{isAmountValid ? `${projectedOutput.toLocaleString(undefined, { maximumFractionDigits: 2 })} NETE` : "--"}</p>
                </div>
              </div>
            </section>

            <div className="mt-5 space-y-3">
              <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/75 sm:grid-cols-2 md:text-sm">
                <p>{t("modules.mining.modal.extend")}：{t("modules.mining.units.days", { count: selectedModel.extendDays })}</p>
                <p>{t("modules.mining.modal.maxCycle")}：{t("modules.mining.units.days", { count: selectedModel.maxPeriodDays })}</p>
                <p>{t("modules.mining.modal.withdrawFee")}：{selectedModel.withdrawFee}%</p>
                <p>{t("modules.mining.modal.singleCycle")}：{t("modules.mining.units.days", { count: selectedModel.periodDays })}</p>
              </div>

              <label className="flex items-start gap-2 text-xs text-white/70 md:text-sm">
                <input className="mt-0.5 h-4 w-4 rounded border border-white/30 bg-transparent accent-[#caff00]" type="checkbox" checked={acceptedAgreement} onChange={(event) => setAcceptedAgreement(event.target.checked)} />
                <span>
                  {t("modules.mining.modal.agreementPrefix")}
                  <button className="ml-1 font-semibold text-[#caff00] underline decoration-dotted underline-offset-4" type="button" onClick={openAgreementFromPurchase}>
                    {t("modules.mining.modal.agreement")}
                  </button>
                </span>
              </label>
            </div>

            <button
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#caff00] text-base font-semibold text-black transition enabled:hover:shadow-[0_0_30px_rgba(202,255,0,0.45)] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45"
              type="button"
              disabled={!canSubmitPurchase}
              onClick={handlePurchase}
            >
              {purchasing ? t("modules.mining.modal.submitting") : t("modules.mining.modal.submit")}
            </button>
            {repurchasePaused ? <p className="mt-2 text-center text-xs text-white/65">{t("modules.mining.messages.paused")}</p> : null}
          </article>
        </div>
      ) : null}

      {agreementOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-2 pb-2 pt-2 backdrop-blur-sm md:items-center md:bg-black/75 md:px-2 md:py-4" onClick={closeAgreementModal} role="presentation">
          <article
            className="mobile-drawer-enter max-h-[70dvh] w-full max-w-[1200px] overflow-y-auto rounded-t-[20px] rounded-b-none border border-white/10 bg-[#141419] p-4 text-white shadow-[0_25px_80px_rgba(0,0,0,0.55)] md:max-h-[92vh] md:rounded-[24px] md:p-7"
            role="dialog"
            aria-modal="true"
            aria-label={t("modules.mining.modal.agreementTitle")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <h3 className="font-display text-lg font-bold tracking-tight text-white md:text-xl">{t("modules.mining.modal.agreementTitle")}</h3>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-full text-2xl leading-none text-white/70 transition hover:bg-white/10 hover:text-white" type="button" onClick={closeAgreementModal} aria-label={t("modules.mining.modal.close")}>
                <Icon icon="solar:close-circle-outline" width="1em" height="1em" />
              </button>
            </div>

            <div className="mt-5 space-y-6 text-xs leading-relaxed text-white/85 md:text-sm">
              <section className="space-y-4">
                <h4 className="text-2xl font-bold text-white md:text-2xl"><span className="text-[#caff00]">1.</span> {t("modules.mining.rules.airdropTitle")}</h4>
                <div className="space-y-1">
                  <p>{t("modules.mining.rules.synthesized")}：{airdropMachineStatus.synthesized ? t("modules.mining.statuses.synthesized") : t("modules.mining.statuses.notSynthesized")}</p>
                  <p>{t("modules.mining.rules.permanent")}：{airdropMachineStatus.permanent ? t("modules.mining.statuses.permanent") : t("modules.mining.statuses.notPermanent")}</p>
                  <p>{t("modules.mining.rules.validityLeft")}：{t("modules.mining.units.days", { count: airdropMachineStatus.validityLeftDays })}</p>
                  <p>{t("modules.mining.rules.produced")}：{airdropMachineStatus.produced}</p>
                  <p>{t("modules.mining.rules.giftRule")}：{airdropMachineStatus.triggerGiftRule}</p>
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-xl font-bold text-white md:text-2xl"><span className="text-[#caff00]">2.</span> {t("modules.mining.rules.outputWalletTitle")}</h4>
                <div className="space-y-1">{t("modules.mining.rules.outputWalletRules", { returnObjects: true }).map((item) => <p key={item}>{item}</p>)}</div>
              </section>

              <section className="space-y-4">
                <h4 className="text-xl font-bold text-white md:text-2xl"><span className="text-[#caff00]">3.</span> {t("modules.mining.modal.reductionTitle")}</h4>
                <div className="space-y-1">{t("modules.mining.rules.reductionRules", { returnObjects: true }).map((item) => <p key={item}>{item}</p>)}</div>
              </section>

              <section className="space-y-4">
                <h4 className="text-xl font-bold text-white md:text-2xl"><span className="text-[#caff00]">4.</span> {t("modules.mining.modal.feeTitle")}</h4>
                <div className="space-y-1">
                  {t("modules.mining.rules.feeRules", { returnObjects: true }).map((row) => (
                    <p key={row.item}>{row.item}：{row.ratio}，{row.use}</p>
                  ))}
                </div>
              </section>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
