import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Deployed at viewpoint.shankaraonlinesolutions.com (root of subdomain)
  base: '/',
})


