import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// O endereco da API vem de variavel de ambiente para permitir rodar o SGP ao
// lado de outro projeto que ja ocupe a 8000. O iniciar.ps1 define a mesma
// variavel para a API e para o proxy, entao os dois nunca ficam fora de sincronia.
const portaApi = process.env.SGP_API_PORT || "8000";
const alvoApi = "http://127.0.0.1:" + portaApi;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: alvoApi,
        changeOrigin: true,
      },
      "/media": {
        target: alvoApi,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          dados: ["@tanstack/react-query", "axios", "zustand", "date-fns"],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/modifiers", "@dnd-kit/utilities"],
          icones: ["lucide-react"],
        },
      },
    },
  },
});
