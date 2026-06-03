/**
 * Lee los colores del chart desde las CSS variables en tiempo de ejecución.
 * Esto hace que los colores respondan al tema activo (light/dark).
 * Los atributos SVG de Recharts no soportan var(--*) directamente,
 * por lo que leemos el valor computado del DOM.
 */

const FALLBACKS: Record<number, string> = {
  1: '#0F766E', // primary  teal
  2: '#059669', // success  emerald
  3: '#D97706', // warning  amber
  4: '#DC2626', // error    red
  5: '#0284C7', // info     sky
  6: '#BE185D', // accent   pink
};

export const getChartColor = (index: 1 | 2 | 3 | 4 | 5 | 6): string => {
  if (typeof document === 'undefined') return FALLBACKS[index];
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue(`--chart-${index}`)
    .trim();
  return val || FALLBACKS[index];
};

export const getChartColors = (count = 6): string[] =>
  Array.from({ length: count }, (_, i) => getChartColor(((i % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6));
