describe('Citas', () => {
  beforeEach(() => {
    cy.loginAsAdminAndVisit('/appointments');
  });

  it('carga la página de citas', () => {
    cy.contains('Citas').should('be.visible');
  });

  it('muestra el botón de nueva cita', () => {
    cy.contains('button', /Nueva cita|Nueva Cita|Agendar/).should('be.visible');
  });

  it('muestra el calendario por defecto', () => {
    cy.get('.appointments-page, [class*="calendar"], [class*="Calendar"]').should('exist');
  });

  it('puede cambiar a vista de lista', () => {
    cy.contains('button', 'Lista').click();
    cy.url().should('include', 'view=list');
  });

  it('puede cambiar a vista tablero (kanban)', () => {
    cy.contains('button', 'Tablero').click();
    cy.url().should('include', 'view=kanban');
  });
});
