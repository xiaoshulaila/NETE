import { useTranslation } from "react-i18next";

const dots = [0, 1, 2, 3];

function indexes(count, fallback) {
  return Array.from({ length: Math.max(1, Number(count) || fallback) }, (_, index) => index);
}

export default function LoadingState({ label, description = "", compact = false, className = "", variant = "dots", rows = 3, cells = 4 }) {
  const { t } = useTranslation();
  const loadingLabel = label || t("common.loading");
  const showCopy = Boolean(label || description);
  const classNames = [
    "data-loading-state",
    compact ? "data-loading-state--compact" : "",
    variant === "list" ? "data-loading-state--list" : "",
    className,
  ].filter(Boolean).join(" ");

  if (variant === "list") {
    const rowItems = indexes(rows, 3);
    const cellItems = indexes(cells, 4);

    return (
      <div className={classNames} role="status" aria-live="polite" style={{ "--data-loading-cells": String(cellItems.length) }}>
        <span className="data-loading-sr">{loadingLabel}</span>
        <div className="data-loading-shimmer-list" aria-hidden="true">
          {rowItems.map((row) => (
            <div className="data-loading-shimmer-row" key={row}>
              {cellItems.map((cell) => (
                <span className="data-loading-shimmer-cell" key={cell} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <span className={classNames} role="status" aria-live="polite">
      <span className="data-loading-dot-group" aria-hidden="true">
        {dots.map((dot) => (
          <span className="data-loading-dot" key={dot} />
        ))}
      </span>
      <span className="data-loading-sr">{loadingLabel}</span>
      {showCopy ? (
        <span className="data-loading-copy">
          {label ? <span className="data-loading-label">{label}</span> : null}
          {description ? <small>{description}</small> : null}
        </span>
      ) : null}
    </span>
  );
}
