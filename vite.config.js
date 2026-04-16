import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // expõe na rede local (mesmo que --host)
    port: 5173,
  },
})
