import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Vercel 배포를 위한 base 경로 설정
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // node_modules를 별도 청크로 분리
          if (id.includes('node_modules')) {
            // 큰 라이브러리들을 개별 청크로 분리
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('xlsx')) {
              return 'xlsx-vendor';
            }
            // 나머지 node_modules
            return 'vendor';
          }
          // 페이지별 코드 스플리팅
          if (id.includes('/pages/')) {
            const pageName = id.split('/pages/')[1].split('.')[0];
            return `page-${pageName}`;
          }
        },
      },
    },
    // 청크 크기 경고 임계값 증가 (큰 페이지 대응)
    chunkSizeWarningLimit: 1000,
    // 소스맵 최적화 (프로덕션)
    sourcemap: false,
    // 압축 최적화
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 프로덕션에서 console 제거
        drop_debugger: true,
      },
    },
  },
  publicDir: 'public',
  server: {
    port: 5173,
    host: true,
    https: false, // 개발 환경에서는 false, 프로덕션에서는 true로 설정
    // HTTPS를 사용하려면 인증서가 필요합니다
    // https: {
    //   key: fs.readFileSync('path/to/key.pem'),
    //   cert: fs.readFileSync('path/to/cert.pem'),
    // },
  },
  // 개발 서버 최적화
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'date-fns', 'lucide-react', '@supabase/supabase-js'],
  },
})

