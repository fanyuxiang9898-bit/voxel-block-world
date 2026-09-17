const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// Exercise voxel generation without WebGL or network dependencies.
const source = fs.readFileSync(path.join(__dirname, '../js/voxel.js'), 'utf8')
  .replace(/^import .*;$/gm, '').replace(/^export /gm, '');
const context = vm.createContext({ SimplexNoise: class {} });
vm.runInContext(source + '\nglobalThis.api = { World, Chunk, BlockType };', context);
const { World, Chunk, BlockType } = context.api;
const world = new World(null);
assert.equal(World.TEXT_LINES.join(' '), 'Agentic Engine');
assert.equal(World.TOTAL_W, 35);
assert.equal(World.TEXT_FLAT_RADIUS_X, 22);
assert.equal(World.TEXT_FLAT_RADIUS_Z, 10);
const row = (x, y, width = 5) => Array.from({length: width}, (_, i) => world._getTextBlock(x + i, y, 0) === BlockType.LEAVES ? '1' : '0').join('');
assert.equal(row(-17, 38), '01110'); // A top
assert.equal(row(-17, 32), '10001'); // A baseline
assert.equal(row(-11, 36), '01110'); // g bowl
assert.equal(row(-11, 32), '01111'); // g baseline
assert.equal(row(-11, 31), '00001'); // g descender
assert.equal(row(-11, 30), '01110'); // g descender bottom
assert.equal(row(-12, 34, 1), '0'); // inter-letter separation
assert.equal(row(-17, 29, 35), '0'.repeat(35));
assert.equal(row(-17, 28, 35), '0'.repeat(35));
assert.equal(row(-15, 27), '11111'); // E top on the second line
assert.equal(world._getTextBlock(-16, 38, 1), BlockType.AIR);
// Check every voxel against its glyph across all touched chunk boundaries,
// including the blank holes, inter-letter gaps and space behind the wall.
for (let cx = -2; cx <= 1; cx++) {
  for (let cz = -1; cz <= 0; cz++) {
    const chunk = new Chunk(cx, cz);
    world.generateChunkData(chunk);
    for (let y = 19; y <= 39; y++) for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
      assert.equal(chunk.getBlock(x, y, z), world._getTextBlock(cx * 16 + x, y, cz * 16 + z));
    }
  }
}
// Guard the user's original spawn and preview against unrelated edits.
const game = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8');
for (const setting of ['this._spawnX = 5.4;', 'this._spawnY = -27.0;', 'this._spawnZ = 22.6;', 'this.player.pitch = -0.3;', 'this.camera.position.set(0, 23, 12);', 'this.camera.lookAt(0, 25, 0);']) assert.ok(game.includes(setting), setting);
console.log('PASS: glyph baseline/descender, separation, all generated text voxels and original scene settings');
