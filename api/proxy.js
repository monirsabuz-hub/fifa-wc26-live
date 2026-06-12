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
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    if (url.includes('aynaott.com')) {
      headers['Referer'] = 'https://aynaott.com/';
      headers['Origin'] = 'https://aynaott.com';
    }
    const response = await fetch(url, {
      headers
    });

    const contentType = response.headers.get('content-type') || '';
    res.setHeader('Content-Type', contentType);

    const isM3U8 = contentType.includes('mpegurl') || contentType.includes('mpegURL') || url.split('?')[0].endsWith('.m3u8');

    if (isM3U8) {
      let text = await response.text();
      // Rewrite absolute links in manifest to use local proxy path
      text = text.replaceAll('https://', '/cors-proxy/https/');
      text = text.replaceAll('http://', '/cors-proxy/http/');
      
      return res.status(response.status).send(text);
    } else {
      // Stream binary response for segments
      const arrayBuffer = await response.arrayBuffer();
      return res.status(response.status).send(Buffer.from(arrayBuffer));
    }
  } catch (error) {
    console.error('[Vercel Proxy Error]', error);
    return res.status(500).send(`Proxy error: ${error.message}`);
  }
}
