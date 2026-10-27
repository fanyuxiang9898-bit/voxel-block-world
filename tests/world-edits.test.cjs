const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
function load() {
  const context = vm.createContext({ SimplexNoise: class {}, THREE: { Vector3: class { constructor(x,y,z) { Object.assign(this,{x,y,z}); } } }, window: { addEventListener() {} } });
  for (const file of ['edit-history.js', 'voxel.js', 'game.js']) {
    const source = fs.readFileSync(path.join(root,'js',file),'utf8').replace(/^import [\s\S]*?;\r?\n/gm,'').replace(/^export /gm,'');
    vm.runInContext(source, context);
  }
  return vm.runInContext('({ World, Chunk, Player, BlockType })',context);
}
test('world rejects unloaded edits and reapplies edits after chunk eviction', () => {
  const {World,Chunk,BlockType}=load();
  const world=new World({ add() {}, remove() {} });
  world.renderDistance=0;
  Chunk.prototype.buildMesh=function() {};
  world.generateChunkData=function(c) { c.setBlock(0,2,0,BlockType.STONE); };
  assert.equal(world.setBlock(0,2,0,BlockType.DIRT),false);
  world.update(0,0);
  assert.equal(world.setBlock(0,2,0,BlockType.DIRT),true);
  world.update(160,160);
  assert.equal(world.chunks.has('0,0'),false);
  world.update(0,0);
  assert.equal(world.getBlock(0,2,0),BlockType.DIRT);
});
test('player undo refuses to restore a solid block inside the player', () => {
  const {Player,BlockType}=load();
  let block=BlockType.STONE;
  const player=new Player({}, { getBlock() { return block; }, setBlock(x,y,z,t) { block=t; return true; } });
  player.targetBlock={x:0,y:2,z:0};
  assert.equal(player.breakBlock(),true);
  Object.assign(player.position,{x:.5,y:2,z:.5});
  assert.equal(player.editHistory.undo(),false);
  assert.equal(block,BlockType.AIR);
  player.position.x=3;
  assert.equal(player.editHistory.undo(),true);
  assert.equal(block,BlockType.STONE);
});
