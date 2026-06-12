describe('Login rápido con PIN', () => {
  const adminEmail = Cypress.env('adminEmail') as string;
  const adminPassword = Cypress.env('adminPassword') as string;
  const TEST_PIN = '7531';
  const WRONG_PIN = '0000';

  let adminUser: {
    id: string;
    firstName: string;
    lastName: string;
    role: { name: string; displayName: string } | null;
  };

  const rememberedUser = (hasPin: boolean) => ({
    id: adminUser.id,
    email: adminEmail,
    firstName: adminUser.firstName,
    lastName: adminUser.lastName,
    roleName: adminUser.role?.displayName ?? '',
    roleKey: adminUser.role?.name ?? '',
    photoUrl: null,
    hasPin,
  });

  const visitWithRememberedUser = (hasPin: boolean) => {
    cy.clearLocalStorage();
    cy.visit('/login', {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          'dermicapro_remembered_users',
          JSON.stringify([rememberedUser(hasPin)])
        );
      },
    });
  };

  const setAdminPin = (pin: string) => {
    cy.request('POST', '/api/auth/login', { email: adminEmail, password: adminPassword }).then(({ body }) => {
      cy.request({
        method: 'PUT',
        url: '/api/auth/me/pin',
        headers: { Authorization: `Bearer ${body.accessToken}` },
        body: { currentPassword: adminPassword, pin },
      });
    });
  };

  const removeAdminPin = () => {
    cy.request('POST', '/api/auth/login', { email: adminEmail, password: adminPassword }).then(({ body }) => {
      cy.request({
        method: 'DELETE',
        url: '/api/auth/me/pin',
        headers: { Authorization: `Bearer ${body.accessToken}` },
        failOnStatusCode: false,
      });
    });
  };

  before(() => {
    cy.request('POST', '/api/auth/login', { email: adminEmail, password: adminPassword }).then(({ body }) => {
      adminUser = body.user;
    });
  });

  afterEach(() => {
    // El PIN se configura sobre la cuenta admin compartida con otros specs,
    // así que se elimina (y se resetea el bloqueo) al final de cada test.
    removeAdminPin();
  });

  it('usuario recordado sin PIN configurado muestra el formulario de contraseña', () => {
    visitWithRememberedUser(false);
    cy.get('.remembered-card').first().click();
    cy.get('.pin-input-box').should('not.exist');
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
    cy.contains('Dashboard').should('be.visible');
  });

  it('usuario recordado con PIN configurado pide el PIN y permite iniciar sesión', () => {
    setAdminPin(TEST_PIN);
    visitWithRememberedUser(true);
    cy.get('.remembered-card').first().click();

    cy.get('.pin-input-box').should('have.length', 4);
    cy.get('input.login-form-input').should('not.exist');

    TEST_PIN.split('').forEach((digit, i) => {
      cy.get('.pin-input-box').eq(i).type(digit);
    });

    cy.url().should('not.include', '/login');
    cy.contains('Dashboard').should('be.visible');
  });

  it('PIN incorrecto muestra error y limpia el ingreso', () => {
    setAdminPin(TEST_PIN);
    visitWithRememberedUser(true);
    cy.get('.remembered-card').first().click();

    WRONG_PIN.split('').forEach((digit, i) => {
      cy.get('.pin-input-box').eq(i).type(digit);
    });

    cy.get('[role="alert"]').should('be.visible').and('contain', 'PIN incorrecto');
    cy.get('.pin-input-box').eq(0).should('have.value', '');
  });

  it('bloquea el PIN tras 5 intentos fallidos y ofrece volver a la contraseña', () => {
    setAdminPin(TEST_PIN);
    visitWithRememberedUser(true);
    cy.get('.remembered-card').first().click();

    for (let attempt = 1; attempt <= 4; attempt++) {
      WRONG_PIN.split('').forEach((digit, i) => {
        cy.get('.pin-input-box').eq(i).type(digit);
      });
      cy.get('[role="alert"]').should('contain', 'PIN incorrecto');
      cy.get('.pin-input-box').eq(0).should('have.value', '');
    }

    WRONG_PIN.split('').forEach((digit, i) => {
      cy.get('.pin-input-box').eq(i).type(digit);
    });

    cy.get('[role="alert"]').should('contain', 'bloqueado');
    cy.get('input[type="password"]').should('be.visible');
  });

  it('permite alternar entre PIN y contraseña desde el inicio rápido', () => {
    setAdminPin(TEST_PIN);
    visitWithRememberedUser(true);
    cy.get('.remembered-card').first().click();

    cy.get('.pin-input-box').should('have.length', 4);
    cy.contains('¿Olvidaste tu PIN?').click();
    cy.get('input[type="password"]').should('be.visible');

    cy.contains('Usar PIN').click();
    cy.get('.pin-input-box').should('have.length', 4);
  });
});
