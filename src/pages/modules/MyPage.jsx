import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LoadingState from "../../components/common/LoadingState";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getClaimMessage, getIncomeLedger, getIncomeOverview, getPerformanceLegs, getReferralInfo } from "../../services/neteApi";
import { claimWithSignature, readNetworkUserData, readUserBalances, readUserMiningData } from "../../services/neteContracts";
import { copyText } from "../../utils/clipboard";
import { formatTokenAmount, formatUnixTime, shortAddress } from "../../utils/formatters";
import { getWalletErrorMessage } from "../../utils/walletErrors";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const LEDGER_PAGE_SIZE = 10;

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

function pickAccountField(account, name, index) {
  if (!account) return undefined;
  if (account[name] !== undefined) return account[name];
  if (Array.isArray(account) && account[index] !== undefined) return account[index];
  return undefined;
}

function normalizeReferrer(value) {
  const address = String(value || "");
  return address && address.toLowerCase() !== ZERO_ADDRESS ? address : "";
}

function getLedgerAmount(row) {
  const primaryFields = [
    row?.amount,
    row?.delta,
    row?.value,
    row?.gross_reward,
    row?.grossReward,
    row?.profit_gross,
    row?.profitGross,
    row?.profit_net,
    row?.profitNet,
  ];
  const directAmount = primaryFields.find((value) => value !== undefined && value !== null && value !== "");

  if (directAmount !== undefined) {
    const parsed = toBigIntSafe(directAmount);
    if (parsed !== 0n) return parsed;
  }

  return toBigIntSafe(row?.principal_part ?? row?.principalPart)
    + toBigIntSafe(row?.profit_part ?? row?.profitPart)
    + toBigIntSafe(row?.accel_income ?? row?.accelIncome);
}

function getLedgerType(row, t) {
  const type = String(row?.type ?? row?.biz_type ?? row?.category ?? row?.event_type ?? row?.reward_type ?? "").trim();
  const normalizedType = type.toLowerCase();

  if (["矿机收益", "mining_income", "miner_income", "miner reward", "miner rewards"].includes(normalizedType)) {
    return t("modules.my.ledgerTypes.minerIncome");
  }

  if (["收益", "income", "profit", "reward", "rewards"].includes(normalizedType)) {
    return t("modules.my.ledgerTypes.income");
  }

  if (type && type !== "--") return type;
  if (row?.position_id || row?.positionId) return t("modules.my.ledgerTypes.minerIncome");
  return "--";
}

function formatBeijingTime(seconds) {
  const value = Number(seconds || 0);
  if (!Number.isFinite(value) || value <= 0) return "--";
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("zh-CN", { hour12: false, timeZone: "Asia/Shanghai" });
}

function getLedgerTimeValue(row) {
  const candidates = [
    row?.claimed_at,
    row?.claimedAt,
    row?.created_at,
    row?.createdAt,
    row?.settled_at,
    row?.settledAt,
    row?.timestamp,
  ];
  return candidates.map(Number).find((value) => Number.isFinite(value) && value > 0) || 0;
}

function getLedgerTimeText(row) {
  return formatBeijingTime(getLedgerTimeValue(row));
}

function normalizeLedgerRow(row, index, t) {
  const amountBigInt = getLedgerAmount(row);
  const signedText = amountBigInt < 0n ? "-" : "+";
  const amountText = `${signedText}${formatTokenAmount(amountBigInt < 0n ? -amountBigInt : amountBigInt, 18, 6)}`;

  return {
    id: `${row?.id ?? row?.tx_hash ?? row?.txHash ?? "row"}-${index}`,
    createdAtText: getLedgerTimeText(row),
    type: getLedgerType(row, t),
    amountText,
    balanceText: formatTokenAmount(row?.balance ?? row?.remain ?? 0n, 18, 6),
    txHash: String(row?.tx_hash ?? row?.txHash ?? row?.tx ?? "--"),
  };
}

function isEmptyLedgerRow(row) {
  const type = String(row?.type ?? row?.biz_type ?? row?.category ?? row?.event_type ?? row?.reward_type ?? "").trim();
  const txHash = String(row?.tx_hash ?? row?.txHash ?? row?.tx ?? "").trim();
  const createdAt = getLedgerTimeValue(row);
  const positionId = String(row?.position_id ?? row?.positionId ?? "").trim();

  return getLedgerAmount(row) === 0n
    && (!type || type === "--")
    && (!txHash || txHash === "--")
    && !createdAt
    && !positionId;
}

