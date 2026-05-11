import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // `vite preview` (used as the production server in the container) blocks
  // requests from hosts it doesn't recognise. Allow the Azure Container Apps
  // ingress fqdn (and any future custom domain) through.
  preview: {
    host: true,
    port: 8080,
    allowedHosts: true,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
    ],
  },
})
