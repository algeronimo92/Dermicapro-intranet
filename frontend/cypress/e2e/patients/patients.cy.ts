describe('Pacientes', () => {
  beforeEach(() => {
    cy.loginAsAdminAndVisit('/patients');
  });

  it('muestra el título de la página', () => {
    cy.contains('h1', 'Pacientes').should('be.visible');
  });

  it('muestra el contador de pacientes', () => {
    cy.contains(/\d+ paciente/).should('be.visible');
  });

  it('muestra el botón de nuevo paciente', () => {
    cy.contains('button', 'Nuevo Paciente').should('be.visible');
  });

  it('filtra pacientes al buscar por texto', () => {
    cy.get('input[placeholder="Nombre, DNI, teléfono…"]').type('Ana');
    cy.wait(400); // debounce de 300 ms
    cy.contains(/\d+ paciente/).should('be.visible');
  });

  it('limpia la búsqueda al presionar ×', () => {
    cy.get('input[placeholder="Nombre, DNI, teléfono…"]').type('xyz');
    cy.wait(400);
    cy.get('input[placeholder="Nombre, DNI, teléfono…"]')
      .parent()
      .find('button')
      .click();
    cy.get('input[placeholder="Nombre, DNI, teléfono…"]').should('have.value', '');
  });

  it('abre el modal de nuevo paciente', () => {
    cy.contains('button', 'Nuevo Paciente').click();
    cy.get('input[name="firstName"], input[placeholder*="ombre"]').should('be.visible');
  });
});
