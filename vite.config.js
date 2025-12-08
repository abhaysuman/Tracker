import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GF Mood Tracker',
        short_name: 'Mood',
        description: 'A dedicated mood tracker for us.',
        theme_color: '#F472B6',
        background_color: '#EBD4F4',
        display: 'standalone',
        icons: [
          {
            src: 'icon.png', // Make sure you have an icon.png in public/
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})