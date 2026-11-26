/**
 * Reglas de una contraseña nueva (primer inicio, Mi perfil y recuperación por
 * correo). Devuelve el primer requisito que no cumple, o null si es válida.
 */
export const passwordPolicyError = (password: string): string | null => {
  if (password.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres';
  if (password.length > 72) return 'La nueva contraseña no puede tener más de 72 caracteres';
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) return 'La contraseña debe tener letras mayúsculas y minúsculas';
  if (!/\d/.test(password)) return 'La contraseña debe contener al menos un número';
  if (!/[^A-Za-z0-9]/.test(password)) return 'La contraseña debe contener al menos un carácter especial';
  return null;
};
