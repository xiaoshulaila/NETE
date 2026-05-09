import { Icon } from "@iconify/react";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatUnits } from "viem";
import C2CPageFrame from "../../components/c2c/C2CPageFrame";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { getMySellOrders, getMyTakenOrders, getPublicOrders, getRuntimeConfig } from "../../services/neteApi";
import { approveNeteToMarket, approveUsdtToMarket, cancelSellOrder, createSellOrder, fillOrder, readMarketConfig } from "../../services/neteContracts";
import { formatTokenAmount, parseTokenInput, shortAddress } from "../../utils/formatters";
import "../styles/c2c.css";

const marketTabs = [
  { key: "market", labelKey: "modules.c2cMarket.tabs.market" },
  { key: "mine", labelKey: "modules.c2cMarket.tabs.mine" },
];

const ONE_18 = 10n ** 18n;

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
    const text = String(value).trim();
    if (!text) return 0n;
    if (text.includes(".")) {
      return parseTokenInput(text);
    }
    return BigInt(text);
  } catch {
    return 0n;
  }
}

function formatDateTime(seconds, locale = "zh-CN") {
  const value = Number(seconds || 0);
  if (!value) return "--";
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString(locale, { hour12: false });
}

function formatUnitPrice(value) {
  return `${formatTokenAmount(value, 18, 6)} U`;
}

function formatQuantity(value) {
  return `${formatTokenAmount(value, 18, 4)} NETE`;
}

function formatTotal(value) {
  return `${formatTokenAmount(value, 18, 4)} USDT`;
}

function isOrderOpen(status) {
  const text = String(status || "").toLowerCase();
  return text === "open" || text === "0";
}

function normalizeOrder(raw) {
  const neteAmount = toBigIntSafe(raw?.nete_amount ?? raw?.neteAmount ?? raw?.amount);
  const priceUsdt = toBigIntSafe(raw?.price_usdt ?? raw?.priceUsdt ?? raw?.price_per_nete ?? raw?.price);
  const givenTotal = toBigIntSafe(raw?.total_usdt ?? raw?.totalUsdt ?? raw?.total);
  const totalUsdt = givenTotal > 0n
    ? givenTotal
    : neteAmount > 0n && priceUsdt > 0n
      ? (neteAmount * priceUsdt) / ONE_18
      : 0n;

  return {
    orderId: String(raw?.order_id ?? raw?.orderId ?? raw?.id ?? ""),
    orderNo: String(raw?.order_no ?? raw?.orderNo ?? ""),
    seller: String(raw?.seller ?? ""),
    buyer: String(raw?.buyer ?? ""),
    neteAmount,
    priceUsdt,
    totalUsdt,
    status: String(raw?.status ?? raw?.status_code ?? "Open"),
    isPublic: Boolean(raw?.is_public ?? raw?.isPublic ?? true),
    createdAt: Number(raw?.created_at ?? raw?.createdAt ?? 0),
    filledAt: Number(raw?.filled_at ?? raw?.filledAt ?? 0),
  };
}

function toLower(value) {
  return String(value || "").toLowerCase();
}

