describe("Editar paciente", () => {
  let patientId: string;
  const uniqueSuffix = Date.now().toString().slice(-6);

  before(() => {
    cy.getAccessToken(
      Cypress.env("adminEmail"),
      Cypress.env("adminPassword"),
    ).then((token) => {
      cy.request({
        method: "POST",
        url: "/api/patients",
        headers: { Authorization: `Bearer ${token}` },
        body: {
          firstName: "EditPaciente",
          lastName: "TestEditar",
          dni: `44${uniqueSuffix}`,
          dateOfBirth: "1993-05-22",
          sex: "F",
          phone: "965432109",
          email: `editpaciente${uniqueSuffix}@test.com`,
        },
      }).then(({ body: patient }) => {
        patientId = patient.id;
      });
    });
  });

  beforeEach(() => {
    cy.loginAsAdminAndVisit(`/patients/${patientId}`);
    cy.contains("EditPaciente").should("be.visible");
    cy.contains("button", "Editar").click();
    // Esperar que el firstName tenga el valor real del API (no solo que sea visible)
    cy.get('input[name="firstName"]', { timeout: 10000 }).should(
      "have.value",
      "EditPaciente",
    );
  });

  it("muestra todos los campos del formulario de edición", () => {
    cy.get('input[name="firstName"]').should("be.visible");
    cy.get('input[name="lastName"]').should("be.visible");
    cy.get('input[name="dni"]').should("be.visible");
    cy.get('input[name="phone"]').scrollIntoView().should("be.visible");

    // Fecha de nacimiento (DatePicker)
    cy.contains("label", "Fecha de Nacimiento").should("be.visible");
    cy.get(".dp-trigger").should("be.visible");

    // Sexo
    cy.get('select[name="sex"]').should("be.visible");

    // Campos opcionales
    cy.get('input[name="email"]').should("be.visible");
    cy.get('input[name="address"]').should("be.visible");

    // Botones de acción
    cy.contains("button", "Cancelar").scrollIntoView().should("be.visible");
    cy.contains("button", "Guardar Cambios")
      .scrollIntoView()
      .should("be.visible");
  });

  it("edita el DNI", () => {
    cy.get('input[name="dni"]').should("not.be.disabled");
    cy.get('input[name="dni"]').should("have.value", `44${uniqueSuffix}`);
  });

  it("edita el teléfono del paciente y guarda", () => {
    cy.intercept("PUT", "/api/patients/*").as("updatePatient");

    cy.get('input[name="phone"]').clear().type("911222333");

    // Verificar que el input tiene el nuevo valor antes de guardar
    cy.get('input[name="phone"]').should("have.value", "911222333");

    // Esperar que el botón esté habilitado (no loading) antes de hacer click
    cy.contains("button", "Guardar Cambios")
      .should("not.be.disabled")
      .scrollIntoView()
      .click();

    // Esperar la respuesta del API como mecanismo de sincronización
    cy.wait("@updatePatient", { timeout: 10000 })
      .its("response.statusCode")
      .should("eq", 200);

    // Modal retorna null al cerrarse
    cy.contains("Editar Paciente").should("not.exist");

    // El teléfono actualizado aparece en el detalle del paciente
    cy.get(".pd-info-value", { timeout: 8000 }).should(
      "contain.text",
      "911222333",
    );
  });

  it("cancela la edición y el modal se cierra sin guardar", () => {
    cy.get('input[name="firstName"]').clear().type("NombreModificado");

    cy.contains("button", "Cancelar").scrollIntoView().click();

    // Modal retorna null al cerrarse → elemento desaparece del DOM
    cy.contains("Editar Paciente").should("not.exist");
    cy.contains("NombreModificado").should("not.exist");
    cy.contains("EditPaciente").should("be.visible");
  });

  it('muestra el título "Editar Paciente" en modo edición (no "Crear")', () => {
    cy.contains("Editar Paciente").should("be.visible");
    cy.contains("Crear Nuevo Paciente").should("not.exist");
    cy.contains("button", "Guardar Cambios")
      .scrollIntoView()
      .should("be.visible");
    cy.contains("button", "Crear Paciente").should("not.exist");
  });
});
