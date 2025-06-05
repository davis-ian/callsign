import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue(), tailwindcss()],
    base: './',
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    build: {
        outDir: resolve(__dirname, '../ui-dist'), // outputs to root/ui-dist/
        emptyOutDir: true,
    },
    server: {
        headers: {
            'Access-Control-Allow-Origin': '*', // ← critical for loading inside VS Code webview
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
        },
        cors: true, // optional but explicit
        origin: 'http://localhost:5173', // helps with dev tools clarity
    },
});
