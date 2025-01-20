import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Asegura rutas relativas para archivos estáticos
  build: {
    outDir: 'dist', // Directorio de salida
    assetsDir: 'assets', // Carpeta para los recursos estáticos
  },
})
