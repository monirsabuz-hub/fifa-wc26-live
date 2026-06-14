import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || 'C:\\Users\\USER\\AppData\\Local', 'Google\\Chrome\\Application\\chrome.exe')
];

let executablePath = '';
for (const p of chromePaths) {
  if (fs.existsSync(p)) {
    executablePath = p;
    break;
  }
}

if (!executablePath) {
  console.error('Chrome executable not found. Please install Chrome or modify executablePath in the script.');
  process.exit(1);
}

console.log('Using Chrome executable:', executablePath);

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.setRequestInterception(true);
  
  page.on('request', interceptedRequest => {
    const url = interceptedRequest.url();
    
    if (url.includes('aiv-cdn.net') || url.includes('embedindia.st') || url.includes('cenc.mpd')) {
      console.log('\n--- INTERCEPTED STREAM REQUEST ---');
      console.log('URL:', url);
      console.log('Method:', interceptedRequest.method());
      console.log('Headers:', JSON.stringify(interceptedRequest.headers(), null, 2));
    }
    
    interceptedRequest.continue();
  });
  
  try {
    console.log('Navigating to stream page...');
    await page.goto('https://weareballin.tv/streams/7', { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Page loaded. Waiting 10 seconds for stream player to initialize and play...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('Error during execution:', error);
  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
}

run();
