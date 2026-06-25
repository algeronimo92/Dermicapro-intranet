export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformAdmin {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date;
}

export interface TenantMetrics {
  id: string;
  tenantId: string;
  totalPatients: number;
  totalAppointmentsMonth: number;
  activeUsers: number;
  lastAccess: Date | null;
  updatedAt: Date;
}

export interface TenantMigration {
  id: string;
  tenantId: string;
  migrationName: string;
  appliedAt: Date;
  status: 'success' | 'failed';
  error: string | null;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  adminEmail?: string;
  adminPassword?: string;
  adminFirstName?: string;
  adminLastName?: string;
}

export interface UpdateTenantDto {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
}

export interface ProvisionResult {
  tenant: Tenant;
  migrationsApplied: number;
  adminCreated: boolean;
}
