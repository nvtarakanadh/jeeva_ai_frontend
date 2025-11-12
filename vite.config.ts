import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "localhost",
    port: 8080,
    hmr: {
      port: 8080,
      overlay: true
    },
    // Optimize file watching to prevent excessive reloads
    watch: {
      usePolling: false,
      interval: 1000,
      ignored: [
        '**/node_modules/**', 
        '**/dist/**', 
        '**/.git/**',
        '**/*.sql',
        '**/*.md',
        '**/supabase/**',
        '**/*.lock',
        '**/*.log',
        '**/*.tmp',
        '**/*.temp'
      ]
    },
    // Disable aggressive caching that causes reload issues
    headers: {
      'Cache-Control': 'no-cache'
    },
    fs: {
      strict: false,
      allow: ['..']
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(process.env.VITE_OPENAI_API_KEY || '')
  },
  build: {
    // Let Vite handle chunking automatically to avoid React loading issues
    rollupOptions: {
      output: {
        // Disable manual chunking to prevent React loading order issues
        manualChunks: undefined,
        // Ensure consistent chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    },
    // Enable source maps for debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Minify using esbuild to avoid optional terser dependency on Vercel
    minify: 'esbuild',
    // Target modern browsers for better optimization
    target: 'esnext',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'date-fns',
    ],
    exclude: [
      // Exclude heavy dependencies that are loaded on demand
    ]
  },
  // Ensure proper module resolution
  esbuild: {
    jsx: 'automatic'
  }
});
