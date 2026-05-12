import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LoadingState from "../../components/common/LoadingState";
import { NETE_CHAIN, getContractConfigMissingKeys, isContractConfigReady } from "../../config/neteRuntime";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getRuntimeConfig } from "../../services/neteApi";
import {
  activateMiner,
  approveNeteToCore,
  claimAndActivateAirdropMiner,
  claimAirdropReward,
  claimReward,
  readTierConfigs,
  readUserBalances,
  readUserMiningData,
  withdrawProfit,
} from "../../services/neteContracts";
import { formatTokenAmount } from "../../utils/formatters";

const MINING_VIEWS = [
  { key: "buy-miners", labelKey: "modules.mining.tabs.buyMiners" },
  { key: "my-miners", labelKey: "modules.mining.tabs.myMiners" },
  { key: "rules", labelKey: "modules.mining.tabs.rules" },
];
const MINING_CONTRACT_KEYS = ["neteToken", "neteCore"];
const PAYMENT_METHODS = {
  principal: "principal",
  wallet: "wallet",
};
const AIRDROP_PRINCIPAL = 100n * 10n ** 18n;

function isAirdropTier(tier) {
  return tier.principal === AIRDROP_PRINCIPAL && Number(tier.returnBps || 0) === 0;
}

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
  const [airdropModel, setAirdropModel] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.principal);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [claimingAirdrop, setClaimingAirdrop] = useState(false);
  const [claimingId, setClaimingId] = useState("");
  const [withdrawingId, setWithdrawingId] = useState("");
  const [withdrawingAll, setWithdrawingAll] = useState(false);

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
    refetchInterval: wallet.currentAddress ? 10_000 : false,
    retry: 1,
  });

  const balancesQuery = useQuery({
    queryKey: ["nete", "balances", wallet.currentAddress],
    queryFn: () => readUserBalances(wallet.currentAddress),
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

  const userTierCounts = useMemo(() => {
    const counts = new Map();

    for (const position of miningDataQuery.data?.positions || []) {
      counts.set(position.tierIndex, (counts.get(position.tierIndex) || 0) + 1);
    }

    return counts;
  }, [miningDataQuery.data?.positions]);

  const machineModels = useMemo(
    () => {
      const badges = t("modules.mining.buy.badges", { returnObjects: true });
      const badgeList = Array.isArray(badges) ? badges : [];

      return (tiersQuery.data || []).map((tier, index) => {
        const isAirdrop = isAirdropTier(tier);
        const ownedCount = userTierCounts.get(tier.tierIndex) || 0;

        return {
          model: t("modules.mining.modelName", { amount: formatTokenAmount(tier.principal, 18, 0) }),
          badge: isAirdrop ? t("modules.mining.buy.airdropBadge") : badgeList[index % badgeList.length] || "",
          price: Number(tier.principalText),
          principalWei: tier.principal,
          unitCount: tier.maxSlots,
          periodDays: tier.cycleDays,
          returnRate: tier.returnRateText,
          maxPeriodDays: tier.maxDays,
          withdrawFee: Number((tier.feeBps / 100).toFixed(2)),
          remaining: Math.max(tier.maxSlots - ownedCount, 0),
          tierIndex: tier.tierIndex,
          isAirdrop,
        };
      });
    },
    [t, tiersQuery.data, userTierCounts],
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
        pendingWei: position.pendingReward,
        remainingDays: formatDaysByEpoch(position.endAt),
        positionId: position.positionId,
        isAirdrop: position.isAirdrop,
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
  const principalPoolBalance = miningDataQuery.data?.repurchaseBalance ?? 0n;
  const profitPoolBalance = useMemo(
    () => (miningDataQuery.data?.positions || []).reduce((sum, position) => sum + (position.profit || 0n), 0n),
    [miningDataQuery.data?.positions],
  );
  const chainNeteBalance = balancesQuery.data?.neteBalance ?? 0n;
  const fragmentBalance = miningDataQuery.data?.fragmentBalance ?? 0n;
  const airdropRemaining = miningDataQuery.data?.airdropRemaining ?? 0n;
  const hasAirdropMiner = Boolean(miningDataQuery.data?.airdropInfo?.composed);
  const airdropEligibility = miningDataQuery.data?.airdropEligibility || {};
  const hasRequiredAirdropNft = airdropEligibility.hasRequiredNft ?? true;
  const airdropNftClaimed = Boolean(airdropEligibility.nftClaimed);

  const projectedCost = useMemo(() => {
    if (!selectedModel || !isAmountValid) return 0;
    return selectedModel.price * amountValue;
  }, [amountValue, isAmountValid, selectedModel]);

  const projectedCostWei = useMemo(() => {
    if (!selectedModel || !isAmountValid) return 0n;
    return selectedModel.principalWei * BigInt(amountValue);
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

    return [
      { label: t("modules.mining.summary.holdings"), value: t("modules.mining.units.machines", { count: holdings }) },
      { label: t("modules.mining.summary.output"), value: `${totalOutputValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} NETE`, accent: true },
    ];
  }, [purchasedMachines, t]);

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
  const repurchasePaused = Boolean(runtimeConfigQuery.data?.repurchase_paused);
  const canWithdrawAllProfits = wallet.isConnected && profitPoolBalance > 0n && !withdrawingAll && !withdrawingId && !claimingId;
  const canClaimAirdrop = wallet.isConnected && !claimingAirdrop && !hasAirdropMiner && !airdropNftClaimed && hasRequiredAirdropNft;

  function openPurchaseModal(model = machineModels[0]) {
    if (!model) return;
    setAirdropModel(null);
    setSelectedModel(model);
    setPurchaseAmount("1");
    setPaymentMethod(PAYMENT_METHODS.principal);
    setModelPickerOpen(false);
  }

  function closePurchaseModal() {
    setSelectedModel(null);
    setPurchaseAmount("1");
    setPaymentMethod(PAYMENT_METHODS.principal);
    setModelPickerOpen(false);
  }

  function openAirdropModal(model) {
    setSelectedModel(null);
    setPurchaseAmount("1");
    setPaymentMethod(PAYMENT_METHODS.principal);
    setModelPickerOpen(false);
    setAirdropModel(model);
  }

  function closeAirdropModal() {
    setAirdropModel(null);
  }

  function openAgreementModal() {
    setAgreementOpen(true);
  }

  function closeAgreementModal() {
    setAgreementOpen(false);
  }

  const paymentBalanceEnough = paymentMethod === PAYMENT_METHODS.wallet
    ? chainNeteBalance >= projectedCostWei
    : principalPoolBalance >= projectedCostWei;
  const quantityWithinLimit = Boolean(selectedModel) && isAmountValid && amountValue <= selectedModel.remaining;
  const canSubmitPurchase = Boolean(selectedModel) && isAmountValid && quantityWithinLimit && wallet.isConnected && !purchasing && !repurchasePaused && paymentBalanceEnough;

  const handlePurchase = async () => {
    if (!canSubmitPurchase || !selectedModel) return;

    try {
      setPurchasing(true);
      await wallet.ensureCorrectChain();

      if (paymentMethod === PAYMENT_METHODS.wallet) {
        await approveNeteToCore(wallet.currentAddress, projectedCostWei);
      }

      for (let index = 0; index < amountValue; index += 1) {
        await activateMiner(wallet.currentAddress, selectedModel.tierIndex);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nete", "mining", wallet.currentAddress] }),
        queryClient.invalidateQueries({ queryKey: ["nete", "balances", wallet.currentAddress] }),
      ]);
      closePurchaseModal();
    } catch {
      return;
    } finally {
      setPurchasing(false);
    }
  };

  const refreshMiningData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["nete", "mining", wallet.currentAddress] }),
      queryClient.invalidateQueries({ queryKey: ["nete", "balances", wallet.currentAddress] }),
      queryClient.invalidateQueries({ queryKey: ["nete", "income-overview", wallet.currentAddress] }),
      queryClient.invalidateQueries({ queryKey: ["nete", "income-ledger", wallet.currentAddress] }),
    ]);
  };

  const handleWithdrawAllProfits = async () => {
    if (!wallet.isConnected) {
      return;
    }
    if (profitPoolBalance <= 0n) {
      return;
    }

    try {
      setWithdrawingAll(true);
      await wallet.ensureCorrectChain();
      for (const machine of portfolioRows) {
        if (machine.profitWei <= 0n) continue;
        await withdrawProfit(wallet.currentAddress, machine.positionId, machine.profitWei);
      }
      await refreshMiningData();
    } catch {
      return;
    } finally {
      setWithdrawingAll(false);
    }
  };

  const handleClaim = async (positionId) => {
    if (!wallet.isConnected || !positionId || claimingId || withdrawingId || withdrawingAll) return;

    try {
      setClaimingId(positionId);
      await wallet.ensureCorrectChain();
      const machine = portfolioRows.find((item) => item.positionId === positionId);
      if (machine?.isAirdrop) {
        await claimAirdropReward(wallet.currentAddress, positionId);
      } else {
        await claimReward(wallet.currentAddress, positionId);
      }
      await refreshMiningData();
    } catch {
      return;
    } finally {
      setClaimingId("");
    }
  };

  const handleComposeAirdrop = async () => {
    if (!wallet.isConnected || claimingAirdrop || hasAirdropMiner || airdropNftClaimed || !hasRequiredAirdropNft) return;

    try {
      setClaimingAirdrop(true);
      await wallet.ensureCorrectChain();
      await claimAndActivateAirdropMiner(wallet.currentAddress);
      await refreshMiningData();
      closeAirdropModal();
      setActiveView("my-miners");
    } catch {
      return;
    } finally {
      setClaimingAirdrop(false);
    }
  };

  const handleWithdraw = async (positionId, amount) => {
    if (!wallet.isConnected || !positionId || amount <= 0n || withdrawingId || claimingId || withdrawingAll) return;

    try {
      setWithdrawingId(positionId);
      await wallet.ensureCorrectChain();
      await withdrawProfit(wallet.currentAddress, positionId, amount);
      await refreshMiningData();
    } catch {
      return;
    } finally {
      setWithdrawingId("");
    }
  };

  const portalRoot = typeof document === "undefined" ? null : document.body;

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
            </div>
          </div>

          <section className="mining-section">
            <div className="mining-section__head">
              <div>
                <h3>{t("modules.mining.portfolio.overviewTitle")}</h3>
                <p>{t("modules.mining.portfolio.overviewDesc")}</p>
              </div>
            </div>
            <div className="mining-summary-strip mining-summary-strip--two">
              {summaryCards.map((card) => (
                <article key={card.label} className="mining-summary-card">
                  <span>{card.label}</span>
                  <strong className={card.accent ? "is-accent" : ""}>{card.value}</strong>
                </article>
              ))}
            </div>
            <div className="mining-summary-strip mining-summary-strip--two mt-2">
              <article className="mining-summary-card">
                <span>{t("modules.mining.modal.principalBalance")}</span>
                <strong>{formatTokenAmount(principalPoolBalance, 18, 4)} NETE</strong>
              </article>
              <article className="mining-summary-card mining-summary-card--with-action">
                <div>
                  <span>{t("modules.mining.modal.profitBalance")}</span>
                  <strong className="is-accent">{formatTokenAmount(profitPoolBalance, 18, 4)} NETE</strong>
                </div>
                <button
                  className="mining-btn mining-btn--inline"
                  type="button"
                  disabled={!canWithdrawAllProfits}
                  onClick={handleWithdrawAllProfits}
                >
                  {withdrawingAll ? t("modules.mining.portfolio.withdrawing") : t("modules.mining.portfolio.withdrawToWallet")}
                </button>
              </article>
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
                  <article className="mining-portfolio-item mining-empty-state">
                    <div className="mining-portfolio-item__top">
                      <div>
                        <div className="mining-portfolio-item__title"><h4>{t("modules.mining.portfolio.emptyTitle")}</h4></div>
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
                            {machine.isAirdrop ? <span className="mining-chip mining-chip--airdrop">{t("modules.mining.buy.airdropBadge")}</span> : null}
                          </div>
                        </div>
                        <span className="mining-chip mining-chip--status">{t("modules.mining.statuses.running")}</span>
                      </div>

                      <div className="mining-reward-grid">
                        <div className="mining-reward-card">
                          <span>{t("modules.mining.portfolio.pending")}</span>
                          <strong>{machine.pending}</strong>
                        </div>
                        <div className="mining-reward-card">
                          <span>{t("modules.mining.portfolio.produced")}</span>
                          <strong>{machine.output}</strong>
                        </div>
                        <div className="mining-reward-card">
                          <span>{t("modules.mining.portfolio.profit")}</span>
                          <strong>{machine.profit}</strong>
                        </div>
                      </div>

                      <div className="mining-progress">
                        <div className="mining-progress__head">
                          <span>{t("modules.mining.portfolio.cycleProgress")}</span>
                          <strong>{machine.progressPercent}%</strong>
                        </div>
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
                        <div className="mining-info-tile mining-info-tile--action">
                          <button
                            className="mining-btn mining-btn--inline"
                            type="button"
                            disabled={claimingId === machine.positionId || !wallet.isConnected || Boolean(withdrawingId) || withdrawingAll}
                            onClick={() => handleClaim(machine.positionId)}
                          >
                            {claimingId === machine.positionId ? t("modules.mining.portfolio.claiming") : t("modules.mining.portfolio.claim")}
                          </button>
                        </div>
                        <div className="mining-info-tile mining-info-tile--action">
                          <button
                            className="mining-btn mining-btn--inline"
                            type="button"
                            disabled={withdrawingId === machine.positionId || !wallet.isConnected || machine.profitWei <= 0n || Boolean(claimingId) || withdrawingAll}
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
                  <article className="mining-plan-item mining-loading-card">
                    <LoadingState variant="list" rows={3} cells={3} />
                  </article>
                ) : tiersQuery.isError || machineModels.length === 0 ? (
                  <article className="mining-plan-item">
                    <div>
                      <h4>{tiersQuery.isError ? t("modules.mining.buy.loadFailedTitle") : t("modules.mining.buy.emptyTitle")}</h4>
                      <p>{miningConfigMessage}</p>
                    </div>
                  </article>
                ) : (
                  machineModels.map((model) => (
                    <article key={model.tierIndex} className={model.isAirdrop ? "mining-plan-item mining-plan-item--airdrop" : "mining-plan-item"}>
                      <div>
                        <h4>{model.model}</h4>
                        <p>{model.price} NETE</p>
                      </div>
                      {model.badge ? <span className="mining-plan-badge">{model.badge}</span> : null}

                      <div className="mining-plan-grid">
                        <div className="mining-info-tile"><span>{t("modules.mining.buy.totalRate")}</span><strong className="is-accent">{model.returnRate}</strong></div>
                        <div className="mining-info-tile"><span>{t("modules.mining.buy.unitLimit")}</span><strong>{t("modules.mining.units.machines", { count: model.unitCount })}</strong></div>
                        <div className="mining-info-tile"><span>{t("modules.mining.buy.cycle")}</span><strong>{t("modules.mining.units.days", { count: model.periodDays })}</strong></div>
                        <div className="mining-info-tile"><span>{t("modules.mining.buy.remaining")}</span><strong>{t("modules.mining.units.machines", { count: model.remaining })}</strong></div>
                      </div>

                      <div className="mining-plan-action">
                        <button
                          className="mining-btn mining-btn--primary"
                          type="button"
                          onClick={() => (model.isAirdrop ? openAirdropModal(model) : openPurchaseModal(model))}
                          disabled={!model.isAirdrop && (repurchasePaused || model.remaining <= 0)}
                        >
                          {model.isAirdrop
                            ? hasAirdropMiner
                              ? t("modules.mining.buy.airdropActivated")
                              : t("modules.mining.buy.airdropAction")
                            : t("modules.mining.buy.actionValue")}
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

      {selectedModel && portalRoot ? createPortal((
        <div className="fixed inset-0 z-[520] flex items-end justify-center bg-black/70 px-0 pb-0 pt-2 backdrop-blur-sm md:items-center md:bg-black/75 md:px-2 md:py-4" onClick={closePurchaseModal} role="presentation">
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
                      {machineModels.filter((model) => !model.isAirdrop).map((model) => {
                        const active = selectedModel.tierIndex === model.tierIndex;
                        return (
                          <button
                            key={model.tierIndex}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${active ? "bg-[#caff00]/12 text-[#dcff64]" : "text-white/90 hover:bg-white/5"}`}
                            type="button"
                            onClick={() => {
                              setSelectedModel(model);
                              setPurchaseAmount("1");
                              setPaymentMethod(PAYMENT_METHODS.principal);
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

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="text-sm font-semibold text-white/70">{t("modules.mining.modal.referenceRate")}</span>
              <strong className="font-display text-xl font-black text-[#caff00]">{selectedModel.returnRate}</strong>
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold text-white/90" htmlFor="mining-purchase-input">{t("modules.mining.modal.quantity")}</label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-12 w-32 items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4">
                  <input
                    id="mining-purchase-input"
                    className="w-full min-w-0 bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/45"
                    type="number"
                    min="1"
                    step="1"
                    value={purchaseAmount}
                    onChange={(event) => setPurchaseAmount(event.target.value)}
                    placeholder={t("modules.mining.modal.minPlaceholder")}
                  />
                  <span className="shrink-0 text-sm font-semibold text-white/65">{t("modules.mining.modal.unit")}</span>
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/65">
                  <span>{t("modules.mining.modal.available")}</span>
                  <strong className="mt-0.5 block text-sm text-white">{t("modules.mining.units.machines", { count: selectedModel.remaining })}</strong>
                </div>
              </div>
            </div>

            <section className="mt-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/55">{t("modules.mining.modal.principalBalance")}</span>
                  <strong className="mt-1 block text-white">{formatTokenAmount(principalPoolBalance, 18, 4)} NETE</strong>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/55">{t("modules.mining.modal.chainBalance")}</span>
                  <strong className="mt-1 block text-white">{formatTokenAmount(chainNeteBalance, 18, 4)} NETE</strong>
                </div>
              </div>
            </section>

            <section className="mt-4">
              <div className="text-sm font-semibold text-white/90">{t("modules.mining.modal.paymentMethod")}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  className={paymentMethod === PAYMENT_METHODS.principal ? "mining-payment-option is-active" : "mining-payment-option"}
                  type="button"
                  onClick={() => setPaymentMethod(PAYMENT_METHODS.principal)}
                >
                  {t("modules.mining.modal.payWithPrincipal")}
                </button>
                <button
                  className={paymentMethod === PAYMENT_METHODS.wallet ? "mining-payment-option is-active" : "mining-payment-option"}
                  type="button"
                  onClick={() => setPaymentMethod(PAYMENT_METHODS.wallet)}
                >
                  {t("modules.mining.modal.payWithWallet")}
                </button>
              </div>
              {!paymentBalanceEnough && selectedModel ? (
                <p className="mt-2 text-xs text-[#ffb199]">{t("modules.mining.modal.insufficientBalance")}</p>
              ) : null}
              {selectedModel && isAmountValid && !quantityWithinLimit ? (
                <p className="mt-2 text-xs text-[#ffb199]">{t("modules.mining.modal.quantityUnavailable")}</p>
              ) : null}
            </section>

            <section className="mt-6">
              <h4 className="text-2xl font-black leading-none text-white">{t("modules.mining.modal.calculator")}</h4>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-xs md:text-sm">
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
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/75 md:text-sm">
                <p>{t("modules.mining.modal.singleCycle")}：{t("modules.mining.units.days", { count: selectedModel.periodDays })}</p>
                <p>{t("modules.mining.modal.maxCycle")}：{t("modules.mining.units.days", { count: selectedModel.maxPeriodDays })}</p>
                <p>{t("modules.mining.modal.withdrawFee")}：{selectedModel.withdrawFee}%</p>
              </div>
            </div>

            <button
              className="mining-modal-submit mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#caff00] text-base font-semibold text-black transition enabled:hover:shadow-[0_0_30px_rgba(202,255,0,0.45)] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45"
              type="button"
              disabled={!canSubmitPurchase}
              onClick={handlePurchase}
            >
              {purchasing ? t("modules.mining.modal.submitting") : t("modules.mining.modal.submit")}
            </button>
            {repurchasePaused ? <p className="mt-2 text-center text-xs text-white/65">{t("modules.mining.messages.paused")}</p> : null}
          </article>
        </div>
      ), portalRoot) : null}

      {airdropModel && portalRoot ? createPortal((
        <div className="fixed inset-0 z-[530] flex items-end justify-center bg-black/70 px-0 pb-0 pt-2 backdrop-blur-sm md:items-center md:bg-black/75 md:px-2 md:py-4" onClick={closeAirdropModal} role="presentation">
          <article
            className="mobile-drawer-enter max-h-[70dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[20px] rounded-b-none border border-white/10 bg-[#141419] p-4 text-white shadow-[0_25px_80px_rgba(0,0,0,0.55)] md:max-h-[92vh] md:rounded-[24px] md:p-5"
            role="dialog"
            aria-modal="true"
            aria-label={t("modules.mining.modal.airdropTitle")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="mining-chip mining-chip--airdrop">{t("modules.mining.buy.airdropBadge")}</span>
                <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-white">{airdropModel.model}</h3>
                <p className="mt-1 text-xs leading-6 text-white/65">{t("modules.mining.modal.airdropDesc")}</p>
              </div>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-full text-2xl leading-none text-white/70 transition hover:bg-white/10 hover:text-white" type="button" onClick={closeAirdropModal} aria-label={t("modules.mining.modal.close")}>
                <Icon icon="solar:close-circle-outline" width="1em" height="1em" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <span className="text-white/55">{t("modules.mining.modal.fragmentBalance")}</span>
                <strong className="mt-1 block text-white">{fragmentBalance.toString()}</strong>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <span className="text-white/55">{t("modules.mining.modal.airdropRemaining")}</span>
                <strong className="mt-1 block text-white">{airdropRemaining.toString()}</strong>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <span className="text-white/55">{t("modules.mining.buy.totalRate")}</span>
                <strong className="mt-1 block text-[#caff00]">{airdropModel.returnRate}</strong>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <span className="text-white/55">{t("modules.mining.buy.cycle")}</span>
                <strong className="mt-1 block text-white">{t("modules.mining.units.days", { count: airdropModel.periodDays })}</strong>
              </div>
            </div>

            <button
              className="mining-modal-submit mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#caff00] text-base font-semibold text-black transition enabled:hover:shadow-[0_0_30px_rgba(202,255,0,0.45)] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45"
              type="button"
              disabled={!canClaimAirdrop}
              onClick={handleComposeAirdrop}
            >
              {claimingAirdrop
                ? t("modules.mining.modal.submitting")
                : hasAirdropMiner
                  ? t("modules.mining.buy.airdropActivated")
                  : airdropNftClaimed
                    ? t("modules.mining.buy.airdropClaimed")
                    : !hasRequiredAirdropNft
                      ? t("modules.mining.buy.airdropNftRequired")
                      : t("modules.mining.buy.airdropAction")}
            </button>
          </article>
        </div>
      ), portalRoot) : null}

      {agreementOpen && portalRoot ? createPortal((
        <div className="fixed inset-0 z-[540] flex items-end justify-center bg-black/70 px-0 pb-0 pt-2 backdrop-blur-sm md:items-center md:bg-black/75 md:px-2 md:py-4" onClick={closeAgreementModal} role="presentation">
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
      ), portalRoot) : null}
    </section>
  );
}
