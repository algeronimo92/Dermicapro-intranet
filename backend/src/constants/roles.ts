export const ROLES = {
  ADMIN: 'admin',
  MEDICAL_STAFF: 'medical_staff',
  ASSISTANT: 'assistant',
  SALES: 'sales',
} as const;

export type RoleName = typeof ROLES[keyof typeof ROLES];
