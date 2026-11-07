export const ROLES = {
  ADMIN: 'admin',
  MEDICAL_STAFF: 'medical_staff',
  ASSISTANT: 'assistant',
  SALES: 'sales',
  ACCOUNTANT: 'accountant',
} as const;

export type RoleName = typeof ROLES[keyof typeof ROLES];
