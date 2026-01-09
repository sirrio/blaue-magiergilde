import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'https://blaue-magiergilde.test',
    supportFile: false,
    video: false,
  },
  viewportWidth: 1366,
  viewportHeight: 768,
})
