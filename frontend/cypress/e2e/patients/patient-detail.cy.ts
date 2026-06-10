describe("Detalle de paciente", () => {
  let patientId: string;

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
          firstName: "María",
          lastName: "DetallePrueba",
          dni: `88${uniqueSuffix}`,
          dateOfBirth: "1990-03-20",
          sex: "F",
          phone: "912345678",
        },
      }).then(({ body: patient }) => {
        patientId = patient.id;
      });
    });
  });

  it("muestra la información del paciente en la página de detalle", () => {
    cy.loginAsAdminAndVisit(`/patients/${patientId}`);
    cy.contains("María").should("be.visible");
    cy.contains("DetallePrueba").should("be.visible");
    cy.contains("36 años").should("be.visible");
    cy.contains("Femenino").should("be.visible");
    cy.contains("912345678").should("be.visible");
  });

  it("navega desde la lista de pacientes al detalle al hacer clic", () => {
    cy.loginAsAdminAndVisit("/patients");
    cy.get('input[placeholder="Nombre, DNI, teléfono…"]').type("DetallePrueba");
    cy.wait(400);
    cy.contains("DetallePrueba").click();
    cy.url().should("include", `/patients/${patientId}`);
  });

  it("muestra el botón de volver a la lista", () => {
    cy.loginAsAdminAndVisit(`/patients/${patientId}`);
    cy.contains(/volver|pacientes/i).should("be.visible");
  });
});
