/**
 * Patient JWT Payload Interface
 * Used for decoding patient access/refresh tokens
 */
export interface PatientJwtPayload {
  id: string; // Patient UUID
  email: string | null;
  type: 'patient'; // Distinguir de tokens de staff
  tenantSlug?: string;
}

/**
 * Patient Auth Response Interface
 * Returned when patient successfully logs in
 */
export interface PatientAuthResponse {
  accessToken: string;
  refreshToken: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    dni: string;
    hasPortalAccess: boolean;
  };
}

/**
 * Create Patient Credentials DTO
 * Used by staff to create portal credentials for a patient
 */
export interface CreatePatientCredentialsDto {
  patientId: string; // UUID del paciente
  email: string; // Email para login
  temporaryPassword: string; // Contraseña temporal que staff asigna
}

/**
 * Patient Login DTO
 */
export interface PatientLoginDto {
  email: string;
  password: string;
}

/**
 * Patient Change Password DTO
 */
export interface PatientChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
