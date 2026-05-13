import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LoadingState from "../../components/common/LoadingState";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getClaimMessage, getIncomeLedger, getIncomeOverview, getReferralInfo } from "../../services/neteApi";
import { claimWithSignature, readNetworkUserData, readUserBalances, readUserMiningData } from "../../services/neteContracts";
import { formatTokenAmount, formatUnixTime, shortAddress } from "../../utils/formatters";

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

function normalizeLedgerRow(row, index) {
  const amountRaw = row?.amount ?? row?.delta ?? row?.value ?? "0";
  const amountBigInt = toBigIntSafe(amountRaw);
  const signedText = amountBigInt < 0n ? "-" : "+";
  const amountText = `${signedText}${formatTokenAmount(amountBigInt < 0n ? -amountBigInt : amountBigInt, 18, 6)}`;

  return {
    id: `${row?.id ?? row?.tx_hash ?? row?.txHash ?? "row"}-${index}`,
    createdAt: Number(row?.created_at ?? row?.createdAt ?? row?.timestamp ?? 0),
    type: String(row?.type ?? row?.biz_type ?? row?.category ?? "--"),
    amountText,
    balanceText: formatTokenAmount(row?.balance ?? row?.remain ?? 0n, 18, 6),
    txHash: String(row?.tx_hash ?? row?.txHash ?? row?.tx ?? "--"),
  };
}

export default function MyPage() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();
  const queryClient = useQueryClient();
  const [claimingType, setClaimingType] = useState("");
  const [notice, setNotice] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [lastClaimInfo, setLastClaimInfo] = useState(null);

  const incomeOverviewQuery = useQuery({
    queryKey: ["nete", "income-overview", wallet.currentAddress],
    queryFn: () => getIncomeOverview(wallet.currentAddress),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 10_000,
    retry: 1,
  });

  const incomeLedgerQuery = useQuery({
    queryKey: ["nete", "income-ledger", wallet.currentAddress],
    queryFn: () => getIncomeLedger(wallet.currentAddress, { page: 1, pageSize: 30 }),
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

  const ledgerRows = useMemo(
    () => toItems(incomeLedgerQuery.data).map(normalizeLedgerRow),
    [incomeLedgerQuery.data],
  );

  const overview = incomeOverviewQuery.data || {};
  const referral = referralInfoQuery.data || {};
  const balances = balancesQuery.data || {};
  const network = networkDataQuery.data || {};
  const miningData = miningDataQuery.data || {};
  const currentLevel = overview.user_level ?? network.userLevel ?? 0;
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
        { label: t("modules.my.summary.ownPerformance"), value: formatTokenAmount(referral.own_perf ?? 0n, 18, 2), unit: "NETE" },
        { label: t("modules.my.summary.team"), value: formatTokenAmount(referral.subtree_perf ?? 0n, 18, 2), unit: "NETE" },
        { label: t("modules.my.summary.zonePerformance"), value: formatTokenAmount(referral.small_leg_perf ?? 0n, 18, 2), unit: "NETE" },
      ],
    ];
  }, [balances.neteBalance, miningData.repurchaseBalance, profitPoolBalance, referral.own_perf, referral.small_leg_perf, referral.subtree_perf, t]);

  const claimRows = useMemo(() => [
    { key: "referral", label: t("modules.my.summary.referral"), amount: overview.pending_referral ?? 0n, labelKey: "modules.my.claimActions.referral" },
    { key: "dividend", label: t("modules.my.summary.dividend"), amount: overview.pending_dividend ?? 0n, labelKey: "modules.my.claimActions.dividend" },
    { key: "v9", label: t("modules.my.summary.v9"), amount: overview.pending_v9 ?? 0n, labelKey: "modules.my.claimActions.v9" },
  ], [overview.pending_dividend, overview.pending_referral, overview.pending_v9, t]);

  const loading = incomeOverviewQuery.isLoading || referralInfoQuery.isLoading || balancesQuery.isLoading || miningDataQuery.isLoading;

  const copyInviteLink = async () => {
    if (!wallet.currentAddress || inviteLink === "--") return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyNotice(t("modules.my.messages.copied"));
    } catch {
      setCopyNotice(inviteLink);
    }
  };

  const handleClaim = async (type) => {
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
        setNotice(message);
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
              <span className="my-account-label">{t("modules.my.summary.wallet")}</span>
              <strong>{wallet.isConnected ? shortAddress(wallet.currentAddress) : t("modules.my.disconnected")}</strong>
            </article>
            <article className="my-account-chip my-account-chip--vip">
              <span className="my-account-label">{t("modules.my.summary.level")}</span>
              <strong>V{currentLevel}</strong>
            </article>
          </div>
        </div>
      </header>

      {!wallet.isConnected ? <p className="my-account-hint">{t("modules.my.connectHint")}</p> : null}

      <section className="my-account-panel my-invite-panel" aria-label={t("modules.my.inviteTitle")}>
        <div>
          <span className="my-account-label">{t("modules.my.inviteTitle")}</span>
          <span className="my-invite-link">{inviteLink}</span>
        </div>
        <button className="my-copy-button" type="button" disabled={!wallet.currentAddress} onClick={copyInviteLink}>
          {t("modules.my.copy")}
        </button>
      </section>
      {copyNotice ? <p className="my-account-note my-account-note--flush">{copyNotice}</p> : null}

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
                disabled={claimingType === row.key || Boolean(claimingType) || !wallet.isConnected}
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
          <div className="my-detail-list">
            <div className="my-detail-head">
              <span>{t("modules.my.type")}</span>
              <span>{t("modules.my.amount")}</span>
              <span>{t("modules.my.claimTime")}</span>
            </div>
            {incomeLedgerQuery.isLoading ? (
              <LoadingState variant="list" rows={4} cells={3} />
            ) : ledgerRows.length === 0 ? (
              <div className="my-empty-state">{t("modules.my.emptyLedger")}</div>
            ) : (
              ledgerRows.map((row) => (
                <div className="my-detail-row" key={row.id}>
                  <span className="my-type-badge">{row.type}</span>
                  <strong className={row.amountText.startsWith("-") ? "is-negative" : ""}>{row.amountText}</strong>
                  <span>{row.createdAt ? formatUnixTime(row.createdAt) : "--"}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
