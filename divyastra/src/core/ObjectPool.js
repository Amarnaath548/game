export class ObjectPool {
  constructor(createFn, initialSize = 30) {
    this.createFn = createFn;
    this.pool = [];
    this.active = [];

    for (let i = 0; i < initialSize; i++) {
      const obj = this.createFn();
      obj.visible = false;
      this.pool.push(obj);
    }
  }

  acquire() {
    let obj = this.pool.pop();
    if (!obj) {
      obj = this.createFn();
    }
    obj.visible = true;
    this.active.push(obj);
    return obj;
  }

  release(obj) {
    const index = this.active.indexOf(obj);
    if (index !== -1) {
      this.active.splice(index, 1);
      obj.visible = false;
      this.pool.push(obj);
    }
  }

  releaseAll() {
    while (this.active.length > 0) {
      this.release(this.active[0]);
    }
  }
}