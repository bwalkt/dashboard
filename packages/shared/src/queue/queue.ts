export class Queue<T> {
  private data: T[] = [];
  private head = 0;

  enqueue(item: T) {
    this.data.push(item);
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    const item = this.data[this.head];
    this.head++;
    // Periodically clean up memory
    if (this.head > 50 && this.head * 2 > this.data.length) {
      this.data = this.data.slice(this.head);
      this.head = 0;
    }
    return item;
  }

  isEmpty() {
    return this.head >= this.data.length;
  }

  size() {
    return this.data.length - this.head;
  }
}