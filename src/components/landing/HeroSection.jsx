import { Fragment } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import logoIcon from "../../assets/images/logo-icon.svg";

function MultilineText({ text }) {
  return String(text)
    .split("\n")
    .map((line, index) => (
      <Fragment key={`${line}-${index}`}>
        {index > 0 ? <br /> : null}
        {line}
      </Fragment>
    ));
}

export default function HeroSection() {
  const { t } = useTranslation();
  const phone = t("landing.hero.phone", { returnObjects: true });

  return (
  <section className="hero stacking-root" id="hero" aria-labelledby="hero-title">
    <div className="hero__bg" aria-hidden="true"></div>
    <div className="hero__grid" aria-hidden="true"></div>
    <div className="glow-orb glow-orb--purple glow-orb--hero-purple" aria-hidden="true"></div>
    <div className="glow-orb glow-orb--acid glow-orb--hero-acid" aria-hidden="true"></div>

    <div className="container">

      <div className="hero__inner">

        <div className="hero__content">
          <div className="hero__badge" aria-label="Now live">
            <span className="hero__badge-dot" aria-hidden="true"></span>
            {t("landing.hero.badge")}
          </div>

          <h1 className="hero__title" id="hero-title">
            <span className="hero__title-line--acid">{t("landing.hero.titleA")}</span><br />
            <span>{t("landing.hero.titleB")}</span><br />
            <span className="hero__title-line--muted">{t("landing.hero.titleC")}</span>
          </h1>

          <p className="hero__subtitle">
            {t("landing.hero.subtitle")}
          </p>

          <div className="hero__actions">
            <button className="btn btn--primary btn--lg" id="get-started-btn">
              {t("landing.hero.primary")}
              <Icon className="hero__action-icon" icon="mdi:arrow-right" aria-hidden="true" />
            </button>
            <button className="btn btn--ghost btn--lg">
              {t("landing.hero.secondary")}
            </button>
          </div>
        </div>


        <div className="hero__phones float-anim" aria-hidden="true">


          <div className="phone phone--left">
            <div className="phone__screen">
              <div className="phone__notch"></div>
              <div className="phone-screen phone-screen--onboard">
                <div className="phone-screen__logo">
                  <div className="phone-screen__logo-mark">
                    <img className="phone-screen__logo-icon" src={logoIcon} alt="" />
                  </div>
                  NETE
                </div>
                <div className="phone-illus phone-illus--modules">
                  <div className="phone-illus__module">
                    <Icon className="phone-illus__module-icon" icon="solar:cpu-bolt-outline" />
                    {t("nav.mining")}
                  </div>
                  <div className="phone-illus__module">
                    <Icon className="phone-illus__module-icon" icon="mdi:swap-horizontal" />
                    C2C
                  </div>
                  <div className="phone-illus__module">
                    <Icon className="phone-illus__module-icon" icon="mdi:account-circle-outline" />
                    {t("nav.my")}
                  </div>
                  <div className="phone-illus__module">
                    <Icon className="phone-illus__module-icon" icon="mdi:account-group-outline" />
                    {t("nav.team")}
                  </div>
                </div>
                <div className="phone-screen__title"><MultilineText text={phone.modulesTitle} /></div>
                <div className="phone-screen__btn-stack">
                  <div className="phone-screen__btn">
                    <div className="phone-screen__btn-icon">
                      <Icon className="phone-screen__btn-icon-svg" icon="mdi:view-grid-outline" />
                    </div>
                    {phone.modulesA}
                  </div>
                  <div className="phone-screen__btn phone-screen__btn--outline">
                    <Icon className="phone-screen__btn-outline-icon" icon="mdi:account-circle-outline" />
                    {phone.modulesB}
                  </div>
                </div>
              </div>
            </div>
          </div>


          <div className="phone phone--main">
            <div className="phone__screen">
              <div className="phone__notch"></div>
              <div className="phone-screen phone-screen--wallet">
                <div className="wallet-header">
                  <div className="phone-screen__logo phone-screen__logo--light">
                    <div className="phone-screen__logo-mark phone-screen__logo-mark--light">
                      <img className="phone-screen__logo-icon" src={logoIcon} alt="" />
                    </div>
                    NETE
                  </div>
                  <div className="phone-screen__status">
                    <Icon className="phone-screen__status-icon" icon="mdi:wifi-strength-2" />
                    <Icon className="phone-screen__status-icon" icon="mdi:battery-medium" />
                  </div>
                </div>
                <div className="phone-screen__greeting">{phone.account}</div>
                <div className="wallet-card">
                  <div className="wallet-card__dot"></div>
                  <div className="wallet-card__label">{phone.totalAsset}</div>
                  <div className="wallet-card__amount">128,640</div>
                  <div className="wallet-card__currency">
                    NETE
                    <Icon className="wallet-card__currency-icon" icon="mdi:chart-line" />
                  </div>
                </div>
                <div className="wallet-assets">
                  <div className="wallet-asset">
                    <div className="wallet-asset__icon wallet-asset__icon--add">
                      <Icon className="wallet-asset__icon-svg" icon="solar:cpu-bolt-outline" />
                    </div>
                    <div className="wallet-asset__label">{t("nav.mining")}</div>
                  </div>
                  <div className="wallet-asset">
                    <div className="wallet-asset__icon wallet-asset__icon--eth">
                      <Icon className="wallet-asset__icon-svg" icon="mdi:swap-horizontal" />
                    </div>
                    <div className="wallet-asset__label">C2C</div>
                  </div>
                  <div className="wallet-asset">
                    <div className="wallet-asset__icon wallet-asset__icon--bnb">
                      <Icon className="wallet-asset__icon-svg" icon="mdi:account-circle-outline" />
                    </div>
                    <div className="wallet-asset__label">{t("nav.my")}</div>
                  </div>
                  <div className="wallet-asset">
                    <div className="wallet-asset__icon wallet-asset__icon--usdt">
                      <Icon className="wallet-asset__icon-svg" icon="mdi:account-group-outline" />
                    </div>
                    <div className="wallet-asset__label">{t("nav.team")}</div>
                  </div>
                </div>
                <div className="wallet-network-label">{phone.data}</div>
                <div className="wallet-row">
                  <div className="wallet-row__info">
                    <div className="wallet-row__avatar wallet-row__avatar--square"></div>
                    <div>
                      <div className="wallet-row__name">{phone.principal}</div>
                      <div className="wallet-row__addr">{phone.withdrawable}</div>
                    </div>
                  </div>
                </div>
                <div className="wallet-row">
                  <div className="wallet-row__info">
                    <div className="wallet-row__avatar wallet-row__avatar--eth"></div>
                    <div className="wallet-row__name">{phone.circulate}</div>
                  </div>
                  <div className="wallet-row__val">56,120</div>
                </div>
                <div className="wallet-row">
                  <div className="wallet-row__info">
                    <div className="wallet-row__avatar wallet-row__avatar--dai"></div>
                    <div className="wallet-row__name">{phone.team}</div>
                  </div>
                  <div className="wallet-row__val">268,000</div>
                </div>
                <div className="phone-nav">
                  <div className="phone-nav__item phone-nav__item--active">
                    <Icon className="phone-nav__icon" icon="mdi:view-grid-outline" />
                  </div>
                  <div className="phone-nav__item phone-nav__item--dim">
                    <Icon className="phone-nav__icon" icon="mdi:swap-horizontal" />
                  </div>
                  <div className="phone-nav__item phone-nav__item--dim">
                    <Icon className="phone-nav__icon" icon="mdi:account-circle-outline" />
                  </div>
                  <div className="phone-nav__item phone-nav__item--dim">
                    <Icon className="phone-nav__icon" icon="mdi:account-group-outline" />
                  </div>
                </div>
              </div>
            </div>
          </div>


          <div className="phone phone--right">
            <div className="phone__screen">
              <div className="phone__notch"></div>
              <div className="phone-screen phone-screen--discover">
                <div className="discover__title">{phone.c2c}</div>
                <div className="discover__banner">
                  <div className="discover__banner-eyebrow">{phone.realtime}</div>
                  <div className="discover__banner-title"><MultilineText text={phone.merchants} /></div>
                </div>
                <div className="discover__caps">
                  <div className="discover__cap-card">
                    <div className="discover__cap-label">{phone.quickPrice}</div>
                    <div className="discover__cap-value">6.82 CNY</div>
                    <div className="discover__cap-change--up">{phone.bestMatch}</div>
                  </div>
                  <div className="discover__cap-card">
                    <div className="discover__cap-label">{phone.sellerFee}</div>
                    <div className="discover__cap-value">10%</div>
                    <div className="discover__cap-change--down">{phone.transparent}</div>
                  </div>
                </div>
                <div className="discover__cats">
                  <div className="discover__cat">
                    <div className="discover__cat-icon">
                      <Icon className="discover__cat-icon-svg" icon="mdi:lightning-bolt-outline" />
                    </div>
                    {phone.quick}
                  </div>
                  <div className="discover__cat">
                    <div className="discover__cat-icon">
                      <Icon className="discover__cat-icon-svg" icon="mdi:playlist-check" />
                    </div>
                    {phone.self}
                  </div>
                  <div className="discover__cat">
                    <div className="discover__cat-icon">
                      <Icon className="discover__cat-icon-svg" icon="mdi:file-document-outline" />
                    </div>
                    {phone.orders}
                  </div>
                </div>
                <div className="discover__nft-grid">
                  <div className="discover__nft-thumb discover__nft-thumb--pink">
                    <div className="discover__nft-meta">{phone.vipBoost}</div>
                    <div className="discover__nft-value">{phone.max}</div>
                  </div>
                  <div className="discover__nft-thumb discover__nft-thumb--acid">
                    <div className="discover__nft-meta">{phone.miningIncome}</div>
                    <div className="discover__nft-value">{phone.daily}</div>
                  </div>
                </div>
                <div className="phone-nav phone-nav--purple">
                  <div className="phone-nav__item">
                    <Icon className="phone-nav__icon" icon="mdi:view-grid-outline" />
                  </div>
                  <div className="phone-nav__item phone-nav__item--active">
                    <Icon className="phone-nav__icon" icon="mdi:swap-horizontal" />
                  </div>
                  <div className="phone-nav__item">
                    <Icon className="phone-nav__icon" icon="mdi:file-document-outline" />
                  </div>
                  <div className="phone-nav__item">
                    <Icon className="phone-nav__icon" icon="mdi:account-circle-outline" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </section>
  );
}
