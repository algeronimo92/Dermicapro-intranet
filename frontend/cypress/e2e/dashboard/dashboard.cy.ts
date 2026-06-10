describe("Dashboard", () => {
  it("el admin ve el dashboard con saludo y botones de periodo", () => {
    cy.loginAsAdminAndVisit("/");
    cy.contains(/(Buenos días|Buenas tardes|Buenas noches)/i).should("be.visible");
    cy.get(".period-btn").should("have.length.at.least", 3);
    cy.contains(".period-btn", "Hoy").should("be.visible");
    cy.contains(".period-btn", "Semana").should("be.visible");
    cy.contains(".period-btn", "Mes").should("be.visible");
  });

  it("cambia el periodo al hacer clic en Semana", () => {
    cy.loginAsAdminAndVisit("/");
    cy.contains(".period-btn", "Semana").click();
    cy.contains(".period-btn--active", "Semana").should("exist");
  });

  it("cambia el periodo al hacer clic en Mes", () => {
    cy.loginAsAdminAndVisit("/");
    cy.contains(".period-btn", "Mes").click();
    cy.contains(".period-btn--active", "Mes").should("exist");
  });

  it("el asistente ve su propio dashboard", () => {
    cy.loginAsAssistantAndVisit("/");
    cy.contains(/(Buenos días|Buenas tardes|Buenas noches)/i).should("be.visible");
    cy.contains(".period-btn", "Hoy").should("be.visible");
  });

  it("el usuario de ventas ve su propio dashboard", () => {
    cy.loginAsSalesAndVisit("/");
    cy.contains(/(Buenos días|Buenas tardes|Buenas noches)/i).should("be.visible");
  });
});
