/**
 * Crawl4AI Client
 * A TypeScript client for the Crawl4AI service
 */

// Types
export interface StockData {
  ticker: string;
  basicInfo: Record<string, string>;
  news: {
    dateTime: string;
    title: string;
    url: string;
  }[];
  insiderTrading: {
    owner: string;
    relationship: string;
    date: string;
    transaction: string;
    cost: string;
    shares: string;
    value: string;
    sharesTotal: string;
    secForm: string;
  }[];
  scrapedAt: string;
}

export interface PoliticalTrade {
  id: string;
  type: 'house' | 'senate';
  politician: string;
  transaction_date: string;
  ticker: string;
  asset_description: string;
  transaction_type: string;
  amount?: string;
  comment?: string;
}

export interface Politician {
  id: string;
  type: 'house' | 'senate';
  name: string;
  party: string;
  state: string;
  district?: string;
}

export interface PoliticalTradesData {
  houseTrades: PoliticalTrade[];
  senateTrades: PoliticalTrade[];
  combinedTrades: PoliticalTrade[];
  timestamp: number;
}

export interface PoliticiansData {
  representatives: Politician[];
  senators: Politician[];
  combinedPoliticians: Politician[];
  timestamp: number;
}

export class Crawl4AIClient {
  private baseUrl: string;

  /**
   * Create a new Crawl4AI client
   * @param baseUrl The base URL of the Crawl4AI service
   */
  constructor(baseUrl: string = 'https://crawl4ai-service.onrender.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Set a new base URL
   * @param baseUrl The new base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * Get the current base URL
   * @returns The current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Fetch stock data from Finviz
   * @param ticker The stock ticker symbol
   * @returns Promise with stock data
   */
  async getStockData(ticker: string): Promise<StockData> {
    const response = await fetch(`${this.baseUrl}/api/stock/${ticker}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stock data: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Get all political trades (both House and Senate)
   * @returns Promise with all political trades
   */
  async getAllPoliticalTrades(): Promise<PoliticalTradesData> {
    const response = await fetch(`${this.baseUrl}/api/political/trades`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch political trades: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Get House representative trades
   * @returns Promise with House trades
   */
  async getHouseTrades(): Promise<PoliticalTrade[]> {
    const response = await fetch(`${this.baseUrl}/api/political/house`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch House trades: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Get Senate trades
   * @returns Promise with Senate trades
   */
  async getSenateTrades(): Promise<PoliticalTrade[]> {
    const response = await fetch(`${this.baseUrl}/api/political/senate`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Senate trades: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Get all politicians (both House and Senate)
   * @returns Promise with all politicians
   */
  async getAllPoliticians(): Promise<PoliticiansData> {
    const response = await fetch(`${this.baseUrl}/api/political/politicians`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch politicians: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Get trades for a specific politician
   * @param name The politician's name
   * @returns Promise with the politician's trades
   */
  async getPoliticianTrades(name: string): Promise<PoliticalTrade[]> {
    const response = await fetch(`${this.baseUrl}/api/political/politician/${encodeURIComponent(name)}/trades`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch trades for politician ${name}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Get trades for a specific ticker
   * @param ticker The stock ticker symbol
   * @returns Promise with trades for the ticker
   */
  async getTickerTrades(ticker: string): Promise<PoliticalTrade[]> {
    const response = await fetch(`${this.baseUrl}/api/political/ticker/${ticker}/trades`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch trades for ticker ${ticker}: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Export default instance
export default Crawl4AIClient;