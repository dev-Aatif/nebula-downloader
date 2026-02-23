export default [
  {
    test: {
      name: 'main',
      environment: 'node',
      include: ['tests/unit/main/**/*.test.ts']
    }
  },
  {
    test: {
      name: 'renderer',
      environment: 'jsdom',
      include: ['tests/unit/renderer/**/*.test.tsx', 'tests/unit/renderer/**/*.test.ts'],
      setupFiles: ['src/renderer/src/setupTests.ts'],
      alias: {
        '@renderer': '/src/renderer/src'
      }
    }
  }
]
