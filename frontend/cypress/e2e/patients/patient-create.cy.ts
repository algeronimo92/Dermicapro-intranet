describe("Creación de paciente", () => {
  beforeEach(() => {
    cy.loginAsAdminAndVisit("/patients");
    cy.contains("button", "Nuevo Paciente").click();
  });

  it("muestra todos los campos requeridos del formulario", () => {
    // Campos de texto requeridos
    cy.get('input[name="firstName"]').should("be.visible");
    cy.get('input[name="lastName"]').should("be.visible");
    cy.get('input[name="dni"]').scrollIntoView().should("be.visible");
    cy.get('input[name="phone"]').scrollIntoView().should("be.visible");

    // Fecha de nacimiento (DatePicker custom)
    cy.contains("label", "Fecha de Nacimiento")
      .scrollIntoView()
      .should("be.visible");
    cy.get(".dp-trigger").scrollIntoView().should("be.visible");

    // Sexo
    cy.get('select[name="sex"]').should("be.visible");

    // Campos opcionales
    cy.get('input[name="email"]').should("be.visible");
    cy.get('input[name="address"]').should("be.visible");

    // Botones de acción
    cy.contains("button", "Cancelar").should("be.visible");
    cy.contains("button", "Crear Paciente").should("be.visible");
  });

  it("muestra errores en todos los campos requeridos al enviar vacío", () => {
    cy.contains("button", "Crear Paciente").click();
    cy.contains(/el nombre es requerido|nombre.*requerido|requerido/i)
      .scrollIntoView()
      .should("be.visible");
  });

  it("cancela y cierra el formulario", () => {
    cy.get('input[name="firstName"]').should("be.visible");
    cy.contains("button", "Cancelar").click();
    cy.get('input[name="firstName"]').should("not.exist");
  });

  it("crea un paciente con todos los campos requeridos", () => {
    const uniqueSuffix = Date.now().toString().slice(-6);

    cy.get('input[name="firstName"]').type("Paciente");
    cy.get('input[name="lastName"]').type("Prueba");
    cy.get('input[name="dni"]').type(`99${uniqueSuffix}`);
    cy.get('input[name="phone"]').type("987654321");

    // Seleccionar fecha de nacimiento
    cy.get(".dp-trigger").first().click();
    cy.get("button.rdp-day_button:not([disabled])").first().click();

    // Seleccionar sexo
    cy.get('select[name="sex"]').select("F");

    cy.contains("button", "Crear Paciente").click();

    cy.contains("Paciente Prueba", { timeout: 8000 }).should("be.visible");
  });
});
