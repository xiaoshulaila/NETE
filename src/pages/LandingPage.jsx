import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import GlobalHeader from "../components/common/GlobalHeader";
import FeaturesSection from "../components/landing/FeaturesSection";
import FooterSection from "../components/landing/FooterSection";
import HeroSection from "../components/landing/HeroSection";
import announcementsData from "../data/announcements.json";

function normalizeAnnouncementLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value.startsWith("zh-tw") || value.startsWith("zh-hk") || value.includes("hant")) return "zh-TW";
  if (value.startsWith("en")) return "en-US";
  if (value.startsWith("ja")) return "ja-JP";
  if (value.startsWith("ko")) return "ko-KR";
  return "zh-CN";
}

function getActiveAnnouncements(language) {
  return (announcementsData.announcements || [])
    .filter((item) => item.status === "active")
    .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
    .map((item) => {
      const translation = item.translations?.[language] || item.translations?.["zh-CN"];
      return translation ? { ...item, ...translation } : null;
    })
    .filter(Boolean);
}

function AnnouncementBar({ items, t }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const activeNotice = items[activeIndex] || items[0];

  useEffect(() => {
    setActiveIndex(0);
  }, [items]);

  useEffect(() => {
    if (items.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [items.length]);

  if (!activeNotice) return null;

  return (
    <>
      <div className="announcement-bar" role="status" aria-live="polite">
        <div className="container announcement-bar__inner">
          <Icon className="announcement-bar__icon" icon="mdi:bullhorn-outline" aria-hidden="true" />
          <button className="announcement-bar__title" type="button" onClick={() => setSelectedNotice(activeNotice)}>
            {activeNotice.title}
          </button>
        </div>
      </div>

      {selectedNotice ? (
        <div className="announcement-modal-backdrop" role="presentation" onClick={() => setSelectedNotice(null)}>
          <section className="announcement-modal" role="dialog" aria-modal="true" aria-label={selectedNotice.title} onClick={(event) => event.stopPropagation()}>
            <div className="announcement-modal__head">
              <div>
                <span>{t("landing.announcements.label")}</span>
                <h2>{selectedNotice.title}</h2>
              </div>
              <button type="button" onClick={() => setSelectedNotice(null)} aria-label={t("landing.announcements.close")}>
                <Icon icon="solar:close-circle-outline" aria-hidden="true" />
              </button>
            </div>
            <div className="announcement-modal__content" dangerouslySetInnerHTML={{ __html: selectedNotice.content || "" }} />
          </section>
        </div>
      ) : null}
    </>
  );
}

export default function LandingPage() {
  const { i18n, t } = useTranslation();
  const modelMechanisms = t("landing.project.modelMechanisms", { returnObjects: true });
  const roadmapItems = t("landing.project.roadmapItems", { returnObjects: true });
  const contractItems = t("landing.project.contractItems", { returnObjects: true });
  const teamSectionItems = t("landing.team.items", { returnObjects: true });
  const bridgeItems = t("landing.bridge.items", { returnObjects: true });
  const foundationItems = t("landing.cta.foundationItems", { returnObjects: true });
  const announcementLanguage = normalizeAnnouncementLanguage(i18n.resolvedLanguage || i18n.language);
  const announcements = useMemo(() => getActiveAnnouncements(announcementLanguage), [announcementLanguage]);
  const teamItems = Array.isArray(teamSectionItems) ? teamSectionItems : [];
  const flowItems = Array.isArray(bridgeItems) ? bridgeItems : [];
  const ctaItems = Array.isArray(foundationItems) ? foundationItems : [];

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
        <AnnouncementBar items={announcements} t={t} />
        <HeroSection />

        <FeaturesSection />

        <section className="mechanism-bridge" aria-label={t("landing.bridge.aria")}>
          <div className="container mechanism-bridge__inner">
            {flowItems.map((item, index) => (
              <div className="mechanism-step" key={item.title}>
                <span className="mechanism-step__index">{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.title}</strong>
                <small>{item.desc}</small>
              </div>
            ))}
          </div>
        </section>

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

        <section className="section team-section" aria-labelledby="team-heading">
          <div className="container">
            <div className="section__header">
              <span className="section__eyebrow" aria-hidden="true">
                {t("landing.team.eyebrow")}
              </span>
              <h2 className="section__title" id="team-heading">
                {t("landing.team.title")}
              </h2>
              <p className="section__desc">
                {t("landing.team.desc")}
              </p>
            </div>

            <div className="features-grid features-grid--team">
              {teamItems.map((item, index) => (
                <article className={index === 0 ? "feature-card feature-card--highlight" : "feature-card"} tabIndex={0} key={item.title}>
                  <div className="feature-card__icon feature-card__icon--teal" role="img" aria-label={item.title}>
                    <Icon className="feature-card__icon-svg" icon={index === 0 ? "mdi:shield-star-outline" : "mdi:source-branch"} />
                  </div>
                  <h3 className="feature-card__title">{item.title}</h3>
                  <p className="feature-card__desc">{item.desc}</p>
                  <span className="feature-card__tag">{item.tag}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

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
              <ul className="cta-section__list">
                {ctaItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
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
