declare global {
  namespace Cypress {
    interface Chainable {
      loginAndVisit(path: string, email: string, password: string): Chainable<void>;
      loginAsAdminAndVisit(path: string): Chainable<void>;
      loginAsSalesAndVisit(path: string): Chainable<void>;
      loginAsAssistantAndVisit(path: string): Chainable<void>;
      loginAsMedicalAndVisit(path: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAndVisit', (path: string, email: string, password: string) => {
  cy.request('POST', '/api/auth/login', { email, password }).then(({ body }) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('accessToken', body.accessToken);
        win.localStorage.setItem('refreshToken', body.refreshToken);
      },
    });
  });
});

Cypress.Commands.add('loginAsAdminAndVisit', (path: string) => {
  cy.loginAndVisit(path, Cypress.env('adminEmail'), Cypress.env('adminPassword'));
});

Cypress.Commands.add('loginAsSalesAndVisit', (path: string) => {
  cy.loginAndVisit(path, Cypress.env('salesEmail'), Cypress.env('salesPassword'));
});

Cypress.Commands.add('loginAsAssistantAndVisit', (path: string) => {
  cy.loginAndVisit(path, Cypress.env('assistantEmail'), Cypress.env('assistantPassword'));
});

Cypress.Commands.add('loginAsMedicalAndVisit', (path: string) => {
  cy.loginAndVisit(path, Cypress.env('medicalEmail'), Cypress.env('medicalPassword'));
});

export {};
