describe('Login', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/login');
  });

  it('muestra el formulario de login', () => {
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('contain', 'Ingresar al sistema');
  });

  it('muestra error con credenciales incorrectas', () => {
    cy.get('input[type="email"]').type('noexiste@dermicapro.com');
    cy.get('input[type="password"]').type('claveincorrecta');
    cy.get('button[type="submit"]').click();
    cy.get('[role="alert"]').should('be.visible');
  });

  it('login exitoso como admin redirige al dashboard', () => {
    cy.get('input[type="email"]').type(Cypress.env('adminEmail') as string);
    cy.get('input[type="password"]').type(Cypress.env('adminPassword') as string);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
    cy.contains('Dashboard').should('be.visible');
  });

  it('redirige a /login si no está autenticado', () => {
    cy.visit('/');
    cy.url().should('include', '/login');
  });
});
