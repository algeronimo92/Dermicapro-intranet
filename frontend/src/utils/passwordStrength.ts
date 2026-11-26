export type Strength = 'weak' | 'fair' | 'good' | 'strong';

export function getPasswordStrength(password: string): { level: Strength; score: number; label: string } {
  if (!password) return { level: 'weak', score: 0, label: '' };
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 'weak',   score: 1, label: 'Débil' };
  if (score === 2) return { level: 'fair',   score: 2, label: 'Regular' };
  if (score === 3) return { level: 'good',   score: 3, label: 'Buena' };
  return              { level: 'strong', score: 4, label: 'Fuerte' };
}

/** Las mismas reglas que valida el backend (utils/passwordPolicy.ts). */
export function passwordRequirements(password: string): { label: string; met: boolean }[] {
  return [
    { label: 'Al menos 8 caracteres',         met: password.length >= 8 },
    { label: 'Letras mayúsculas y minúsculas', met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'Al menos un número',             met: /\d/.test(password) },
    { label: 'Al menos un carácter especial',  met: /[^A-Za-z0-9]/.test(password) },
  ];
}
