import type { ReactNode } from "react";

export const AppShell = ({
  title,
  eyebrow = "Flow2Print",
  subtitle,
  compact = false,
  maxWidth = 1240,
  children
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  compact?: boolean;
  maxWidth?: number;
  children: ReactNode;
}) => (
  <div
    className="app-shell"
    style={{
      margin: "0 auto",
      maxWidth,
      padding: compact ? "22px 20px 40px" : "32px 20px 56px",
      position: "relative"
    }}
  >
    <header
      className="app-shell__header"
      style={{
        marginBottom: compact ? 18 : 28,
        display: "grid",
        gap: 10
      }}
    >
      <span
        className="app-shell__eyebrow"
        style={{
          display: "inline-flex",
          alignItems: "center",
          width: "fit-content",
          borderRadius: 999,
          letterSpacing: "0.18em",
          padding: "8px 12px",
          textTransform: "uppercase",
          fontSize: 11,
          fontWeight: 700
        }}
      >
        {eyebrow}
      </span>
      <div
        className="app-shell__hero"
        style={{
          display: "grid",
          gap: 10,
          maxWidth: compact ? 980 : 860
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: compact ? "clamp(1.9rem, 3vw, 3rem)" : "clamp(2.4rem, 5vw, 4.6rem)",
            lineHeight: 0.95
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            style={{
              margin: 0,
              fontSize: compact ? "1rem" : "clamp(1rem, 1.6vw, 1.2rem)",
              lineHeight: 1.6,
              maxWidth: compact ? 960 : 760
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
    <main>{children}</main>
  </div>
);
