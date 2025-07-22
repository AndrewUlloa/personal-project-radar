// Lead Research types and data structures for Nivoda's jewelry retailer leads

export interface LeadItem {
  id: string;
  companyName: string;
  website: string;
  logoUrl?: string;
  geoMarket: string;
  leadScore: number;
  arpuBand: 'High' | 'Mid' | 'Low';
  keySignals: string[];
  sizeFTE: string;
  lastActivity: {
    type: string;
    description: string;
    timeAgo: string;
  };
  status: 'new' | 'contacted' | 'qualified' | 'opportunity' | 'dead';
  assignedTo?: string;
  estimatedARPU: number;
  addedAt: Date;
  
  // Rich context data for details drawer
  overview: {
    address: string;
    industry: string;
    founded?: number;
    description: string;
  };
  
  timeline: Array<{
    id: string;
    type: 'score_change' | 'news_hit' | 'activity' | 'note';
    description: string;
    timestamp: Date;
    metadata?: any;
  }>;
  
  rationale: {
    explanation: string;
    factors: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight: number;
    }>;
  };
  
  rawData: {
    enrichment: any;
    scoreFeatures: any;
  };
}

// Sample lead data based on Nivoda's jewelry retailer use case
export const sampleLeadData: LeadItem[] = [
  {
    id: "1",
    companyName: "Brilliant Diamonds Ltd",
    website: "brilliantdiamonds.co.uk",
    logoUrl: undefined,
    geoMarket: "UK",
    leadScore: 87,
    arpuBand: "High",
    keySignals: ["ICP Match", "High AOV", "Showroom User"],
    sizeFTE: "25-50",
    lastActivity: {
      type: "showroom_usage",
      description: "Active in Nivoda Showroom",
      timeAgo: "2h ago"
    },
    status: "new",
    estimatedARPU: 15000,
    addedAt: new Date(),
    overview: {
      address: "London, UK",
      industry: "Luxury Jewelry",
      founded: 2018,
      description: "Premium diamond retailer with multiple UK locations specializing in engagement rings and certified diamonds. Strong e-commerce presence with growing showroom footprint."
    },
    timeline: [
      {
        id: "t1",
        type: "score_change",
        description: "Health score increased +12 points",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        metadata: { oldScore: 75, newScore: 87 }
      },
      {
        id: "t2", 
        type: "activity",
        description: "Showroom session: 45min browsing premium diamonds",
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
      }
    ],
    rationale: {
      explanation: "High-value jewelry partner with strong GMV potential. Expanding market presence and technology adoption indicate readiness for Nivoda's diamond sourcing platform. Strong fit for premium inventory access.",
      factors: [
        { factor: "GMV Potential", impact: "positive", weight: 0.25 },
        { factor: "Technology Readiness", impact: "positive", weight: 0.20 },
        { factor: "Market Expansion", impact: "positive", weight: 0.30 },
        { factor: "Partnership Fit", impact: "positive", weight: 0.15 }
      ]
    },
    rawData: {
      enrichment: { 
        employees: 45, 
        revenue: "£2-5M", 
        technology: ["Shopify", "Klaviyo"], 
        inventory_focus: "Premium diamonds", 
        sourcing_frequency: "Weekly",
        avg_order_value: "£2,500"
      },
      scoreFeatures: { growth_rate: 0.35, tech_adoption: 0.8, market_presence: 0.7, nivoda_fit: 0.85 }
    }
  },
  {
    id: "2",
    companyName: "Heritage Jewelers",
    website: "heritagejewelers.com",
    geoMarket: "UAE",
    leadScore: 72,
    arpuBand: "Mid",
    keySignals: ["Family Business", "High Growth Signals", "API Integration"],
    sizeFTE: "10-25",
    lastActivity: {
      type: "kyc_progress",
      description: "KYC documentation submitted",
      timeAgo: "1d ago"
    },
    status: "new",
    estimatedARPU: 8500,
    addedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    overview: {
      address: "Dubai, UAE",
      industry: "Traditional Jewelry",
      founded: 1995,
      description: "Established family jewelry business serving Middle East market with focus on traditional gold jewelry and custom designs. Growing interest in diamond sourcing."
    },
    timeline: [
      {
        id: "t3",
        type: "activity",
        description: "Completed KYC verification process",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ],
    rationale: {
      explanation: "Established jewelry business with growth signals. Traditional family operation showing modernization efforts. Good candidate for Nivoda's sourcing solutions to support expansion.",
      factors: [
        { factor: "Market Position", impact: "positive", weight: 0.20 },
        { factor: "Digital Adoption", impact: "neutral", weight: 0.25 },
        { factor: "Geographic Market", impact: "positive", weight: 0.30 }
      ]
    },
    rawData: {
      enrichment: { 
        employees: 18, 
        revenue: "$1-3M", 
        location: "Dubai Mall",
        inventory_focus: "Gold jewelry, growing diamonds",
        sourcing_pattern: "Quarterly bulk orders",
        avg_order_value: "$800"
      },
      scoreFeatures: { stability: 0.85, growth_potential: 0.6, nivoda_readiness: 0.55 }
    }
  },
  {
    id: "3",
    companyName: "Sparkle & Shine",
    website: "sparkleshine.de",
    geoMarket: "Germany",
    leadScore: 45,
    arpuBand: "Low",
    keySignals: ["Small Scale", "Manual Processes", "Price Sensitive"],
    sizeFTE: "1-5",
    lastActivity: {
      type: "website_activity",
      description: "API documentation viewed",
      timeAgo: "3d ago"
    },
    status: "new",
    estimatedARPU: 2500,
    addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    overview: {
      address: "Berlin, Germany",
      industry: "Fashion Jewelry",
      founded: 2020,
      description: "Small online jewelry retailer focusing on affordable fashion pieces and lab-grown diamonds. Primarily e-commerce with social media marketing focus."
    },
    timeline: [
      {
        id: "t4",
        type: "activity",
        description: "Researched API integration documentation",
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ],
    rationale: {
      explanation: "Small-scale jewelry retailer with limited tech adoption. Lower GMV potential but may benefit from entry-level inventory access to compete in affordable jewelry market.",
      factors: [
        { factor: "Business Size", impact: "negative", weight: 0.30 },
        { factor: "Market Segment", impact: "negative", weight: 0.25 },
        { factor: "Growth Stage", impact: "neutral", weight: 0.20 }
      ]
    },
    rawData: {
      enrichment: { 
        employees: 3, 
        revenue: "€50K-100K", 
        platform: "WooCommerce",
        inventory_focus: "Fashion jewelry, lab-grown",
        sourcing_frequency: "Monthly small orders",
        avg_order_value: "€85"
      },
      scoreFeatures: { size_score: 0.2, tech_score: 0.3, partnership_potential: 0.25 }
    }
  },
  {
    id: "4",
    companyName: "Elite Diamonds NYC",
    website: "elitediamonds.nyc",
    geoMarket: "USA",
    leadScore: 91,
    arpuBand: "High",
    keySignals: ["ICP Match", "High Volume", "API Integrated"],
    sizeFTE: "50-100",
    lastActivity: {
      type: "score_change",
      description: "Health score +8 (funding news)",
      timeAgo: "6h ago"
    },
    status: "qualified",
    assignedTo: "Sarah Chen",
    estimatedARPU: 25000,
    addedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    overview: {
      address: "New York, USA",
      industry: "Luxury Diamonds",
      founded: 2012,
      description: "High-end diamond retailer with flagship Manhattan store specializing in rare and exceptional diamonds. Celebrity clientele and custom design services."
    },
    timeline: [
      {
        id: "t5",
        type: "score_change",
        description: "Health score increased +8 points due to funding news",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        id: "t6",
        type: "note",
        description: "Partnership discussion initiated by Sarah",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ],
    rationale: {
      explanation: "Premium diamond retailer with exceptional GMV potential. High-end market positioning and technology adoption make this an ideal partner for Nivoda's luxury inventory and API integration.",
      factors: [
        { factor: "GMV Potential", impact: "positive", weight: 0.35 },
        { factor: "Luxury Market Focus", impact: "positive", weight: 0.25 },
        { factor: "Technology Integration", impact: "positive", weight: 0.20 }
      ]
    },
    rawData: {
      enrichment: { 
        employees: 75, 
        revenue: "$10M+", 
        funding: "$2M Series A",
        inventory_focus: "Rare diamonds, custom pieces",
        sourcing_pattern: "Daily high-value sourcing",
        avg_order_value: "$15,000",
        api_interest: "High - custom integration planned"
      },
      scoreFeatures: { premium_score: 0.95, tech_adoption: 0.9, revenue_score: 0.85, nivoda_strategic_fit: 0.95 }
    }
  }
]; 