describe('Cancelar cita', () => {
  let appointmentId: string;

  beforeEach(() => {
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
          firstName: 'Cancelar',
          lastName: 'TestCita',
          dni: `55${uniqueSuffix}`,
          dateOfBirth: '1992-04-18',
          sex: 'F',
          phone: '954321098',
        },
      }).then(({ body: patient }) => {
        cy.request({
          method: 'GET',
          url: '/api/services',
          headers: { Authorization: `Bearer ${token}` },
        }).then(({ body: services }) => {
          const service = services[0];
          cy.request({
            method: 'POST',
            url: '/api/appointments',
            headers: { Authorization: `Bearer ${token}` },
            body: {
              patientId: patient.id,
              scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
              services: [{ serviceId: service.id, sessionNumber: 1 }],
            },
          }).then(({ body: appointment }) => {
            appointmentId = appointment.id;
          });
        });
      });
    });
  });

  it('el admin puede cancelar una cita reservada', () => {
    cy.loginAsAdminAndVisit(`/appointments/${appointmentId}`);
    cy.get('.status-badge-large').should('contain.text', 'Reservada');

    // El botón de cancelar es una acción secundaria destructiva
    cy.contains('button', 'Cancelar Cita').click();

    // Aparece el modal de confirmación
    cy.contains('Confirmar cambio de estado').should('be.visible');
    cy.get('.sts-confirm__ok').click();

    cy.get('.status-badge-large', { timeout: 8000 }).should('contain.text', 'Cancelada');
  });

  it('el modal de cancelación se puede rechazar', () => {
    cy.loginAsAdminAndVisit(`/appointments/${appointmentId}`);
    cy.contains('button', 'Cancelar Cita').click();
    cy.contains('Confirmar cambio de estado').should('be.visible');
    cy.get('.sts-confirm__cancel').click();
    cy.get('.status-badge-large').should('contain.text', 'Reservada');
  });
});
