describe("Creación de cita", () => {
  let patientId: string;

  before(() => {
    // Crea un paciente nuevo sin citas previas, para evitar el bloqueo
    // "Este paciente ya tiene una cita reservada" al crear la cita de prueba
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
          firstName: "Crear",
          lastName: "TestCita",
          dni: `77${uniqueSuffix}`,
          dateOfBirth: "1998-09-10",
          sex: "M",
          phone: "934567890",
          email: `creartestcita${uniqueSuffix}@test.com`,
        },
      }).then(({ body: patient }) => {
        patientId = patient.id;
      });
    });
  });

  it("muestra todos los campos del formulario de nueva cita", () => {
    // patientId en query param evita interactuar con el dropdown portal
    cy.loginAsAdminAndVisit(`/appointments/new?patientId=${patientId}`);

    // Selector de paciente
    cy.contains("label", "Paciente").should("be.visible");

    // Selector de servicio visible porque el paciente ya está pre-seleccionado
    cy.get('input[placeholder="Buscar servicio o tratamiento..."]', {
      timeout: 8000,
    })
      .scrollIntoView()
      .should("be.visible");

    // Fecha y hora
    cy.contains("label", "Fecha y Hora").should("be.visible");
    cy.get(".datetime-input-button").should("be.visible");
    cy.get(".datetime-time-select").should("be.visible");

    // Duración
    cy.get('select[name="durationMinutes"]')
      .scrollIntoView()
      .should("be.visible");

    // Monto de reserva y notas
    cy.get('input[name="reservationAmount"]')
      .scrollIntoView()
      .should("be.visible");
    cy.get('textarea[name="notes"]').should("be.visible");

    // Botones de acción
    cy.contains("button", "Volver").scrollIntoView().should("be.visible");
    cy.contains("button", "Cancelar").scrollIntoView().should("be.visible");
    cy.contains("button", "Crear Cita").scrollIntoView().should("be.visible");
  });

  it("crea una cita completa y redirige al detalle del paciente", () => {
    cy.loginAsAdminAndVisit(`/appointments/new?patientId=${patientId}`);

    // Seleccionar servicio (también es un portal con position:fixed → force:true)
    cy.get('input[placeholder="Buscar servicio o tratamiento..."]', {
      timeout: 8000,
    })
      .scrollIntoView()
      .click();
    cy.get(".service-dropdown", { timeout: 8000 }).should("exist");
    cy.get(".service-dropdown-item:not(.service-dropdown-empty)", {
      timeout: 8000,
    })
      .first()
      .click({ force: true });

    // Agregar el servicio seleccionado a la lista de sesiones de la cita
    cy.contains("button", "Agregar a la Lista").click();

    // Seleccionar fecha
    cy.get(".datetime-input-button").first().click();
    cy.get(
      ".datetime-calendar-day:not(.datetime-calendar-day-disabled):not(.datetime-calendar-day-empty)",
    )
      .last()
      .click();

    // Seleccionar hora
    cy.get(".datetime-time-select").select("10:00");

    cy.contains("button", "Crear Cita").scrollIntoView().click();

    // Al crear desde ?patientId=, redirige al detalle del paciente (returnTo)
    cy.url({ timeout: 10000 }).should("include", `/patients/${patientId}`);
  });
});
