// Contraseña estándar usada en tests cuando el usuario tiene mustChangePassword: true.
// Debe cumplir los requisitos: mayúscula, minúscula, número y carácter especial.
const CYPRESS_TEST_PASSWORD = 'TestPass@123';

declare global {
  namespace Cypress {
    interface Chainable {
      loginAndVisit(path: string, email: string, password: string): Chainable<void>;
      loginAsAdminAndVisit(path: string): Chainable<void>;
      loginAsSalesAndVisit(path: string): Chainable<void>;
      loginAsAssistantAndVisit(path: string): Chainable<void>;
      loginAsMedicalAndVisit(path: string): Chainable<void>;
      /**
       * Obtiene un accessToken válido gestionando el flujo mustChangePassword.
       * Úsalo en tests que necesitan hacer cy.request con Authorization header.
       */
      getAccessToken(email: string, password: string): Chainable<string>;
    }
  }
}

const visitWithTokens = (path: string, accessToken: string, refreshToken: string) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('accessToken', accessToken);
      win.localStorage.setItem('refreshToken', refreshToken);
    },
  });
};

Cypress.Commands.add('loginAndVisit', (path: string, email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { email, password },
    failOnStatusCode: false,
  }).then(({ body, status }) => {
    if (status === 200 && body.mustChangePassword) {
      // Primer login: cambiar contraseña al estándar de tests y re-loguear
      cy.request({
        method: 'PUT',
        url: '/api/auth/me/password',
        headers: { Authorization: `Bearer ${body.accessToken}` },
        body: { currentPassword: password, newPassword: CYPRESS_TEST_PASSWORD },
      }).then(() => {
        cy.request('POST', '/api/auth/login', {
          email,
          password: CYPRESS_TEST_PASSWORD,
        }).then(({ body: newBody }) => {
          visitWithTokens(path, newBody.accessToken, newBody.refreshToken);
        });
      });
    } else if (status === 200) {
      // Login normal (sin mustChangePassword)
      visitWithTokens(path, body.accessToken, body.refreshToken);
    } else {
      // Login falló con la contraseña original — probablemente ya fue cambiada
      // en una ejecución anterior local. Intentar con CYPRESS_TEST_PASSWORD.
      cy.request('POST', '/api/auth/login', {
        email,
        password: CYPRESS_TEST_PASSWORD,
      }).then(({ body: newBody }) => {
        visitWithTokens(path, newBody.accessToken, newBody.refreshToken);
      });
    }
  });
});

Cypress.Commands.add('getAccessToken', (email: string, password: string) => {
  return cy
    .request({
      method: 'POST',
      url: '/api/auth/login',
      body: { email, password },
      failOnStatusCode: false,
    })
    .then(({ body, status }) => {
      if (status === 200 && body.mustChangePassword) {
        return cy
          .request({
            method: 'PUT',
            url: '/api/auth/me/password',
            headers: { Authorization: `Bearer ${body.accessToken}` },
            body: { currentPassword: password, newPassword: CYPRESS_TEST_PASSWORD },
          })
          .then(() =>
            cy
              .request('POST', '/api/auth/login', { email, password: CYPRESS_TEST_PASSWORD })
              .then(({ body: nb }) => nb.accessToken)
          );
      }
      if (status === 200) return body.accessToken;
      return cy
        .request('POST', '/api/auth/login', { email, password: CYPRESS_TEST_PASSWORD })
        .then(({ body: nb }) => nb.accessToken);
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
