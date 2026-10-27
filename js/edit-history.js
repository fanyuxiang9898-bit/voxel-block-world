/** Bounded, session-only undo history. Failed/conflicting edits never consume history. */
export class EditHistory {
  constructor(read, write, canWrite = () => true, limit = 100) {
    this.read = read;
    this.write = write;
    this.canWrite = canWrite;
    this.limit = limit;
    this.past = [];
    this.future = [];
  }

  edit(x, y, z, after) {
    const before = this.read(x, y, z);
    if (before === after || !this.canWrite(x, y, z, after) || !this.write(x, y, z, after)) return false;
    this.past.push({ x, y, z, before, after });
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    return true;
  }

  transfer(from, to, undo) {
    const edit = from.at(-1);
    if (!edit) return false;
    const { x, y, z } = edit;
    const value = undo ? edit.before : edit.after;
    if (this.read(x, y, z) !== (undo ? edit.after : edit.before) ||
        !this.canWrite(x, y, z, value) || !this.write(x, y, z, value)) return false;
    from.pop();
    to.push(edit);
    return true;
  }

  undo() { return this.transfer(this.past, this.future, true); }
  redo() { return this.transfer(this.future, this.past, false); }
}