export default function C2CMarketPage() {
  const { i18n, t } = useTranslation();
  const wallet = useWalletConnector();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");
  const activeView = view === "mine" ? "mine" : "market";
  const locale = i18n.resolvedLanguage?.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";

  const [searchInput, setSearchInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sellQuantity, setSellQuantity] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [actionKey, setActionKey] = useState("");

  const runtimeConfigQuery = useQuery({
    queryKey: ["nete", "runtime-config"],
    queryFn: getRuntimeConfig,
    staleTime: 20_000,
    retry: 1,
  });

  const marketConfigQuery = useQuery({
    queryKey: ["nete", "market-config"],
    queryFn: readMarketConfig,
    staleTime: 20_000,
    retry: 1,
  });

  const publicOrdersQuery = useQuery({
    queryKey: ["nete", "orders", "public"],
    queryFn: () => getPublicOrders({ page: 1, pageSize: 80 }),
    staleTime: 8_000,
    retry: 1,
  });

  const mySellOrdersQuery = useQuery({
    queryKey: ["nete", "orders", "my-sell", wallet.currentAddress],
    queryFn: () => getMySellOrders(wallet.currentAddress, { page: 1, pageSize: 80 }),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 8_000,
    retry: 1,
  });

  const myTakenOrdersQuery = useQuery({
    queryKey: ["nete", "orders", "my-taken", wallet.currentAddress],
    queryFn: () => getMyTakenOrders(wallet.currentAddress, { page: 1, pageSize: 80 }),
    enabled: Boolean(wallet.currentAddress),
    staleTime: 8_000,
    retry: 1,
  });

  const publicOrders = useMemo(
    () => toItems(publicOrdersQuery.data).map(normalizeOrder),
    [publicOrdersQuery.data],
  );

  const mySellOrders = useMemo(
    () => toItems(mySellOrdersQuery.data).map(normalizeOrder),
    [mySellOrdersQuery.data],
  );

  const myTakenOrders = useMemo(
    () => toItems(myTakenOrdersQuery.data).map(normalizeOrder),
    [myTakenOrdersQuery.data],
  );

  const guideMinPrice = useMemo(() => {
    const fromApi = runtimeConfigQuery.data?.guide_min_price;
    if (fromApi) return toBigIntSafe(fromApi);
    return marketConfigQuery.data?.guideMinPrice ?? 0n;
  }, [marketConfigQuery.data?.guideMinPrice, runtimeConfigQuery.data?.guide_min_price]);

  const guideMaxPrice = useMemo(() => {
    const fromApi = runtimeConfigQuery.data?.guide_max_price;
    if (fromApi) return toBigIntSafe(fromApi);
    return marketConfigQuery.data?.guideMaxPrice ?? 0n;
  }, [marketConfigQuery.data?.guideMaxPrice, runtimeConfigQuery.data?.guide_max_price]);

  const filteredMarketOrders = useMemo(() => {
    const term = toLower(searchKeyword);
    return publicOrders
      .filter((item) => isOrderOpen(item.status))
      .filter((item) => {
        if (!term) return true;
        return toLower(item.orderId).includes(term) || toLower(item.seller).includes(term) || toLower(item.orderNo).includes(term);
      });
  }, [publicOrders, searchKeyword]);

  const currentOrders = useMemo(
    () => mySellOrders.filter((item) => isOrderOpen(item.status)),
    [mySellOrders],
  );

  const historyOrders = useMemo(() => {
    const sellHistory = mySellOrders
      .filter((item) => !isOrderOpen(item.status))
      .map((item) => ({
        ...item,
        typeKey: "sell",
        type: t("modules.c2cMarket.type.sell"),
        completedAt: item.filledAt || item.createdAt,
      }));

    const buyHistory = myTakenOrders.map((item) => ({
      ...item,
      typeKey: "buy",
      type: t("modules.c2cMarket.type.buy"),
      completedAt: item.filledAt || item.createdAt,
    }));

    return [...buyHistory, ...sellHistory]
      .sort((a, b) => Number(b.completedAt || 0) - Number(a.completedAt || 0))
      .slice(0, 80);
  }, [mySellOrders, myTakenOrders, t]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const switchTab = (next) => {
    if (next === "market") {
      setSearchParams({});
      return;
    }
    setSearchParams({ view: next });
  };

  const handleSearch = () => {
    setSearchKeyword(searchInput.trim().toLowerCase());
  };

  async function refreshOrders() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["nete", "orders", "public"] }),
      queryClient.invalidateQueries({ queryKey: ["nete", "orders", "my-sell", wallet.currentAddress] }),
      queryClient.invalidateQueries({ queryKey: ["nete", "orders", "my-taken", wallet.currentAddress] }),
    ]);
  }

  const handlePurchase = async (order) => {
    if (!wallet.isConnected) {
      setToastMessage(t("modules.c2cMarket.messages.connectWallet"));
      return;
    }
    if (!order?.orderId) return;
    if (toLower(order.seller) === toLower(wallet.currentAddress)) {
      setToastMessage(t("modules.c2cMarket.messages.ownOrder"));
      return;
    }

    try {
      setActionKey(`fill-${order.orderId}`);
      await wallet.ensureCorrectChain();
      await approveUsdtToMarket(wallet.currentAddress, order.totalUsdt);
      const tx = await fillOrder(wallet.currentAddress, order.orderId);
      await refreshOrders();
      setToastMessage(t("modules.c2cMarket.messages.buySuccess", { hash: tx.hash }));
      switchTab("mine");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("modules.c2cMarket.messages.buyFailed");
      setToastMessage(message);
    } finally {
      setActionKey("");
    }
  };

  const handleCancelOrder = async (order) => {
    if (!wallet.isConnected || !order?.orderId) {
      setToastMessage(t("modules.c2cMarket.messages.connectWallet"));
      return;
    }

    try {
      setActionKey(`cancel-${order.orderId}`);
      await wallet.ensureCorrectChain();
      const tx = await cancelSellOrder(wallet.currentAddress, order.orderId);
      await refreshOrders();
      setToastMessage(t("modules.c2cMarket.messages.cancelSuccess", { hash: tx.hash }));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("modules.c2cMarket.messages.cancelFailed");
      setToastMessage(message);
    } finally {
      setActionKey("");
    }
  };

  const handleCreateListing = async (event) => {
    event.preventDefault();

    if (!wallet.isConnected) {
      setToastMessage(t("modules.c2cMarket.messages.connectWallet"));
      return;
    }

    let neteAmount = 0n;
    let pricePerNete = 0n;

    try {
      neteAmount = parseTokenInput(sellQuantity || "0");
      pricePerNete = parseTokenInput(sellPrice || "0");
    } catch {
      setToastMessage(t("modules.c2cMarket.messages.invalidInput"));
      return;
    }

    if (neteAmount <= 0n) {
      setToastMessage(t("modules.c2cMarket.messages.invalidSellQuantity"));
      return;
    }
    if (pricePerNete <= 0n) {
      setToastMessage(t("modules.c2cMarket.messages.invalidSellPrice"));
      return;
    }

    if (guideMinPrice > 0n && pricePerNete < guideMinPrice) {
      setToastMessage(t("modules.c2cMarket.messages.priceTooLow", { price: formatTokenAmount(guideMinPrice, 18, 6) }));
      return;
    }
    if (guideMaxPrice > 0n && pricePerNete > guideMaxPrice) {
      setToastMessage(t("modules.c2cMarket.messages.priceTooHigh", { price: formatTokenAmount(guideMaxPrice, 18, 6) }));
      return;
    }

    try {
      setActionKey("create-order");
      await wallet.ensureCorrectChain();
      await approveNeteToMarket(wallet.currentAddress, neteAmount);
      const tx = await createSellOrder(wallet.currentAddress, neteAmount, pricePerNete);
      setSellQuantity("");
      setSellPrice("");
      setIsModalOpen(false);
      await refreshOrders();
      switchTab("mine");
      setToastMessage(t("modules.c2cMarket.messages.listingSuccess", { hash: tx.hash }));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("modules.c2cMarket.messages.listingFailed");
      setToastMessage(message);
    } finally {
      setActionKey("");
    }
  };

  return (
    <C2CPageFrame zone="self">
      <section className="c2c-market-shell">
        <div className="c2c-market-tabs" role="tablist" aria-label={t("modules.c2cMarket.ariaTabs")}>
          {marketTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeView === tab.key}
              className={activeView === tab.key ? "c2c-market-tab is-active" : "c2c-market-tab"}
              onClick={() => switchTab(tab.key)}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {wallet.isConnected ? null : <p className="mb-3 text-xs text-white/70">{t("modules.c2cMarket.connectHint")}</p>}

        {activeView === "market" ? (
          <section className="c2c-surface c2c-market-panel">
            <div className="c2c-toolbar">
              <label className="c2c-search-field" aria-label={t("modules.c2cMarket.searchAria")}>
                <Icon icon="mdi:magnify" aria-hidden="true" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t("modules.c2cMarket.searchPlaceholder")}
                />
              </label>
              <button type="button" className="c2c-btn c2c-btn-primary" onClick={handleSearch}>{t("modules.c2cMarket.search")}</button>
              <button type="button" className="c2c-btn c2c-btn-secondary" onClick={() => setIsModalOpen(true)}>
                {t("modules.c2cMarket.createListing")}
              </button>
            </div>

            <div className="px-4 py-3 text-xs text-white/65">
              {t("modules.c2cMarket.guideRange")}
              {guideMinPrice > 0n ? `${formatTokenAmount(guideMinPrice, 18, 6)} U` : "--"}
              {" - "}
              {guideMaxPrice > 0n ? `${formatTokenAmount(guideMaxPrice, 18, 6)} U` : "--"}
            </div>

            <div className="c2c-order-table">
              <header className="c2c-order-table-head">
                <span>{t("modules.c2cMarket.orderId")}</span>
                <span>{t("modules.c2cMarket.unitPrice")}</span>
                <span>{t("modules.c2cMarket.quantity")}</span>
                <span>{t("modules.c2cMarket.total")}</span>
                <span>{t("modules.c2cMarket.buy")}</span>
              </header>

              <div className="c2c-order-table-body">
                {publicOrdersQuery.isLoading ? (
                  <div className="c2c-empty-state">{t("modules.c2cMarket.loadingOrders")}</div>
                ) : publicOrdersQuery.isError ? (
                  <div className="c2c-empty-state">
                    {publicOrdersQuery.error instanceof Error ? publicOrdersQuery.error.message : t("modules.c2cMarket.loadOrdersFailed")}
                  </div>
                ) : filteredMarketOrders.length === 0 ? (
                  <div className="c2c-empty-state">{t("modules.c2cMarket.noOrders")}</div>
                ) : (
                  filteredMarketOrders.map((order) => (
                    <article className="c2c-order-row" key={order.orderId || order.orderNo}>
                      <div className="c2c-order-cell c2c-order-main-cell">
                        <div className="c2c-order-id-block">
                          <span className="c2c-mobile-key">{t("modules.c2cMarket.orderId")}</span>
                          <strong className="c2c-order-id">{order.orderId || order.orderNo || "--"}</strong>
                          <p className="c2c-sub-meta">{t("modules.c2cMarket.seller")} {shortAddress(order.seller)} · {t("modules.c2cMarket.listedAt")} {formatDateTime(order.createdAt, locale)}</p>
                        </div>
                        <button
                          type="button"
                          className="c2c-btn c2c-btn-primary c2c-mobile-inline"
                          disabled={actionKey === `fill-${order.orderId}`}
                          onClick={() => handlePurchase(order)}
                        >
                          {actionKey === `fill-${order.orderId}` ? t("modules.c2cMarket.buying") : t("modules.c2cMarket.buy")}
                        </button>
                      </div>

                      <div className="c2c-order-cell">
                        <span className="c2c-mobile-key">{t("modules.c2cMarket.unitPrice")}</span>
                        <strong className="c2c-order-price">{formatUnitPrice(order.priceUsdt)}</strong>
                      </div>

                      <div className="c2c-order-cell">
                        <span className="c2c-mobile-key">{t("modules.c2cMarket.quantity")}</span>
                        <span>{formatQuantity(order.neteAmount)}</span>
                      </div>

                      <div className="c2c-order-cell">
                        <span className="c2c-mobile-key">{t("modules.c2cMarket.total")}</span>
                        <span>{formatTotal(order.totalUsdt)}</span>
                      </div>

                      <div className="c2c-order-cell c2c-order-action-cell">
                        <button
                          type="button"
                          className="c2c-btn c2c-btn-primary c2c-desktop-action"
                          disabled={actionKey === `fill-${order.orderId}`}
                          onClick={() => handlePurchase(order)}
                        >
                          {actionKey === `fill-${order.orderId}` ? t("modules.c2cMarket.buying") : t("modules.c2cMarket.buy")}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="c2c-mine-layout">
            <section className="c2c-surface c2c-card-section">
              <header className="c2c-section-heading">
                <div>
                  <h2>{t("modules.c2cMarket.currentListings")}</h2>
                  <p>{t("modules.c2cMarket.currentListingsDesc")}</p>
                </div>
              </header>

              <div className="c2c-list-stack">
                {mySellOrdersQuery.isLoading ? (
                  <div className="c2c-empty-state">{t("modules.c2cMarket.loading")}</div>
                ) : mySellOrdersQuery.isError ? (
                  <div className="c2c-empty-state">
                    {mySellOrdersQuery.error instanceof Error ? mySellOrdersQuery.error.message : t("modules.c2cMarket.myListingsFailed")}
                  </div>
                ) : currentOrders.length === 0 ? (
                  <div className="c2c-empty-state">{t("modules.c2cMarket.noListings")}</div>
                ) : (
                  currentOrders.map((order) => (
                    <article className="c2c-order-card" key={order.orderId || order.orderNo}>
                      <div className="c2c-order-card-top">
                        <div>
                          <h3 className="c2c-order-card-title">{order.orderId || order.orderNo || "--"}</h3>
                          <p className="c2c-sub-meta">{t("modules.c2cMarket.createdAt")} {formatDateTime(order.createdAt, locale)}</p>
                        </div>
                        <button
                          type="button"
                          className="c2c-btn c2c-btn-danger"
                          disabled={actionKey === `cancel-${order.orderId}`}
                          onClick={() => handleCancelOrder(order)}
                        >
                          {actionKey === `cancel-${order.orderId}` ? t("modules.c2cMarket.canceling") : t("modules.c2cMarket.cancelOrder")}
                        </button>
                      </div>

                      <div className="c2c-order-card-grid">
                        <div className="c2c-metric">
                          <span>{t("modules.c2cMarket.sellPrice")}</span>
                          <strong>{formatUnitPrice(order.priceUsdt)}</strong>
                        </div>
                        <div className="c2c-metric">
                          <span>{t("modules.c2cMarket.sellQuantity")}</span>
                          <strong>{formatQuantity(order.neteAmount)}</strong>
                        </div>
                        <div className="c2c-metric">
                          <span>{t("modules.c2cMarket.total")}</span>
                          <strong>{formatTotal(order.totalUsdt)}</strong>
                        </div>
                        <div className="c2c-metric">
                          <span>{t("modules.c2cMarket.status")}</span>
                          <strong>{order.status}</strong>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="c2c-surface c2c-card-section">
              <header className="c2c-section-heading">
                <div>
                  <h2>{t("modules.c2cMarket.history")}</h2>
                  <p>{t("modules.c2cMarket.historyDesc")}</p>
                </div>
              </header>

              <div className="c2c-list-stack">
                {myTakenOrdersQuery.isLoading || mySellOrdersQuery.isLoading ? (
                  <div className="c2c-empty-state">{t("modules.c2cMarket.loading")}</div>
                ) : myTakenOrdersQuery.isError ? (
                  <div className="c2c-empty-state">
                    {myTakenOrdersQuery.error instanceof Error ? myTakenOrdersQuery.error.message : t("modules.c2cMarket.myTakenFailed")}
                  </div>
                ) : historyOrders.length === 0 ? (
                  <div className="c2c-empty-state">{t("modules.c2cMarket.noHistory")}</div>
                ) : (
                  historyOrders.map((item) => (
                    <article className="c2c-history-item" key={`${item.orderId || item.orderNo}-${item.completedAt}`}>
                      <div className="c2c-history-top">
                        <h3 className="c2c-order-card-title">{item.orderId || item.orderNo || "--"}</h3>
                        <span className={item.typeKey === "buy" ? "c2c-type-chip buy" : "c2c-type-chip sell"}>{item.type}</span>
                      </div>

                      <div className="c2c-history-meta">
                        <div>
                          <span>{t("modules.c2cMarket.dealPrice")}</span>
                          <strong>{formatUnitPrice(item.priceUsdt)}</strong>
                        </div>
                        <div>
                          <span>{t("modules.c2cMarket.dealQuantity")}</span>
                          <strong>{formatQuantity(item.neteAmount)}</strong>
                        </div>
                        <div>
                          <span>{t("modules.c2cMarket.dealTotal")}</span>
                          <strong>{formatTotal(item.totalUsdt)}</strong>
                        </div>
                        <div>
                          <span>{t("modules.c2cMarket.dealTime")}</span>
                          <strong>{formatDateTime(item.completedAt, locale)}</strong>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>
        )}
      </section>

      <div className={isModalOpen ? "c2c-modal-backdrop is-open" : "c2c-modal-backdrop"} onClick={() => setIsModalOpen(false)}>
        <div className="c2c-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="c2cListingTitle">
          <h3 id="c2cListingTitle">{t("modules.c2cMarket.modalTitle")}</h3>
          <p>
            {t("modules.c2cMarket.modalGuideRange")}
            {guideMinPrice > 0n ? `${formatTokenAmount(guideMinPrice, 18, 6)} U` : "--"}
            {" - "}
            {guideMaxPrice > 0n ? `${formatTokenAmount(guideMaxPrice, 18, 6)} U` : "--"}
          </p>

          <form className="c2c-modal-form" onSubmit={handleCreateListing}>
            <label className="c2c-modal-field">
              <span>{t("modules.c2cMarket.sellQuantityLabel")}</span>
              <input
                type="number"
                min="0.0001"
                step="0.0001"
                value={sellQuantity}
                onChange={(event) => setSellQuantity(event.target.value)}
                placeholder={t("modules.c2cMarket.sellQuantityPlaceholder")}
              />
            </label>
            <label className="c2c-modal-field">
              <span>{t("modules.c2cMarket.sellPriceLabel")}</span>
              <input
                type="number"
                min={guideMinPrice > 0n ? formatUnits(guideMinPrice, 18) : "0"}
                max={guideMaxPrice > 0n ? formatUnits(guideMaxPrice, 18) : undefined}
                step="0.000001"
                value={sellPrice}
                onChange={(event) => setSellPrice(event.target.value)}
                placeholder={t("modules.c2cMarket.sellPricePlaceholder")}
              />
            </label>

            <div className="c2c-modal-actions">
              <button type="button" className="c2c-btn c2c-btn-ghost" onClick={() => setIsModalOpen(false)}>{t("modules.c2cMarket.cancel")}</button>
              <button type="submit" className="c2c-btn c2c-btn-primary" disabled={actionKey === "create-order"}>
                {actionKey === "create-order" ? t("modules.c2cMarket.submitting") : t("modules.c2cMarket.confirm")}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={toastMessage ? "c2c-toast is-show" : "c2c-toast"}>{toastMessage}</div>
    </C2CPageFrame>
  );
}
