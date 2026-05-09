import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import C2CPageFrame from "../../components/c2c/C2CPageFrame";
import { hotCoins } from "../../data/c2cUiData";
import { getRuntimeConfig } from "../../services/neteApi";
import { readMarketConfig } from "../../services/neteContracts";
import { formatTokenAmount, parseTokenInput } from "../../utils/formatters";
import c2cGuideIcon1 from "../../assets/images/c2c-1.svg";
import c2cGuideIcon2 from "../../assets/images/c2c-2.svg";
import c2cGuideIcon3 from "../../assets/images/c2c-3.svg";
import "../styles/c2c.css";

function CoinMark({ type }) {
  return <span className="c2c-token-mark">{type}</span>;
}

const guideIconMap = {
  money: c2cGuideIcon1,
  hourglass: c2cGuideIcon2,
  wallet: c2cGuideIcon3,
};

function toPriceWei(value) {
  if (typeof value === "bigint") return value;
  if (value === null || value === undefined || value === "") return 0n;
  const text = String(value).trim();
  if (!text) return 0n;
  try {
    return text.includes(".") ? parseTokenInput(text) : BigInt(text);
  } catch {
    return 0n;
  }
}

function QuickSellFormCard({ referenceText, t }) {
  return (
    <article className="c2c-quick-form c2c-surface">
      <div className="c2c-form-tabs">
        <Link className="c2c-form-tab" to="/c2c">{t("modules.c2cQuick.buy")}</Link>
        <Link className="c2c-form-tab is-active" to="/c2c/sell">{t("modules.c2cQuick.sell")}</Link>
      </div>

      <div className="c2c-field-block">
        <div className="c2c-field-title">{t("modules.c2cQuick.sellAmount")}</div>
        <div className="c2c-field-input-row right-fixed">
          <button type="button" className="c2c-currency-pill usdt-pill">
            <span className="c2c-currency-mark usdt">₮</span>
            USDT
            <span className="c2c-chevron"><Icon icon="mdi:chevron-down" /></span>
          </button>
        </div>
      </div>

      <p className="c2c-account-tip">{t("modules.c2cQuick.accountCanSell")}</p>

      <div className="c2c-field-block">
        <div className="c2c-field-title">{t("modules.c2cQuick.receive")}</div>
        <div className="c2c-field-input-row">
          <span className="c2c-field-placeholder">0</span>
          <button type="button" className="c2c-currency-pill">
            <span className="c2c-currency-mark cny">¥</span>
            CNY
            <span className="c2c-chevron"><Icon icon="mdi:chevron-down" /></span>
          </button>
        </div>
      </div>

      <p className="c2c-field-tip">10 - 40,000,000 CNY</p>
      <p className="c2c-reference">{referenceText}</p>
      <button type="button" className="c2c-disabled-btn">{t("modules.c2cQuick.chooseReceipt")}</button>
    </article>
  );
}

export default function C2CSellPage() {
  const { t } = useTranslation();
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

  const guideMin = toPriceWei(runtimeConfigQuery.data?.guide_min_price || marketConfigQuery.data?.guideMinPrice);
  const guideMax = toPriceWei(runtimeConfigQuery.data?.guide_max_price || marketConfigQuery.data?.guideMaxPrice);

  const referenceText = guideMin > 0n && guideMax > 0n
    ? t("modules.c2cQuick.referenceRange", { min: formatTokenAmount(guideMin, 18, 6), max: formatTokenAmount(guideMax, 18, 6) })
    : t("modules.c2cQuick.referenceLoading");
  const guideSteps = t("modules.c2cQuick.sellSteps", { returnObjects: true });

  return (
    <C2CPageFrame zone="quick">
      <section className="c2c-hero c2c-surface">
        <div className="c2c-hero-copy">
          <span className="c2c-eyebrow">NETE C2C</span>
          <h1>{t("modules.c2cQuick.sellTitle")}</h1>
          <p className="c2c-lead">{t("modules.c2cQuick.sellLead")}</p>

          <div className="c2c-mini-metrics">
            <article className="c2c-mini-panel">
              <span>{t("modules.c2cQuick.guideRange")}</span>
              <strong>{guideMin > 0n && guideMax > 0n ? `${formatTokenAmount(guideMin, 18, 6)} U - ${formatTokenAmount(guideMax, 18, 6)} U` : "--"}</strong>
            </article>
            <article className="c2c-mini-panel">
              <span>{t("modules.c2cQuick.orderLimit")}</span>
              <strong>10 - 40,000,000 CNY</strong>
            </article>
          </div>
        </div>

        <QuickSellFormCard referenceText={referenceText} t={t} />
      </section>

      <article className="c2c-hot-coins c2c-surface">
        <h2>{t("modules.c2cQuick.hotTitle")}</h2>
        <p>{t("modules.c2cQuick.hotDesc")}</p>
        <div className="c2c-hot-list">
          {hotCoins.map((coin) => (
            <div className="c2c-hot-item" key={coin.symbol}>
              <div className="c2c-hot-head">
                <span className="c2c-hot-symbol">{coin.symbol}</span>
                <CoinMark type={coin.tokenMark} />
              </div>
              <p className="c2c-hot-price">{coin.price}</p>
              <p className={coin.trend === "up" ? "c2c-hot-change up" : "c2c-hot-change down"}>{coin.change}</p>
            </div>
          ))}
        </div>
      </article>

      <section className="c2c-guide c2c-surface">
        <h2>{t("modules.c2cQuick.sellGuideTitle")}</h2>
        <div className="c2c-guide-grid">
          {guideSteps.map((item) => (
            <article key={item.title} className="c2c-guide-card">
              <span className="c2c-guide-icon">
                <img src={guideIconMap[item.icon] ?? c2cGuideIcon1} alt="" aria-hidden="true" />
              </span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>
    </C2CPageFrame>
  );
}
