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
      { path: '/games', heading: 'Game Master Log', name: 'game-master-log' },
      { path: '/rules', heading: 'Guild Handbook', name: 'guild-handbook' },
      { path: '/admin/settings', heading: 'Admin Settings', name: 'admin-settings' },
      { path: '/items', heading: 'Items', name: 'items' },
      { path: '/spells', heading: 'Spells', name: 'spells' },
      { path: '/shops', heading: 'Shop', name: 'shop' },
      { path: '/auctions', heading: 'Auctions', name: 'auctions' },
      { path: '/registrations', heading: 'Character Approvals', name: 'character-approvals' },
    ]

    pages.forEach(({ path, heading, name }) => {
      cy.visit(path)
      cy.contains('h1', heading).should('be.visible')
      cy.screenshot(`ui-sweep/${name}`, { capture: 'fullPage' })
    })
  })
})
