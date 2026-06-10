export {};

declare global {
  namespace Cypress {
    interface Cypress {
      env(
        key:
          | "adminEmail"
          | "adminPassword"
          | "salesEmail"
          | "salesPassword"
          | "assistantEmail"
          | "assistantPassword"
          | "medicalEmail"
          | "medicalPassword",
      ): string;
    }
  }
}
