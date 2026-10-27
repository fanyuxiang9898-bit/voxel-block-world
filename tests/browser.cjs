const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.argv[2] || 'playwright');
const root = path.resolve(__dirname, '..');
// Test-only instrumentation exposes the game; shipped source is unchanged.
const server = http.createServer((req, res) => {
  const relative = req.url.split('?')[0].replace(/^\/voxel-block-world\//, '');
  if (!/^(index\.html|js\/[\w-]+\.js|styles\/main\.css)$/.test(relative)) {
    res.writeHead(404); res.end(); return;
  }
  let content = fs.readFileSync(path.join(root, relative), 'utf8');
  if (relative === 'js/game.js') content = content.replace('const game = new Game();', 'const game = window.__testGame = new Game();');
  res.setHeader('Content-Type', relative.endsWith('.js') ? 'text/javascript' : relative.endsWith('.css') ? 'text/css' : 'text/html');
  res.end(content);
});

async function fixture(page) {
  await page.evaluate(() => {
    const { player, world } = window.__testGame;
    player.position.set(.5, 28, 8.5);
    player.velocity.set(0, 0, 0);
    player.gravity = 0;
    player.yaw = 0; player.pitch = 0;
    for (let z = 5; z <= 9; z++) for (let y = 28; y <= 31; y++) world.setBlock(0, y, z, 0);
    world.setBlock(0, 29, 5, 3);
    player.editHistory.past = []; player.editHistory.future = [];
  });
  await page.waitForFunction(() => window.__testGame.player.targetBlock?.z === 5);
}
async function expectBlock(page, value) {
  await page.waitForFunction(value => window.__testGame.world.getBlock(0,29,6) === value, value);
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
    for (const mobile of [false, true]) {
      const context = await browser.newContext(mobile ? { viewport: {width:390,height:844}, isMobile:true, hasTouch:true, userAgent:'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' } : { viewport: {width:1280,height:900} });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/voxel-block-world/index.html`);
      await page.waitForFunction(() => document.querySelector('#loadingBar').style.display === 'none', null, {timeout:60000});
      // Start at the same cursor position used later; moving a locked pointer
      // would rotate the camera instead of merely positioning a test click.
      if (mobile) await page.locator('.start-title').tap();
      else await page.mouse.click(640,450);
      if (!mobile) await page.waitForFunction(() => !!document.pointerLockElement);
      await fixture(page);
      if (mobile) await page.locator('#btnPlace').tap(); else await page.mouse.click(640,450);
      await expectBlock(page,1);
      if (mobile) await page.locator('#btnUndo').tap(); else await page.keyboard.press('Control+z');
      await expectBlock(page,0);
      if (mobile) await page.locator('#btnRedo').tap(); else await page.keyboard.press('Control+y');
      await expectBlock(page,1);
      await page.waitForFunction(() => window.__testGame.player.targetBlock?.z === 6);
      if (mobile) await page.locator('#btnBreak').tap(); else await page.mouse.click(640,450,{button:'right'});
      await expectBlock(page,0);
      if (mobile) await page.locator('#btnUndo').tap(); else await page.keyboard.press('Control+z');
      await expectBlock(page,1);
      if (!mobile) {
        await page.keyboard.down('w');
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        assert.equal(await page.evaluate(() => !!window.__testGame.player.keys.KeyW), false);
        await page.keyboard.up('w');
        await page.keyboard.press('Escape');
        await page.locator('#pauseScreen').waitFor({state:'visible'});
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${mobile ? 'mobile touch emulation' : 'desktop keyboard/mouse'}: place, undo, redo, break, restore; no page errors`);
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
