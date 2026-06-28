import platformApi from './platformApi';

export interface RegisterTenantInput {
  name: string;
  slug: string;
  contactEmail?: string;
  contactPhone?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
}

export interface RegisterTenantResult {
  tenant: { id: string; name: string; slug: string };
  loginUrl: string;
  adminEmail: string;
  tempPassword: string;
  migrationsApplied: number;
}

export const onboardingService = {
  async registerTenant(input: RegisterTenantInput): Promise<RegisterTenantResult> {
    const response = await platformApi.post<{ data: RegisterTenantResult }>(
      '/onboarding/register',
      input,
    );
    return response.data.data;
  },
};
