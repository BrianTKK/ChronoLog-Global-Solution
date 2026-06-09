// Estilos e Tokens do Design System da Missão Refúgio (Astro-Support / ChronoLog)

export const COLORS = {
  // Paleta Principal do Espaço (Conforme Especificação PDF)
  background: "#0B0F19",       // bg-main: Azul-marinho profundo. Evita o reflexo.
  surface: "#1A2130",          // bg-surface: Superfície levemente mais clara.
  surfaceLow: "#141a26",       // Camada inferior de superfície
  surfaceLowest: "#070a12",    // Fundo profundo
  surfaceHigh: "#222c3e",      // Camada superior de console
  surfaceHighest: "#2d3a52",   // Elementos destacados ativos

  // Cores de Significado Psicológico
  primary: "#2DD4BF",          // brand-primary: Verde-água/Teal (Cura, Respiração)
  primaryDim: "#22c1ad",
  primaryContainer: "#2dd4bf", // Alias para compatibilidade
  onPrimary: "#003731",        // Contraste para textos em botões verde-água

  secondary: "#FBBF24",        // brand-secondary: Âmbar suave (Conforto, Refúgio)
  onSecondary: "#402d00",      // Contraste para textos em botões amber

  // Alertas / Erro / Status
  error: "#FB923C",            // status-alert: Laranja/Coral para anomalias (substitui vermelho)
  errorContainer: "#7c3809",
  onError: "#ffffff",

  // Textos e Bordas
  onBackground: "#F3F4F6",     // text-primary: Cinza-gelo de alta legibilidade.
  onSurface: "#F3F4F6",        // text-primary
  onSurfaceVariant: "#9CA3AF", // text-secondary: Cinza médio para metadados/timestamps.
  outline: "#859490",          // Bordas discretas
  outlineVariant: "#3c4a46",   // Bordas muito escuras
  whiteOpacity5: "rgba(255, 255, 255, 0.05)",
  whiteOpacity10: "rgba(255, 255, 255, 0.10)",
};

export const SPACING = {
  base: 8,
  marginSide: 24,
  sectionGapSm: 32,
  sectionGapLg: 48,
  touchTargetMin: 48,
};

export const ROUNDNESS = {
  sm: 8,
  default: 16,
  md: 24,
  lg: 32,
  full: 9999,
};

// Helpers de Estilos Especiais (HUD / Glassmorphism)
export const GLASS_STYLE = {
  backgroundColor: "rgba(28, 31, 42, 0.5)", // surface + translucidez
  borderColor: "rgba(255, 255, 255, 0.05)",
  borderWidth: 1,
};
