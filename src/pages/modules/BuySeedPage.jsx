import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { seedPurchaseRecords } from "../../data/mockData";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { approveUsdtToCore, buySeed, readCoreSeedInfo, readUserBalances } from "../../services/neteContracts";
import { formatTokenAmount, parseTokenInput } from "../../utils/formatters";

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

  const parsedQuantity = useMemo(() => {
    try {
      return parseTokenInput(quantityInput || "0");
    } catch {
      return 0n;
    }
  }, [quantityInput]);

  const seedPrice = seedInfoQuery.data?.seedPrice ?? 0n;
  const seedRemaining = seedInfoQuery.data?.seedRemaining ?? 0n;
  const posRemaining = seedInfoQuery.data?.posRemaining ?? 0n;
  const usdtBalance = balanceQuery.data?.usdtBalance ?? 0n;

  const estimatedUsdt = useMemo(() => {
    if (parsedQuantity <= 0n || seedPrice <= 0n) return 0n;
    return (parsedQuantity * seedPrice) / ONE_18;
  }, [parsedQuantity, seedPrice]);

  const canSubmit = wallet.isConnected && parsedQuantity > 0n && estimatedUsdt > 0n && !submitting;

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
      await approveUsdtToCore(account, estimatedUsdt);
      const result = await buySeed(account, estimatedUsdt);

      setTxMessage(t("modules.seed.messages.success", { hash: result.hash }));
      setQuantityInput("");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nete", "seed-info"] }),
        queryClient.invalidateQueries({ queryKey: ["nete", "balances", wallet.currentAddress] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("modules.seed.messages.failed");
      setTxMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-[28px] bg-transparent">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-3xl">
            <h1 className="font-display text-2xl font-black tracking-tight text-white md:text-3xl">{t("modules.seed.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/80">{t("modules.seed.desc")}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-transparent p-5 xl:col-span-2">
          <h2 className="font-display text-base font-bold tracking-wide text-white md:text-xl">{t("modules.seed.formTitle")}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-white/75">
              {t("modules.seed.price")}
              <input
                className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none"
                value={seedPrice > 0n ? formatTokenAmount(seedPrice, 18, 8) : "--"}
                disabled
              />
            </label>
            <label className="space-y-2 text-sm text-white/75">
              {t("modules.seed.quantity")}
              <input
                className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-[#caff00]/60"
                type="number"
                min="0"
                step="0.0001"
                placeholder={t("modules.seed.quantityPlaceholder")}
                value={quantityInput}
                onChange={(event) => setQuantityInput(event.target.value)}
              />
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-white/75">
              {t("modules.seed.usdtBalance")}
              <input
                className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none"
                value={wallet.isConnected ? formatTokenAmount(usdtBalance, 18, 6) : t("modules.seed.connectWallet")}
                disabled
              />
            </label>
            <label className="space-y-2 text-sm text-white/75">
              {t("modules.seed.estimatedUsdt")}
              <input
                className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none"
                value={estimatedUsdt > 0n ? formatTokenAmount(estimatedUsdt, 18, 6) : "--"}
                disabled
              />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#caff00] px-5 text-sm font-semibold tracking-wide text-black transition hover:shadow-[0_0_30px_rgba(202,255,0,0.45)] disabled:cursor-not-allowed disabled:opacity-45"
              type="button"
              onClick={handleBuySeed}
              disabled={!canSubmit}
            >
              {submitting ? t("modules.seed.submitting") : t("modules.seed.confirm")}
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 bg-transparent px-5 text-sm font-semibold tracking-wide text-white transition hover:border-white/40 hover:bg-white/5"
              type="button"
              onClick={clearForm}
            >
              {t("modules.seed.clear")}
            </button>
          </div>
          {txMessage ? <p className="mt-3 text-xs text-white/75 break-all">{txMessage}</p> : null}
        </article>

        <article className="rounded-2xl border border-white/10 bg-transparent p-5 space-y-4">
          <h2 className="font-display text-base font-bold tracking-wide text-white md:text-xl">{t("modules.seed.statusTitle")}</h2>
          <div className="rounded-xl border border-white/10 bg-transparent p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.seed.seedRemaining")}</div>
            <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">{formatTokenAmount(seedRemaining, 18, 2)} NETE</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-transparent p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.seed.posRemaining")}</div>
            <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">{formatTokenAmount(posRemaining, 18, 2)} NETE</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-transparent p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-white/55">{t("modules.seed.presaleActive")}</div>
            <div className="mt-2 font-display text-base font-bold text-[#caff00] md:text-lg">{seedInfoQuery.data?.presaleActive ? t("modules.seed.active") : t("modules.seed.inactive")}</div>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-white/10 bg-transparent p-5">
        <h2 className="font-display text-base font-bold tracking-wide text-white md:text-xl">{t("modules.seed.recordsTitle")}</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full border-collapse text-left text-xs md:text-sm [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold [&_th]:text-white/65 [&_td]:border-t [&_td]:border-white/10 [&_td]:px-4 [&_td]:py-3 [&_td]:text-white/85">
            <thead>
              <tr>
                <th>{t("modules.seed.time")}</th>
                <th>{t("modules.seed.amount")}</th>
                <th>{t("modules.seed.paid")}</th>
                <th>{t("modules.seed.status")}</th>
              </tr>
            </thead>
            <tbody>
              {seedPurchaseRecords.map((record) => (
                <tr key={`${record.time}-${record.amount}`}>
                  <td>{record.time}</td>
                  <td>{record.amount}</td>
                  <td>{record.paidUsdt}</td>
                  <td>{record.status === seedPurchaseRecords[0]?.status ? t("modules.seed.successStatus") : record.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
