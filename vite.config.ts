import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.ARK_API_KEY': JSON.stringify(env.ARK_API_KEY || env.API_KEY || ''),
        'process.env.ARK_API_BASE': JSON.stringify(env.ARK_API_BASE || 'https://ark.cn-beijing.volces.com/api/v3'),
        'process.env.ARK_MODEL': JSON.stringify(env.ARK_MODEL || 'Doubao-Seed-1.6-flash'),
        // 向后兼容
        'process.env.API_KEY': JSON.stringify(env.ARK_API_KEY || env.API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
