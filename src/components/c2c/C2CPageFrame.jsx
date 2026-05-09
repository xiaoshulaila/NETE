import { Icon } from "@iconify/react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import GlobalHeader from "../common/GlobalHeader";
import FooterSection from "../landing/FooterSection";

function ZoneNavLink({ to, label, active }) {
  return (
    <NavLink to={to} className={active ? "c2c-zone-link is-active" : "c2c-zone-link"}>
      {label}
    </NavLink>
  );
}

export default function C2CPageFrame({ zone, children }) {
  const { t } = useTranslation();

  return (
    <div className="c2c-page">
      <GlobalHeader />

      <header className="c2c-topbar">
        <div className="c2c-topbar-inner">
          <div className="c2c-zones" role="tablist" aria-label="C2C zones">
            <ZoneNavLink to="/c2c/market" label={t("c2cFrame.self")} active={zone === "self"} />
          </div>

          <div className="c2c-header-actions desktop-only">
            <span className="c2c-header-action">{t("c2cFrame.orders")}</span>
            <span className="c2c-header-action">{t("c2cFrame.profile")}</span>
            <span className="c2c-header-action c2c-more-action">
              {t("c2cFrame.more")}
              <i aria-hidden="true" className="c2c-red-dot"></i>
            </span>
            <span className="c2c-search-icon" aria-hidden="true">
              <Icon icon="mdi:magnify" />
            </span>
          </div>

          <div className="c2c-header-actions mobile-only">
            <span className="c2c-more-icon" aria-hidden="true">
              <Icon icon="mdi:dots-horizontal" />
            </span>
            <i aria-hidden="true" className="c2c-red-dot mobile-dot"></i>
            <span className="c2c-search-icon" aria-hidden="true">
              <Icon icon="mdi:magnify" />
            </span>
          </div>
        </div>
      </header>

      <main className="c2c-main">{children}</main>

      <FooterSection />
    </div>
  );
}
