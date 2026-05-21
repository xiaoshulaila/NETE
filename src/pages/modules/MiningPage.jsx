import { useMemo, useRef, useState } from "react";
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
  checkInWithBABT,
  claimAndActivateAirdropMiner,
  claimAirdropReward,
  claimReward,
  readCheckInRecords,
  readNeteCoreAllowance,
  readTierConfigs,
  readUserBalances,
  readUserMiningData,
  repurchaseExpiredMinersWithMode,
  repurchaseMinerWithMode,
  withdrawCheckInProfit,
  withdrawAllProfit,
} from "../../services/neteContracts";
import { formatTokenAmount, formatUnixTime } from "../../utils/formatters";

const MINING_VIEWS = [
  { key: "buy-miners", labelKey: "modules.mining.tabs.buyMiners" },
  { key: "my-miners", labelKey: "modules.mining.tabs.myMiners" },
  { key: "rules", labelKey: "modules.mining.tabs.rules" },
];
const MINING_CONTRACT_KEYS = ["neteToken", "neteCore"];
const PAYMENT_METHODS = {
  principal: 0,
  wallet: 1,
  auto: 2,
  profit: 3,
};
const REPURCHASE_MODES = {
  all: "all",
  single: "single",
};
const REPURCHASE_PAY_MODES = {
  principal: 0,
  wallet: 1,
  auto: 2,
  profit: 3,
};
const POSITION_STATES = {
  running: 0,
  pendingRepurchase: 1,
  ended: 2,
};
const AIRDROP_PRINCIPAL = 100n * 10n ** 18n;
const MIN_VISIBLE_NETE_WEI = 5n * 10n ** 13n;
const REPURCHASE_READY_STATES = new Set([POSITION_STATES.pendingRepurchase, POSITION_STATES.ended]);

function isAirdropTier(tier) {
  return Number(tier.tierIndex) === 0 || (tier.principal === AIRDROP_PRINCIPAL && (
    Number(tier.returnBps || 0) === 0 ||
    Number(tier.cycleDays || 0) === 75 ||
    Number(tier.maxDays || 0) === 75
  ));
}

