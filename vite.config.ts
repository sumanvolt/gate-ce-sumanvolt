import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png'],
      manifest: {
        name: "SUMANVOLT // GATE 2027 CE COMMAND CENTER",
        short_name: "SUMANVOLT",
        description: "GATE 2027 Civil Engineering grind tracker — syllabus, mocks, countdown, offline-first.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#000000",
        theme_color: "#CCFF00",
        lang: "en",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ]
});
