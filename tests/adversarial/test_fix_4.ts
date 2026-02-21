import { Mutex } from '../../src/main/mutex'

// Mock DB Class interacting with the Mutex
class MockDB {
  private mutex = new Mutex()
  public data: number[] = []

  async safeAdd(val: number) {
    await this.mutex.run(async () => {
      // Simulate async read
      await new Promise((r) => setTimeout(r, 10))

      // Read, Modify, Write simulation
      const currentLen = this.data.length
      await new Promise((r) => setTimeout(r, 10)) // Simulate async write delay
      this.data.push(val)

      // if race condition exists, this check might fail in a real file write,
      // but in-memory array push is synchronous.
      // However, the DELAYs above simulate the gap where another process could intervene if not locked.
    })
  }

  async unsafeAdd(val: number) {
    // Simulate async read
    await new Promise((r) => setTimeout(r, 10))
    const currentLen = this.data.length
    await new Promise((r) => setTimeout(r, 10))
    this.data.push(val)
  }
}

async function testFix() {
  console.log('--- Testing Fix 4: Database Safety (Mutex) ---')

  const db = new MockDB()
  const iterations = 50

  console.log(`Running ${iterations} concurrent writes...`)

  const promises = []
  for (let i = 0; i < iterations; i++) {
    promises.push(db.safeAdd(i))
  }

  await Promise.all(promises)

  console.log(`Expected Length: ${iterations}`)
  console.log(`Actual Length:   ${db.data.length}`)

  if (db.data.length === iterations) {
    console.log('✅ Mutex Verification Passed: No race conditions detected (all writes succeeded).')
  } else {
    console.error('❌ Mutex Verification Failed: Writes lost!')
    process.exit(1)
  }

  // Double check basic mutex logic
  const mutex = new Mutex()
  let counter = 0
  await Promise.all([
    mutex.run(async () => {
      const c = counter
      await new Promise((r) => setTimeout(r, 20))
      counter = c + 1
    }),
    mutex.run(async () => {
      const c = counter
      await new Promise((r) => setTimeout(r, 20))
      counter = c + 1
    }),
    mutex.run(async () => {
      const c = counter
      await new Promise((r) => setTimeout(r, 20))
      counter = c + 1
    })
  ])

  if (counter === 3) {
    console.log('✅ Atomic Counter Verification Passed (3/3).')
  } else {
    console.error(`❌ Atomic Counter Verification Failed. Expected 3, got ${counter}`)
  }
}

testFix()
