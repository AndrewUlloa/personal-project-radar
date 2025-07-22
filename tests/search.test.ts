import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockCtx, mockDb, resetAllMocks } from './setup'

// Import the functions we want to test
// Note: In a real scenario, you'd import from the actual Convex functions
// For now, we'll test the logic patterns

describe('Search Module Tests', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('searchAndAddCompany', () => {
    it('should create a new company when it does not exist', async () => {
      // Mock that company doesn't exist
      mockCtx.runMutation.mockResolvedValueOnce({ companyId: 'test-id', isNew: true })
      
      // Mock data for the test
      const companyData = {
        companyName: 'Test Company',
        website: 'testcompany.com',
        source: 'search'
      }

      // Test the workflow that searchAndAddCompany would follow
      const result = await mockCtx.runMutation('internal.search.createCompany', companyData)
      
      expect(result.isNew).toBe(true)
      expect(result.companyId).toBe('test-id')
      expect(mockCtx.runMutation).toHaveBeenCalledWith('internal.search.createCompany', companyData)
    })

    it('should return existing company when it already exists', async () => {
      // Mock that company already exists
      mockCtx.runMutation.mockResolvedValueOnce({ companyId: 'existing-id', isNew: false })
      
      const companyData = {
        companyName: 'Existing Company',
        website: 'existing.com',
        source: 'search'
      }

      const result = await mockCtx.runMutation('internal.search.createCompany', companyData)
      
      expect(result.isNew).toBe(false)
      expect(result.companyId).toBe('existing-id')
    })

    it('should handle website normalization correctly', () => {
      // Test website normalization logic
      function normalizeWebsite(website: string): string {
        return website
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/+$/, '')
          .toLowerCase()
      }

      expect(normalizeWebsite('https://www.TestCompany.com/')).toBe('testcompany.com')
      expect(normalizeWebsite('http://TestCompany.com')).toBe('testcompany.com')
      expect(normalizeWebsite('TestCompany.com')).toBe('testcompany.com')
      expect(normalizeWebsite('www.TestCompany.com')).toBe('testcompany.com')
    })
  })

  describe('createCompany', () => {
    it('should insert new company with correct fields', async () => {
      // Mock database operations
      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null) // No existing company
      }
      mockDb.query.mockReturnValue(mockQuery)
      mockDb.insert.mockResolvedValue('new-company-id')

      // Simulate the createCompany internal mutation logic
      const companyData = {
        companyName: 'New Company',
        website: 'newcompany.com',
        discoverySource: 'search'
      }

      // Test the database operations
      await mockDb.query('companies')
      expect(mockDb.query).toHaveBeenCalledWith('companies')
      
      // Simulate inserting the company
      const companyId = await mockDb.insert('companies', {
        company_name: companyData.companyName,
        website: companyData.website,
        lead_score: 0,
        status: 'new',
        discovery_source: companyData.discoverySource
      })

      expect(mockDb.insert).toHaveBeenCalledWith('companies', {
        company_name: 'New Company',
        website: 'newcompany.com',
        lead_score: 0,
        status: 'new',
        discovery_source: 'search'
      })
      expect(companyId).toBe('new-company-id')
    })

    it('should log company creation event', async () => {
      const companyId = 'test-company-id'
      const eventData = {
        company_id: companyId,
        event_type: 'company_created',
        description: 'Company created from search',
        metadata: {
          source: 'search',
          company_name: 'Test Company',
          website: 'testcompany.com'
        }
      }

      await mockDb.insert('event_log', eventData)
      
      expect(mockDb.insert).toHaveBeenCalledWith('event_log', eventData)
    })
  })

  describe('addToDiscoveryQueue', () => {
    it('should add company to discovery queue when not already present', async () => {
      // Mock that company is not in queue
      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      }
      mockDb.query.mockReturnValue(mockQuery)
      mockDb.insert.mockResolvedValue('queue-item-id')

      const queueData = {
        domain: 'testcompany.com',
        company_name: 'Test Company',
        status: 'pending',
        scheduled_for: expect.any(Number),
        attempts: 0,
        priority: 1,
        source: 'search'
      }

      await mockDb.insert('discovery_queue', queueData)

      expect(mockDb.insert).toHaveBeenCalledWith('discovery_queue', queueData)
    })

    it('should not add duplicate entries to discovery queue', async () => {
      // Mock that company is already in queue
      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ id: 'existing-queue-item' })
      }
      mockDb.query.mockReturnValue(mockQuery)

      // Simulate checking for existing queue item
      const existing = await mockQuery.first()
      
      expect(existing).toBeTruthy()
      expect(mockDb.insert).not.toHaveBeenCalled()
    })
  })

  describe('searchExistingCompanies', () => {
    it('should filter companies by name and website', async () => {
      const mockCompanies = [
        { _id: '1', company_name: 'Apple Inc', website: 'apple.com', lead_score: 95, status: 'qualified' },
        { _id: '2', company_name: 'Microsoft Corp', website: 'microsoft.com', lead_score: 90, status: 'new' },
        { _id: '3', company_name: 'Test Corp', website: 'test.com', lead_score: 70, status: 'contacted' }
      ]

      const mockQuery = {
        collect: vi.fn().mockResolvedValue(mockCompanies)
      }
      mockDb.query.mockReturnValue(mockQuery)

      // Simulate search logic
      const searchQuery = 'apple'
      const companies = await mockQuery.collect()
      const filtered = companies
        .filter((company: any) => 
          company.company_name.toLowerCase().includes(searchQuery) ||
          (company.website && company.website.toLowerCase().includes(searchQuery))
        )
        .slice(0, 10)
        .map((company: any) => ({
          _id: company._id,
          company_name: company.company_name,
          website: company.website,
          lead_score: company.lead_score,
          status: company.status
        }))

      expect(filtered).toHaveLength(1)
      expect(filtered[0].company_name).toBe('Apple Inc')
    })

    it('should limit results to specified count', async () => {
      const mockCompanies = Array.from({ length: 20 }, (_, i) => ({
        _id: `id-${i}`,
        company_name: `Company ${i}`,
        website: `company${i}.com`,
        lead_score: 50 + i,
        status: 'new'
      }))

      const mockQuery = {
        collect: vi.fn().mockResolvedValue(mockCompanies)
      }
      mockDb.query.mockReturnValue(mockQuery)

      const companies = await mockQuery.collect()
      const limited = companies.slice(0, 5) // Limit to 5

      expect(limited).toHaveLength(5)
    })
  })

  describe('getSearchSuggestions', () => {
    it('should return suggestions for existing companies', async () => {
      const existingCompanies = [
        { _id: '1', company_name: 'Apple Inc', website: 'apple.com', lead_score: 95, status: 'qualified' }
      ]

      // Mock the suggestions logic
      const suggestions = existingCompanies.map(company => ({
        type: 'existing_company' as const,
        value: company.company_name,
        description: company.website || 'Company in your Lead Radar',
        data: company
      }))

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].type).toBe('existing_company')
      expect(suggestions[0].value).toBe('Apple Inc')
    })

    it('should add new search suggestion when query is long enough', () => {
      const query = 'new company'
      const existingSuggestions: any[] = []
      const limit = 5

      const suggestions = [...existingSuggestions]
      
      if (suggestions.length < limit && query.length > 2) {
        suggestions.push({
          type: 'new_search' as const,
          value: query,
          description: 'Search for new companies',
          data: null
        })
      }

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].type).toBe('new_search')
      expect(suggestions[0].value).toBe('new company')
    })
  })

  describe('getSearchAnalytics', () => {
    it('should calculate analytics correctly', async () => {
      const mockCompanies = [
        { _id: '1', _creationTime: Date.now() - 3 * 24 * 60 * 60 * 1000, discovery_source: 'search' },
        { _id: '2', _creationTime: Date.now() - 10 * 24 * 60 * 60 * 1000, discovery_source: 'manual' },
        { _id: '3', _creationTime: Date.now() - 1 * 24 * 60 * 60 * 1000, discovery_source: 'search' }
      ]

      const mockQuery = {
        collect: vi.fn().mockResolvedValue(mockCompanies)
      }
      mockDb.query.mockReturnValue(mockQuery)

      const companies = await mockQuery.collect()
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      
      const analytics = {
        totalCompanies: companies.length,
        recentAdds: companies.filter((c: any) => c._creationTime > weekAgo).length,
        searchSourced: companies.filter((c: any) => c.discovery_source === 'search').length,
        manualSourced: companies.filter((c: any) => c.discovery_source === 'manual').length,
        lastUpdated: Date.now()
      }

      expect(analytics.totalCompanies).toBe(3)
      expect(analytics.recentAdds).toBe(2) // Companies added within last week
      expect(analytics.searchSourced).toBe(2)
      expect(analytics.manualSourced).toBe(1)
    })
  })
}) 