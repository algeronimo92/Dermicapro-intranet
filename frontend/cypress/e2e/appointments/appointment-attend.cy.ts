const createPatientAndAppointment = (token: string, uniqueSuffix: string) => {
  return cy
    .request({
      method: "POST",
      url: "/api/patients",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        firstName: "Atender",
        lastName: "TestCita",
        dni: `66${uniqueSuffix}`,
        dateOfBirth: "1995-07-25",
        sex: "M",
        phone: "965432109",
      },
    })
    .then(({ body: patient }) =>
      cy
        .request({
          method: "GET",
          url: "/api/services",
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(({ body: services }) =>
          cy.request({
            method: "POST",
            url: "/api/appointments",
            headers: { Authorization: `Bearer ${token}` },
            body: {
              patientId: patient.id,
              scheduledDate: new Date(
                Date.now() + 24 * 60 * 60 * 1000,
              ).toISOString(),
              services: [
                {
                  serviceId: services[0].id,
                  sessionNumber: 1,
                  tempPackageId: "pkg-test-1",
                },
              ],
            },
          }),
        ),
    );
};

describe("Atender cita", () => {
  it("el asistente puede iniciar la atención de una cita reservada", () => {
    cy.getAccessToken(
      Cypress.env("adminEmail"),
      Cypress.env("adminPassword"),
    ).then((token) => {
      const uniqueSuffix = `${Date.now()}`.slice(-6);
      createPatientAndAppointment(token, uniqueSuffix).then(
        ({ body: appointment }) => {
          cy.loginAsAssistantAndVisit(`/appointments/${appointment.id}`);
          cy.get(".status-badge-large").should("contain.text", "Reservada");
          cy.contains("button", "Iniciar Atención").click();
          cy.get(".status-badge-large", { timeout: 8000 }).should(
            "contain.text",
            "En Atención",
          );
        },
      );
    });
  });

  it("el asistente puede finalizar la atención de una cita en progreso", () => {
    cy.getAccessToken(
      Cypress.env("adminEmail"),
      Cypress.env("adminPassword"),
    ).then((token) => {
      const uniqueSuffix = `${Date.now() + 1}`.slice(-6);
      createPatientAndAppointment(token, uniqueSuffix).then(
        ({ body: appointment }) => {
          cy.request({
            method: "PUT",
            url: `/api/appointments/${appointment.id}`,
            headers: { Authorization: `Bearer ${token}` },
            body: { status: "in_progress" },
          }).then(() => {
            cy.loginAsAssistantAndVisit(`/appointments/${appointment.id}`);
            cy.get(".status-badge-large", { timeout: 6000 }).should(
              "contain.text",
              "En Atención",
            );
            cy.contains("button", "Finalizar Atención").click();
            cy.get(".status-badge-large", { timeout: 8000 }).should(
              "contain.text",
              "En Atención",
            );
          });
        },
      );
    });
  });
});
