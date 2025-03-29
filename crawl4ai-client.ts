import { Platform } from 'react-native';

// Define types from the original service
export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  links: string[];
  timestamp: number;
  metadata?: any;
}

export interface CrawlOptions {
  maxDepth: number;
  maxPages: number;
  ignoreRobotsTxt: boolean;
  timeout: number;
  userAgent: string;
  sources: string[];
}

export interface PoliticalTrade {
  id: string;
  representative?: {
    name: string;
    party: string;
    state: string;
    district?: string;
  };
  senator?: {
    name: string;
    party: string;
    state: string;
  };
  transaction_date: string;
  disclosure_date: string;
  ticker: string;
  company: string;
  type: string;
  amount: string;
  comment: string;
}

export interface Politician {
  name: string;
  party: string;
  state: string;
  district?: string; // House only
  trades_count: number;
  total_value?: number;
}

export const defaultCrawlOptions: CrawlOptions = {
  maxDepth: 2,
  maxPages: 10,
  ignoreRobotsTxt: true,
  timeout: 10000,
  userAgent: 'StockAdvisorAI/1.0',
  sources: ['finviz', 'political']
};

// Define the base URL for the API
// Replace this with your actual Render service URL after deployment
const API_BASE_URL = 'https://crawl4ai-service.onrender.com';

// Client implementation of the Crawl4AI service
export class Crawl4AIClient {
  // Crawl Finviz for financial data
  static async crawlFinviz(options: Partial<CrawlOptions> = {}): Promise<CrawlResult[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawl/finviz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ options }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to crawl Finviz: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Error in crawlFinviz:', error);
      throw error;
    }
  }

  // Get all political trades (House and Senate)
  static async getPoliticalTrades(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/political/trades`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch political trades: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching political trades:', error);
      throw error;
    }
  }

  // Get House representative trades
  static async getHouseTrades(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/political/house/trades`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch House trades: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching House trades:', error);
      throw error;
    }
  }

  // Get Senate trades
  static async getSenateTrades(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/political/senate/trades`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Senate trades: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching Senate trades:', error);
      throw error;
    }
  }

  // Get politician profiles
  static async getPoliticians(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/political/politicians`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch politicians: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching politicians:', error);
      throw error;
    }
  }

  // Generic crawl method
  static async crawl(seedUrls: string[], options: Partial<CrawlOptions> = {}): Promise<CrawlResult[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seedUrls, options }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to crawl URLs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Error in crawl:', error);
      throw error;
    }
  }

  // Get crawler status
  static async getStatus(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawl/status`);
      
      if (!response.ok) {
        throw new Error(`Failed to get crawler status: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting crawler status:', error);
      throw error;
    }
  }
}

// Function to check if we should use the server or local implementation
export const shouldUseServer = (): boolean => {
  // On web we use server, on native we can choose
  if (Platform.OS === 'web') return true;
  
  // You can add logic here to determine if you want to use 
  // the server or local implementation on native platforms
  return true; // Default to using server for consistency
};