function parsePercent(rateText) {
  const parsed = Number(String(rateText || "").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDaysByEpoch(endAt, timeUnitSeconds = 600) {
  if (!endAt) return 0;
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = Number(endAt) - nowSec;
  if (diff <= 0) return 0;
  return Math.ceil(diff / timeUnitSeconds);
}

function getPositionCycleDays(tier, position) {
  const baseDays = Number(tier?.periodDays || position.cycleTotalDays || 1);
  const extendDays = Number(tier?.extendDays || 0);
  const maxDays = Number(tier?.maxPeriodDays || 0);
  const completedRepurchases = Math.max(0, Number(position.currentPeriod || 1) - 1);
  const cycleDays = baseDays + completedRepurchases * extendDays;

  return Math.max(1, maxDays > 0 ? Math.min(cycleDays, maxDays) : cycleDays);
}

function getMinerModelSuffix(amount, t) {
  if (amount === 30 || amount === 100) return t("modules.mining.buy.modelSuffix.starter");
  if (amount === 300 || amount === 500) return t("modules.mining.buy.modelSuffix.classic");
  if (amount === 1000 || amount === 3000) return t("modules.mining.buy.modelSuffix.hot");
  if ([5000, 10000, 30000, 50000].includes(amount)) return t("modules.mining.buy.modelSuffix.advanced");
  return "";
}

function getMinerModelSuffixTone(amount) {
  if (amount === 30 || amount === 100) return "starter";
  if (amount === 300 || amount === 500) return "classic";
  if (amount === 1000 || amount === 3000) return "hot";
  if ([5000, 10000, 30000, 50000].includes(amount)) return "advanced";
  return "default";
}

function getMinerModelName(amountText, t) {
  const amount = Number(String(amountText || "").replace(/,/g, ""));
  const suffix = getMinerModelSuffix(amount, t);
  return suffix ? `${amountText}型·${amountText}NETE ${suffix}` : `${amountText}型·${amountText}NETE`;
}

function getMinerModelParts(amountText, t) {
  const amount = Number(String(amountText || "").replace(/,/g, ""));
  return {
    base: `${amountText}型·${amountText}NETE`,
    titleName: `${amountText}型`,
    titleAmount: amountText,
    picker: `${amountText}型`,
    suffix: getMinerModelSuffix(amount, t),
    suffixTone: getMinerModelSuffixTone(amount),
  };
}

function getMinerAmountText(value) {
  return String(value || "0").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function getAutoWalletShortfall(requiredWei, principalWei, profitWei) {
  if (requiredWei <= 0n) return 0n;
  const afterPrincipal = requiredWei > principalWei ? requiredWei - principalWei : 0n;
  return afterPrincipal > profitWei ? afterPrincipal - profitWei : 0n;
}

export default function MiningPage() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();
  const queryClient = useQueryClient();
  const withdrawingAllRef = useRef(false);

  const [activeView, setActiveView] = useState("buy-miners");
  const [selectedModel, setSelectedModel] = useState(null);
  const [airdropModel, setAirdropModel] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.auto);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [claimingAirdrop, setClaimingAirdrop] = useState(false);
  const [claimingAll, setClaimingAll] = useState(false);
  const [repurchasingAll, setRepurchasingAll] = useState(false);
  const [repurchasingId, setRepurchasingId] = useState("");
  const [repurchaseTarget, setRepurchaseTarget] = useState(null);
  const [repurchasePayMode, setRepurchasePayMode] = useState(REPURCHASE_PAY_MODES.auto);
  const [claimingId, setClaimingId] = useState("");
  const [withdrawingAll, setWithdrawingAll] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [withdrawingCheckin, setWithdrawingCheckin] = useState(false);
  const [checkinCalendarOpen, setCheckinCalendarOpen] = useState(false);

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

  const checkInRecordsQuery = useQuery({
    queryKey: ["nete", "checkin-records", wallet.currentAddress],
    queryFn: () => readCheckInRecords(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 30_000,
    retry: 0,
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
      return (tiersQuery.data || []).map((tier) => {
        const isAirdrop = isAirdropTier(tier);
        const ownedCount = userTierCounts.get(tier.tierIndex) || 0;
        const amountText = getMinerAmountText(tier.principalText);
        const modelParts = getMinerModelParts(amountText, t);

        return {
          model: getMinerModelName(amountText, t),
          modelBase: modelParts.base,
          modelTitleName: modelParts.titleName,
          modelTitleAmount: modelParts.titleAmount,
          modelPicker: modelParts.picker,
          modelSuffix: modelParts.suffix,
          modelSuffixTone: modelParts.suffixTone,
          hideModelSuffix: isAirdrop,
          badge: isAirdrop ? t("modules.mining.buy.airdropBadge") : "",
          price: Number(tier.principalText),
          principalWei: tier.principal,
          ownedCount,
          unitCount: tier.maxSlots,
          periodDays: tier.cycleDays,
          extendDays: tier.extendDays,
          returnRate: isAirdrop ? "20 NETE" : tier.returnRateText,
          maxPeriodDays: tier.maxDays,
          withdrawFee: 20,
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
    const timeUnitSeconds = miningDataQuery.data?.timeUnitSeconds || 600;
    return positions.map((position) => {
      const tier = tiersMap.get(position.tierIndex);
      const configuredCycleTotal = getPositionCycleDays(tier, position);
      const totalRemainingDays = formatDaysByEpoch(position.endAt, timeUnitSeconds);
      const cycleTotal = Math.max(configuredCycleTotal, totalRemainingDays);
      const rawState = Number(position.state);
      const hasReachedEnd = Number(position.endAt || 0) > 0 && totalRemainingDays <= 0;
      const claimedTotalWei = position.grossClaimed + (position.accelClaimed || 0n);
      const hasReachedReturnCap = position.totalReturn > 0n && claimedTotalWei >= position.totalReturn;
      const state = (rawState === POSITION_STATES.running && (hasReachedEnd || hasReachedReturnCap)) || rawState === POSITION_STATES.ended
        ? POSITION_STATES.pendingRepurchase
        : rawState;
      const isEnded = state === POSITION_STATES.ended;
      const isPendingRepurchase = REPURCHASE_READY_STATES.has(state);
      const canClaim = rawState === POSITION_STATES.running && position.pendingReward > 0n;
      const canRepurchase = isPendingRepurchase && !canClaim;
      const batchRepurchaseEligible = canRepurchase && (hasReachedEnd || rawState === POSITION_STATES.ended);
      const cycleCurrent = totalRemainingDays <= 0 || isPendingRepurchase || isEnded
        ? cycleTotal
        : Math.max(0, Math.min(cycleTotal - totalRemainingDays, cycleTotal));
      const remainingDays = totalRemainingDays <= 0 || isPendingRepurchase || isEnded ? 0 : Math.max(cycleTotal - cycleCurrent, 0);

      return {
        model: tier?.model || `T${position.tierIndex}`,
        modelBase: tier?.modelBase || tier?.model || `T${position.tierIndex}`,
        modelTitleName: tier?.modelTitleName || tier?.modelBase || tier?.model || `T${position.tierIndex}`,
        modelTitleAmount: tier?.modelTitleAmount || "",
        modelPicker: tier?.modelPicker || tier?.modelBase || tier?.model || `T${position.tierIndex}`,
        modelSuffix: tier?.modelSuffix || "",
        modelSuffixTone: tier?.modelSuffixTone || "default",
        hideModelSuffix: Boolean(tier?.hideModelSuffix || position.isAirdrop),
        quantity: 1,
        cycleProgress: t("modules.mining.units.positionProgress", { current: cycleCurrent, total: cycleTotal }),
        output: formatTokenAmount(claimedTotalWei, 18, 4),
        pending: formatTokenAmount(position.pendingReward, 18, 4),
        profit: formatTokenAmount(position.profit, 18, 4),
        accel: formatTokenAmount(position.accelClaimed || 0n, 18, 4),
        profitWei: position.profit,
        pendingWei: position.pendingReward,
        principalWei: position.principal,
        purchaseTime: formatUnixTime(position.originStartAt || position.startAt),
        remainingDays,
        positionId: position.positionId,
        state,
        rawState,
        isEnded,
        isPendingRepurchase,
        batchRepurchaseEligible,
        canRepurchase,
        canClaim,
        isAirdrop: position.isAirdrop,
        cycleCurrent,
        cycleTotal,
      };
    });
  }, [machineModels, miningDataQuery.data, t]);

  const airdropMachineStatus = useMemo(() => {
    const info = miningDataQuery.data?.airdropInfo;
    const related = (miningDataQuery.data?.positions || []).find((item) => item.positionId === String(info?.positionId || ""));
    const timeUnitSeconds = miningDataQuery.data?.timeUnitSeconds || 600;
    const permanent = Boolean(info?.promoted)
      || Boolean(info?.composed && related && Number(related.endAt || 0) === 0)
      || (Boolean(info?.composed) && (miningDataQuery.data?.positions || []).some((item) => !item.isAirdrop));

    return {
      synthesized: Boolean(info?.composed),
      permanent,
      validityLeftDays: permanent
        ? 0
        : related?.endAt
          ? formatDaysByEpoch(Number(related.endAt), timeUnitSeconds)
          : info?.expireAt
            ? formatDaysByEpoch(Number(info.expireAt), timeUnitSeconds)
            : 0,
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
  const hasAirdropMiner = Boolean(miningDataQuery.data?.airdropInfo?.composed)
    || (miningDataQuery.data?.positions || []).some((position) => position.isAirdrop);
  const airdropEligibility = miningDataQuery.data?.airdropEligibility || {};
  const hasRequiredAirdropNft = Boolean(airdropEligibility.hasRequiredNft);
  const airdropNftClaimed = Boolean(airdropEligibility.nftClaimed);
  const hasAnyMinerPosition = (miningDataQuery.data?.positions || []).length > 0;
  const checkinProfitBalance = miningDataQuery.data?.checkinProfitBalance ?? 0n;
  const checkinRewardAmount = miningDataQuery.data?.checkinRewardAmount ?? 0n;
  const lastCheckinAt = Number(miningDataQuery.data?.lastCheckinAt || 0n);
  const lastCheckinAtText = lastCheckinAt > 0 ? new Date(lastCheckinAt * 1000).toLocaleString() : "--";
  const checkInRecords = checkInRecordsQuery.data || [];
  const cumulativeCheckInReward = useMemo(
    () => {
      const total = checkInRecords.reduce((sum, item) => sum + (item.amount || 0n), 0n);
      return total > 0n ? total : checkinProfitBalance;
    },
    [checkInRecords, checkinProfitBalance],
  );
  const checkInCalendar = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const signedDates = [
      ...checkInRecords.map((item) => Number(item.checkinAt || 0)),
      lastCheckinAt,
    ].filter((value) => Number.isFinite(value) && value > 0);
    const signedDays = new Set(
      signedDates
        .map((value) => new Date(value * 1000))
        .filter((date) => date.getFullYear() === year && date.getMonth() === month)
        .map((date) => date.getDate()),
    );
    const cells = [
      ...Array.from({ length: firstDay }, (_, index) => ({ key: `empty-${index}`, day: "", empty: true, signed: false })),
      ...Array.from({ length: totalDays }, (_, index) => {
        const day = index + 1;
        return { key: `day-${day}`, day, empty: false, signed: signedDays.has(day) };
      }),
    ];

    return {
      year,
      month: month + 1,
      cells,
      signedCount: signedDays.size,
    };
  }, [checkInRecords, lastCheckinAt]);
  const airdropHidden = hasAirdropMiner || airdropNftClaimed;
  const visibleMachineModels = useMemo(
    () => machineModels.filter((model) => !model.isAirdrop || !airdropHidden),
    [airdropHidden, machineModels],
  );
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
      { label: t("modules.mining.summary.holdings"), value: holdings },
      { label: t("modules.mining.summary.output"), value: totalOutputValue.toLocaleString(undefined, { maximumFractionDigits: 4 }), accent: true },
    ];
  }, [purchasedMachines, t]);

  const planStats = useMemo(() => {
    const maxRate = visibleMachineModels.reduce((max, item) => Math.max(max, parsePercent(item.returnRate)), 0);
    const minDays = visibleMachineModels.reduce((min, item) => Math.min(min, item.periodDays), Number.POSITIVE_INFINITY);
    const maxDays = visibleMachineModels.reduce((max, item) => Math.max(max, item.periodDays), 0);

    return {
      modelCount: visibleMachineModels.length,
      maxRate,
      cycleRange: visibleMachineModels.length ? t("modules.mining.units.cycleRange", { min: minDays, max: maxDays }) : "--",
    };
  }, [visibleMachineModels, t]);

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
  const claimablePortfolioRows = useMemo(
    () => portfolioRows.filter((item) => item.canClaim),
    [portfolioRows],
  );
  const totalClaimableRewardWei = useMemo(
    () => claimablePortfolioRows.reduce((sum, item) => sum + (item.pendingWei || 0n), 0n),
    [claimablePortfolioRows],
  );
  const hasClaimBlockingPosition = useMemo(
    () => portfolioRows.some((item) => item.state === POSITION_STATES.running && (item.pendingWei || 0n) > 0n && !item.canClaim),
    [portfolioRows],
  );
  const repurchasableMinerRows = useMemo(
    () => portfolioRows.filter((item) => item.canRepurchase),
    [portfolioRows],
  );
  const batchRepurchasableMinerRows = useMemo(
    () => portfolioRows.filter((item) => item.canRepurchase && item.batchRepurchaseEligible),
    [portfolioRows],
  );
  const repurchaseContext = useMemo(() => {
    if (!repurchaseTarget) return null;
    const rows = repurchaseTarget.mode === REPURCHASE_MODES.all
      ? batchRepurchasableMinerRows
      : portfolioRows.filter((item) => item.positionId === repurchaseTarget.positionId && item.canRepurchase);
    const amountWei = rows.reduce((sum, item) => sum + (item.isAirdrop ? 0n : (item.principalWei || 0n)), 0n);

    return {
      ...repurchaseTarget,
      rows,
      amountWei,
    };
  }, [batchRepurchasableMinerRows, portfolioRows, repurchaseTarget]);
  const actionBusy = claimingAll || repurchasingAll || withdrawingAll || checkingIn || withdrawingCheckin || Boolean(claimingId) || Boolean(repurchasingId);
  const canClaimAllRewards = wallet.isConnected && totalClaimableRewardWei > 0n && !hasClaimBlockingPosition && !actionBusy;
  const canRepurchaseExpired = wallet.isConnected && batchRepurchasableMinerRows.length > 0 && !repurchasePaused && !actionBusy;
  const canWithdrawAllProfits = wallet.isConnected && (profitPoolBalance >= MIN_VISIBLE_NETE_WEI || totalClaimableRewardWei > 0n) && !actionBusy;
  const canClaimAirdrop = wallet.isConnected && !claimingAirdrop && !hasAirdropMiner && !airdropNftClaimed && hasRequiredAirdropNft;
  const canCheckInWithBABT = wallet.isConnected && !actionBusy && !hasAnyMinerPosition && hasRequiredAirdropNft && checkinRewardAmount > 0n;
  const canWithdrawCheckinProfit = wallet.isConnected && !actionBusy && checkinProfitBalance >= MIN_VISIBLE_NETE_WEI;
  const repurchaseRequiredWei = repurchaseContext?.amountWei || 0n;
  const repurchaseRowCount = repurchaseContext?.rows.length || 0;
  const repurchaseWalletShortfall = useMemo(() => {
    if (repurchasePayMode === REPURCHASE_PAY_MODES.wallet) return repurchaseRequiredWei;
    if (repurchasePayMode === REPURCHASE_PAY_MODES.auto) {
      return getAutoWalletShortfall(repurchaseRequiredWei, principalPoolBalance, profitPoolBalance);
    }
    return 0n;
  }, [principalPoolBalance, profitPoolBalance, repurchasePayMode, repurchaseRequiredWei]);
  const repurchaseBalanceEnough = useMemo(() => {
    if (repurchaseRequiredWei <= 0n) return repurchaseRowCount > 0;
    if (repurchasePayMode === REPURCHASE_PAY_MODES.principal) return principalPoolBalance >= repurchaseRequiredWei;
    if (repurchasePayMode === REPURCHASE_PAY_MODES.wallet) return chainNeteBalance >= repurchaseRequiredWei;
    if (repurchasePayMode === REPURCHASE_PAY_MODES.profit) return profitPoolBalance >= repurchaseRequiredWei;
    return principalPoolBalance + profitPoolBalance + chainNeteBalance >= repurchaseRequiredWei;
  }, [chainNeteBalance, principalPoolBalance, profitPoolBalance, repurchasePayMode, repurchaseRequiredWei, repurchaseRowCount]);
  const canSubmitRepurchase = Boolean(repurchaseContext)
    && wallet.isConnected
    && !actionBusy
    && !repurchasePaused
    && repurchaseContext.rows.length > 0
    && repurchaseBalanceEnough;
  const repurchaseSubmitting = Boolean(repurchaseContext) && (
    repurchaseContext.mode === REPURCHASE_MODES.all
      ? repurchasingAll
      : repurchasingId === repurchaseContext.positionId
  );

  function openPurchaseModal(model = machineModels[0]) {
    if (!model) return;
    setAirdropModel(null);
    setSelectedModel(model);
    setPurchaseAmount("1");
    setPaymentMethod(PAYMENT_METHODS.auto);
    setModelPickerOpen(false);
  }

  function closePurchaseModal() {
    setSelectedModel(null);
    setPurchaseAmount("1");
    setPaymentMethod(PAYMENT_METHODS.auto);
    setModelPickerOpen(false);
  }

  function openAirdropModal(model) {
    setSelectedModel(null);
    setPurchaseAmount("1");
    setPaymentMethod(PAYMENT_METHODS.auto);
    setModelPickerOpen(false);
    setAirdropModel(model);
  }

  function closeAirdropModal() {
    setAirdropModel(null);
  }

  function openRepurchaseModal(target) {
    setRepurchasePayMode(REPURCHASE_PAY_MODES.auto);
    setRepurchaseTarget(target);
  }

  function closeRepurchaseModal() {
    setRepurchaseTarget(null);
    setRepurchasePayMode(REPURCHASE_PAY_MODES.auto);
  }

  function openAgreementModal() {
    setAgreementOpen(true);
  }

  function closeAgreementModal() {
    setAgreementOpen(false);
  }

  const claimMachineRewards = async (rows) => {
    for (const machine of rows) {
      if (machine.isAirdrop) {
        await claimAirdropReward(wallet.currentAddress, machine.positionId);
      } else {
        await claimReward(wallet.currentAddress, machine.positionId);
      }
    }
  };

  const purchaseWalletShortfall = useMemo(() => {
    if (paymentMethod === PAYMENT_METHODS.wallet) return projectedCostWei;
    if (paymentMethod === PAYMENT_METHODS.auto) {
      return getAutoWalletShortfall(projectedCostWei, principalPoolBalance, profitPoolBalance);
    }
    return 0n;
  }, [paymentMethod, principalPoolBalance, profitPoolBalance, projectedCostWei]);
  const paymentBalanceEnough = useMemo(() => {
    if (projectedCostWei <= 0n) return false;
    if (paymentMethod === PAYMENT_METHODS.principal) return principalPoolBalance >= projectedCostWei;
    if (paymentMethod === PAYMENT_METHODS.wallet) return chainNeteBalance >= projectedCostWei;
    if (paymentMethod === PAYMENT_METHODS.profit) return profitPoolBalance >= projectedCostWei;
    return principalPoolBalance + profitPoolBalance + chainNeteBalance >= projectedCostWei;
  }, [chainNeteBalance, paymentMethod, principalPoolBalance, profitPoolBalance, projectedCostWei]);
  const quantityWithinLimit = Boolean(selectedModel) && isAmountValid && amountValue <= selectedModel.remaining;
  const canSubmitPurchase = Boolean(selectedModel) && isAmountValid && quantityWithinLimit && wallet.isConnected && !purchasing && !repurchasePaused && paymentBalanceEnough;

  const handlePurchase = async () => {
    if (!canSubmitPurchase || !selectedModel) return;

    try {
      setPurchasing(true);
      await wallet.ensureCorrectChain();

      if (purchaseWalletShortfall > 0n) {
        const allowance = await readNeteCoreAllowance(wallet.currentAddress);
        if (allowance < purchaseWalletShortfall) {
          await approveNeteToCore(wallet.currentAddress, purchaseWalletShortfall);
        }
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
      queryClient.invalidateQueries({ queryKey: ["nete", "checkin-records", wallet.currentAddress] }),
    ]);
  };

  const handleClaimAll = async () => {
    const rows = claimablePortfolioRows;
    if (!canClaimAllRewards || rows.length === 0) return;

    try {
      setClaimingAll(true);
      await wallet.ensureCorrectChain();
      await claimMachineRewards(rows);
      await refreshMiningData();
    } catch {
      return;
    } finally {
      setClaimingAll(false);
    }
  };

  const handleSubmitRepurchase = async () => {
    if (!canSubmitRepurchase || !repurchaseContext) return;
    const isBatch = repurchaseContext.mode === REPURCHASE_MODES.all;
    const positionId = repurchaseContext.positionId;

    try {
      if (isBatch) {
        setRepurchasingAll(true);
      } else {
        setRepurchasingId(positionId);
      }
      await wallet.ensureCorrectChain();
      if (repurchaseWalletShortfall > 0n) {
        const allowance = await readNeteCoreAllowance(wallet.currentAddress);
        if (allowance < repurchaseWalletShortfall) {
          await approveNeteToCore(wallet.currentAddress, repurchaseWalletShortfall);
        }
      }
      if (isBatch) {
        await repurchaseExpiredMinersWithMode(wallet.currentAddress, repurchasePayMode);
      } else {
        await repurchaseMinerWithMode(wallet.currentAddress, positionId, repurchasePayMode);
      }
      await refreshMiningData();
      closeRepurchaseModal();
    } catch {
      return;
    } finally {
      if (isBatch) {
        setRepurchasingAll(false);
      } else {
        setRepurchasingId("");
      }
    }
  };

  const handleWithdrawAllProfits = async () => {
    if (!canWithdrawAllProfits || withdrawingAllRef.current) {
      return;
    }

    try {
      withdrawingAllRef.current = true;
      setWithdrawingAll(true);
      await wallet.ensureCorrectChain();
      const rows = claimablePortfolioRows;
      if (rows.length > 0) {
        try {
          await claimMachineRewards(rows);
        } catch (error) {
          if (profitPoolBalance < MIN_VISIBLE_NETE_WEI) throw error;
        }
      }
      await withdrawAllProfit(wallet.currentAddress);
      await refreshMiningData();
    } catch {
      return;
    } finally {
      withdrawingAllRef.current = false;
      setWithdrawingAll(false);
    }
  };

  const handleCheckInWithBABT = async () => {
    if (!canCheckInWithBABT) return;

    try {
      setCheckingIn(true);
      await wallet.ensureCorrectChain();
      await checkInWithBABT(wallet.currentAddress);
      await refreshMiningData();
    } catch {
      return;
    } finally {
      setCheckingIn(false);
    }
  };

  const handleWithdrawCheckinProfit = async () => {
    if (!canWithdrawCheckinProfit) return;

    try {
      setWithdrawingCheckin(true);
      await wallet.ensureCorrectChain();
      await withdrawCheckInProfit(wallet.currentAddress, checkinProfitBalance);
      await refreshMiningData();
    } catch {
      return;
    } finally {
      setWithdrawingCheckin(false);
    }
  };

  const handleClaim = async (positionId) => {
    if (!wallet.isConnected || !positionId || actionBusy) return;
    const machine = portfolioRows.find((item) => item.positionId === positionId);
    if (!machine?.canClaim) return;

    try {
      setClaimingId(positionId);
      await wallet.ensureCorrectChain();
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

  const shouldShowCheckinSection = !wallet.isConnected || (!hasAnyMinerPosition && hasRequiredAirdropNft);
  const checkinSection = shouldShowCheckinSection ? (
    <section className="mining-section">
      <div className="mining-panel-card mining-checkin-card">
        <div className="mining-checkin-card__head">
          <h3>{t("modules.mining.checkin.title")}</h3>
          <p>{t("modules.mining.checkin.desc")}</p>
        </div>
        <div className="mining-checkin-grid">
          <div className="mining-info-tile">
            <span>{t("modules.mining.checkin.reward")}</span>
            <strong className="is-accent">{formatTokenAmount(checkinRewardAmount, 18, 4)} NETE</strong>
          </div>
          <div className="mining-info-tile">
            <span>{t("modules.mining.checkin.balance")}</span>
            <strong>{formatTokenAmount(checkinProfitBalance, 18, 4)} NETE</strong>
          </div>
        </div>
        <div className="mining-checkin-grid">
          <div className="mining-info-tile">
            <span>{t("modules.mining.checkin.total")}</span>
            <strong className="is-accent">{formatTokenAmount(cumulativeCheckInReward, 18, 4)} NETE</strong>
          </div>
          <div className="mining-info-tile">
            <span>{t("modules.mining.checkin.last")}</span>
            <strong>{lastCheckinAtText}</strong>
          </div>
        </div>

        <div className="mining-checkin-actions">
          <button
            className="mining-btn mining-btn--primary mining-checkin-action--main"
            type="button"
            disabled={!canCheckInWithBABT}
            onClick={handleCheckInWithBABT}
          >
            {checkingIn ? t("modules.mining.checkin.checking") : t("modules.mining.checkin.checkIn")}
          </button>
          <button
            className="mining-btn mining-btn--ghost"
            type="button"
            disabled={!wallet.isConnected}
            onClick={() => setCheckinCalendarOpen(true)}
          >
            {t("modules.mining.checkin.records")}
          </button>
          <button
            className="mining-btn mining-btn--ghost"
            type="button"
            disabled={!canWithdrawCheckinProfit}
            onClick={handleWithdrawCheckinProfit}
          >
            {withdrawingCheckin ? t("modules.mining.checkin.withdrawing") : t("modules.mining.checkin.withdraw")}
          </button>
        </div>

        {!wallet.isConnected ? (
          <p className="mining-checkin-hint">{t("modules.mining.checkin.connectHint")}</p>
        ) : null}
      </div>
    </section>
  ) : null;

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
                <strong>{formatTokenAmount(principalPoolBalance, 18, 4)}</strong>
              </article>
              <article className="mining-summary-card">
                <div>
                  <span>{t("modules.mining.modal.profitBalance")}</span>
                  <strong className="is-accent">{formatTokenAmount(profitPoolBalance, 18, 4)}</strong>
                </div>
              </article>
            </div>
            <div className="mining-portfolio-actions">
              <button
                className="mining-btn mining-btn--primary"
                type="button"
                disabled={!canClaimAllRewards}
                onClick={handleClaimAll}
              >
                {claimingAll ? t("modules.mining.portfolio.claimAlling") : t("modules.mining.portfolio.claimAll")}
              </button>
              <button
                className="mining-btn mining-btn--ghost"
                type="button"
                disabled={!canRepurchaseExpired}
                onClick={() => openRepurchaseModal({ mode: REPURCHASE_MODES.all })}
              >
                {repurchasingAll ? t("modules.mining.portfolio.repurchasing") : t("modules.mining.portfolio.repurchaseAll")}
              </button>
              <button
                className="mining-btn mining-btn--inline"
                type="button"
                disabled={!canWithdrawAllProfits}
                onClick={handleWithdrawAllProfits}
              >
                {withdrawingAll ? t("modules.mining.portfolio.withdrawing") : t("modules.mining.portfolio.withdrawToWallet")}
              </button>
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
                            <h4 className="mining-model-title">
                              <span className="mining-model-title__main">
                                <span>{machine.modelTitleName}</span>
                                {machine.modelTitleAmount ? <small>·{machine.modelTitleAmount}NETE</small> : null}
                              </span>
                              {machine.modelSuffix && !machine.hideModelSuffix ? (
                                <small className={`mining-model-title__suffix mining-model-title__suffix--${machine.modelSuffixTone}`}>
                                  {machine.modelSuffix}
                                </small>
                              ) : null}
                            </h4>
                            {machine.isAirdrop ? (
                              <span className="mining-chip mining-chip--airdrop">
                                {machine.isAirdrop && airdropMachineStatus.permanent ? t("modules.mining.buy.airdropPermanentBadge") : t("modules.mining.buy.airdropBadge")}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <span className="mining-chip mining-chip--status">
                          {machine.canClaim
                            ? t("modules.mining.portfolio.pending")
                            : machine.isEnded
                              ? t("modules.mining.statuses.ended")
                              : machine.isPendingRepurchase
                                ? t("modules.mining.statuses.pendingRepurchase")
                                : t("modules.mining.statuses.running")}
                        </span>
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
                        <div className="mining-info-tile">
                          <span>{t("modules.mining.portfolio.purchaseTime")}</span>
                          <strong>{machine.purchaseTime}</strong>
                        </div>
                        <div className="mining-info-tile mining-info-tile--action">
                          <button
                            className="mining-btn mining-btn--inline"
                            type="button"
                            disabled={
                              machine.canClaim
                                ? claimingId === machine.positionId || !wallet.isConnected || actionBusy
                                : !machine.canRepurchase || repurchasingId === machine.positionId || !wallet.isConnected || actionBusy || repurchasePaused
                            }
                            onClick={() => (
                              machine.canClaim
                                ? handleClaim(machine.positionId)
                                : openRepurchaseModal({ mode: REPURCHASE_MODES.single, positionId: machine.positionId })
                            )}
                          >
                            {machine.canClaim
                              ? claimingId === machine.positionId
                                ? t("modules.mining.portfolio.claiming")
                                : t("modules.mining.portfolio.claim")
                              : machine.canRepurchase
                                ? repurchasingId === machine.positionId
                                  ? t("modules.mining.portfolio.repurchasing")
                                  : t("modules.mining.portfolio.repurchase")
                                : machine.isEnded
                                  ? t("modules.mining.statuses.ended")
                                  : t("modules.mining.portfolio.noClaimableReward")}
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

          {checkinSection}

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
                ) : tiersQuery.isError || visibleMachineModels.length === 0 ? (
                  <article className="mining-plan-item">
                    <div>
                      <h4>{tiersQuery.isError ? t("modules.mining.buy.loadFailedTitle") : t("modules.mining.buy.emptyTitle")}</h4>
                      <p>{miningConfigMessage}</p>
                    </div>
                  </article>
                ) : (
                  visibleMachineModels.map((model) => (
                    <article key={model.tierIndex} className={model.isAirdrop ? "mining-plan-item mining-plan-item--airdrop" : "mining-plan-item"}>
                      <div>
                        <h4 className="mining-model-title">
                          <span className="mining-model-title__main">
                            <span>{model.modelTitleName}</span>
                            <small>·{model.modelTitleAmount}NETE</small>
                          </span>
                          {model.modelSuffix && !model.hideModelSuffix ? (
                            <small className={`mining-model-title__suffix mining-model-title__suffix--${model.modelSuffixTone}`}>
                              {model.modelSuffix}
                            </small>
                          ) : null}
                        </h4>
                      </div>
                      {model.badge ? <span className="mining-plan-badge">{model.isAirdrop && airdropMachineStatus.permanent ? t("modules.mining.buy.airdropPermanentBadge") : model.badge}</span> : null}

                      <div className="mining-plan-grid">
                        <div className="mining-info-tile"><span>{t("modules.mining.buy.totalRate")}</span><strong className="is-accent">{model.returnRate}</strong></div>
                        <div className="mining-info-tile"><span>{t("modules.mining.buy.quantity")}</span><strong>{model.ownedCount}/{model.unitCount}</strong></div>
                        <div className="mining-info-tile"><span>{t("modules.mining.buy.cycle")}</span><strong>{t("modules.mining.units.days", { count: model.periodDays })}</strong></div>
                      </div>

                      <div className="mining-plan-action">
                        <button
                          className="mining-btn mining-btn--primary"
                          type="button"
                          onClick={() => (model.isAirdrop ? undefined : openPurchaseModal(model))}
                          disabled={model.isAirdrop || repurchasePaused || model.remaining <= 0}
                        >
                          {model.isAirdrop
                            ? t("modules.mining.buy.airdropAction")
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
              <details className="mining-rule-card" open>
                <summary>
                  <span className="mining-rule-card__index">01</span>
                  <h4>{t("modules.mining.rules.airdropTitle")}</h4>
                  <Icon icon="solar:alt-arrow-down-outline" aria-hidden="true" />
                </summary>
                <div className="mining-rule-card__body">
                  <p>{t("modules.mining.rules.synthesized")}：{airdropMachineStatus.synthesized ? t("modules.mining.statuses.synthesized") : t("modules.mining.statuses.notSynthesized")}</p>
                  <p>{t("modules.mining.rules.permanent")}：{airdropMachineStatus.permanent ? t("modules.mining.statuses.permanent") : t("modules.mining.statuses.notPermanent")}</p>
                  <p>{t("modules.mining.rules.validityLeft")}：{t("modules.mining.units.days", { count: airdropMachineStatus.validityLeftDays })}</p>
                  <p>{t("modules.mining.rules.produced")}：{airdropMachineStatus.produced}</p>
                  <p>{t("modules.mining.rules.giftRule")}：{airdropMachineStatus.triggerGiftRule}</p>
                </div>
              </details>

              <details className="mining-rule-card">
                <summary>
                  <span className="mining-rule-card__index">02</span>
                  <h4>{t("modules.mining.rules.outputWalletTitle")}</h4>
                  <Icon icon="solar:alt-arrow-down-outline" aria-hidden="true" />
                </summary>
                <div className="mining-rule-card__body">
                  <ul>
                    {t("modules.mining.rules.outputWalletRules", { returnObjects: true }).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </details>

              <details className="mining-rule-card">
                <summary>
                  <span className="mining-rule-card__index">03</span>
                  <h4>{t("modules.mining.rules.reductionTitle")}</h4>
                  <Icon icon="solar:alt-arrow-down-outline" aria-hidden="true" />
                </summary>
                <div className="mining-rule-card__body">
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
                </div>
              </details>
            </div>
          </section>
        </div>
      ) : null}

      {selectedModel && portalRoot ? createPortal((
        <div className="fixed inset-0 z-[520] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={closePurchaseModal} role="presentation">
          <article
            className="max-h-[88dvh] w-full max-w-[760px] overflow-y-auto rounded-[20px] border border-white/10 bg-[#141419] p-4 text-white shadow-[0_25px_80px_rgba(0,0,0,0.55)] md:max-h-[92vh] md:rounded-[24px] md:p-5"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedModel.model} ${t("modules.mining.modal.subscribe")}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ff9900] text-base font-bold text-white">B</span>
                <h3 className="font-display text-lg font-bold tracking-tight text-white md:text-xl">{selectedModel.modelPicker} {t("modules.mining.modal.subscribe")}</h3>
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
                  <span className="truncate">{selectedModel.modelPicker} - {selectedModel.price} NETE</span>
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
                              setPaymentMethod(PAYMENT_METHODS.auto);
                              setModelPickerOpen(false);
                            }}
                            role="option"
                            aria-selected={active}
                          >
                            <span className="truncate">{model.modelPicker} - {model.price} NETE</span>
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
                <div className="min-w-0 flex-1 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/65">
                  <span>{t("modules.mining.modal.available")}</span>
                  <strong className="text-sm text-white">{t("modules.mining.units.machines", { count: selectedModel.remaining })}</strong>
                </div>
              </div>
            </div>

            <section className="mt-4">
              <div className="grid grid-cols-3 gap-2 text-xs max-[520px]:grid-cols-1">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/55">{t("modules.mining.modal.principalBalance")}</span>
                  <strong className="mt-1 block text-white">{formatTokenAmount(principalPoolBalance, 18, 4)} NETE</strong>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/55">{t("modules.mining.modal.profitBalance")}</span>
                  <strong className="mt-1 block text-white">{formatTokenAmount(profitPoolBalance, 18, 4)} NETE</strong>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/55">{t("modules.mining.modal.chainBalance")}</span>
                  <strong className="mt-1 block text-white">{formatTokenAmount(chainNeteBalance, 18, 4)} NETE</strong>
                </div>
              </div>
            </section>

            <section className="mt-4">
              <div className="text-sm font-semibold text-white/90">{t("modules.mining.modal.paymentMethod")}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 max-[390px]:grid-cols-1">
                <button
                  className={paymentMethod === PAYMENT_METHODS.auto ? "mining-payment-option is-active" : "mining-payment-option"}
                  type="button"
                  onClick={() => setPaymentMethod(PAYMENT_METHODS.auto)}
                >
                  {t("modules.mining.modal.payWithAuto")}
                </button>
                <button
                  className={paymentMethod === PAYMENT_METHODS.principal ? "mining-payment-option is-active" : "mining-payment-option"}
                  type="button"
                  onClick={() => setPaymentMethod(PAYMENT_METHODS.principal)}
                >
                  {t("modules.mining.modal.payWithPrincipal")}
                </button>
                <button
                  className={paymentMethod === PAYMENT_METHODS.profit ? "mining-payment-option is-active" : "mining-payment-option"}
                  type="button"
                  onClick={() => setPaymentMethod(PAYMENT_METHODS.profit)}
                >
                  {t("modules.mining.modal.payWithProfit")}
                </button>
                <button
                  className={paymentMethod === PAYMENT_METHODS.wallet ? "mining-payment-option is-active" : "mining-payment-option"}
                  type="button"
                  onClick={() => setPaymentMethod(PAYMENT_METHODS.wallet)}
                >
                  {t("modules.mining.modal.payWithWallet")}
                </button>
              </div>
              {paymentMethod === PAYMENT_METHODS.auto && purchaseWalletShortfall > 0n ? (
                <p className="mt-2 text-xs text-white/60">
                  {t("modules.mining.modal.repurchaseWalletTopUp", { amount: formatTokenAmount(purchaseWalletShortfall, 18, 4) })}
                </p>
              ) : null}
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
                <p>{t("modules.mining.modal.singleCycle")}：<span className="text-white">{t("modules.mining.units.days", { count: selectedModel.periodDays })}</span></p>
                <p>{t("modules.mining.modal.maxCycle")}：<span className="text-white">{t("modules.mining.units.days", { count: selectedModel.maxPeriodDays })}</span></p>
                <p>{t("modules.mining.modal.withdrawFee")}：<span className="text-white">{selectedModel.withdrawFee}%</span></p>
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

      {repurchaseContext && portalRoot ? createPortal((
        <div className="fixed inset-0 z-[535] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={closeRepurchaseModal} role="presentation">
          <article
            className="max-h-[88dvh] w-full max-w-[520px] overflow-y-auto rounded-[20px] border border-white/10 bg-[#141419] p-4 text-white shadow-[0_25px_80px_rgba(0,0,0,0.55)] md:max-h-[92vh] md:rounded-[24px] md:p-5"
            role="dialog"
            aria-modal="true"
            aria-label={repurchaseContext.mode === REPURCHASE_MODES.all ? t("modules.mining.modal.repurchaseAllTitle") : t("modules.mining.modal.repurchaseTitle")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="mining-chip mining-chip--status">
                  {repurchaseContext.mode === REPURCHASE_MODES.all ? t("modules.mining.portfolio.repurchaseAll") : t("modules.mining.portfolio.repurchase")}
                </span>
                <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-white">
                  {repurchaseContext.mode === REPURCHASE_MODES.all ? t("modules.mining.modal.repurchaseAllTitle") : t("modules.mining.modal.repurchaseTitle")}
                </h3>
              </div>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-full text-2xl leading-none text-white/70 transition hover:bg-white/10 hover:text-white" type="button" onClick={closeRepurchaseModal} aria-label={t("modules.mining.modal.close")}>
                <Icon icon="solar:close-circle-outline" width="1em" height="1em" />
              </button>
            </div>

            <section className="mt-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/55">{t("modules.mining.modal.repurchaseCount")}</span>
                  <strong className="mt-1 block text-white">{t("modules.mining.units.machines", { count: repurchaseContext.rows.length })}</strong>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/55">{t("modules.mining.modal.repurchaseCost")}</span>
                  <strong className="mt-1 block text-[#caff00]">{formatTokenAmount(repurchaseContext.amountWei, 18, 4)} NETE</strong>
                </div>
              </div>
              {repurchaseContext.mode === REPURCHASE_MODES.single && repurchaseContext.positionId ? (
                <p className="mt-2 text-xs text-white/55">{t("modules.mining.portfolio.positionId")}：{repurchaseContext.positionId}</p>
              ) : null}
            </section>

            <section className="mt-4">
              <div className="grid grid-cols-3 gap-2 text-xs max-[520px]:grid-cols-1">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/55">{t("modules.mining.modal.principalBalance")}</span>
                  <strong className="mt-1 block text-white">{formatTokenAmount(principalPoolBalance, 18, 4)} NETE</strong>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/55">{t("modules.mining.modal.profitBalance")}</span>
                  <strong className="mt-1 block text-white">{formatTokenAmount(profitPoolBalance, 18, 4)} NETE</strong>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/55">{t("modules.mining.modal.chainBalance")}</span>
                  <strong className="mt-1 block text-white">{formatTokenAmount(chainNeteBalance, 18, 4)} NETE</strong>
                </div>
              </div>
            </section>

            <section className="mt-4">
              <div className="text-sm font-semibold text-white/90">{t("modules.mining.modal.repurchasePaymentMethod")}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 max-[390px]:grid-cols-1">
                <button
                  className={repurchasePayMode === REPURCHASE_PAY_MODES.auto ? "mining-payment-option is-active" : "mining-payment-option"}
                  type="button"
                  onClick={() => setRepurchasePayMode(REPURCHASE_PAY_MODES.auto)}
                >
                  {t("modules.mining.modal.payWithAuto")}
                </button>
                <button
                  className={repurchasePayMode === REPURCHASE_PAY_MODES.principal ? "mining-payment-option is-active" : "mining-payment-option"}
                  type="button"
                  onClick={() => setRepurchasePayMode(REPURCHASE_PAY_MODES.principal)}
                >
                  {t("modules.mining.modal.payWithPrincipal")}
                </button>
                <button
                  className={repurchasePayMode === REPURCHASE_PAY_MODES.profit ? "mining-payment-option is-active" : "mining-payment-option"}
                  type="button"
                  onClick={() => setRepurchasePayMode(REPURCHASE_PAY_MODES.profit)}
                >
                  {t("modules.mining.modal.payWithProfit")}
                </button>
                <button
                  className={repurchasePayMode === REPURCHASE_PAY_MODES.wallet ? "mining-payment-option is-active" : "mining-payment-option"}
                  type="button"
                  onClick={() => setRepurchasePayMode(REPURCHASE_PAY_MODES.wallet)}
                >
                  {t("modules.mining.modal.payWithWallet")}
                </button>
              </div>
              {repurchasePayMode === REPURCHASE_PAY_MODES.auto && repurchaseWalletShortfall > 0n ? (
                <p className="mt-2 text-xs text-white/60">
                  {t("modules.mining.modal.repurchaseWalletTopUp", { amount: formatTokenAmount(repurchaseWalletShortfall, 18, 4) })}
                </p>
              ) : null}
              {!repurchaseBalanceEnough && repurchaseContext.amountWei > 0n ? (
                <p className="mt-2 text-xs text-[#ffb199]">{t("modules.mining.modal.repurchaseInsufficientBalance")}</p>
              ) : null}
              {repurchaseContext.rows.length === 0 ? (
                <p className="mt-2 text-xs text-[#ffb199]">{t("modules.mining.modal.repurchaseUnavailable")}</p>
              ) : null}
              {repurchasePaused ? <p className="mt-2 text-xs text-white/65">{t("modules.mining.messages.paused")}</p> : null}
            </section>

            <button
              className="mining-modal-submit mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#caff00] text-base font-semibold text-black transition enabled:hover:shadow-[0_0_30px_rgba(202,255,0,0.45)] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45"
              type="button"
              disabled={!canSubmitRepurchase}
              onClick={handleSubmitRepurchase}
            >
              {repurchaseSubmitting ? t("modules.mining.portfolio.repurchasing") : t("modules.mining.modal.repurchaseSubmit")}
            </button>
          </article>
        </div>
      ), portalRoot) : null}

      {checkinCalendarOpen && portalRoot ? createPortal((
        <div className="calendar-mask is-open" onClick={() => setCheckinCalendarOpen(false)} role="presentation">
          <div className="calendar-popup" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={t("modules.mining.checkin.records")}>
            <div className="calendar-header">
              <span>{t("modules.mining.checkin.calendarTitle")}</span>
              <button type="button" onClick={() => setCheckinCalendarOpen(false)} aria-label={t("modules.mining.modal.close")}>
                <Icon icon="solar:close-circle-outline" width="1em" height="1em" />
              </button>
            </div>

            <div className="calendar-month">{t("modules.mining.checkin.calendarMonth", { year: checkInCalendar.year, month: checkInCalendar.month })}</div>

            <div className="calendar-week" aria-hidden="true">
              {t("modules.mining.checkin.weekdays", { returnObjects: true }).map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="calendar-days">
              {checkInCalendar.cells.map((cell) => (
                <div className={cell.empty ? "calendar-day empty" : "calendar-day"} key={cell.key}>
                  {cell.day ? <span>{cell.day}</span> : null}
                  {cell.signed ? <i className="check-icon" aria-label={t("modules.mining.checkin.signed")}>✓</i> : null}
                </div>
              ))}
            </div>

            <div className="calendar-footer">
              <div>{t("modules.mining.checkin.monthSigned", { count: checkInCalendar.signedCount })}</div>
              <div>{t("modules.mining.checkin.totalAmount")} <b>+{formatTokenAmount(cumulativeCheckInReward, 18, 4)}</b></div>
            </div>
          </div>
        </div>
      ), portalRoot) : null}

      {airdropModel && portalRoot ? createPortal((
        <div className="fixed inset-0 z-[530] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={closeAirdropModal} role="presentation">
          <article
            className="max-h-[88dvh] w-full max-w-[520px] overflow-y-auto rounded-[20px] border border-white/10 bg-[#141419] p-4 text-white shadow-[0_25px_80px_rgba(0,0,0,0.55)] md:max-h-[92vh] md:rounded-[24px] md:p-5"
            role="dialog"
            aria-modal="true"
            aria-label={t("modules.mining.modal.airdropTitle")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="mining-chip mining-chip--airdrop">
                  {airdropMachineStatus.permanent ? t("modules.mining.buy.airdropPermanentBadge") : t("modules.mining.buy.airdropBadge")}
                </span>
                <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-white">{airdropModel.model}</h3>
                <p className="mt-1 text-xs leading-6 text-white/65">{t("modules.mining.modal.airdropDesc")}</p>
              </div>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-full text-2xl leading-none text-white/70 transition hover:bg-white/10 hover:text-white" type="button" onClick={closeAirdropModal} aria-label={t("modules.mining.modal.close")}>
                <Icon icon="solar:close-circle-outline" width="1em" height="1em" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
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
