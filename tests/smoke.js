const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results');
fs.mkdirSync(output, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.json': 'application/json', '.webmanifest': 'application/manifest+json'
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const server = http.createServer((request, response) => {
  if (request.url === '/api/test' && request.method === 'POST') {
    request.resume();
    request.on('end', () => {
      response.writeHead(201, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true, id: 'test-application' }));
    });
    return;
  }
  if (request.url === '/api/fail' && request.method === 'POST') {
    request.resume();
    request.on('end', () => {
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: false }));
    });
    return;
  }
  const pathname = request.url === '/' ? '/index.html' : decodeURIComponent(request.url.split('?')[0]);
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404); response.end('Not found'); return;
  }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});

async function run() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true });
  const results = [];

  async function scenario(name, options, test) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await test(page);
    assert(errors.length === 0, `${name}: ошибки консоли: ${errors.join('; ')}`);
    await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
    results.push(name);
    await context.close();
  }

  await scenario('desktop', { viewport: { width: 1440, height: 1000 } }, async (page) => {
    assert(await page.locator('h1').isVisible(), 'desktop: H1 не виден');
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    assert(noOverflow, 'desktop: обнаружен горизонтальный скролл');
    const summaries = page.locator('.accordion summary');
    assert(await summaries.count() === 6, 'desktop: неверное количество FAQ');
    await summaries.nth(1).click();
    const openFaqs = await page.locator('.accordion details[open]').count();
    assert(openFaqs === 1, 'desktop: одновременно открыто несколько FAQ');
    await page.locator('[data-lab="ai"]').click();
    assert(await page.locator('#lab-modal').evaluate((node) => node.open), 'desktop: окно лаборатории не открылось');
    await page.locator('#lab-modal .modal__close').click();
    await page.locator('[data-open-form="student"]').first().click();
    await page.locator('#application-form').evaluate((node) => { node.dataset.endpoint = '/api/test'; });
    assert(await page.locator('[name="student_topic"]').isVisible(), 'desktop: студенческие поля не показаны');
    await page.locator('[name="name"]').fill('Тестовый Студент');
    await page.locator('[name="email"]').fill('student@example.ru');
    await page.locator('[name="student_work_type"]').selectOption({ label: 'ВКР / дипломный проект' });
    await page.locator('[name="student_topic"]').fill('Тестовая тема ВКР');
    await page.locator('[name="task"]').fill('Разработать функциональный прототип');
    assert((await page.locator('[data-counter-for="task"]').textContent()).startsWith('35'), 'desktop: счётчик задачи не обновился');
    await page.locator('[name="consent"]').check();
    await page.locator('#form-submit').click();
    await page.locator('.form-success h2').waitFor({ state: 'visible' });
    assert((await page.locator('.form-success h2').textContent()).includes('отправлена'), 'desktop: нет подтверждения API-отправки');
    assert((await page.locator('.form-success p').textContent()).includes('test-application'), 'desktop: не показан номер заявки');
  });

  await scenario('api-error', { viewport: { width: 1280, height: 900 } }, async (page) => {
    const buttons = page.locator('[data-open-form="partner"]');
    const buttonCount = await buttons.count();
    assert(buttonCount > 0, 'api-error: нет CTA организации');
    await buttons.nth(0).click();
    await page.locator('#application-form').evaluate((node) => { node.dataset.endpoint = '/api/fail'; });
    await page.locator('[name="name"]').fill('Тестовая Организация');
    await page.locator('[name="email"]').fill('company@example.ru');
    await page.locator('[name="organization"]').fill('Тестовая компания');
    await page.locator('[name="task"]').fill('Проверка обработки ошибки API');
    await page.locator('[name="consent"]').check();
    await page.locator('#form-submit').click();
    await page.locator('#form-alert').waitFor({ state: 'visible' });
    assert((await page.locator('#form-alert').textContent()).includes('Не удалось'), 'api-error: нет понятного сообщения об ошибке');
  });

  await scenario('mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, async (page) => {
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    assert(noOverflow, 'mobile: обнаружен горизонтальный скролл');
    await page.locator('.menu-toggle').click();
    assert(await page.locator('.menu-toggle').getAttribute('aria-expanded') === 'true', 'mobile: меню не открылось');
    assert(await page.locator('.main-nav').isVisible(), 'mobile: навигация не видна');
    await page.keyboard.press('Escape');
    assert(await page.locator('.menu-toggle').getAttribute('aria-expanded') === 'false', 'mobile: меню не закрылось по Escape');
  });

  await scenario('reduced-motion', { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }, async (page) => {
    const animation = await page.locator('.map-orbit').evaluate((node) => getComputedStyle(node).animationName);
    assert(animation === 'none', 'reduced-motion: декоративная анимация не отключена');
  });

  await browser.close();
  server.close();
  console.log(`Smoke tests passed: ${results.join(', ')}`);
}

run().catch((error) => {
  server.close();
  console.error(error);
  process.exit(1);
});
