import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const tokenCache = {};

async function getStreamToken(channel) {
  const now = Date.now();
  if (tokenCache[channel] && tokenCache[channel].expires > now) {
    return tokenCache[channel].token;
  }
  
  try {
    const pageUrl = `https://hesgoaler.com/stream.php?ch=${channel}`;
    const res = await fetch(pageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.ntvs.cx/'
      },
      body: JSON.stringify({ channel, current_token: '' })
    });
    const data = await res.json();
    if (data.success && data.token) {
      tokenCache[channel] = {
        token: data.token,
        expires: Date.now() + 200 * 1000
      };
      return data.token;
    }
  } catch (e) {
    console.error(`[Token Fetch Error] For ${channel}:`, e);
  }
  return null;
}

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
              // Transparent token-refresh injection for lovely.lovetier.bz HLS streams
              if (finalUrl.includes('lovely.lovetier.bz')) {
                const channelMatch = finalUrl.match(/lovely\.lovetier\.bz\/([^/]+)/);
                if (channelMatch) {
                  const channelName = channelMatch[1]; // e.g. ITV1 or TSN4
                  const channelToken = await getStreamToken(channelName);
                  if (channelToken) {
                    const urlObj = new URL(finalUrl);
                    urlObj.searchParams.set('token', channelToken);
                    finalUrl = urlObj.toString();
                  }
                }
              }

              try {
                const headers = {};
                // Copy all incoming request headers to preserve custom headers (like "indians" for embedindia.st)
                for (const [key, value] of Object.entries(req.headers)) {
                  const lowerKey = key.toLowerCase();
                  if (!["host", "connection", "content-length", "accept-encoding"].includes(lowerKey)) {
                    headers[key] = value;
                  }
                }
                
                // Override standard headers
                headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
                if (finalUrl.includes('aynaott.com')) {
                  headers['Referer'] = 'https://aynaott.com/';
                  headers['Origin'] = 'https://aynaott.com';
                }
                if (finalUrl.includes('live.tsports.com')) {
                  headers['User-Agent'] = 'https://github.com/byte-capsule (Linux;Android 14)';
                  headers['Host'] = 'live.tsports.com';
                }
                if (finalUrl.includes('embed.st') || finalUrl.includes('embedindia.st')) {
                  headers['Referer'] = 'https://1ball.pk/';
                  headers['Origin'] = 'https://1ball.pk';
                }
                if (finalUrl.includes('hesgoaler.com')) {
                  headers['Referer'] = 'https://www.ntvs.cx/';
                  headers['Origin'] = 'https://www.ntvs.cx';
                }
                if (finalUrl.includes('weareballin.tv') || finalUrl.includes('aiv-cdn.net')) {
                  headers['Referer'] = 'https://weareballin.tv/';
                  headers['Origin'] = 'https://weareballin.tv';
                }
                if (finalUrl.includes('sportzfylive.com')) {
                  headers['Referer'] = 'https://sportzfylive.com/';
                  headers['Origin'] = 'https://sportzfylive.com';
                }

                let body = undefined;
                if (req.method === 'POST') {
                  body = await new Promise((resolve) => {
                    let chunks = [];
                    req.on('data', chunk => chunks.push(chunk));
                    req.on('end', () => resolve(Buffer.concat(chunks)));
                  });
                }

                const response = await fetch(finalUrl, {
                  method: req.method,
                  headers,
                  body
                });

                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', '*');

                // Copy response headers (except encoding and iframe-blocking headers)
                const headersToExclude = [
                  'content-encoding',
                  'transfer-encoding',
                  'content-length',
                  'access-control-allow-origin',
                  'x-frame-options',
                  'content-security-policy'
                ];
                response.headers.forEach((value, key) => {
                  if (!headersToExclude.includes(key.toLowerCase())) {
                    res.setHeader(key, value);
                  }
                });

                let statusCode = response.status;
                if (statusCode === 404 && (finalUrl.includes('.css') || response.headers.get('content-type')?.includes('text/css'))) {
                  statusCode = 200;
                }
                res.statusCode = statusCode;

                const contentType = response.headers.get('content-type') || '';
                const isM3U8 = contentType.includes('mpegurl') || contentType.includes('mpegURL') || finalUrl.split('?')[0].endsWith('.m3u8');
                const isHTML = contentType.includes('text/html');

                if (isM3U8) {
                  let text = await response.text();
                  
                  // Rewrite absolute links in manifest to use local proxy path
                  text = text.replaceAll('https://', '/cors-proxy/https/');
                  text = text.replaceAll('http://', '/cors-proxy/http/');
                  
                  res.setHeader('Content-Type', contentType || 'application/vnd.apple.mpegurl');
                  res.write(text);
                  res.end();
                } else if (isHTML) {
                  let text = await response.text();
                  
                  // Strip known ad scripts and popunders from HTML
                  text = text.replace(/<script[^>]*src="[^"]*(?:doctusflaxman|corruptioneasiestsubmarine|histats|aclib)[^"]*"[^>]*><\/script>/gi, '');
                  text = text.replace(/aclib\.runPop\([^)]*\);?/g, '');

                  // Inject custom adblocker and window.open override script
                  const adBlockerScript = `
<script>
  (function() {
    window.Adcash = true;
    window.aclib = {
      runPop: function() { console.log("[AdBlocker] Blocked aclib.runPop"); },
      runBanner: function() { console.log("[AdBlocker] Blocked aclib.runBanner"); },
      runPopunder: function() { console.log("[AdBlocker] Blocked aclib.runPopunder"); }
    };
    
    // Override window.open to prevent popup redirects and sandbox detection
    const originalOpen = window.open;
    window.open = function(url, name, specs) {
      console.log("[AdBlocker] Blocked window.open:", url, name, specs);
      return {
        focus: function() {},
        close: function() {},
        document: {
          write: function() {},
          writeln: function() {},
          close: function() {}
        }
      };
    };

    // Helper to rewrite network request URLs through our CORS proxy
    const rewriteUrl = function(url) {
      if (!url || typeof url !== 'string') return url;
      if (url.startsWith('http://localhost') || url.startsWith('ws://localhost') || url.includes('/vite') || url.includes('node_modules')) {
        return url;
      }
      if (url.includes('/cors-proxy/')) {
        return url;
      }
      let absoluteUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        let baseHost = 'https://embedindia.st';
        const proxyMatch = window.location.href.match(/\\/cors-proxy\\/https?\\/([^/]+)/);
        if (proxyMatch) {
          baseHost = 'https://' + proxyMatch[1];
        }
        if (url.startsWith('/')) {
          absoluteUrl = baseHost + url;
        } else {
          absoluteUrl = baseHost + '/embed/' + url;
        }
      }
      
      const needsProxy = 
        absoluteUrl.includes('embedindia.st') || 
        absoluteUrl.includes('aiv-cdn.net') || 
        absoluteUrl.includes('.m3u8') || 
        absoluteUrl.includes('.mpd') ||
        absoluteUrl.includes('lovely.lovetier.bz') ||
        absoluteUrl.includes('sportzfylive.com');
        
      if (needsProxy) {
        const cleanUrl = absoluteUrl.replace('://', '/');
        return window.location.origin + '/cors-proxy/' + cleanUrl;
      }
      return url;
    };

    // Intercept native fetch
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        input = rewriteUrl(input);
      } else if (input instanceof URL) {
        input = new URL(rewriteUrl(input.toString()));
      } else if (input && input.url) {
        try {
          const proxiedUrl = rewriteUrl(input.url);
          input = new Request(proxiedUrl, input);
        } catch (e) {}
      }
      return originalFetch.call(this, input, init);
    };

    // Intercept XMLHttpRequest
    const originalOpenXHR = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      if (typeof url === 'string') {
        url = rewriteUrl(url);
      }
      return originalOpenXHR.call(this, method, url, ...args);
    };
  })();
</script>
`;

                  if (text.includes('<head>')) {
                    text = text.replace('<head>', `<head>${adBlockerScript}`);
                  } else if (text.includes('<html>')) {
                    text = text.replace('<html>', `<html>${adBlockerScript}`);
                  } else {
                    text = adBlockerScript + text;
                  }

                  // Rewrite stream iframe/script URLs for specific domains to go through the CORS proxy
                  const domainsToRewrite = ['weareballin.tv', 'embed.st', 'embedindia.st', 'dlhd.pk', 'dlhd.sx', 'dlhd.la', 'dlhd.info', 'donis.jimpenopisonline.online', 'sportzfylive.com'];
                  const localOrigin = (req.connection?.encrypted ? 'https' : 'http') + '://' + req.headers.host;
                  domainsToRewrite.forEach(domain => {
                    const regexHttps = new RegExp(`https://${domain}`, 'g');
                    const regexHttp = new RegExp(`http://${domain}`, 'g');
                    text = text.replace(regexHttps, `${localOrigin}/cors-proxy/https/${domain}`);
                    text = text.replace(regexHttp, `${localOrigin}/cors-proxy/http/${domain}`);
                  });

                  if (finalUrl.includes('sportzfylive.com')) {
                    const localProxyPrefix = `${localOrigin}/cors-proxy/https/sportzfylive.com`;
                    text = text.replace(/(href|src)="\/((?!cors-proxy\/)[^"]*)"/g, `$1="${localProxyPrefix}/$2"`);
                  }

                  // Bypass base tag injection for hesgoaler.com and dlhd to prevent relative proxy requests failure
                  if (!finalUrl.includes('hesgoaler.com') && !finalUrl.includes('dlhd')) {
                    try {
                      const urlObj = new URL(finalUrl);
                      const remoteBase = `${urlObj.protocol}//${urlObj.host}`;
                      const baseTag = `<base href="${remoteBase}/" />`;
                      
                      if (text.includes('<head>')) {
                        text = text.replace('<head>', `<head>${baseTag}`);
                      } else if (text.includes('<html>')) {
                        text = text.replace('<html>', `<html>${baseTag}`);
                      } else {
                        text = baseTag + text;
                      }
                    } catch (e) {
                      // ignore base injection errors
                    }
                  }
                  
                  res.setHeader('Content-Type', 'text/html; charset=utf-8');
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
