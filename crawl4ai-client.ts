/**
 * Crawl4AI Client
 * TypeScript client for interacting with the Crawl4AI service.
 */

/**
 * Stock data interface representing data from Finviz
 */
export interface StockData {
  ticker: string;
  data: {
    [key: string]: any;
    fullName?: string;
    currentPrice?: string;
    news?: Array<{
      title: string;
      url: string;
    }>;
  };
  timestamp: string;
}

/**
 * Political trade interface
 */
export interface PoliticalTrade {
  id: string;
  type: 'house' | 'senate';
  politician: string;
  transaction_date: string;
  ticker: string;
  asset_description: string;
  transaction_type: string;
  amount: string;
  comment?: string;
  scraped_at: string;
  data_source: string;
}

/**
 * Politician profile interface
 */
export interface Politician {
  id: string;
  name: string;
  state: string;
  party: string;
  chamber: 'house' | 'senate';
  district?: string;
  data_source: string;
}

/**
 * Configuration options for the Crawl4AI client
 */
export interface Crawl4AIConfig {
  /** Base URL for the API */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Response structure for political trades
 */
export interface PoliticalTradesResponse {
  success: boolean;
  data: PoliticalTrade[];
  count: number;
  house_count?: number;
  senate_count?: number;
  timestamp: string;
}

/**
 * Response structure for politicians
 */
export interface PoliticiansResponse {
  success: boolean;
  data: Politician[];
  count: number;
  chamber: string;
  timestamp: string;
}

/**
 * Crawl4AI Client class
 */
export class Crawl4AIClient {
  private baseUrl: string;
  private timeout: number;

  /**
   * Creates an instance of the Crawl4AI client.
   * @param config - Configuration options
   */
  constructor(config: Crawl4AIConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://crawl4ai-service.onrender.com';
    this.timeout = config.timeout || 30000;
  }

  /**
   * Get stock data from Finviz
   * @param ticker - Stock ticker symbol
   * @returns Promise with stock data
   */
  async getStockData(ticker: string): Promise<StockData> {
    if (!ticker) {
      throw new Error('Ticker symbol is required');
    }

    const response = await fetch(`${this.baseUrl}/api/crawl-finviz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticker }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to fetch stock data for ${ticker}`);
    }

    return await response.json();
  }

  /**
   * Get House stock trades
   * @returns Promise with House trades data
   */
  async getHouseTrades(): Promise<PoliticalTradesResponse> {
    const response = await fetch(`${this.baseUrl}/api/house-trades`, {
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch House trades');
    }

    return await response.json();
  }

  /**
   * Get Senate stock trades
   * @returns Promise with Senate trades data
   */
  async getSenateTrades(): Promise<PoliticalTradesResponse> {
    const response = await fetch(`${this.baseUrl}/api/senate-trades`, {
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch Senate trades');
    }

    return await response.json();
  }

  /**
   * Get all congressional trades (House and Senate combined)
   * @returns Promise with all congressional trades data
   */
  async getCongressionalTrades(): Promise<PoliticalTradesResponse> {
    const response = await fetch(`${this.baseUrl}/api/congressional-trades`, {
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch congressional trades');
    }

    return await response.json();
  }

  /**
   * Get politicians by chamber
   * @param chamber - 'house', 'senate', or 'all'
   * @returns Promise with politicians data
   */
  async getPoliticians(chamber: 'house' | 'senate' | 'all' = 'all'): Promise<PoliticiansResponse> {
    const response = await fetch(`${this.baseUrl}/api/politicians?chamber=${chamber}`, {
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch politicians');
    }

    return await response.json();
  }

  /**
   * Health check for the service
   * @returns Promise with health status
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    const response = await fetch(`${this.baseUrl}/api/health`, {
      signal: AbortSignal.timeout(5000), // Shorter timeout for health check
    });

    if (!response.ok) {
      throw new Error('Service health check failed');
    }

    return await response.json();
  }
}

export default Crawl4AIClient;