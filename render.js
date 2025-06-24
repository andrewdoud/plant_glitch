import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Serve your web/ folder (with main.js, shaders, images, etc.)
app.use(express.static(path.join(__dirname, 'web')));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web/index.html'));
});

// Start the express server
const server = app.listen(PORT, async () => {
    console.log(`🟢 Server running at http://localhost:${PORT}`);
    await waitForServer();

    const plantDir = path.join(__dirname, 'web/images/plant_mode');
    const outputDir = path.join(__dirname, 'output');
    await fs.mkdir(outputDir, { recursive: true });

    const files = await fs.readdir(plantDir);
    const plantImages = files.filter(f => /\.(png|jpe?g|jpg)$/i.test(f));

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 2160, height: 3840 });

    let index = 0;
    for (const file of plantImages) {
        const parsed = parseName(file);
        if (!parsed) {
        console.warn(`Skipping unrecognized file: ${file}`);
        continue;
        }

        const { sciName, commonName } = parsed;
        // const url = `http://localhost:${PORT}/?sci=${sciName}&common=${commonName}&img=${encodeURIComponent(file)}`;
        const url = `http://localhost:${PORT}/?sci=${sciName}&common=${commonName}&img=${encodeURIComponent(file)}&i=${index + 1}&n=${plantImages.length}`;
        console.log(`🌿 Rendering ${commonName} (${sciName})...`);

        await page.goto(url);
        await page.waitForSelector('canvas'); // ensure canvas is present
        // await page.waitForTimeout(1000); // give time to render
        await new Promise(resolve => setTimeout(resolve, 1000));

        const screenshotPath = path.join(outputDir, `${sciName}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`✅ Saved: ${screenshotPath}`);
        index++;
    }

    await browser.close();
    console.log('🎉 All plant images rendered.');
    server.close(() => {
        console.log('🔚 Server shut down.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('❌ Caught Ctrl+C — closing server.');
    server.close(() => {
        process.exit(0);
    });
});

function parseName(filename) {
    // Standard pattern with common name in parentheses
    const match = filename.match(/^(.+?)_\((.+?)\)(?:_(\d+))?\.(png|jpe?g|jpg)$/i);
    if (match) {
        const rawSci = match[1];
        const rawCommon = match[2];
        const suffix = match[3] ? `_${match[3]}` : '';
        const sciName = rawSci.replace(/_/g, '-').toLowerCase() + suffix;
        const commonName = rawCommon.replace(/_/g, '_').toLowerCase();
        return { sciName, commonName, suffix };
    }

    // Fallback pattern: just a scientific name and optional number
    const fallback = filename.match(/^([A-Za-z]+)(?:_(\d+))?\.(png|jpe?g|jpg)$/i);
    if (fallback) {
        const rawSci = fallback[1];
        const suffix = fallback[2] ? `_${fallback[2]}` : '';
        const sciName = rawSci.toLowerCase() + suffix;
        const commonName = rawSci.toLowerCase(); // use same as sci
        return { sciName, commonName, suffix };
    }

    return null;
}

function waitForServer(port = PORT) {
    return new Promise(resolve => setTimeout(resolve, 1000));
}
