describe('Control de acceso por rol (RBAC)', () => {
  it('asistente no ve Empleados, Comisiones ni Analíticas en el menú', () => {
    cy.loginAsAssistantAndVisit('/');
    cy.contains('a', 'Empleados').should('not.exist');
    cy.contains('a', 'Comisiones').should('not.exist');
    cy.contains('a', 'Analíticas').should('not.exist');
  });

  it('asistente sí ve Dashboard, Pacientes y Citas', () => {
    cy.loginAsAssistantAndVisit('/');
    cy.contains('a', 'Dashboard').should('be.visible');
    cy.contains('a', 'Pacientes').should('be.visible');
    cy.contains('a', 'Citas').should('be.visible');
  });

  it('médico no ve Empleados ni Comisiones en el menú', () => {
    cy.loginAsMedicalAndVisit('/');
    cy.contains('a', 'Empleados').should('not.exist');
    cy.contains('a', 'Comisiones').should('not.exist');
    cy.contains('a', 'Analíticas').should('not.exist');
  });

  it('ventas ve Servicios pero no Empleados ni Comisiones', () => {
    cy.loginAsSalesAndVisit('/');
    cy.contains('a', 'Servicios').should('be.visible');
    cy.contains('a', 'Empleados').should('not.exist');
    cy.contains('a', 'Comisiones').should('not.exist');
    cy.contains('a', 'Analíticas').should('not.exist');
  });

  it('admin ve todas las secciones del menú', () => {
    cy.loginAsAdminAndVisit('/');
    cy.contains('a', 'Empleados').should('be.visible');
    cy.contains('a', 'Comisiones').should('be.visible');
    cy.contains('a', 'Analíticas').should('be.visible');
    cy.contains('a', 'Servicios').should('be.visible');
  });

  it('la API de usuarios rechaza tokens inválidos', () => {
    cy.request({
      method: 'GET',
      url: '/api/users',
      headers: { Authorization: 'Bearer token-invalido' },
      failOnStatusCode: false,
    }).its('status').should('eq', 401);
  });
});
