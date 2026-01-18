import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    allowedHosts: [
      "macie-achievable-undubitatively.ngrok-free.dev",
    ],
    proxy: {
      "/data": "http://localhost:3001",
      "/upload": "http://localhost:3001",
      "/upload-audio": "http://localhost:3001",
      "/uploads": "http://localhost:3001",
    },
  },
})
