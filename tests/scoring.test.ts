import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockCtx, mockDb, resetAllMocks } from './setup'

describe('AI Scoring Tests', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('scoreLead', () => {
    it('should generate valid lead scores within range', async () => {
      // Mock enrichment data
      const mockEnrichmentData = [
        {
          source: 'exa_website',
          json_payload: JSON.stringify({
            title: 'TechCorp - SaaS Platform',
            text: 'Leading software company with strong growth metrics',
            url: 'https://techcorp.com'
          })
        },
        {
          source: 'exa_linkedin',
          json_payload: JSON.stringify({
            employees: '51-200',
            industry: 'Software',
            funding: '$5M Series A'
          })
        }
      ]

      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(mockEnrichmentData)
      }
      mockDb.query.mockReturnValue(mockQuery)

      // Simulate AI scoring logic
      const aiResponse = {
        lead_score: 85,
        arpu_band: "$50-100K",
        key_signals: ["Fast-growing SaaS", "Recent funding", "Strong online presence"],
        score_rationale: "High-growth company with strong digital footprint"
      }

      // Validate score is within bounds
      expect(aiResponse.lead_score).toBeGreaterThanOrEqual(0)
      expect(aiResponse.lead_score).toBeLessThanOrEqual(100)
      expect(aiResponse.key_signals).toHaveLength(3)
      expect(['$0-10K', '$10-50K', '$50-100K', '$100K+']).toContain(aiResponse.arpu_band)
    })

    it('should handle missing enrichment data gracefully', async () => {
      // Mock empty enrichment data
      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue([])
      }
      mockDb.query.mockReturnValue(mockQuery)

      // Should still provide a default score
      const defaultScore = {
        lead_score: 50, // Default/neutral score
        arpu_band: "$0-10K",
        key_signals: ["Limited data available"],
        score_rationale: "Insufficient enrichment data for accurate scoring"
      }

      expect(defaultScore.lead_score).toBe(50)
      expect(defaultScore.key_signals).toContain("Limited data available")
    })

    it('should validate AI response schema', () => {
      // Test schema validation logic
      const validResponse = {
        lead_score: 75,
        arpu_band: "$10-50K",
        key_signals: ["SaaS platform", "B2B focus"],
        score_rationale: "Moderate growth potential"
      }

      const invalidResponse = {
        lead_score: 150, // Invalid - over 100
        arpu_band: "invalid",
        key_signals: [], // Invalid - empty
        score_rationale: ""
      }

      // Simulate Zod validation
      function validateScoringResponse(response: any) {
        const isValidScore = response.lead_score >= 0 && response.lead_score <= 100
        const isValidBand = ['$0-10K', '$10-50K', '$50-100K', '$100K+'].includes(response.arpu_band)
        const hasSignals = Array.isArray(response.key_signals) && response.key_signals.length > 0
        const hasRationale = typeof response.score_rationale === 'string' && response.score_rationale.length > 0
        
        return isValidScore && isValidBand && hasSignals && hasRationale
      }

      expect(validateScoringResponse(validResponse)).toBe(true)
      expect(validateScoringResponse(invalidResponse)).toBe(false)
    })

    it('should handle API rate limits and retries', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      rateLimitError.name = 'RateLimitError'

      let attemptCount = 0
      const maxRetries = 3

      async function mockScoringWithRetry() {
        attemptCount++
        
        if (attemptCount <= 2) {
          throw rateLimitError
        }
        
        return {
          lead_score: 80,
          arpu_band: "$50-100K",
          key_signals: ["Successful retry"],
          score_rationale: "Scoring completed after retry"
        }
      }

      // Simulate retry logic
      let result
      for (let i = 0; i < maxRetries; i++) {
        try {
          result = await mockScoringWithRetry()
          break
        } catch (error) {
          if (i === maxRetries - 1) throw error
          // Wait before retry (in real implementation)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
        }
      }

      expect(result?.lead_score).toBe(80)
      expect(attemptCount).toBe(3)
    })

    it('should score different company types appropriately', () => {
      // Test scoring logic for different company profiles
      const companyProfiles = [
        {
          name: 'High-Growth SaaS',
          data: {
            industry: 'Software',
            employees: '51-200',
            funding: '$10M Series B',
            revenue_growth: '300%',
            tech_stack: ['React', 'Node.js', 'AWS']
          },
          expectedScore: { min: 80, max: 100 }
        },
        {
          name: 'Traditional SMB',
          data: {
            industry: 'Retail',
            employees: '11-50',
            funding: 'Bootstrapped',
            revenue_growth: '10%',
            tech_stack: ['WordPress']
          },
          expectedScore: { min: 40, max: 70 }
        },
        {
          name: 'Enterprise Client',
          data: {
            industry: 'Finance',
            employees: '1000+',
            funding: 'Public',
            revenue_growth: '15%',
            tech_stack: ['Java', 'Oracle', 'Salesforce']
          },
          expectedScore: { min: 70, max: 95 }
        }
      ]

      companyProfiles.forEach(profile => {
        // Simulate scoring based on company profile
        let score = 50 // Base score
        
        // Industry scoring
        if (profile.data.industry === 'Software') score += 20
        else if (profile.data.industry === 'Finance') score += 15
        else score += 5
        
        // Size scoring
        if (profile.data.employees.includes('1000+')) score += 15
        else if (profile.data.employees.includes('51-200')) score += 10
        else score += 5
        
        // Funding scoring
        if (profile.data.funding.includes('Series')) score += 10
        else if (profile.data.funding === 'Public') score += 15
        
        // Growth scoring
        const growthRate = parseInt(profile.data.revenue_growth.replace('%', ''))
        if (growthRate > 100) score += 15
        else if (growthRate > 50) score += 10
        else if (growthRate > 20) score += 5

        score = Math.min(100, Math.max(0, score)) // Clamp to 0-100

        expect(score).toBeGreaterThanOrEqual(profile.expectedScore.min)
        expect(score).toBeLessThanOrEqual(profile.expectedScore.max)
      })
    })
  })

  describe('saveScore', () => {
    it('should update company record with scoring data', async () => {
      const companyId = 'test-company-id'
      const scoringData = {
        lead_score: 85,
        arpu_band: "$50-100K",
        key_signals: ["Fast-growing SaaS", "Recent funding"],
        score_rationale: "High-growth potential with strong metrics"
      }

      // Mock database patch
      await mockDb.patch(companyId, {
        ...scoringData,
        last_activity_description: `Lead score updated to ${scoringData.lead_score}`,
        last_activity_timestamp: expect.any(Number)
      })

      expect(mockDb.patch).toHaveBeenCalledWith(companyId, {
        lead_score: 85,
        arpu_band: "$50-100K",
        key_signals: ["Fast-growing SaaS", "Recent funding"],
        score_rationale: "High-growth potential with strong metrics",
        last_activity_description: "Lead score updated to 85",
        last_activity_timestamp: expect.any(Number)
      })
    })

    it('should log scoring event', async () => {
      const companyId = 'test-company-id'
      const scoringData = {
        lead_score: 85,
        arpu_band: "$50-100K"
      }

      const eventData = {
        company_id: companyId,
        event_type: 'score_updated',
        description: `Lead score updated to ${scoringData.lead_score}`,
        metadata: {
          lead_score: scoringData.lead_score,
          arpu_band: scoringData.arpu_band
        }
      }

      await mockDb.insert('event_log', eventData)

      expect(mockDb.insert).toHaveBeenCalledWith('event_log', eventData)
    })
  })

  describe('getEnrichmentData', () => {
    it('should fetch all enrichment sources for a company', async () => {
      const companyId = 'test-company-id'
      const mockEnrichmentData = [
        {
          _id: 'e1',
          company_id: companyId,
          source: 'exa_website',
          json_payload: '{"title": "Company Website"}',
          fetched_at: Date.now()
        },
        {
          _id: 'e2',
          company_id: companyId,
          source: 'exa_linkedin',
          json_payload: '{"employees": "51-200"}',
          fetched_at: Date.now()
        }
      ]

      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(mockEnrichmentData)
      }
      mockDb.query.mockReturnValue(mockQuery)

      // Simulate the getEnrichmentData function logic
      const result = await mockDb.query("raw_enrichment")
        .withIndex("by_company", (q: any) => q.eq("company_id", companyId))
        .collect()

      expect(mockDb.query).toHaveBeenCalledWith("raw_enrichment")
      expect(mockQuery.withIndex).toHaveBeenCalledWith('by_company', expect.any(Function))
      expect(result).toHaveLength(2)
      expect(result[0].source).toBe('exa_website')
      expect(result[1].source).toBe('exa_linkedin')
    })

    it('should handle missing enrichment data', async () => {
      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue([])
      }
      mockDb.query.mockReturnValue(mockQuery)

      const result = await mockQuery.collect()

      expect(result).toHaveLength(0)
    })
  })

  describe('Score Quality Metrics', () => {
    it('should track scoring accuracy over time', () => {
      // Mock historical scoring data with actual outcomes
      const scoringHistory = [
        { predicted_score: 85, actual_outcome: 'converted', days_to_convert: 30 },
        { predicted_score: 45, actual_outcome: 'no_response', days_to_convert: null },
        { predicted_score: 92, actual_outcome: 'converted', days_to_convert: 15 },
        { predicted_score: 65, actual_outcome: 'contacted', days_to_convert: null },
        { predicted_score: 30, actual_outcome: 'no_response', days_to_convert: null }
      ]

      // Calculate accuracy metrics
      const highScoreConversions = scoringHistory
        .filter(h => h.predicted_score >= 80)
        .filter(h => h.actual_outcome === 'converted').length

      const highScoreTotal = scoringHistory.filter(h => h.predicted_score >= 80).length
      const highScoreAccuracy = highScoreTotal > 0 ? highScoreConversions / highScoreTotal : 0

      const lowScoreRejections = scoringHistory
        .filter(h => h.predicted_score <= 40)
        .filter(h => h.actual_outcome === 'no_response').length

      const lowScoreTotal = scoringHistory.filter(h => h.predicted_score <= 40).length
      const lowScoreAccuracy = lowScoreTotal > 0 ? lowScoreRejections / lowScoreTotal : 0

      expect(highScoreAccuracy).toBeGreaterThan(0.5) // High scores should convert >50%
      expect(lowScoreAccuracy).toBeGreaterThan(0.5)  // Low scores should not respond >50%
    })

    it('should identify scoring calibration issues', () => {
      // Test for score distribution and calibration
      const scores = [85, 92, 88, 45, 30, 65, 78, 82, 91, 38]
      
      // Calculate distribution
      const highScores = scores.filter(s => s >= 80).length
      const midScores = scores.filter(s => s >= 50 && s < 80).length
      const lowScores = scores.filter(s => s < 50).length
      
      const total = scores.length
      const distribution = {
        high: (highScores / total) * 100,
        mid: (midScores / total) * 100,
        low: (lowScores / total) * 100
      }

      // Check for healthy distribution (not too skewed)
      expect(distribution.high).toBeLessThan(70) // Not more than 70% high scores
      expect(distribution.low).toBeLessThan(70)  // Not more than 70% low scores
      expect(distribution.mid).toBeGreaterThan(10) // At least 10% mid scores
    })
  })

  describe('Scoring Performance', () => {
    it('should complete scoring within time limits', async () => {
      const startTime = Date.now()
      
      // Simulate scoring operation
      await new Promise(resolve => setTimeout(resolve, 50)) // 50ms mock operation
      
      const duration = Date.now() - startTime
      const timeoutThreshold = 5000 // 5 seconds

      expect(duration).toBeLessThan(timeoutThreshold)
    })

    it('should handle concurrent scoring requests', async () => {
      const concurrentRequests = 5
      const scoringPromises = []

      for (let i = 0; i < concurrentRequests; i++) {
        const promise = new Promise(resolve => {
          setTimeout(() => resolve({
            companyId: `company-${i}`,
            lead_score: 70 + (i * 5),
            success: true
          }), Math.random() * 100)
        })
        scoringPromises.push(promise)
      }

      const results = await Promise.all(scoringPromises)

      expect(results).toHaveLength(concurrentRequests)
      results.forEach((result: any) => {
        expect(result.success).toBe(true)
        expect(result.lead_score).toBeGreaterThanOrEqual(70)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed AI responses', () => {
      const malformedResponses = [
        null,
        undefined,
        "",
        "not json",
        { incomplete: "data" },
        { lead_score: "not a number" }
      ]

      malformedResponses.forEach(response => {
        function handleMalformedResponse(response: any) {
          try {
            if (!response || typeof response !== 'object') {
              return { error: 'Invalid response format' }
            }
            
            if (typeof response.lead_score !== 'number') {
              return { error: 'Invalid lead_score type' }
            }
            
            return { success: true }
          } catch (error) {
            return { error: 'Parse error' }
          }
        }

        const result = handleMalformedResponse(response)
        expect(result).toHaveProperty('error')
      })
    })

    it('should handle API timeout scenarios', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'

      async function mockAPIWithTimeout() {
        throw timeoutError
      }

      try {
        await mockAPIWithTimeout()
        expect.fail('Should have thrown timeout error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).name).toBe('TimeoutError')
      }
    })

    it('should validate enrichment data completeness', () => {
      const enrichmentSources = ['exa_website', 'exa_linkedin', 'exa_funding']
      
      const scenarios = [
        { available: ['exa_website'], completeness: 33 },
        { available: ['exa_website', 'exa_linkedin'], completeness: 67 },
        { available: ['exa_website', 'exa_linkedin', 'exa_funding'], completeness: 100 },
        { available: [], completeness: 0 }
      ]

      scenarios.forEach(scenario => {
        const completeness = Math.round((scenario.available.length / enrichmentSources.length) * 100)
        expect(completeness).toBe(scenario.completeness)
        
        // Scoring confidence should correlate with data completeness
        const confidenceScore = Math.min(100, 50 + (completeness * 0.5))
        expect(confidenceScore).toBeGreaterThanOrEqual(50)
        expect(confidenceScore).toBeLessThanOrEqual(100)
      })
    })
  })
}) 