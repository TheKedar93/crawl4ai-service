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

export const defaultCrawlOptions: CrawlOptions = {
  maxDepth: 2,
  maxPages: 10,
  ignoreRobotsTxt: true,
  timeout: 10000,
  userAgent: 'StockAdvisorAI/1.0',
  sources: ['finviz', 'capitoltrades']
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

  // Crawl CapitolTrades for political trading data
  static async crawlCapitolTrades(options: Partial<CrawlOptions> = {}): Promise<CrawlResult[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawl/capitoltrades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ options }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to crawl CapitolTrades: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Error in crawlCapitolTrades:', error);
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