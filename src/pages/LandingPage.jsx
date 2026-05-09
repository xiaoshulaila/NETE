import { useEffect } from "react";
import { Icon } from "@iconify/react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import GlobalHeader from "../components/common/GlobalHeader";
import FeaturesSection from "../components/landing/FeaturesSection";
import FooterSection from "../components/landing/FooterSection";
import HeroSection from "../components/landing/HeroSection";
import MarketsSection from "../components/landing/MarketsSection";

export default function LandingPage() {
  const { t } = useTranslation();
  const modelMechanisms = t("landing.project.modelMechanisms", { returnObjects: true });
  const roadmapItems = t("landing.project.roadmapItems", { returnObjects: true });
  const contractItems = t("landing.project.contractItems", { returnObjects: true });

  useEffect(() => {
    document.title = "NETE";

    const scrollTopBtn = document.getElementById("scroll-top-btn");
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toast-msg");

    if (!scrollTopBtn || !toast || !toastMsg) {
      return undefined;
    }

    let toastTimer;

    const handleScroll = () => {
      scrollTopBtn.classList.toggle("is-visible", window.scrollY > 400);
    };

    const handleScrollTopClick = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    scrollTopBtn.addEventListener("click", handleScrollTopClick);

    const showToast = (message, duration = 3000) => {
      clearTimeout(toastTimer);
      toastMsg.textContent = message;
      toast.classList.add("is-visible");
      toastTimer = window.setTimeout(() => {
        toast.classList.remove("is-visible");
      }, duration);
    };

    const getStartedBtn = document.getElementById("get-started-btn");
    const launchBtn = document.getElementById("launch-btn");
    const ctaPrimaryBtn = document.getElementById("cta-primary-btn");

    const handleGetStarted = () => showToast(t("landing.toast.core"));
    const handleLaunch = () => showToast(t("landing.toast.launch"));
    const handleCreateWallet = () => showToast(t("landing.toast.wallet"));

    getStartedBtn?.addEventListener("click", handleGetStarted);
    launchBtn?.addEventListener("click", handleLaunch);
    ctaPrimaryBtn?.addEventListener("click", handleCreateWallet);
    handleScroll();

    return () => {
      clearTimeout(toastTimer);

      window.removeEventListener("scroll", handleScroll);
      scrollTopBtn.removeEventListener("click", handleScrollTopClick);

      getStartedBtn?.removeEventListener("click", handleGetStarted);
      launchBtn?.removeEventListener("click", handleLaunch);
      ctaPrimaryBtn?.removeEventListener("click", handleCreateWallet);
    };
  }, [t]);

  return (
    <>
      <GlobalHeader />

      <main id="main-content" tabIndex={-1}>
        <HeroSection />

        <div className="stats-bar" role="marquee" aria-label="Live market data" aria-live="off">
          <div className="stats-bar__track" aria-hidden="true">
            <div className="stats-bar__item">
              <span className="stats-bar__label">BTC</span>
              <span className="stats-bar__value">$67,234.50</span>
              <span className="stats-bar__change--up">▲ 3.24%</span>
            </div>
            <div className="stats-bar__dot"></div>
            <div className="stats-bar__item">
              <span className="stats-bar__label">ETH</span>
              <span className="stats-bar__value">$2,321.79</span>
              <span className="stats-bar__change--down">▼ 1.18%</span>
            </div>
            <div className="stats-bar__dot"></div>
            <div className="stats-bar__item">
              <span className="stats-bar__label">BNB</span>
              <span className="stats-bar__value">$416.32</span>
              <span className="stats-bar__change--up">▲ 5.67%</span>
            </div>
            <div className="stats-bar__dot"></div>
            <div className="stats-bar__item">
              <span className="stats-bar__label">SOL</span>
              <span className="stats-bar__value">$183.44</span>
              <span className="stats-bar__change--up">▲ 8.91%</span>
            </div>
            <div className="stats-bar__dot"></div>
            <div className="stats-bar__item">
              <span className="stats-bar__label">MATIC</span>
              <span className="stats-bar__value">$0.987</span>
              <span className="stats-bar__change--down">▼ 2.33%</span>
            </div>
            <div className="stats-bar__dot"></div>
            <div className="stats-bar__item">
              <span className="stats-bar__label">AVAX</span>
              <span className="stats-bar__value">$38.12</span>
              <span className="stats-bar__change--up">▲ 4.55%</span>
            </div>
            <div className="stats-bar__dot"></div>
            <div className="stats-bar__item">
              <span className="stats-bar__label">NFT Cap</span>
              <span className="stats-bar__value">$2.16B</span>
              <span className="stats-bar__change--up">▲ 2.91%</span>
            </div>
            <div className="stats-bar__dot"></div>

            <div className="stats-bar__item">
              <span className="stats-bar__label">BTC</span>
              <span className="stats-bar__value">$67,234.50</span>
              <span className="stats-bar__change--up">▲ 3.24%</span>
            </div>
            <div className="stats-bar__dot"></div>
            <div className="stats-bar__item">
              <span className="stats-bar__label">ETH</span>
              <span className="stats-bar__value">$2,321.79</span>
              <span className="stats-bar__change--down">▼ 1.18%</span>
            </div>
            <div className="stats-bar__dot"></div>
            <div className="stats-bar__item">
              <span className="stats-bar__label">BNB</span>
              <span className="stats-bar__value">$416.32</span>
              <span className="stats-bar__change--down">▼ 0.45%</span>
            </div>
            <div className="stats-bar__dot"></div>
            <div className="stats-bar__item">
              <span className="stats-bar__label">SOL</span>
              <span className="stats-bar__value">$183.44</span>
              <span className="stats-bar__change--up">▲ 8.91%</span>
            </div>
            <div className="stats-bar__dot"></div>
            <div className="stats-bar__item">
              <span className="stats-bar__label">NFT Cap</span>
              <span className="stats-bar__value">$2.16B</span>
              <span className="stats-bar__change--up">▲ 2.91%</span>
            </div>
          </div>
        </div>

        <FeaturesSection />

        <section className="section section--alt" aria-labelledby="project-heading">
          <div className="container">
            <div className="section__header">
              <span className="section__eyebrow" aria-hidden="true">
                {t("landing.project.eyebrow")}
              </span>
              <h2 className="section__title" id="project-heading">
                {t("landing.project.title")}
              </h2>
              <p className="section__desc">
                {t("landing.project.desc")}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <article className="feature-card feature-card--highlight" tabIndex={0}>
                <div className="feature-card__icon feature-card__icon--acid" role="img" aria-label="model mechanism">
                  <Icon className="feature-card__icon-svg" icon="mdi:cog-outline" />
                </div>
                <h3 className="feature-card__title">{t("landing.project.mechanismsTitle")}</h3>
                <ul className="space-y-2 text-sm text-white/80">
                  {modelMechanisms.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="feature-card" tabIndex={0}>
                <div className="feature-card__icon feature-card__icon--purple" role="img" aria-label="roadmap">
                  <Icon className="feature-card__icon-svg" icon="mdi:compass-outline" />
                </div>
                <h3 className="feature-card__title">{t("landing.project.rulesTitle")}</h3>
                <ul className="space-y-2 text-sm text-white/80">
                  {roadmapItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {contractItems.map((item) => (
                <article key={item.name} className="feature-card" tabIndex={0}>
                  <h3 className="feature-card__title">{item.name}</h3>
                  <p className="text-sm text-white/80">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <MarketsSection />

        <section className="cta-section" aria-labelledby="cta-heading">
          <div className="cta-section__bg" aria-hidden="true"></div>
          <div className="container">
            <div className="cta-section__inner">
              <h2 className="cta-section__title" id="cta-heading">
                {t("landing.cta.title")}
              </h2>
              <p className="cta-section__subtitle">
                {t("landing.cta.subtitle")}
              </p>
              <div className="cta-section__actions">
                <button className="btn btn--primary btn--lg" id="cta-primary-btn">
                  {t("landing.cta.action")}
                </button>
              </div>
              <div className="download-badges">
                <NavLink className="download-badge" to="/mining" aria-label="Open mining module">
                  <span className="download-badge__icon" aria-hidden="true">
                    <Icon className="download-badge__icon-svg" icon="mdi:pickaxe" />
                  </span>
                  <div className="download-badge__text">
                    <div className="download-badge__sub">{t("landing.cta.enter")}</div>
                    <div className="download-badge__name">{t("landing.cta.mining")}</div>
                  </div>
                </NavLink>
                <NavLink className="download-badge" to="/c2c" aria-label="Open c2c market module">
                  <span className="download-badge__icon" aria-hidden="true">
                    <Icon className="download-badge__icon-svg" icon="mdi:swap-horizontal" />
                  </span>
                  <div className="download-badge__text">
                    <div className="download-badge__sub">{t("landing.cta.quick")}</div>
                    <div className="download-badge__name">{t("landing.cta.c2c")}</div>
                  </div>
                </NavLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />

      <button className="scroll-top" id="scroll-top-btn" aria-label="Scroll back to top">
        <Icon className="scroll-top__icon" icon="mdi:arrow-up" aria-hidden="true" />
      </button>

      <div className="toast" id="toast" role="status" aria-live="polite" aria-atomic="true">
        <span className="toast__dot" aria-hidden="true"></span>
        <span id="toast-msg">{t("landing.toast.default")}</span>
      </div>
    </>
  );
}
