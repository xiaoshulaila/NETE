import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import logoIcon from "../../assets/images/logo-icon.svg";
import { useWalletConnector } from "../../hooks/useWalletConnector";
import { languageOptions } from "../../i18n";
import { getWalletErrorMessage } from "../../utils/walletErrors";

const navItems = [
  { key: "home", to: "/" },
  { key: "mining", to: "/mining" },
  { key: "c2c", to: "/c2c" },
  { key: "seed", to: "/finance/buy-seed" },
  { key: "team", to: "/account/team" },
  { key: "my", to: "/my" },
];
const walletIconDefs = [
  { keys: ["metamask", "meta mask"], icon: "logos:metamask-icon", className: "is-metamask" },
  { keys: ["coinbase"], icon: "token-branded:coinbase", className: "is-coinbase" },
  { keys: ["walletconnect", "wallet connect"], icon: "logos:walletconnect", className: "is-official" },
  { keys: ["injected", "browser wallet"], icon: "solar:wallet-money-bold", className: "is-injected" },
];

function desktopNavClassName(isActive) {
  return isActive ? "nav__link nav__link--active" : "nav__link";
}

function mobileNavClassName(isActive) {
  return isActive ? "nav__mobile-link nav__mobile-link--active" : "nav__mobile-link";
}

function normalizeLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value.startsWith("zh-tw") || value.startsWith("zh-hk") || value.includes("hant")) return "zh-TW";
  if (value.startsWith("en")) return "en";
  if (value.startsWith("ja")) return "ja";
  if (value.startsWith("ko")) return "ko";
  return "zh";
}

function getConnectorLabel(connector) {
  return connector?.name || connector?.id || "Wallet";
}

function getWalletOptions(connectors) {
  const seen = new Set();
  return (connectors || []).filter((connector) => {
    const key = getConnectorLabel(connector).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findWalletIcon(connector, label) {
  const key = `${connector?.id || ""} ${connector?.type || ""} ${label || ""}`.toLowerCase();
  return walletIconDefs.find((item) => item.keys.some((name) => key.includes(name)));
}

function getConnectorIcon(connector, label) {
  if (typeof connector?.icon === "string" && connector.icon) {
    return { src: connector.icon, className: "is-image" };
  }

  const walletIcon = findWalletIcon(connector, label);
  if (walletIcon) {
    return { icon: walletIcon.icon, className: walletIcon.className };
  }

  return { icon: "solar:wallet-money-bold", className: "is-default" };
}

function WalletOptionIcon({ connector, label }) {
  const walletIcon = getConnectorIcon(connector, label);

  return (
    <span className={`wallet-modal__mark ${walletIcon.className}`} aria-hidden="true">
      {walletIcon.src ? <img src={walletIcon.src} alt="" /> : <Icon icon={walletIcon.icon} width="26" height="26" />}
    </span>
  );
}

function WalletConnectModal({ errorMessage, onClose, onConnect, open, options, t, wallet }) {
  if (!open) return null;

  return (
    <div className="wallet-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="wallet-modal" role="dialog" aria-modal="true" aria-label={t("nav.wallet.connect")} onClick={(event) => event.stopPropagation()}>
        <div className="wallet-modal__header">
          <div>
            <p className="wallet-modal__eyebrow">NETE WALLET</p>
            <h2>{t("nav.wallet.select")}</h2>
          </div>
          <button className="wallet-modal__close" type="button" onClick={onClose} aria-label={t("modules.team.closeBindPrompt")}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 7L17 17M17 7L7 17" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="wallet-modal__list">
          {options.length ? options.map((connector) => {
            const label = getConnectorLabel(connector);
            const connecting = wallet.isConnecting && wallet.connectingConnectorUid === connector.uid;

            return (
              <button
                className="wallet-modal__option"
                type="button"
                key={connector.uid || connector.id || label}
                disabled={wallet.isConnecting}
                onClick={() => onConnect(connector)}
              >
                <WalletOptionIcon connector={connector} label={label} />
                <span>{connecting ? t("nav.wallet.connecting") : label}</span>
                {connecting ? <span className="wallet-modal__spinner" aria-hidden="true" /> : null}
              </button>
            );
          }) : <p className="wallet-modal__empty">{t("nav.wallet.noConnector")}</p>}
        </div>

        {errorMessage ? <p className="wallet-modal__error">{errorMessage}</p> : null}
      </section>
    </div>
  );
}

export default function GlobalHeader() {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const wallet = useWalletConnector();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletError, setWalletError] = useState("");
  const languageMenuRef = useRef(null);
  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const walletOptions = useMemo(() => getWalletOptions(wallet.connectors), [wallet.connectors]);
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
    setWalletModalOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen || walletModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, walletModalOpen]);

  useEffect(() => {
    if (wallet.isConnected) {
      setWalletModalOpen(false);
      setWalletError("");
    }
  }, [wallet.isConnected]);

  useEffect(() => {
    if (!walletError) return undefined;
    const timer = window.setTimeout(() => setWalletError(""), 3000);
    return () => window.clearTimeout(timer);
  }, [walletError]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setLanguageMenuOpen(false);
        setWalletModalOpen(false);
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
        setMenuOpen(false);
        setLanguageMenuOpen(false);
        setWalletError("");
        setWalletModalOpen(true);
        return;
      }

      if (wallet.isWrongChain) {
        await wallet.ensureCorrectChain();
        return;
      }

      wallet.disconnectWallet();
    } catch (error) {
      setWalletError(getWalletErrorMessage(error, t, "nav.wallet.connectionFailed"));
    }
  };

  const handleWalletConnect = async (connector) => {
    try {
      setWalletError("");
      await wallet.connectWallet(connector);
      setWalletModalOpen(false);
    } catch (error) {
      setWalletError(getWalletErrorMessage(error, t, "nav.wallet.connectionFailed"));
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
                  {languageOptions.map((item) => (
                    <button
                      className={currentLanguage === item.key ? "nav__lang-option is-active" : "nav__lang-option"}
                      onClick={() => switchLanguage(item.key)}
                      role="menuitem"
                      key={item.key}
                    >
                      {t(item.labelKey)}
                    </button>
                  ))}
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

      <WalletConnectModal
        errorMessage={walletError}
        onClose={() => setWalletModalOpen(false)}
        onConnect={handleWalletConnect}
        open={walletModalOpen && !wallet.isConnected}
        options={walletOptions}
        t={t}
        wallet={wallet}
      />
      {walletError && (!walletModalOpen || wallet.isConnected) ? (
        <div className="fixed bottom-6 left-1/2 z-[720] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-xl border border-white/10 bg-black/90 px-4 py-3 text-center text-sm text-white shadow-[0_24px_70px_rgba(0,0,0,0.36)]" role="status" aria-live="polite">
          {walletError}
        </div>
      ) : null}
    </>
  );
}
