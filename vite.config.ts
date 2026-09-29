import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // The AI-summary hash core is shared verbatim with the ai-assist edge
      // function, which imports it as ../_shared/lessonSummaryCore.ts. One file,
      // two runtimes — see the header of that file.
      "@shared": path.resolve(__dirname, "./supabase/functions/_shared"),
    },
  },
});
