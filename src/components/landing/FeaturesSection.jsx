import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";

const featureIcons = [
  { icon: "mdi:recycle-variant", tone: "acid", aria: "Deflation" },
  { icon: "mdi:pickaxe", tone: "purple", aria: "Mining" },
  { icon: "mdi:puzzle-outline", tone: "pink", aria: "Community" },
  { icon: "mdi:shield-lock-outline", tone: "teal", aria: "Security" },
];

export default function FeaturesSection() {
  const { t } = useTranslation();
  const cards = t("landing.features.cards", { returnObjects: true });

  return (
  <section className="section" id="discover" aria-labelledby="features-heading">
    <div className="container">
      <div className="section__header">
        <span className="section__eyebrow" aria-hidden="true">{t("landing.features.eyebrow")}</span>
        
        <h2 className="section__title" id="features-heading">
          {t("landing.features.title").split("\n").map((line, index) => (
            <span key={`${line}-${index}`}>{index > 0 ? <br /> : null}{line}</span>
          ))}
        </h2>
        <p className="section__desc">
          {t("landing.features.desc")}
        </p>
      </div>

      <div className="features-grid">
        {cards.map((card, index) => {
          const meta = featureIcons[index] || featureIcons[0];
          return (
            <article className={index === 0 ? "feature-card feature-card--highlight" : "feature-card"} tabIndex={0} key={card.title}>
              <div className={`feature-card__icon feature-card__icon--${meta.tone}`} role="img" aria-label={meta.aria}>
                <Icon className="feature-card__icon-svg" icon={meta.icon} />
              </div>
              <h3 className="feature-card__title">{card.title}</h3>
              <p className="feature-card__desc">{card.desc}</p>
              <span className="feature-card__tag">{card.tag}</span>
            </article>
          );
        })}
      </div>
    </div>
  </section>
  );
}
