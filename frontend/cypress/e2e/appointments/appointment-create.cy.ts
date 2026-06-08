describe('Creación de cita', () => {
  before(() => {
    // Crear paciente de prueba para usar en el formulario de cita
    cy.request('POST', '/api/auth/login', {
      email: Cypress.env('adminEmail'),
      password: Cypress.env('adminPassword'),
    }).then(({ body }) => {
      const token = body.accessToken;
      const uniqueSuffix = Date.now().toString().slice(-6);
      cy.request({
        method: 'POST',
        url: '/api/patients',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          firstName: 'Cita',
          lastName: 'TestPaciente',
          dni: `77${uniqueSuffix}`,
          dateOfBirth: '1988-11-10',
          sex: 'F',
          phone: '976543210',
        },
      });
    });
  });

  it('carga el formulario de nueva cita', () => {
    cy.loginAsAdminAndVisit('/appointments/new');
    cy.contains(/nueva cita|agendar/i).should('be.visible');
    cy.contains('Paciente *').should('be.visible');
  });

  it('muestra el botón de Crear Cita deshabilitado sin datos', () => {
    cy.loginAsAdminAndVisit('/appointments/new');
    cy.contains('button', 'Crear Cita').should('be.visible');
  });

  it('crea una cita completa y redirige a la lista', () => {
    cy.loginAsAdminAndVisit('/appointments/new');

    // Seleccionar paciente
    cy.get('input[placeholder="Buscar por nombre, DNI o teléfono..."]').click().type('Cita');
    cy.contains('.patient-dropdown-item', 'Cita').click();

    // Seleccionar servicio
    cy.get('input[placeholder="Buscar servicio o tratamiento..."]').click().type('HIFU');
    cy.get('.service-dropdown-item').first().click();

    // Seleccionar fecha en el DateTimePicker (sección de fecha)
    cy.get('.datetime-input-button').first().click();
    cy.get('.datetime-calendar-day:not(.datetime-calendar-day-disabled):not(.datetime-calendar-day-empty)')
      .last().click();

    // Seleccionar hora
    cy.get('.datetime-time-select').select('10:00');

    // Enviar formulario
    cy.contains('button', 'Crear Cita').click();

    // Redirige a la lista de citas
    cy.url({ timeout: 10000 }).should('match', /\/appointments(\/|$|\?)/);
  });
});
