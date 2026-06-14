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

export default async function handler(req, res) {
  // 1. Enable CORS headers for client-side fetching
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const fullUrl = req.url || '';
  const urlMatch = fullUrl.match(/[?&]url=([^&]*)/);
  if (!urlMatch) {
    return res.status(400).send('Missing url parameter');
  }

  let url = decodeURIComponent(urlMatch[1]);

  // Reconstruct any query parameters that were passed to the stream
  const questionMarkIndex = fullUrl.indexOf('?');
  if (questionMarkIndex !== -1) {
    const searchParams = new URLSearchParams(fullUrl.slice(questionMarkIndex));
    searchParams.delete('url');
    const queryStr = searchParams.toString();
    if (queryStr) {
      url += (url.includes('?') ? '&' : '?') + queryStr;
    }
  }

  // Restore protocol separator
  if (url.startsWith('https/')) {
    url = 'https://' + url.slice('https/'.length);
  } else if (url.startsWith('http/')) {
    url = 'http://' + url.slice('http/'.length);
  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Clean up double slashes
  url = url.replace(/([^:]\/)\/+/g, "$1");

  try {
    // Transparent token-refresh injection for lovely.lovetier.bz HLS streams
    if (url.includes('lovely.lovetier.bz')) {
      const channelMatch = url.match(/lovely\.lovetier\.bz\/([^/]+)/);
      if (channelMatch) {
        const channelName = channelMatch[1]; // e.g. ITV1 or TSN4
        const channelToken = await getStreamToken(channelName);
        if (channelToken) {
          const urlObj = new URL(url);
          urlObj.searchParams.set('token', channelToken);
          url = urlObj.toString();
        }
      }
    }

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
    if (url.includes('aynaott.com')) {
      headers['Referer'] = 'https://aynaott.com/';
      headers['Origin'] = 'https://aynaott.com';
    }
    if (url.includes('hesgoaler.com')) {
      headers['Referer'] = 'https://www.ntvs.cx/';
      headers['Origin'] = 'https://www.ntvs.cx';
    }
    if (url.includes('weareballin.tv') || url.includes('aiv-cdn.net')) {
      headers['Referer'] = 'https://weareballin.tv/';
      headers['Origin'] = 'https://weareballin.tv';
    }
    if (url.includes('embedindia.st') || url.includes('embed.st')) {
      headers['Referer'] = 'https://weareballin.tv/';
      headers['Origin'] = 'https://weareballin.tv';
    }

    let body = undefined;
    if (req.method === 'POST') {
      if (req.body) {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      } else {
        body = await new Promise((resolve) => {
          let chunks = [];
          req.on('data', chunk => chunks.push(chunk));
          req.on('end', () => resolve(Buffer.concat(chunks)));
        });
      }
    }

    const response = await fetch(url, {
      method: req.method,
      headers,
      body
    });

    const contentType = response.headers.get('content-type') || '';
    const isM3U8 = contentType.includes('mpegurl') || contentType.includes('mpegURL') || url.split('?')[0].endsWith('.m3u8');
    const isHTML = contentType.includes('text/html');

    // Always set permissive CORS/framing headers on our proxy responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    // Forward safe upstream headers, excluding ones that would block embedding or CORS
    const blockedResponseHeaders = new Set([
      'x-frame-options', 'content-security-policy', 'content-security-policy-report-only',
      'content-encoding', 'transfer-encoding', 'content-length', 'access-control-allow-origin'
    ]);
    response.headers.forEach((value, key) => {
      if (!blockedResponseHeaders.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    if (isM3U8) {
      res.setHeader('Content-Type', contentType);
      let text = await response.text();
      // Rewrite absolute links in manifest to use local proxy path
      text = text.replaceAll('https://', '/cors-proxy/https/');
      text = text.replaceAll('http://', '/cors-proxy/http/');
      
      return res.status(response.status).send(text);
    } else if (isHTML) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
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
        const baseHost = 'https://embedindia.st';
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
        absoluteUrl.includes('lovely.lovetier.bz');
        
      if (needsProxy) {
        const cleanUrl = absoluteUrl.replace('://', '/');
        return '/cors-proxy/' + cleanUrl;
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
      const domainsToRewrite = ['weareballin.tv', 'embed.st', 'embedindia.st', 'dlhd.pk', 'dlhd.sx', 'dlhd.la', 'dlhd.info', 'donis.jimpenopisonline.online'];
      domainsToRewrite.forEach(domain => {
        const regexHttps = new RegExp(`https://${domain}`, 'g');
        const regexHttp = new RegExp(`http://${domain}`, 'g');
        text = text.replace(regexHttps, `/cors-proxy/https/${domain}`);
        text = text.replace(regexHttp, `/cors-proxy/http/${domain}`);
      });

      // Bypass base tag injection for hesgoaler.com and dlhd to prevent relative proxy requests failure
      if (!url.includes('hesgoaler.com') && !url.includes('dlhd')) {
        try {
          const urlObj = new URL(url);
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
      return res.status(response.status).send(text);
    } else {
      res.setHeader('Content-Type', contentType);
      // Stream binary response for segments
      const arrayBuffer = await response.arrayBuffer();
      return res.status(response.status).send(Buffer.from(arrayBuffer));
    }
  } catch (error) {
    console.error('[Vercel Proxy Error]', error);
    return res.status(500).send(`Proxy error: ${error.message}`);
  }
}
