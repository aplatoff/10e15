//

interface Mutex {
  acquire(): Promise<() => void>
}

export function createMutex(): Mutex {
  let lock = Promise.resolve()
  return {
    acquire() {
      let release: () => void
      const wait = new Promise<void>((resolve) => (release = resolve))
      const acquired = lock.then(() => release)
      lock = lock.then(() => wait)
      return acquired
    },
  }
}
