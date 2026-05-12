import { Icon } from "@iconify/react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logoIcon from "../../assets/images/logo-icon.svg";

function FooterLink({ item, className = "footer__link" }) {
  if (item.href) {
    return (
      <a className={className} href={item.href} target="_blank" rel="noopener noreferrer">
        {item.label}
      </a>
    );
  }

  return (
    <NavLink className={className} to={item.to}>
      {item.label}
    </NavLink>
  );
}

export default function FooterSection() {
  const { t } = useTranslation();
  const footerGroups = [
    {
      title: t("footer.product"),
      ariaLabel: "Product links",
      links: [
        { to: "/mining", label: t("footer.mining") },
        { to: "/c2c/market", label: t("footer.c2cMarket") },
        { to: "/", label: t("footer.project") },
      ],
    },
    {
      title: t("footer.developers"),
      ariaLabel: "Developer links",
      links: [
        { to: "/my", label: t("footer.myPanel") },
        { to: "/account/team", label: t("footer.teamCenter") },
        { href: "https://github.com", label: "GitHub" },
        { to: "/", label: "Changelog" },
      ],
    },
    {
      title: t("footer.company"),
      ariaLabel: "Company links",
      links: [
        { to: "/", label: t("footer.home") },
        { to: "/mining", label: t("footer.mining") },
        { to: "/c2c", label: "C2C" },
        { to: "/account/team", label: t("footer.team") },
      ],
    },
  ];

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

          <div className="footer__desktop-links">
            {footerGroups.map((group) => (
              <nav key={group.title} aria-label={group.ariaLabel}>
                <div className="footer__links-title">{group.title}</div>
                <ul className="footer__links-list" role="list">
                  {group.links.map((item) => (
                    <li key={`${group.title}-${item.label}`}>
                      <FooterLink item={item} />
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="footer__mobile-accordion">
            {footerGroups.map((group) => (
              <details key={`mobile-${group.title}`} className="footer__accordion">
                <summary className="footer__accordion-summary">
                  <span>{group.title}</span>
                  <Icon icon="mdi:chevron-down" aria-hidden="true" />
                </summary>
                <ul className="footer__accordion-list" role="list">
                  {group.links.map((item) => (
                    <li key={`mobile-${group.title}-${item.label}`}>
                      <FooterLink item={item} />
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>


        <div className="footer__bottom">
          <span>© 2024 NETE. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