export default function MyPage() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();
  const queryClient = useQueryClient();
  const [claimingType, setClaimingType] = useState("");
  const [notice, setNotice] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [lastClaimInfo, setLastClaimInfo] = useState(null);
  const [ledgerPage, setLedgerPage] = useState(1);

  const incomeOverviewQuery = useQuery({
    queryKey: ["nete", "income-overview", wallet.currentAddress],
    queryFn: () => getIncomeOverview(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 10_000,
    retry: 1,
  });

  const incomeLedgerQuery = useQuery({
    queryKey: ["nete", "income-ledger", wallet.currentAddress, ledgerPage],
    queryFn: () => getIncomeLedger(wallet.currentAddress, { page: ledgerPage, pageSize: LEDGER_PAGE_SIZE }),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 10_000,
    retry: 1,
  });

  const referralInfoQuery = useQuery({
    queryKey: ["nete", "referral-info", wallet.currentAddress],
    queryFn: () => getReferralInfo(wallet.currentAddress),
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

  const networkDataQuery = useQuery({
    queryKey: ["nete", "network-data", wallet.currentAddress],
    queryFn: () => readNetworkUserData(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 15_000,
    retry: 1,
  });

  const balancesQuery = useQuery({
    queryKey: ["nete", "balances", wallet.currentAddress],
    queryFn: () => readUserBalances(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 10_000,
    retry: 1,
  });

  const miningDataQuery = useQuery({
    queryKey: ["nete", "mining", wallet.currentAddress],
    queryFn: () => readUserMiningData(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 10_000,
    retry: 1,
  });

  useEffect(() => {
    setLedgerPage(1);
  }, [wallet.currentAddress]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const rawLedgerRows = useMemo(
    () => toItems(incomeLedgerQuery.data).filter((row) => !isEmptyLedgerRow(row)),
    [incomeLedgerQuery.data],
  );
  const ledgerTotalCount = toTotalCount(incomeLedgerQuery.data);
  const clientPaginatedLedger = rawLedgerRows.length > LEDGER_PAGE_SIZE;
  const ledgerTotalPages = ledgerTotalCount > 0
    ? Math.max(1, Math.ceil(ledgerTotalCount / LEDGER_PAGE_SIZE))
    : clientPaginatedLedger
      ? Math.max(1, Math.ceil(rawLedgerRows.length / LEDGER_PAGE_SIZE))
      : 0;
  const ledgerRows = useMemo(
    () => {
      const rows = clientPaginatedLedger
        ? rawLedgerRows.slice((ledgerPage - 1) * LEDGER_PAGE_SIZE, ledgerPage * LEDGER_PAGE_SIZE)
        : rawLedgerRows;
      return rows.map((row, index) => normalizeLedgerRow(row, index, t));
    },
    [clientPaginatedLedger, ledgerPage, rawLedgerRows, t],
  );
  const hasLedgerPagination = ledgerPage > 1 || ledgerTotalPages > 1 || rawLedgerRows.length >= LEDGER_PAGE_SIZE;
  const canLedgerPrev = ledgerPage > 1 && !incomeLedgerQuery.isFetching;
  const canLedgerNext = !incomeLedgerQuery.isFetching && (
    ledgerTotalPages > 0
      ? ledgerPage < ledgerTotalPages
      : rawLedgerRows.length === LEDGER_PAGE_SIZE
  );

  const overview = incomeOverviewQuery.data || {};
  const referral = referralInfoQuery.data || {};
  const performanceLegs = performanceLegsQuery.data || {};
  const balances = balancesQuery.data || {};
  const network = networkDataQuery.data || {};
  const miningData = miningDataQuery.data || {};
  const referralAccount = network.referralAccount || {};
  const joinedAt = Number(pickAccountField(referralAccount, "updatedAt", 3) || 0);
  const referrerAddress = normalizeReferrer(
    pickAccountField(referralAccount, "referrer", 0)
      ?? referral.referrer
      ?? referral.referrer_address
      ?? referral.parent
      ?? referral.parent_address,
  );
  const ownPerformance = toBigIntSafe(referral.own_perf);
  const teamPerformance = toBigIntSafe(performanceLegs.team_perf);
  const zonePerformance = toBigIntSafe(performanceLegs.small_leg_perf);
  const totalDividend = toBigIntSafe(overview.dividend_income_total) + toBigIntSafe(overview.v9_income_total);
  const profitPoolBalance = useMemo(
    () => (miningData.positions || []).reduce((sum, position) => sum + (position.profit || 0n), 0n),
    [miningData.positions],
  );
  const inviteLink = useMemo(() => {
    if (!wallet.currentAddress) return "--";
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin || "https://nete.io"}/?ref=${wallet.currentAddress}`;
  }, [wallet.currentAddress]);

  const assetRows = useMemo(() => {
    const neteBalance = balances.neteBalance ?? 0n;
    const principalPool = miningData.repurchaseBalance ?? 0n;

    return [
      [
        { label: t("modules.my.summary.nete"), value: formatTokenAmount(neteBalance, 18, 4), unit: "NETE", asset: true },
        { label: t("modules.my.summary.principalPool"), value: formatTokenAmount(principalPool, 18, 4), unit: "NETE", asset: true },
        { label: t("modules.my.summary.profitPool"), value: formatTokenAmount(profitPoolBalance, 18, 4), unit: "NETE", asset: true },
      ],
      [
        { label: t("modules.my.summary.ownPerformance"), value: formatTokenAmount(ownPerformance, 18, 2), unit: "NETE" },
        { label: t("modules.my.summary.team"), value: formatTokenAmount(teamPerformance, 18, 2), unit: "NETE" },
        { label: t("modules.my.summary.zonePerformance"), value: formatTokenAmount(zonePerformance, 18, 2), unit: "NETE" },
      ],
    ];
  }, [balances.neteBalance, miningData.repurchaseBalance, ownPerformance, profitPoolBalance, teamPerformance, t, zonePerformance]);

  const claimRows = useMemo(() => [
    { key: "referral", label: t("modules.my.summary.referral"), amount: overview.pending_referral ?? 0n, labelKey: "modules.my.claimActions.referral" },
    { key: "dividend", label: t("modules.my.summary.dividend"), amount: overview.pending_dividend ?? 0n, labelKey: "modules.my.claimActions.dividend" },
    { key: "v9", label: t("modules.my.summary.v9"), amount: overview.pending_v9 ?? 0n, labelKey: "modules.my.claimActions.v9" },
  ].map((row) => ({ ...row, claimable: toBigIntSafe(row.amount) > 0n })), [overview.pending_dividend, overview.pending_referral, overview.pending_v9, t]);

  const loading = incomeOverviewQuery.isLoading || referralInfoQuery.isLoading || performanceLegsQuery.isLoading || balancesQuery.isLoading || miningDataQuery.isLoading;

  const copyInviteLink = async () => {
    if (!wallet.currentAddress || inviteLink === "--") return;
    try {
      const copied = await copyText(inviteLink);
      setCopyNotice(copied ? t("modules.my.messages.copied") : inviteLink);
    } catch {
      setCopyNotice(inviteLink);
    }
  };

  const handleClaim = async (type) => {
    const target = claimRows.find((row) => row.key === type);
    if (!target?.claimable) return;

    if (!wallet.isConnected) {
      setNotice(t("modules.my.messages.connectWallet"));
      return;
    }

    try {
      setClaimingType(type);
      setNotice("");
      setCopyNotice("");
      await wallet.ensureCorrectChain();

      const claimMessage = await getClaimMessage(type, { user: wallet.currentAddress });
      const tx = await claimWithSignature(wallet.currentAddress, claimMessage);
      setLastClaimInfo({
        type,
        amount: claimMessage.amount,
        deadline: Number(claimMessage.deadline || 0),
      });
      setNotice(t("modules.my.messages.success", { hash: tx.hash }));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nete", "income-overview", wallet.currentAddress] }),
        queryClient.invalidateQueries({ queryKey: ["nete", "income-ledger", wallet.currentAddress] }),
        queryClient.invalidateQueries({ queryKey: ["nete", "network-data", wallet.currentAddress] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("modules.my.messages.failed");
      if (message.includes("claim signature disabled")) {
        setNotice(t("modules.my.messages.disabled"));
      } else {
        setNotice(getWalletErrorMessage(error, t, "modules.my.messages.failed"));
      }
    } finally {
      setClaimingType("");
    }
  };

  return (
    <section className="module-page my-account-page">
      <header className="my-account-hero">
        <div className="my-account-hero__inner">
          <p className="module-eyebrow">NETE ACCOUNT</p>
          <h1>{t("modules.my.accountTitle")}</h1>
          <p className="my-account-hero__copy">{t("modules.my.desc")}</p>

          <div className="my-account-row" aria-label={t("modules.my.accountInfo")}>
            <article className="my-account-chip">
              <span className="my-account-label">{t("modules.my.summary.joinedAt")}</span>
              <strong>{wallet.isConnected ? formatUnixTime(joinedAt) : t("modules.my.disconnected")}</strong>
            </article>
            <article className="my-account-chip">
              <span className="my-account-label">{t("modules.my.summary.referrer")}</span>
              <strong>{wallet.isConnected ? (referrerAddress ? shortAddress(referrerAddress) : t("modules.my.unbound")) : t("modules.my.disconnected")}</strong>
            </article>
          </div>
        </div>
      </header>

      {!wallet.isConnected ? <p className="my-account-hint">{t("modules.my.connectHint")}</p> : null}

      <section className="my-account-panel my-invite-panel" aria-label={t("modules.my.inviteTitle")}>
        <div>
          <p className="my-invite-desc">{t("modules.my.inviteDesc")}</p>
          <span className="my-invite-link">{inviteLink}</span>
        </div>
        <button className="my-copy-button" type="button" disabled={!wallet.currentAddress} onClick={copyInviteLink}>
          {t("modules.my.share")}
        </button>
      </section>
      {copyNotice ? <p className="my-account-note my-account-note--flush" aria-live="polite">{copyNotice}</p> : null}

      <section className="my-account-panel">
        <div className="my-section-head">
          <h2>{t("modules.my.overview")}</h2>
          <span>{t("modules.my.assetTag")}</span>
        </div>

        {loading ? <LoadingState className="module-loading-card" /> : (
          <div className="my-metric-board">
            {assetRows.map((row, rowIndex) => (
              <div className="my-metric-row" key={rowIndex}>
                {row.map((item) => (
                  <article className={item.asset ? "my-metric-card my-metric-card--asset" : "my-metric-card"} key={item.label}>
                    <span className="my-account-label">{item.label}</span>
                    <strong>
                      {item.value}
                      <small>{item.unit}</small>
                    </strong>
                  </article>
                ))}
              </div>
            ))}

            <article className="my-dividend-card">
              <span className="my-account-label">{t("modules.my.summary.totalDividend")}</span>
              <strong>{formatTokenAmount(totalDividend, 18, 4)} NETE</strong>
            </article>
          </div>
        )}
      </section>

      <section className="my-account-panel">
        <div className="my-section-head">
          <h2>{t("modules.my.pendingRewards")}</h2>
          <span>{t("modules.my.rewardCount", { count: claimRows.length })}</span>
        </div>

        <div className="my-claim-list">
          {claimRows.map((row) => (
            <div className="my-claim-row" key={row.key}>
              <span className="my-account-label">{row.label}</span>
              <strong>{formatTokenAmount(row.amount, 18, 4)} NETE</strong>
              <button
                type="button"
                disabled={!row.claimable || claimingType === row.key || Boolean(claimingType) || !wallet.isConnected}
                onClick={() => handleClaim(row.key)}
                aria-label={t(row.labelKey)}
              >
                {claimingType === row.key ? t("modules.my.processing") : t("modules.my.claim")}
              </button>
            </div>
          ))}
        </div>

        {lastClaimInfo ? (
          <p className="my-account-note">
            {t("modules.my.lastClaim", { type: lastClaimInfo.type, amount: formatTokenAmount(lastClaimInfo.amount ?? 0n, 18, 4), deadline: formatUnixTime(lastClaimInfo.deadline) })}
          </p>
        ) : null}
        {notice ? <p className="my-account-note">{notice}</p> : null}
      </section>

      <section className="my-account-panel my-history-panel">
        <div className="my-section-head">
          <h2>{t("modules.my.detailTitle")}</h2>
          <span>{t("modules.my.listTag")}</span>
        </div>

        <div className="my-history-list">
          {incomeLedgerQuery.isLoading ? (
            <div className="my-detail-list">
              <LoadingState variant="list" rows={4} cells={3} />
            </div>
          ) : ledgerRows.length === 0 ? (
            <div className="my-empty-state">{t("modules.my.emptyLedger")}</div>
          ) : (
            <div className="my-detail-list">
              {ledgerRows.map((row) => (
                <div className="my-detail-row" key={row.id}>
                  <div className="my-detail-row__info">
                    <span className="my-type-badge">{row.type}</span>
                    <time>{row.createdAtText}</time>
                  </div>
                  <strong className={row.amountText.startsWith("-") ? "is-negative" : ""}>{row.amountText}</strong>
                </div>
              ))}
            </div>
          )}
          {hasLedgerPagination ? (
            <div className="my-detail-pagination" aria-label={t("modules.my.pagination.label")}>
              <button
                type="button"
                disabled={!canLedgerPrev}
                onClick={() => setLedgerPage((page) => Math.max(1, page - 1))}
              >
                {t("modules.my.pagination.prev")}
              </button>
              <span>
                {ledgerTotalPages > 0
                  ? t("modules.my.pagination.pageWithTotal", { page: ledgerPage, total: ledgerTotalPages })
                  : t("modules.my.pagination.page", { page: ledgerPage })}
              </span>
              <button
                type="button"
                disabled={!canLedgerNext}
                onClick={() => setLedgerPage((page) => page + 1)}
              >
                {t("modules.my.pagination.next")}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
