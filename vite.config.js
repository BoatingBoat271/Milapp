import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Milapp - Ayuda y Seguimiento de Mascotas',
        short_name: 'Milapp',
        description: 'Aplicación para ayudar y hacer seguimiento de mascotas perdidas',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  server: {
    host: '0.0.0.0', // Permite acceso desde fuera de localhost
    port: 3000,
    open: true
  }
})
