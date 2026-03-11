import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sri } from 'vite-plugin-sri3'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sri(),  // Adds Subresource Integrity hashes to all script/link tags
  ],
})
