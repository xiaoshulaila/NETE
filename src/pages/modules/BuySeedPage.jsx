import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatUnits } from "viem";
import LoadingState from "../../components/common/LoadingState";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getPresaleRecords } from "../../services/neteApi";
import { approveUsdtToCore, buySeed, readCoreSeedInfo, readUsdtCoreAllowance, readUserBalances, readUserMiningData } from "../../services/neteContracts";
import { formatTokenAmount, formatUnixTime, parseTokenInput, shortAddress } from "../../utils/formatters";

const ONE_18 = 10n ** 18n;

export default function BuySeedPage() {
  const { t } = useTranslation();
  const wallet = useWalletConnector();
  const queryClient = useQueryClient();
  const [quantityInput, setQuantityInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [txMessage, setTxMessage] = useState("");

  const seedInfoQuery = useQuery({
    queryKey: ["nete", "seed-info"],
    queryFn: readCoreSeedInfo,
    staleTime: 15_000,
    retry: 1,
  });

  const balanceQuery = useQuery({
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

  const recordsQuery = useQuery({
    queryKey: ["nete", "presale-records", wallet.currentAddress],
    queryFn: () => getPresaleRecords(wallet.currentAddress, { pageSize: 20 }),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 15_000,
    retry: 1,
  });

  const parsedQuantity = useMemo(() => {
    try {
      return parseTokenInput(quantityInput || "0");
    } catch {
      return 0n;
    }
  }, [quantityInput]);

  const seedPrice = seedInfoQuery.data?.seedPrice ?? 0n;
  const seedRemaining = seedInfoQuery.data?.seedRemaining ?? 0n;
  const seedPoolInit = seedInfoQuery.data?.seedPoolInit ?? 0n;
  const seedSold = seedInfoQuery.data?.seedSold ?? 0n;
  const minSeedBuy = seedInfoQuery.data?.minSeedBuy ?? 30n * ONE_18;
  const presaleActive = Boolean(seedInfoQuery.data?.presaleActive);
  const usdtBalance = balanceQuery.data?.usdtBalance ?? 0n;
  const principalPoolBalance = miningDataQuery.data?.repurchaseBalance ?? 0n;
  const seedTotal = seedPoolInit > 0n ? seedPoolInit : seedRemaining + seedSold;
  const soldPercent = seedTotal > 0n ? Math.min(100, Number((seedSold * 10_000n) / seedTotal) / 100) : 0;
  const soldPercentText = `${soldPercent.toFixed(2).replace(/\.00$/, "")}%`;
  const seedPriceText = seedPrice > 0n ? formatTokenAmount(seedPrice, 18, 8) : "--";
  const minSeedBuyInputValue = formatUnits(minSeedBuy, 18);
  const minSeedBuyText = formatTokenAmount(minSeedBuy, 18, 0);
  const usdtBalanceText = wallet.isConnected ? `${formatTokenAmount(usdtBalance, 18, 6)} USDT` : t("modules.seed.connectWallet");
  const principalPoolBalanceText = wallet.isConnected ? `${formatTokenAmount(principalPoolBalance, 18, 4)} NETE` : t("modules.seed.connectWallet");
  const seedInfoLoading = seedInfoQuery.isLoading;
  const balanceLoading = balanceQuery.isLoading;
  const principalPoolLoading = miningDataQuery.isLoading;
  const presaleRecords = useMemo(() => {
    const data = recordsQuery.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.rows)) return data.rows;
    return [];
  }, [recordsQuery.data]);

  const estimatedUsdt = useMemo(() => {
    if (parsedQuantity <= 0n || seedPrice <= 0n) return 0n;
    return (parsedQuantity * seedPrice) / ONE_18;
  }, [parsedQuantity, seedPrice]);
  const estimatedUsdtText = estimatedUsdt > 0n ? `${formatTokenAmount(estimatedUsdt, 18, 6)} USDT` : "--";

  const canSubmit = wallet.isConnected && presaleActive && parsedQuantity >= minSeedBuy && estimatedUsdt > 0n && !submitting;
  const submitLabel = submitting
    ? t("modules.seed.submitting")
    : presaleActive
      ? t("modules.seed.confirm")
      : t("modules.seed.saleClosed");

  const clearForm = () => {
    setQuantityInput("");
    setTxMessage("");
  };

  const handleBuySeed = async () => {
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setTxMessage("");
      await wallet.ensureCorrectChain();

      const account = wallet.currentAddress;
      const allowance = await readUsdtCoreAllowance(account);
      if (allowance < estimatedUsdt) {
        await approveUsdtToCore(account, estimatedUsdt);
      }
      const result = await buySeed(account, estimatedUsdt);

      setTxMessage(t("modules.seed.messages.success", { hash: result.hash }));
      setQuantityInput("");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nete", "seed-info"] }),
        queryClient.invalidateQueries({ queryKey: ["nete", "balances", wallet.currentAddress] }),
        queryClient.invalidateQueries({ queryKey: ["nete", "mining", wallet.currentAddress] }),
        queryClient.invalidateQueries({ queryKey: ["nete", "presale-records", wallet.currentAddress] }),
      ]);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "";
      const message = rawMessage.includes("SeedSaleClosed") || rawMessage.includes("0xc038c35b")
        ? t("modules.seed.messages.saleClosed")
        : rawMessage || t("modules.seed.messages.failed");
      setTxMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="seed-page">
      <div className="seed-layout">
        <section>
          <header className="seed-hero">
            <p className="seed-eyebrow">NETE SEED</p>
            <h1>{t("modules.seed.title")}</h1>
            <p>{t("modules.seed.desc")}</p>
          </header>

          <article className="seed-panel seed-progress-panel" aria-label={t("modules.seed.quotaTitle")}>
            <div className="seed-panel-head">
              <div>
                <h2>{t("modules.seed.quotaTitle")}</h2>
                <p>{t("modules.seed.quotaDesc")}</p>
              </div>
            </div>
            {seedInfoLoading ? (
              <LoadingState className="seed-loading-card" />
            ) : (
              <>
                <div className="seed-progress-track" aria-hidden="true">
                  <div className="seed-progress-fill" style={{ width: soldPercentText }} />
                  <div className="seed-progress-label seed-mono">{soldPercentText}</div>
                </div>
                <div className="seed-price-display">
                  <span>{t("modules.seed.price")}</span>
                  <strong className="seed-mono">{seedPriceText}</strong>
                  <small>{t("modules.seed.priceNote", { price: seedPriceText })}</small>
                </div>
                <div className="seed-progress-meta">
                  <div className="seed-metric">
                    <span>{t("modules.seed.totalAmount")}</span>
                    <strong className="seed-mono">{formatTokenAmount(seedTotal, 18, 2)}</strong>
                  </div>
                  <div className="seed-metric">
                    <span>{t("modules.seed.remainingQuota")}</span>
                    <strong className="seed-mono">{formatTokenAmount(seedRemaining, 18, 2)}</strong>
                  </div>
                </div>
              </>
            )}
          </article>
        </section>

        <section className="seed-panel seed-buy-panel" aria-label={t("modules.seed.buyTitle")}>
          <div className="seed-panel-head">
            <div>
              <h2>{t("modules.seed.buyTitle")}</h2>
              <p>{t("modules.seed.buyDesc")}</p>
            </div>
          </div>

          <div className="seed-balance-row">
            <div className="seed-balance-card">
              <span>{t("modules.seed.usdtBalance")}</span>
              {balanceLoading ? (
                <LoadingState compact />
              ) : (
                <strong className="seed-mono">{usdtBalanceText}</strong>
              )}
            </div>
            <div className="seed-balance-card">
              <span>{t("modules.seed.principalPoolBalance")}</span>
              {principalPoolLoading ? (
                <LoadingState compact />
              ) : (
                <strong className="seed-mono">{principalPoolBalanceText}</strong>
              )}
            </div>
          </div>

          <div className="seed-form-grid">
            <label className="seed-field">
              <span>{t("modules.seed.quantity")}</span>
              <input
                className="seed-input seed-mono"
                type="number"
                min={minSeedBuyInputValue}
                step="1"
                placeholder={t("modules.seed.quantityPlaceholder", { amount: minSeedBuyText })}
                value={quantityInput}
                onChange={(event) => setQuantityInput(event.target.value)}
              />
            </label>
            <div className="seed-field">
              <span>{t("modules.seed.estimatedUsdt")}</span>
              <div className="seed-readonly-value seed-mono">{estimatedUsdtText}</div>
            </div>
          </div>

          <div className="seed-actions">
            <button className="seed-button seed-button-primary" type="button" onClick={handleBuySeed} disabled={!canSubmit}>
              {submitLabel}
            </button>
            <button className="seed-button seed-button-ghost" type="button" onClick={clearForm}>
              {t("modules.seed.clear")}
            </button>
          </div>
        </section>

        <section className="seed-panel seed-records-panel" aria-label={t("modules.seed.recordsTitle")}>
          <div className="seed-panel-head">
            <div>
              <h2>{t("modules.seed.recordsTitle")}</h2>
              <p>{t("modules.seed.recordsDesc")}</p>
            </div>
          </div>

          {!wallet.isConnected ? (
            <p className="seed-record-empty">{t("modules.seed.connectWallet")}</p>
          ) : recordsQuery.isLoading ? (
            <LoadingState className="seed-loading-card" />
          ) : recordsQuery.isError ? (
            <p className="seed-record-empty">{t("modules.seed.recordsFailed")}</p>
          ) : presaleRecords.length > 0 ? (
            <div className="seed-records-list">
              {presaleRecords.map((record) => {
                const key = `${record.tx_hash || record.txHash || record.created_at}-${record.log_index ?? record.buyer}`;
                const amount = record.nete_amount ?? record.neteAmount ?? "0";
                const paid = record.usdt_amount ?? record.usdtAmount ?? "0";
                const hash = record.tx_hash || record.txHash || "";

                return (
                  <article className="seed-record-item" key={key}>
                    <div className="seed-record-main">
                      <div className="seed-record-time">
                        <span>{t("modules.seed.time")}：</span>
                        <strong>{formatUnixTime(record.created_at ?? record.createdAt)}</strong>
                      </div>
                      <span className="seed-status-chip">{t("modules.seed.successStatus")}</span>
                    </div>
                    {hash ? (
                      <small className="seed-record-hash seed-mono">
                        {t("modules.seed.txHash")}：{shortAddress(hash, 8, 6)}
                      </small>
                    ) : null}
                    <div className="seed-record-values">
                      <div className="seed-record-cell">
                        <span>{t("modules.seed.amount")}</span>
                        <strong className="seed-mono">{formatTokenAmount(amount, 18, 4)} NETE</strong>
                      </div>
                      <div className="seed-record-cell">
                        <span>{t("modules.seed.paid")}</span>
                        <strong className="seed-mono">{formatTokenAmount(paid, 18, 4)} USDT</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="seed-record-empty">{t("modules.seed.emptyRecords")}</p>
          )}
        </section>
      </div>
      {txMessage ? (
        <div className="seed-toast is-show" role="status" aria-live="polite">
          {txMessage}
        </div>
      ) : null}
    </section>
  );
}
