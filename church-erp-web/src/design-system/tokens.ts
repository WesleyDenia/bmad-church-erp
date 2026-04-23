export const productTokens = {
  colors: {
    background: "var(--color-background)",
    foreground: "var(--color-foreground)",
    muted: "var(--color-muted)",
    accent: "var(--color-accent)",
    border: "var(--color-border)",
  },
  radii: {
    card: "2rem",
    control: "9999px",
    field: "1rem",
  },
  shadows: {
    card: "0 20px 60px rgba(30, 41, 59, 0.08)",
    cardHover: "0 24px 70px rgba(30, 41, 59, 0.12)",
  },
} as const;
