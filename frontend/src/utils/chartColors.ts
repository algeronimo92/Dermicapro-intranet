/**
 * Lee los colores del chart desde las CSS variables en tiempo de ejecución.
 * Esto hace que los colores respondan al tema activo (light/dark).
 * Los atributos SVG de Recharts no soportan var(--*) directamente,
 * por lo que leemos el valor computado del DOM.
 */

const FALLBACKS: Record<number, string> = {
  1: '#B8892B', // dorado
  2: '#2F6F73', // verde azulado
  3: '#B4566E', // rosa piel
  4: '#5B6CB0', // índigo
  5: '#6E9E6A', // salvia
  6: '#C46A3A', // terracota
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
