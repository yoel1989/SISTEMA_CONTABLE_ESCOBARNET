// Paleta y variables de las gráficas. Módulo sin "use client" para que puedan
// importarla tanto componentes de servidor (páginas) como de cliente (gráficas).
// Los valores hex están validados para contraste y daltonismo: no cambiarlos.
export const ESTILO_VIZ = `
.viz {
  color-scheme: light;
  --superficie: #fcfcfb;
  --texto: #0b0b0b;
  --texto-secundario: #52514e;
  --grid: #e4e3df;
  --serie-1: #2a78d6;
  --serie-2: #eb6834;
  --serie-3: #1baf7a;
  --serie-4: #eda100;
}
/* Modo oscuro solo con data-theme="dark" (no por preferencia del sistema). */
:root[data-theme="dark"] .viz {
  color-scheme: dark;
  --superficie: #1a1a19;
  --texto: #f0efec;
  --texto-secundario: #c3c2b7;
  --grid: #33332f;
  --serie-1: #3987e5;
  --serie-2: #d95926;
  --serie-3: #199e70;
  --serie-4: #c98500;
}
`;
