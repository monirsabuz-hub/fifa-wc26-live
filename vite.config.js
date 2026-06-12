import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'cors-proxy',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith('/cors-proxy/')) {
            let finalUrl;
            if (req.url.startsWith('/cors-proxy/http/')) {
              finalUrl = 'http://' + req.url.slice('/cors-proxy/http/'.length);
            } else if (req.url.startsWith('/cors-proxy/https/')) {
              finalUrl = 'https://' + req.url.slice('/cors-proxy/https/'.length);
            } else {
              finalUrl = 'https://' + req.url.slice('/cors-proxy/'.length);
            }

            // Clean up potential double slashes, but keep protocol separator
            finalUrl = finalUrl.replace(/([^:]\/)\/+/g, "$1");

            (async () => {
              try {
                const headers = {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                };
                if (finalUrl.includes('aynaott.com')) {
                  headers['Referer'] = 'https://aynaott.com/';
                  headers['Origin'] = 'https://aynaott.com';
                }
                if (finalUrl.includes('live.tsports.com')) {
                  headers['User-Agent'] = 'https://github.com/byte-capsule (Linux;Android 14)';
                  headers['Host'] = 'live.tsports.com';
                }
                const response = await fetch(finalUrl, {
                  method: req.method,
                  headers
                });

                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', '*');

                // Copy response headers (except encoding headers that cause decompression issues)
                response.headers.forEach((value, key) => {
                  if (key !== 'content-encoding' && key !== 'transfer-encoding' && key !== 'content-length' && key !== 'access-control-allow-origin') {
                    res.setHeader(key, value);
                  }
                });

                res.statusCode = response.status;

                const contentType = response.headers.get('content-type') || '';
                const isM3U8 = contentType.includes('mpegurl') || contentType.includes('mpegURL') || finalUrl.split('?')[0].endsWith('.m3u8');

                if (isM3U8) {
                  let text = await response.text();
                  
                  // Rewrite absolute links in manifest to use local proxy path
                  text = text.replaceAll('https://', '/cors-proxy/https/');
                  text = text.replaceAll('http://', '/cors-proxy/http/');
                  
                  res.setHeader('Content-Type', contentType || 'application/vnd.apple.mpegurl');
                  res.write(text);
                  res.end();
                } else {
                  const arrayBuffer = await response.arrayBuffer();
                  res.write(Buffer.from(arrayBuffer));
                  res.end();
                }
              } catch (err) {
                console.error('[CORS Proxy Error]', err);
                res.statusCode = 500;
                res.end(`Proxy error: ${err.message}`);
              }
            })();
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    port: 3001,
    proxy: {
      '/api-games': {
        target: 'https://worldcup26.ir',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-games/, '/get/games')
      },
      '/api-teams': {
        target: 'https://worldcup26.ir',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-teams/, '/get/teams')
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('hls.js')) return 'vendor-hls';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            return 'vendor-core';
          }
        }
      }
    }
  }
})
