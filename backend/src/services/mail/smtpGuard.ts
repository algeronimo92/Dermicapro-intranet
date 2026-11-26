import dns from 'dns/promises';
import net from 'net';
import { config } from '../../config/env';

/**
 * El servidor SMTP que se configura desde la pantalla lo escribe un admin y
 * el backend se conecta a él desde adentro del servidor. Sin estos límites,
 * "Enviar correo de prueba" serviría para sondear la red interna (la base,
 * MinIO, Mailpit...).
 */

/** Sólo puertos de envío de correo. */
export const ALLOWED_PORTS = [25, 465, 587, 2525] as const;
/** Puerto de Mailpit, aceptado sólo en desarrollo. */
const DEV_PORT = 1025;

export class SmtpHostRejected extends Error {}

const HOSTNAME_RE = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const INTERNAL_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa'];

const NON_PUBLIC = new net.BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) {
  NON_PUBLIC.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32], ['64:ff9b::', 96],
] as const) {
  NON_PUBLIC.addSubnet(network, prefix, 'ipv6');
}

/** En desarrollo se permite apuntar a Mailpit u otro servidor interno. */
export const internalHostsAllowed = (): boolean => config.mail.allowInternalHosts;

export const allowedPorts = (): number[] =>
  internalHostsAllowed() ? [...ALLOWED_PORTS, DEV_PORT] : [...ALLOWED_PORTS];

export const isPublicIp = (address: string): boolean => {
  const clean = address.split('%')[0];
  const family = net.isIP(clean);
  if (family === 0) return false;
  if (family === 6) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(clean);
    if (mapped) return isPublicIp(mapped[1]);
    return !NON_PUBLIC.check(clean, 'ipv6');
  }
  return !NON_PUBLIC.check(clean, 'ipv4');
};

/** Normaliza y valida lo que escribió el admin. Devuelve el host en minúsculas. */
export const validateSmtpHost = (raw: string): string => {
  const host = raw.trim().toLowerCase().replace(/\.$/, '');
  if (net.isIP(host)) {
    if (!internalHostsAllowed() && !isPublicIp(host)) {
      throw new SmtpHostRejected('El servidor SMTP debe ser una dirección pública');
    }
    return host;
  }
  if (internalHostsAllowed() && /^[a-z0-9][a-z0-9.-]{0,252}$/.test(host)) return host;
  if (!HOSTNAME_RE.test(host) || INTERNAL_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new SmtpHostRejected('Escribe el servidor SMTP de tu proveedor, por ejemplo smtp.hostinger.com');
  }
  return host;
};

/**
 * Resuelve el host una sola vez y exige que todas sus IP sean públicas. Hay
 * que conectarse a la IP devuelta: si se resolviera otra vez al conectar, un
 * DNS que cambia de respuesta llevaría la conexión a la red interna.
 */
export const resolvePublicAddress = async (host: string): Promise<string> => {
  if (net.isIP(host)) {
    if (!internalHostsAllowed() && !isPublicIp(host)) throw new SmtpHostRejected('El servidor SMTP debe ser una dirección pública');
    return host;
  }
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    throw new SmtpHostRejected('No se encontró el servidor SMTP. Revisa el nombre.');
  }
  if (!addresses.length) throw new SmtpHostRejected('No se encontró el servidor SMTP. Revisa el nombre.');
  if (!internalHostsAllowed() && addresses.some((a) => !isPublicIp(a.address))) {
    throw new SmtpHostRejected('El servidor SMTP debe ser una dirección pública');
  }
  return addresses[0].address;
};
