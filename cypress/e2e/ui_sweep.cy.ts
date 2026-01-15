const email = 'cypress@example.test'
const password = 'cypress-password'

const login = () => {
  cy.visit('/login')
  cy.get('input[type="email"]').clear().type(email)
  cy.get('input[type="password"]').clear().type(password, { log: false })
  cy.contains('button', 'Login').click()
  cy.location('pathname').should('not.include', '/login')
}

describe('UI sweep', () => {
  it('captures key pages', () => {
    login()

    const pages = [
      { path: '/characters', heading: 'Characters', name: 'characters' },
      { path: '/game-master-log', heading: 'Game Master Log', name: 'game-master-log' },
      { path: '/handbook', heading: 'Guild Handbook', name: 'guild-handbook' },
      { path: '/admin/settings', heading: 'Settings', name: 'admin-settings' },
      { path: '/admin/items', heading: 'Items', name: 'items' },
      { path: '/admin/spells', heading: 'Spells', name: 'spells' },
      { path: '/admin/shops', heading: 'Shop', name: 'shop' },
      { path: '/admin/auctions', heading: 'Auctions', name: 'auctions' },
      { path: '/admin/character-approvals', heading: 'Character Approvals', name: 'character-approvals' },
    ]

    pages.forEach(({ path, heading, name }) => {
      cy.visit(path)
      cy.contains('h1', heading).should('be.visible')
      cy.screenshot(`ui-sweep/${name}`, { capture: 'fullPage' })
    })
  })
})
