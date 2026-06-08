describe('Creación de paciente', () => {
  beforeEach(() => {
    cy.loginAsAdminAndVisit('/patients');
  });

  it('abre el formulario al hacer clic en Nuevo Paciente', () => {
    cy.contains('button', 'Nuevo Paciente').click();
    cy.get('input[name="firstName"]').should('be.visible');
    cy.get('input[name="lastName"]').should('be.visible');
    cy.get('input[name="dni"]').should('be.visible');
  });

  it('muestra errores de validación si se envía sin datos', () => {
    cy.contains('button', 'Nuevo Paciente').click();
    cy.contains('button', 'Crear Paciente').click();
    cy.contains(/requerido|obligatorio|nombre|dni/i).should('be.visible');
  });

  it('crea un paciente correctamente con el formulario completo', () => {
    const uniqueSuffix = Date.now().toString().slice(-6);
    const dni = `99${uniqueSuffix}`;

    cy.contains('button', 'Nuevo Paciente').click();

    cy.get('input[name="firstName"]').type('Paciente');
    cy.get('input[name="lastName"]').type('Prueba');
    cy.get('input[name="dni"]').type(dni);
    cy.get('input[name="phone"]').type('987654321');

    // Seleccionar fecha de nacimiento (DatePicker con react-day-picker v10)
    cy.get('.dp-trigger').first().click();
    cy.get('body').find('button.rdp-day_button:not([disabled])').first().click();

    // Seleccionar sexo
    cy.get('select[name="sex"]').select('F');

    cy.contains('button', 'Crear Paciente').click();

    // Verificar que el paciente aparece en la lista o que el modal se cierra
    cy.contains('Paciente Prueba', { timeout: 8000 }).should('be.visible');
  });
});
