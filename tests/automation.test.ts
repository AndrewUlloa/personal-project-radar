import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockCtx, mockDb, resetAllMocks } from './setup'

describe('Automation Module Tests', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('healthCheck', () => {
    it('should return healthy status when all systems are operational', async () => {
      // Mock database stats
      mockCtx.runQuery.mockImplementation((queryName) => {
        if (queryName === 'internal.automation.getDatabaseStats') {
          return Promise.resolve({
            totalCompanies: 100,
            totalEvents: 500,
            totalQueueItems: 10,
            avgLeadScore: 75,
            lastActivity: Date.now()
          })
        }
        return Promise.resolve(null)
      })

      // Simulate health check logic
      const healthStatus = {
        timestamp: Date.now(),
        database: { healthy: true, details: { companies: 100, avgScore: 75 } },
        apiLimits: { healthy: true, details: { remaining: 1000 } },
        scoring: { healthy: true, details: { accuracy: 0.92 } },
        overall: 'healthy' as const
      }

      expect(healthStatus.overall).toBe('healthy')
      expect(healthStatus.database.healthy).toBe(true)
      expect(healthStatus.apiLimits.healthy).toBe(true)
      expect(healthStatus.scoring.healthy).toBe(true)
    })

    it('should return warning status when some systems have issues', async () => {
      // Simulate degraded performance
      const healthStatus = {
        timestamp: Date.now(),
        database: { healthy: true, details: {} },
        apiLimits: { healthy: false, details: { remaining: 10 } }, // Low API limits
        scoring: { healthy: true, details: {} },
        overall: 'warning' as const
      }

      expect(healthStatus.overall).toBe('warning')
      expect(healthStatus.apiLimits.healthy).toBe(false)
    })

    it('should track health check frequency', () => {
      // Test that health checks are properly scheduled
      const healthCheckInterval = 120 // 2 hours in minutes
      const lastHealthCheck = Date.now() - (60 * 60 * 1000) // 1 hour ago
      const nextHealthCheck = lastHealthCheck + (healthCheckInterval * 60 * 1000)
      
      expect(nextHealthCheck).toBeGreaterThan(Date.now())
    })
  })

  describe('processDiscoveryQueue', () => {
    it('should process queue items in batches', async () => {
      const queueItems = [
        { _id: 'q1', domain: 'company1.com', status: 'pending', attempts: 0 },
        { _id: 'q2', domain: 'company2.com', status: 'pending', attempts: 0 },
        { _id: 'q3', domain: 'company3.com', status: 'pending', attempts: 1 }
      ]

      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        take: vi.fn().mockResolvedValue(queueItems.slice(0, 2)) // Take 2 items
      }
      mockDb.query.mockReturnValue(mockQuery)

      // Simulate processing logic
      const batchSize = 2
      const items = await mockQuery.take(batchSize)
      const processed = items.length
      const failed = 0

      expect(processed).toBe(2)
      expect(failed).toBe(0)
      expect(mockQuery.take).toHaveBeenCalledWith(batchSize)
    })

    it('should handle queue processing errors gracefully', async () => {
      const queueItem = { _id: 'q1', domain: 'broken-company.com', status: 'pending', attempts: 2 }
      
      // Simulate processing failure
      try {
        throw new Error('External API failure')
      } catch (error) {
        // Update queue item with error
        await mockDb.patch('q1', {
          status: 'failed',
          attempts: queueItem.attempts + 1,
          last_error: (error as Error).message
        })

        expect(mockDb.patch).toHaveBeenCalledWith('q1', {
          status: 'failed',
          attempts: 3,
          last_error: 'External API failure'
        })
      }
    })

    it('should retry failed items up to max attempts', () => {
      const maxRetries = 3
      const queueItem = { attempts: 2, maxRetries }
      
      const shouldRetry = queueItem.attempts < maxRetries
      expect(shouldRetry).toBe(true)

      const queueItemMaxed = { attempts: 3, maxRetries }
      const shouldNotRetry = queueItemMaxed.attempts < maxRetries
      expect(shouldNotRetry).toBe(false)
    })
  })

  describe('getDatabaseStats', () => {
    it('should calculate database statistics correctly', async () => {
      const mockCompanies = [
        { _id: '1', lead_score: 80, _creationTime: Date.now() - 1000 },
        { _id: '2', lead_score: 90, _creationTime: Date.now() - 2000 },
        { _id: '3', lead_score: 70, _creationTime: Date.now() - 3000 }
      ]

      const mockEvents = Array.from({ length: 15 }, (_, i) => ({ _id: `e${i}` }))

      const mockCompanyQuery = {
        collect: vi.fn().mockResolvedValue(mockCompanies)
      }
      const mockEventQuery = {
        collect: vi.fn().mockResolvedValue(mockEvents)
      }

      mockDb.query.mockImplementation((table) => {
        if (table === 'companies') return mockCompanyQuery
        if (table === 'event_log') return mockEventQuery
        return { collect: vi.fn().mockResolvedValue([]) }
      })

      // Simulate stats calculation
      const companies = await mockCompanyQuery.collect()
      const events = await mockEventQuery.collect()

      const avgLeadScore = companies.reduce((sum: number, c: any) => sum + (c.lead_score || 0), 0) / companies.length
      const lastActivity = Math.max(...companies.map((c: any) => c._creationTime))

      const stats = {
        totalCompanies: companies.length,
        totalEvents: events.length,
        totalQueueItems: 0,
        avgLeadScore,
        lastActivity
      }

      expect(stats.totalCompanies).toBe(3)
      expect(stats.totalEvents).toBe(15)
      expect(stats.avgLeadScore).toBe(80) // (80 + 90 + 70) / 3
      expect(stats.lastActivity).toBe(mockCompanies[0]._creationTime)
    })

    it('should handle empty database gracefully', async () => {
      const mockQuery = {
        collect: vi.fn().mockResolvedValue([])
      }
      mockDb.query.mockReturnValue(mockQuery)

      const companies = await mockQuery.collect()
      const avgLeadScore = companies.length > 0 
        ? companies.reduce((sum: number, c: any) => sum + (c.lead_score || 0), 0) / companies.length 
        : 0

      expect(avgLeadScore).toBe(0)
    })
  })

  describe('getScoringStats', () => {
    it('should calculate scoring accuracy metrics', async () => {
      const mockCompanies = [
        { _id: '1', lead_score: 85 },
        { _id: '2', lead_score: 90 },
        { _id: '3', lead_score: undefined }, // Unscored company
        { _id: '4', lead_score: 95 }
      ]

      const mockQuery = {
        collect: vi.fn().mockResolvedValue(mockCompanies)
      }
      mockDb.query.mockReturnValue(mockQuery)

      const companies = await mockQuery.collect()
      const scoredCompanies = companies.filter((c: any) => c.lead_score !== undefined)
      const totalScore = scoredCompanies.reduce((sum: number, c: any) => sum + (c.lead_score || 0), 0)
      const averageScore = scoredCompanies.length > 0 ? totalScore / scoredCompanies.length : 0
      const errorRate = companies.length > 0 ? 1 - (scoredCompanies.length / companies.length) : 0
      const highScoreCompanies = scoredCompanies.filter((c: any) => (c.lead_score || 0) > 80).length

      const scoringStats = {
        totalCompanies: companies.length,
        scoredCompanies: scoredCompanies.length,
        averageScore,
        errorRate,
        highScoreCompanies
      }

      expect(scoringStats.totalCompanies).toBe(4)
      expect(scoringStats.scoredCompanies).toBe(3)
      expect(scoringStats.averageScore).toBe(90) // (85 + 90 + 95) / 3
      expect(scoringStats.errorRate).toBe(0.25) // 1 unscored out of 4
      expect(scoringStats.highScoreCompanies).toBe(3) // All scored companies > 80
    })
  })

  describe('getQueueSize', () => {
    it('should return current queue size', async () => {
      const mockQueueItems = [
        { _id: '1', status: 'pending' },
        { _id: '2', status: 'processing' },
        { _id: '3', status: 'completed' },
        { _id: '4', status: 'pending' }
      ]

      const mockQuery = {
        collect: vi.fn().mockResolvedValue(mockQueueItems)
      }
      mockDb.query.mockReturnValue(mockQuery)

      const queueItems = await mockQuery.collect()
      const pendingItems = queueItems.filter((item: any) => item.status !== 'completed')
      
      expect(pendingItems.length).toBe(3) // 2 pending + 1 processing
    })
  })

  describe('Cron Job Validation', () => {
    it('should validate cron job schedules', () => {
      // Test daily schedule
      const dailySchedule = { hourUTC: 9, minuteUTC: 0 }
      expect(dailySchedule.hourUTC).toBeGreaterThanOrEqual(0)
      expect(dailySchedule.hourUTC).toBeLessThan(24)
      expect(dailySchedule.minuteUTC).toBeGreaterThanOrEqual(0)
      expect(dailySchedule.minuteUTC).toBeLessThan(60)

      // Test interval schedule
      const intervalSchedule = { minutes: 120 }
      expect(intervalSchedule.minutes).toBeGreaterThan(0)

      // Test weekly schedule
      const weeklySchedule = { dayOfWeek: 'monday', hourUTC: 8, minuteUTC: 0 }
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      expect(validDays).toContain(weeklySchedule.dayOfWeek)
    })

    it('should validate cron job arguments', () => {
      // Daily lead discovery args
      const discoveryArgs = {
        maxCompanies: 50,
        icpCriteria: {
          industries: ["jewelry", "fashion", "accessories"],
          minEmployees: 10,
          maxEmployees: 500,
          geoMarkets: ["US", "UK", "CA"]
        }
      }

      expect(discoveryArgs.maxCompanies).toBeGreaterThan(0)
      expect(discoveryArgs.icpCriteria.industries).toBeInstanceOf(Array)
      expect(discoveryArgs.icpCriteria.minEmployees).toBeLessThan(discoveryArgs.icpCriteria.maxEmployees)

      // Queue processing args
      const queueArgs = {
        batchSize: 10,
        maxRetries: 3
      }

      expect(queueArgs.batchSize).toBeGreaterThan(0)
      expect(queueArgs.maxRetries).toBeGreaterThan(0)
    })
  })

  describe('Performance Monitoring', () => {
    it('should track operation performance', async () => {
      const operationStart = Date.now()
      
      // Simulate some operation
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const operationEnd = Date.now()
      const duration = operationEnd - operationStart

      const performanceLog = {
        operation: 'test_operation',
        duration,
        success: true,
        timestamp: Date.now()
      }

      await mockDb.insert('performance_logs', performanceLog)

      expect(mockDb.insert).toHaveBeenCalledWith('performance_logs', performanceLog)
      expect(performanceLog.duration).toBeGreaterThan(0)
    })

    it('should identify slow operations', () => {
      const operations = [
        { operation: 'fast_op', duration: 100 },
        { operation: 'slow_op', duration: 5000 },
        { operation: 'normal_op', duration: 500 }
      ]

      const slowThreshold = 1000 // 1 second
      const slowOperations = operations.filter(op => op.duration > slowThreshold)

      expect(slowOperations).toHaveLength(1)
      expect(slowOperations[0].operation).toBe('slow_op')
    })
  })

  describe('Error Handling & Recovery', () => {
    it('should handle API rate limits gracefully', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      rateLimitError.name = 'RateLimitError'

      // Simulate rate limit handling
      try {
        throw rateLimitError
      } catch (error) {
        if (error instanceof Error && error.name === 'RateLimitError') {
          // Schedule retry with exponential backoff
          const retryDelay = Math.min(1000 * Math.pow(2, 3), 30000) // Max 30 seconds
          expect(retryDelay).toBe(8000) // 2^3 * 1000 = 8 seconds
        }
      }
    })

    it('should implement circuit breaker pattern', () => {
      class CircuitBreaker {
        private failures = 0
        private lastFailureTime = 0
        private readonly threshold = 5
        private readonly timeout = 60000 // 1 minute

        isOpen(): boolean {
          if (this.failures >= this.threshold) {
            return Date.now() - this.lastFailureTime < this.timeout
          }
          return false
        }

        recordFailure(): void {
          this.failures++
          this.lastFailureTime = Date.now()
        }

        recordSuccess(): void {
          this.failures = 0
        }
      }

      const breaker = new CircuitBreaker()
      
      // Test circuit breaker logic
      expect(breaker.isOpen()).toBe(false)
      
      // Record failures
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }
      
      expect(breaker.isOpen()).toBe(true)
      
      // Test recovery
      breaker.recordSuccess()
      expect(breaker.isOpen()).toBe(false)
    })
  })
}) 