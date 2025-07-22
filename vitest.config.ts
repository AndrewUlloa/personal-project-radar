import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/**/*.{test,spec}.ts',
      'convex/**/*.test.ts'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next'
    ],
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'convex/_generated/',
        '**/*.d.ts',
        'coverage/'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/convex': path.resolve(__dirname, './convex'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/components': path.resolve(__dirname, './components')
    }
  }
}) 