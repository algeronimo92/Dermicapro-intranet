/**
 * Configuración de versión del sistema
 * Esta versión se sincroniza automáticamente con package.json
 */

// Lee la versión del package.json en tiempo de build
import packageJson from '../../package.json';

export const APP_VERSION = packageJson.version;
export const APP_NAME = packageJson.name;
export const APP_DESCRIPTION = packageJson.description;

// Puedes agregar más información de versión si lo necesitas
export const BUILD_DATE = new Date().toISOString();
export const ENVIRONMENT = import.meta.env.MODE;
