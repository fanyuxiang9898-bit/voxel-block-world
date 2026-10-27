import test from 'node:test';
import assert from 'node:assert/strict';
import { EditHistory } from '../js/edit-history.js';

function fixture(limit = 100) {
  const blocks = new Map();
  let allowed = true;
  let loaded = true;
  const history = new EditHistory((x,y,z) => blocks.get(`${x},${y},${z}`) ?? 0,
    (x,y,z,v) => { if (!loaded) return false; blocks.set(`${x},${y},${z}`, v); return true; },
    () => allowed, limit);
  return { history, blocks, allow: v => allowed = v, load: v => loaded = v };
}
test('place, break, undo and redo restore the exact block', () => {
  const {history: h, blocks} = fixture();
  h.edit(-1,2,3,4); h.edit(-1,2,3,0);
  assert.equal(h.undo(), true); assert.equal(blocks.get('-1,2,3'),4);
  assert.equal(h.undo(), true); assert.equal(blocks.get('-1,2,3'),0);
  assert.equal(h.redo(), true); assert.equal(h.redo(), true);
  assert.equal(blocks.get('-1,2,3'),0);
});
test('collision, unloaded chunks and conflicts preserve history', () => {
  const f=fixture(); f.history.edit(1,2,3,4);
  f.allow(false); assert.equal(f.history.undo(),false);
  f.allow(true); f.load(false); assert.equal(f.history.undo(),false);
  f.load(true); f.blocks.set('1,2,3',5); assert.equal(f.history.undo(),false);
  f.blocks.set('1,2,3',4); assert.equal(f.history.undo(),true);
});
test('new edits discard redo and history stays bounded', () => {
  const {history:h}=fixture(2);
  h.edit(0,0,0,1); h.edit(0,0,0,2); h.edit(0,0,0,3);
  h.undo(); h.undo(); assert.equal(h.undo(),false);
  h.edit(0,0,0,7); assert.equal(h.redo(),false);
});
