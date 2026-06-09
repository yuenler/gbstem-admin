declare namespace Cypress {
  interface Chainable<_Subject = any> {
    signedInSession(role: string): Chainable<any>
    signOutViaUi(): Chainable<any>
    fillInput(selector: string, text: string): Chainable<any>
    selectOption(selector: string, text: string): Chainable<any>
    parseCsv(csvText: string): Chainable<string[][]>
    parseCopiedEmails(clipboardText: string): Chainable<string[]>
    dropCsvColumn(
      parsedRows: string[][],
      columnName: string,
    ): Chainable<string[][]>
  }
}
