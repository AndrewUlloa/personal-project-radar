import { vi, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock environment variables
vi.mock('process', () => ({
  env: {
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    EXA_API_KEY: 'test-exa-key',
    CONVEX_DEPLOYMENT: 'test-deployment'
  }
}))

// Mock external APIs for testing
export const mockHandlers = [
  // Mock Anthropic API
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      content: [{
        text: JSON.stringify({
          lead_score: 85,
          arpu_band: "$50-100K",
          key_signals: ["Fast-growing SaaS", "Recent funding", "Strong online presence"],
          score_rationale: "High-growth company with strong digital footprint and recent funding indicators"
        })
      }],
      model: 'claude-3-sonnet-20241022',
      role: 'assistant'
    })
  }),

  // Mock Exa API
  http.post('https://api.exa.ai/*', () => {
    return HttpResponse.json({
      results: [{
        title: "Test Company",
        url: "https://testcompany.com",
        text: "Test company description with relevant business information",
        highlights: ["SaaS platform", "B2B software"],
        score: 0.95
      }]
    })
  })
]

// Setup MSW server
export const server = setupServer(...mockHandlers)

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Close server after all tests
afterAll(() => server.close())

// Reset handlers after each test for test isolation
afterEach(() => server.resetHandlers())

// Mock Convex database operations
export const mockDb = {
  query: vi.fn(),
  insert: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  get: vi.fn()
}

// Mock Convex context
export const mockCtx = {
  db: mockDb,
  auth: {
    getUserIdentity: vi.fn().mockResolvedValue(null)
  },
  scheduler: {
    runAfter: vi.fn(),
    runAt: vi.fn()
  },
  storage: {
    getUrl: vi.fn(),
    getMetadata: vi.fn(),
    generateUploadUrl: vi.fn(),
    delete: vi.fn()
  },
  runQuery: vi.fn(),
  runMutation: vi.fn(),
  runAction: vi.fn()
}

// Helper to reset all mocks
export function resetAllMocks() {
  vi.clearAllMocks()
  Object.values(mockDb).forEach(mock => mock.mockClear())
} 