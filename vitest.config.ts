import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // In CI non esiste .env, e src/integrations/supabase/client.ts costruisce il
    // client al momento dell'import: senza queste due variabili createClient
    // solleva "supabaseUrl is required" e fallisce qualunque test che importi,
    // anche solo per catena, un componente che usa il client. Valori finti di
    // proposito: nessun test deve raggiungere un server vero.
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'chiave-finta-solo-per-i-test',
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
