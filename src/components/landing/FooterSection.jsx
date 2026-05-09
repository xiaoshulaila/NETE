import { Icon } from "@iconify/react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logoIcon from "../../assets/images/logo-icon.svg";

export default function FooterSection() {
  const { t } = useTranslation();

  return (
    <footer className="footer" role="contentinfo" aria-label="Site footer">
      <div className="container">
        <div className="footer__inner">
          <div className="footer__brand">
            <NavLink className="nav__logo" to="/" aria-label="NETE — Home">
              <span className="nav__logo-mark" aria-hidden="true">
                <img src={logoIcon} alt="" />
              </span>
              NETE
            </NavLink>
            <p>{t("footer.tagline")}</p>
          </div>

          <nav aria-label="Product links">
            <div className="footer__links-title">{t("footer.product")}</div>
            <ul className="footer__links-list" role="list">
              <li>
                <NavLink className="footer__link" to="/mining">
                  {t("footer.mining")}
                </NavLink>
              </li>
              <li>
                <NavLink className="footer__link" to="/c2c/market">
                  {t("footer.c2cMarket")}
                </NavLink>
              </li>
              <li>
                <NavLink className="footer__link" to="/vip">
                  VIP
                </NavLink>
              </li>
              <li>
                <NavLink className="footer__link" to="/">
                  {t("footer.project")}
                </NavLink>
              </li>
            </ul>
          </nav>

          <nav aria-label="Developer links">
            <div className="footer__links-title">{t("footer.developers")}</div>
            <ul className="footer__links-list" role="list">
              <li>
                <NavLink className="footer__link" to="/my">
                  {t("footer.myPanel")}
                </NavLink>
              </li>
              <li>
                <NavLink className="footer__link" to="/account/team">
                  {t("footer.teamCenter")}
                </NavLink>
              </li>
              <li>
                <a className="footer__link" href="https://github.com" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <NavLink className="footer__link" to="/">
                  Changelog
                </NavLink>
              </li>
            </ul>
          </nav>

          <nav aria-label="Company links">
            <div className="footer__links-title">{t("footer.company")}</div>
            <ul className="footer__links-list" role="list">
              <li>
                <NavLink className="footer__link" to="/">
                  {t("footer.home")}
                </NavLink>
              </li>
              <li>
                <NavLink className="footer__link" to="/mining">
                  {t("footer.mining")}
                </NavLink>
              </li>
              <li>
                <NavLink className="footer__link" to="/c2c">
                  C2C
                </NavLink>
              </li>
              <li>
                <NavLink className="footer__link" to="/account/team">
                  {t("footer.team")}
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>


        <div className="footer__bottom">
          <span>© 2024 NETE. All rights reserved.</span>
          <span>{t("footer.built")}</span>
          <nav aria-label="Legal">
            <NavLink className="footer__link footer__link--inline" to="/">
              {t("footer.privacy")}
            </NavLink>
            &nbsp;·&nbsp;
            <NavLink className="footer__link footer__link--inline" to="/">
              {t("footer.terms")}
            </NavLink>
          </nav>
        </div>
      </div>
    </footer>
  );
}
