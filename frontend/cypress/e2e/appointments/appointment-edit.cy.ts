describe("Editar cita", () => {
  let appointmentId: string;

  before(() => {
    cy.getAccessToken(
      Cypress.env("adminEmail"),
      Cypress.env("adminPassword"),
    ).then((token) => {
      const uniqueSuffix = Date.now().toString().slice(-6);

      cy.request({
        method: "POST",
        url: "/api/patients",
        headers: { Authorization: `Bearer ${token}` },
        body: {
          firstName: "EditCita",
          lastName: "TestPaciente",
          dni: `33${uniqueSuffix}`,
          dateOfBirth: "1985-07-15",
          sex: "M",
          phone: "943210987",
        },
      }).then(({ body: patient }) => {
        cy.request({
          method: "GET",
          url: "/api/services",
          headers: { Authorization: `Bearer ${token}` },
        }).then(({ body: services }) => {
          cy.request({
            method: "POST",
            url: "/api/appointments",
            headers: { Authorization: `Bearer ${token}` },
            body: {
              patientId: patient.id,
              scheduledDate: new Date(
                Date.now() + 72 * 60 * 60 * 1000,
              ).toISOString(),
              services: [
                {
                  serviceId: services[0].id,
                  sessionNumber: 1,
                  tempPackageId: "pkg-edit-1",
                },
              ],
              durationMinutes: 60,
            },
          }).then(({ body: appointment }) => {
            appointmentId = appointment.id;
          });
        });
      });
    });
  });

  it("muestra todos los campos del formulario de edición", () => {
    cy.loginAsAdminAndVisit(`/appointments/${appointmentId}/edit`);

    // Título en modo edición
    cy.contains("Editar Cita").should("be.visible");

    // Selector de paciente (presente aunque pueda estar deshabilitado)
    cy.get('input[placeholder="Buscar por nombre, DNI o teléfono..."]').should(
      "exist",
    );

    // Fecha y hora
    cy.get("button.datetime-input-button").should("exist");
    cy.get("select.datetime-time-select.datetime-input-selected")
      .scrollIntoView()
      .should("be.visible");
    cy.get(".datetime-time-select").should("be.visible");

    // Duración
    cy.get('select[name="durationMinutes"]').should("be.visible");

    // Botones de acción
    cy.contains("button", "Volver").scrollIntoView().should("be.visible");
    cy.contains("button", "Cancelar").scrollIntoView().should("be.visible");
    cy.contains("button", "Guardar Cambios")
      .scrollIntoView()
      .should("be.visible");
  });

  it('muestra "Guardar Cambios" como texto del botón de submit en modo edición', () => {
    cy.loginAsAdminAndVisit(`/appointments/${appointmentId}/edit`);
    cy.contains("button", "Guardar Cambios")
      .scrollIntoView()
      .should("be.visible");
    cy.contains("button", "Crear Cita").should("not.exist");
  });

  it("edita la duración de la cita y guarda", () => {
    cy.loginAsAdminAndVisit(`/appointments/${appointmentId}/edit`);

    cy.get('select[name="durationMinutes"]').select("90");

    cy.contains("button", "Guardar Cambios").scrollIntoView().click();

    // Redirige al detalle de la cita después de guardar
    cy.url({ timeout: 10000 }).should(
      "include",
      `/appointments/${appointmentId}`,
    );
    cy.url().should("not.include", "/edit");
  });

  it("el botón Cancelar regresa al detalle sin guardar", () => {
    cy.loginAsAdminAndVisit(`/appointments/${appointmentId}/edit`);

    cy.get('select[name="durationMinutes"]').select("30");
    cy.contains("button", "Cancelar").scrollIntoView().click();

    cy.url({ timeout: 8000 }).should(
      "include",
      `/appointments/${appointmentId}`,
    );
    cy.url().should("not.include", "/edit");
  });
});
