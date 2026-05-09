import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logoIcon from "../../assets/images/logo-icon.svg";
import { useWalletConnector } from "../../hooks/useWalletConnector";

const navItems = [
  { key: "home", to: "/" },
  { key: "mining", to: "/mining" },
  { key: "vip", to: "/vip" },
  { key: "c2c", to: "/c2c" },
  { key: "seed", to: "/finance/buy-seed" },
  { key: "team", to: "/account/team" },
  { key: "my", to: "/my" },
];

function desktopNavClassName(isActive) {
  return isActive ? "nav__link nav__link--active" : "nav__link";
}

function mobileNavClassName(isActive) {
  return isActive ? "nav__mobile-link nav__mobile-link--active" : "nav__mobile-link";
}

function normalizeLanguage(language) {
  return language?.toLowerCase().startsWith("en") ? "en" : "zh";
}

export default function GlobalHeader() {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const wallet = useWalletConnector();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef(null);
  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const connectLabel = t("nav.wallet.connect");
  const disconnectLabel = t("nav.wallet.disconnect");
  const switchChainLabel = t("nav.wallet.switchChain");

  const walletLabel = wallet.isConnecting || wallet.isSwitching
    ? t("nav.wallet.processing")
    : wallet.isConnected
      ? wallet.shortAddress
      : connectLabel;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setLanguageMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setLanguageMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setLanguageMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const switchLanguage = (nextLanguage) => {
    void i18n.changeLanguage(nextLanguage);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nete-lang", nextLanguage);
    }
    setLanguageMenuOpen(false);
  };

  const handleWalletAction = async () => {
    try {
      if (!wallet.isConnected) {
        await wallet.connectWallet();
        return;
      }

      if (wallet.isWrongChain) {
        await wallet.ensureCorrectChain();
        return;
      }

      wallet.disconnectWallet();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet action failed";
      window.alert(message);
    }
  };

  return (
    <>
      <nav className={scrolled ? "nav nav--scrolled" : "nav"} role="navigation" aria-label="Main navigation">
        <div className="container">
          <div className="nav__inner">
            <NavLink className="nav__logo" to="/" aria-label="NETE — Home">
              <span className="nav__logo-mark" aria-hidden="true">
                <img src={logoIcon} alt="" />
              </span>
              NETE
            </NavLink>

            <ul className="nav__links" role="list">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={({ isActive }) => desktopNavClassName(isActive)} end={item.to === "/"}>
                    {t(`nav.${item.key}`)}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="nav__cta">
              <button
                className="btn btn--ghost btn--wallet btn--sm"
                id="connect-btn"
                type="button"
                onClick={handleWalletAction}
                title={wallet.isConnected ? (wallet.isWrongChain ? switchChainLabel : disconnectLabel) : connectLabel}
              >
                <svg className="btn__wallet-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M3 8.5C3 6.567 4.567 5 6.5 5H17.5C19.433 5 21 6.567 21 8.5V15.5C21 17.433 19.433 19 17.5 19H6.5C4.567 19 3 17.433 3 15.5V8.5Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M15 12C15 10.895 15.895 10 17 10H21V14H17C15.895 14 15 13.105 15 12Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <circle cx="17.2" cy="12" r="0.9" fill="currentColor" />
                </svg>
                {walletLabel}
              </button>
              <div className="nav__lang" ref={languageMenuRef}>
                <button
                  className={languageMenuOpen ? "nav__lang-trigger is-open" : "nav__lang-trigger"}
                  aria-label={t("common.language")}
                  aria-expanded={languageMenuOpen}
                  aria-controls="header-language-menu"
                  aria-haspopup="menu"
                  onClick={() => setLanguageMenuOpen((prev) => !prev)}
                >
                  <svg className="nav__lang-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2.75C16.882 2.75 20.85 6.718 20.85 11.6C20.85 16.482 16.882 20.45 12 20.45C7.118 20.45 3.15 16.482 3.15 11.6C3.15 6.718 7.118 2.75 12 2.75Z" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M3.6 9.2H20.4M3.6 14H20.4M12 3.2C13.86 5.02 14.92 8.04 14.92 11.6C14.92 15.16 13.86 18.18 12 20M12 3.2C10.14 5.02 9.08 8.04 9.08 11.6C9.08 15.16 10.14 18.18 12 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
                <div
                  className={languageMenuOpen ? "nav__lang-popover is-open" : "nav__lang-popover"}
                  id="header-language-menu"
                  role="menu"
                  aria-hidden={!languageMenuOpen}
                >
                  <button
                    className={currentLanguage === "zh" ? "nav__lang-option is-active" : "nav__lang-option"}
                    onClick={() => switchLanguage("zh")}
                    role="menuitem"
                  >
                    {t("common.chinese")}
                  </button>
                  <button
                    className={currentLanguage === "en" ? "nav__lang-option is-active" : "nav__lang-option"}
                    onClick={() => switchLanguage("en")}
                    role="menuitem"
                  >
                    {t("common.english")}
                  </button>
                </div>
              </div>
              <button
                className={menuOpen ? "nav__burger is-open" : "nav__burger"}
                aria-expanded={menuOpen}
                aria-controls="global-mobile-menu"
                aria-label="Open menu"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div
        className={menuOpen ? "nav__mobile-menu is-open" : "nav__mobile-menu"}
        id="global-mobile-menu"
        role="dialog"
        aria-label="Navigation menu"
        aria-hidden={!menuOpen}
      >
        <ul role="list">
          {navItems.map((item) => (
            <li key={`mobile-${item.to}`}>
              <NavLink to={item.to} className={({ isActive }) => mobileNavClassName(isActive)} end={item.to === "/"} onClick={() => setMenuOpen(false)}>
                {t(`nav.${item.key}`)}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="nav__mobile-actions">
          <button
            className="btn btn--ghost btn--wallet btn--lg"
            type="button"
            onClick={handleWalletAction}
            title={wallet.isConnected ? (wallet.isWrongChain ? switchChainLabel : disconnectLabel) : connectLabel}
          >
            <svg className="btn__wallet-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 8.5C3 6.567 4.567 5 6.5 5H17.5C19.433 5 21 6.567 21 8.5V15.5C21 17.433 19.433 19 17.5 19H6.5C4.567 19 3 17.433 3 15.5V8.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M15 12C15 10.895 15.895 10 17 10H21V14H17C15.895 14 15 13.105 15 12Z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <circle cx="17.2" cy="12" r="0.9" fill="currentColor" />
            </svg>
            {walletLabel}
          </button>
        </div>
      </div>
    </>
  );
}
