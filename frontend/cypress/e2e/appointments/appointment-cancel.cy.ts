describe('Cancelar cita', () => {
  let appointmentId: string;

  beforeEach(() => {
    cy.getAccessToken(Cypress.env('adminEmail'), Cypress.env('adminPassword')).then((token) => {
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
          // La sesión se identifica por el paquete, no por el servicio: el
          // backend deriva serviceId, totalSessions y precio del ServicePackage.
          const servicePackage = services.find((s: any) => s.packages?.length)?.packages[0];
          expect(servicePackage, 'el seed debe crear al menos un paquete').to.exist;

          cy.request({
            method: 'POST',
            url: '/api/appointments',
            headers: { Authorization: `Bearer ${token}` },
            body: {
              patientId: patient.id,
              scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
              services: [{ servicePackageId: servicePackage.id, sessionNumber: 1, tempPackageId: 'pkg-test-1' }],
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

    cy.contains('button', 'Cancelar Cita').click();
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
