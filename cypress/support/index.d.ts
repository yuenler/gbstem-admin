declare namespace Cypress {
  interface Chainable<_Subject = any> {
    signedInSession(role: string): Chainable<any>
    signOutViaUi(): Chainable<any>
    fillInput(selector: string, text: string): Chainable<any>
    selectOption(selector: string, text: string): Chainable<any>
  }
}
