declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Hace login vía API real y visita la ruta con los tokens en localStorage.
       * cy.request va a localhost:5173/api (Vite proxy → backend:5000).
       */
      loginAndVisit(path: string, email: string, password: string): Chainable<void>;
      loginAsAdminAndVisit(path: string): Chainable<void>;
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

export {};
