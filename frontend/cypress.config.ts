import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 8000,
    requestTimeout: 10000,
    env: {
      adminEmail: 'admin@dermicapro.com',
      adminPassword: 'admin123',
      salesEmail: 'ggeronimo@dermicapro.com',
      salesPassword: '1234567890',
      assistantEmail: 'emurga@dermicapro.com',
      assistantPassword: '1234567890',
      medicalEmail: 'daguilar@dermicapro.com',
      medicalPassword: '1234567890',
    },
  },
});
