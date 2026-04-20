import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    allowedHosts: [
      'pitch-bras-sides-dicke.trycloudflare.com',
      'bellylike-maryann-caenogenetic.ngrok-free.dev',
      'all'
    ],
    host: true
  }
})
