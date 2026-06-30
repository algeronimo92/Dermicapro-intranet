import axios, { AxiosError } from 'axios';
import platformApi from './platformApi';

export const PLATFORM_ADMIN_TOKEN_KEY = 'platform_admin_token';
export const PLATFORM_ADMIN_USER_KEY = 'platform_admin_user';

export interface PlatformAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMetrics {
  id: string;
  tenantId: string;
  totalPatients: number;
  totalAppointmentsMonth: number;
  activeUsers: number;
  lastAccess: string | null;
  updatedAt: string;
}

export interface TenantMigration {
  id: string;
  tenantId: string;
  migrationName: string;
  appliedAt: string;
  status: 'success' | 'failed';
  error: string | null;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  contactEmail?: string;
  contactPhone?: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName?: string;
  adminLastName?: string;
}

export interface ProvisionTenantResult {
  tenant: Tenant;
  migrationsApplied: number;
  adminCreated: boolean;
}

export interface FailedMigrationsSummary {
  totalFailed: number;
  tenants: Array<{ slug: string; name: string; failedCount: number }>;
}

export interface PlatformAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePlatformAdminDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface PlatformSettings {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFrom: string | null;
  platformDomain: string | null;
  maxTenants: number | null;
}

interface DataEnvelope<T> {
  data: T;
  total?: number;
}

const unwrap = <T>(payload: T | DataEnvelope<T>): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as DataEnvelope<T>).data;
  }
  return payload as T;
};

platformApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(PLATFORM_ADMIN_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

platformApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    const isLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) {
      localStorage.removeItem(PLATFORM_ADMIN_TOKEN_KEY);
      localStorage.removeItem(PLATFORM_ADMIN_USER_KEY);
      window.location.href = '/superadmin/login';
    }
    return Promise.reject(error);
  },
);

export function getPlatformApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? fallback;
  }
  return fallback;
}

export const platformAdminApi = {
  async login(email: string, password: string): Promise<{ token: string; admin: PlatformAdminUser }> {
    const response = await platformApi.post<{ token: string; admin: PlatformAdminUser }>('/auth/login', { email, password });
    return response.data;
  },

  async getMe(): Promise<Partial<PlatformAdminUser>> {
    const response = await platformApi.get<Partial<PlatformAdminUser>>('/auth/me');
    return response.data;
  },

  async listTenants(): Promise<Tenant[]> {
    const response = await platformApi.get<DataEnvelope<Tenant[]> | Tenant[]>('/tenants');
    return unwrap(response.data);
  },

  async getTenant(slug: string): Promise<Tenant> {
    const response = await platformApi.get<DataEnvelope<Tenant> | Tenant>(`/tenants/${slug}`);
    return unwrap(response.data);
  },

  async createTenant(dto: CreateTenantDto): Promise<ProvisionTenantResult> {
    const response = await platformApi.post<DataEnvelope<ProvisionTenantResult> | ProvisionTenantResult>('/tenants', dto);
    return unwrap(response.data);
  },

  async activateTenant(slug: string): Promise<Tenant> {
    const response = await platformApi.post<DataEnvelope<Tenant> | Tenant>(`/tenants/${slug}/activate`);
    return unwrap(response.data);
  },

  async deactivateTenant(slug: string): Promise<Tenant> {
    const response = await platformApi.post<DataEnvelope<Tenant> | Tenant>(`/tenants/${slug}/deactivate`);
    return unwrap(response.data);
  },

  async getTenantMigrations(slug: string): Promise<TenantMigration[]> {
    const response = await platformApi.get<DataEnvelope<TenantMigration[]> | TenantMigration[]>(`/tenants/${slug}/migrations`);
    return unwrap(response.data);
  },

  async getTenantMetrics(slug: string): Promise<TenantMetrics | null> {
    try {
      const response = await platformApi.get<DataEnvelope<TenantMetrics> | TenantMetrics>(`/tenants/${slug}/metrics`);
      return unwrap(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },

  async refreshTenantMetrics(slug: string): Promise<TenantMetrics | null> {
    const response = await platformApi.post<DataEnvelope<TenantMetrics | null> | TenantMetrics | null>(`/tenants/${slug}/metrics/refresh`);
    return unwrap(response.data);
  },

  async getFailedMigrationsSummary(): Promise<FailedMigrationsSummary> {
    const res = await platformApi.get<{ data: FailedMigrationsSummary }>('/migrations/failed-summary');
    return res.data.data;
  },

  async impersonateTenant(slug: string): Promise<{ token: string; userEmail: string; loginUrl: string }> {
    const res = await platformApi.post<{ data: { token: string; userEmail: string; loginUrl: string } }>(
      `/tenants/${slug}/impersonate`,
    );
    return res.data.data;
  },

  async listPlatformAdmins(): Promise<PlatformAdmin[]> {
    const res = await platformApi.get<{ data: PlatformAdmin[] }>('/admins');
    return res.data.data;
  },

  async createPlatformAdmin(dto: CreatePlatformAdminDto): Promise<PlatformAdmin> {
    const res = await platformApi.post<{ data: PlatformAdmin }>('/admins', dto);
    return res.data.data;
  },

  async deactivatePlatformAdmin(id: string): Promise<void> {
    await platformApi.delete(`/admins/${id}`);
  },

  async getSettings(): Promise<PlatformSettings> {
    const res = await platformApi.get<{ data: PlatformSettings }>('/settings');
    return res.data.data;
  },

  async updateSettings(dto: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const res = await platformApi.put<{ data: PlatformSettings }>('/settings', dto);
    return res.data.data;
  },
};
