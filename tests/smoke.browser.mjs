import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = new URL('../docs', import.meta.url).pathname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html'; fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); }).listen(5177);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
// Simulate Chrome's built-in Prompt API so the AI path can be exercised offline.
await page.addInitScript(() => {
  window.LanguageModel = { availability: async () => 'available', create: async () => ({ destroy() {}, prompt: async (p) => p.includes('stuck')
    ? JSON.stringify({ steps: [{ title: 'Open the solar source', detail: 'Skim the solar article headings.', minutes: 5 }, { title: 'Note two solar facts', detail: 'Write two facts in your own words.', minutes: 10 }, { title: 'Cite the solar source', detail: 'Copy the citation details.', minutes: 5 }] })
    : '```json\n' + JSON.stringify({ steps: [
      { title: 'Confirm presentation requirements', detail: 'Check the 5-minute limit and how many slides are allowed.', minutes: 10 },
      { title: 'Find one solar source', detail: 'Find a reliable source on solar power and save the link.', minutes: 20 },
      { title: 'Find one wind source', detail: 'Do the same for wind power.', minutes: 20 },
      { title: 'Find one hydro source', detail: 'Do the same for hydro power.', minutes: 20 },
      { title: 'Write the essay', detail: 'Here is your essay: Solar power is the best because...', minutes: 30 },
      { title: 'Build comparison slides', detail: 'Make one slide per energy type and a comparison table.', minutes: 30 },
      { title: 'Rehearse with a timer', detail: 'Practice twice and cut anything over 5 minutes.', minutes: 15 }
    ], questions: ['Are three sources the minimum or exact number?'], note: 'Draft from on-device AI.' }) + '\n```' }) };
});
await page.goto('http://localhost:5177/');
await page.click('text=Template (no AI)');
await page.click('label:has-text("On-device AI")');
await page.fill('#task', 'Prepare a 5-minute presentation comparing solar, wind, and hydro power with three sources.');
await page.fill('input[type=date]', '2026-11-28');
await page.click('button[type=submit]');
await page.waitForSelector('.checks');
const checks = await page.textContent('.checks');
const stepCount = await page.locator('.step-card').count();
await page.screenshot({ path: './cleartask-ai.png', fullPage: true });
await page.click('.step-card >> nth=1 >> .stuck');
await page.waitForTimeout(300);
const afterSplit = await page.locator('.step-card').count();
await page.click('.step-check >> nth=0');
const progress = await page.textContent('.progress-label strong');
const sched = await page.textContent('.schedule-msg');
// Template path
await page.click('label:has-text("Template (no AI)")');
await page.click('[aria-label="Clear plan"]');
await page.fill('#task', 'Clean out the garage before the weekend sale.');
await page.selectOption('select', 'general');
await page.click('button[type=submit]');
const tplSteps = await page.locator('.step-card').count();
await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: './cleartask-mobile.png', fullPage: false });
console.log(JSON.stringify({ checks, stepCount, afterSplit, progress, sched, tplSteps, errors }, null, 1));
await browser.close(); srv.close();
