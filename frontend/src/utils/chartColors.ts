/**
 * Lee los colores del chart desde las CSS variables en tiempo de ejecución.
 * Esto hace que los colores respondan al tema activo (light/dark).
 * Los atributos SVG de Recharts no soportan var(--*) directamente,
 * por lo que leemos el valor computado del DOM.
 */

const FALLBACKS: Record<number, string> = {
  1: '#A88B4E', // dorado
  2: '#4E7A7C', // verde azulado
  3: '#A3687A', // rosa
  4: '#6875A0', // índigo
  5: '#7C9873', // salvia
  6: '#B07A55', // terracota
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
