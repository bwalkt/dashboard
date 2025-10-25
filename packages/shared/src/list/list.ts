export class ListNode<T> {
  data: T;
  next: ListNode<T> | null;

  constructor(data: T, next: ListNode<T> | null = null) {
    this.data = data;
    this.next = next;
  }
}

export class LinkedList<T> {
  head: ListNode<T> | null;

  constructor() {
    this.head = null;
  }

  // Add a new node to the end of the list
  append(data: T): void {
    const newNode = new ListNode(data);
    if (!this.head) {
      this.head = newNode;
    } else {
      let currentNode: ListNode<T> = this.head;
      while (currentNode.next) {
        currentNode = currentNode.next;
      }
      currentNode.next = newNode;
    }
  }
  pruneAfter(node: ListNode<T>, count: number): void {
    let currentNode = node;
    for (let i = 0; i < count; i++) {
      if (currentNode.next) {
        currentNode = currentNode.next;
      } else {
        break;
      }
    }
    currentNode.next = null;
  }
  pruneBefore(node: ListNode<T>, count: number): void {
    if (this.head === node) {
      return; // Nothing to prune
    }

    let currentNode: ListNode<T> | null = this.head;
    let prevNode: ListNode<T> | null = null;

    while (currentNode && currentNode !== node) {
      prevNode = currentNode;
      currentNode = currentNode.next;
    }

    if (currentNode === node) {
      // Found the target node
      let pruneNode: ListNode<T> | null = prevNode;
      for (let i = 0; i < count && pruneNode; i++) {
        let tempNode: ListNode<T> | null = this.head;
        let tempPrevNode: ListNode<T> | null = null;

        while (tempNode && tempNode !== pruneNode) {
          tempPrevNode = tempNode;
          tempNode = tempNode.next;
        }

        if (tempNode === pruneNode) {
          if (tempPrevNode) {
            tempPrevNode.next = pruneNode.next;
          } else {
            this.head = pruneNode.next; // Update head if needed
          }
          pruneNode = tempPrevNode;
        } else {
          break; // Node not found, exit
        }
      }
    }
  }
  

  // Other methods like prepend, delete, search, etc., can be added here
}

// Example usage of a custom linked list
const myList = new LinkedList<string>();
myList.append("Apple");
myList.append("Banana");
console.log(myList.head?.data); // Output: Apple
console.log(myList.head?.next?.data); // Output: Ban