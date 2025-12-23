/**
 * Service Icon Utility
 *
 * Priority system:
 * 1. Use icon from database (Service.icon field) if provided
 * 2. Fallback to keyword detection based on service name
 * 3. Default icon if no match found
 */

import React from 'react';

export interface ServiceIconProps {
  serviceName: string;
  iconName?: string | null; // Icon from database (priority)
  size?: number;
  color?: string;
}

/**
 * Icon library - All available icons mapped by name
 */
const ICON_LIBRARY: Record<string, (size: number, color: string) => JSX.Element> = {
  // Láser / Depilación
  laser: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),

  // HIFU / Ultrasonido
  hifu: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  ),

  // Peeling / Hollywood Peel / Ácidos
  peel: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  ),

  // Radiofrecuencia
  radiofrecuencia: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2"/>
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
    </svg>
  ),

  // Botox / Toxina Botulínica
  botox: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 12H7m10-5H7m10 10H7"/>
      <path d="M9 7h6M9 17h6"/>
    </svg>
  ),

  // Rellenos / Ácido Hialurónico / Fillers
  filler: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20"/>
      <path d="M5 9l7-7 7 7"/>
      <path d="M5 15l7 7 7-7"/>
    </svg>
  ),

  // Limpieza Facial / Hidrafacial
  facial: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/>
      <line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  ),

  // Mesoterapia / Vitaminas
  mesoterapia: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  ),

  // Plasma / PRP
  plasma: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.2 7.8l-7.7 7.7-4-4-5.7 5.7"/>
      <path d="M15 7h6v6"/>
    </svg>
  ),

  // Microagujas / Microneedling
  microneedling: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M7 7h.01M12 7h.01M17 7h.01M7 12h.01M12 12h.01M17 12h.01M7 17h.01M12 17h.01M17 17h.01"/>
    </svg>
  ),

  // Consulta / Evaluación
  consulta: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),

  // Criolipólisis / Coolsculpting
  criolipolisis: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v6.5"/>
      <path d="m19 5-7 7-7-7"/>
      <path d="M12 17.5V22"/>
      <path d="m19 19-7-7-7 7"/>
    </svg>
  ),

  // Masaje / Drenaje
  masaje: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10"/>
      <path d="M12 20V4"/>
      <path d="M6 20v-6"/>
    </svg>
  ),

  // Default icon (estrella)
  default: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
};

/**
 * Get icon by database name
 */
const getIconByName = (iconName: string, size: number, color: string): JSX.Element => {
  const lowerIconName = iconName.toLowerCase().trim();
  const iconFn = ICON_LIBRARY[lowerIconName];

  if (iconFn) {
    return iconFn(size, color);
  }

  // If icon name not found in library, return default
  return ICON_LIBRARY.default(size, color);
};

/**
 * Detect icon based on service name keywords (fallback)
 */
const detectIconByKeywords = (serviceName: string, size: number, color: string): JSX.Element => {
  const lowerName = serviceName.toLowerCase();

  // Láser / Depilación
  if (lowerName.includes('láser') || lowerName.includes('laser') || lowerName.includes('depilación') || lowerName.includes('depilacion')) {
    return ICON_LIBRARY.laser(size, color);
  }

  // HIFU / Ultrasonido
  if (lowerName.includes('hifu') || lowerName.includes('ultrasonido')) {
    return ICON_LIBRARY.hifu(size, color);
  }

  // Peeling / Hollywood Peel / Ácidos
  if (lowerName.includes('peel') || lowerName.includes('peeling') || lowerName.includes('ácido') || lowerName.includes('acido') || lowerName.includes('hollywood')) {
    return ICON_LIBRARY.peel(size, color);
  }

  // Radiofrecuencia
  if (lowerName.includes('radiofrecuencia') || lowerName.includes('rf ')) {
    return ICON_LIBRARY.radiofrecuencia(size, color);
  }

  // Botox / Toxina Botulínica
  if (lowerName.includes('botox') || lowerName.includes('toxina')) {
    return ICON_LIBRARY.botox(size, color);
  }

  // Rellenos / Ácido Hialurónico / Fillers
  if (lowerName.includes('relleno') || lowerName.includes('hialurónico') || lowerName.includes('hialuronico') || lowerName.includes('filler')) {
    return ICON_LIBRARY.filler(size, color);
  }

  // Limpieza Facial / Hidrafacial
  if (lowerName.includes('limpieza') || lowerName.includes('hidrafacial') || lowerName.includes('facial')) {
    return ICON_LIBRARY.facial(size, color);
  }

  // Mesoterapia / Vitaminas
  if (lowerName.includes('mesoterapia') || lowerName.includes('vitamina') || lowerName.includes('cocktail')) {
    return ICON_LIBRARY.mesoterapia(size, color);
  }

  // Plasma / PRP
  if (lowerName.includes('plasma') || lowerName.includes('prp') || lowerName.includes('plaquetas')) {
    return ICON_LIBRARY.plasma(size, color);
  }

  // Microagujas / Microneedling
  if (lowerName.includes('microaguja') || lowerName.includes('microneedling') || lowerName.includes('dermapen')) {
    return ICON_LIBRARY.microneedling(size, color);
  }

  // Consulta / Evaluación
  if (lowerName.includes('consulta') || lowerName.includes('evaluación') || lowerName.includes('evaluacion')) {
    return ICON_LIBRARY.consulta(size, color);
  }

  // Criolipólisis / Coolsculpting
  if (lowerName.includes('criolipólisis') || lowerName.includes('criolipolisis') || lowerName.includes('coolsculpting') || lowerName.includes('cool')) {
    return ICON_LIBRARY.criolipolisis(size, color);
  }

  // Masaje / Drenaje
  if (lowerName.includes('masaje') || lowerName.includes('drenaje')) {
    return ICON_LIBRARY.masaje(size, color);
  }

  // Default icon
  return ICON_LIBRARY.default(size, color);
};

/**
 * Get icon component for a service
 * Priority: Database icon > Keyword detection > Default
 */
export const getServiceIcon = (
  serviceName: string,
  iconName?: string | null,
  size: number = 20,
  color: string = 'currentColor'
): JSX.Element => {
  // Priority 1: Use icon from database if provided
  if (iconName) {
    return getIconByName(iconName, size, color);
  }

  // Priority 2: Fallback to keyword detection
  return detectIconByKeywords(serviceName, size, color);
};

/**
 * Service Icon Component
 */
export const ServiceIcon: React.FC<ServiceIconProps> = ({
  serviceName,
  iconName,
  size = 20,
  color = 'currentColor'
}) => {
  return getServiceIcon(serviceName, iconName, size, color);
};

/**
 * Get list of available icons for UI selector
 */
export const getAvailableIcons = (): string[] => {
  return Object.keys(ICON_LIBRARY).filter(key => key !== 'default');
};
