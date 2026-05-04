import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  server: {
    proxy: {
      "/auth": "http://localhost:8080",
      "/usuarios": "http://localhost:8080",
      "/sessoes": "http://localhost:8080",
      "/rodadas": "http://localhost:8080",
      "/numeros": "http://localhost:8080",
      "/salas": "http://localhost:8080",
      "/ws": {
        target: "http://localhost:8080",
        ws: true,
      },
    },
  },
});