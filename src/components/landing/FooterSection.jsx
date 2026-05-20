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
          </div>
        </div>

        <div className="footer__bottom">
          <span>{t("footer.closing")}</span>
          <span>© 2026 NETE. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
