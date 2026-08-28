import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Required for subdirectory deployment at shankaraonlinesolutions.com/viewpoint
  base: '/viewpoint/',
})

