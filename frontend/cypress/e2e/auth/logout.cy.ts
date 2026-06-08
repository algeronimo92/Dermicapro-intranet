describe('Logout', () => {
  beforeEach(() => {
    cy.loginAsAdminAndVisit('/');
  });

  it('cierra sesión y redirige al login', () => {
    cy.get('.sidebar-logout-btn').click();
    cy.contains('button', 'Cerrar sesión').click();
    cy.url().should('include', '/login');
  });

  it('limpia los tokens de localStorage al cerrar sesión', () => {
    cy.get('.sidebar-logout-btn').click();
    cy.contains('button', 'Cerrar sesión').click();
    cy.url().should('include', '/login');
    cy.window().its('localStorage').invoke('getItem', 'accessToken').should('be.null');
    cy.window().its('localStorage').invoke('getItem', 'refreshToken').should('be.null');
  });

  it('el modal de logout se puede cancelar', () => {
    cy.get('.sidebar-logout-btn').click();
    cy.contains('¿Cerrar sesión?').should('be.visible');
    cy.contains('button', 'Cancelar').click();
    cy.url().should('not.include', '/login');
  });
});
