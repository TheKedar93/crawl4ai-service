const fetch = require('node-fetch');

// API endpoints
const HOUSE_API_URL = 'https://housestockwatcher.com/api';
const SENATE_API_URL = 'https://senatestockwatcher.com/api';

/**
 * Fetch House representative stock trades
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - House trades data
 */
async function fetchHouseTrades(options = {}) {
  try {
    const response = await fetch(`${HOUSE_API_URL}/trades`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch House trades: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching House trades:', error);
    throw error;
  }
}

/**
 * Fetch Senate stock trades
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Senate trades data
 */
async function fetchSenateTrades(options = {}) {
  try {
    const response = await fetch(`${SENATE_API_URL}/trades`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Senate trades: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Senate trades:', error);
    throw error;
  }
}

/**
 * Fetch House representative profiles
 * @returns {Promise<Array>} - House representatives data
 */
async function fetchHouseRepresentatives() {
  try {
    const response = await fetch(`${HOUSE_API_URL}/representatives`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch House representatives: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching House representatives:', error);
    throw error;
  }
}

/**
 * Fetch Senate profiles
 * @returns {Promise<Array>} - Senators data
 */
async function fetchSenators() {
  try {
    const response = await fetch(`${SENATE_API_URL}/senators`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Senators: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Senators:', error);
    throw error;
  }
}

/**
 * Fetch all political trades (both House and Senate)
 * @returns {Promise<Object>} - Combined political trades
 */
async function fetchAllPoliticalTrades() {
  try {
    const [houseTrades, senateTrades] = await Promise.all([
      fetchHouseTrades(),
      fetchSenateTrades()
    ]);
    
    return {
      houseTrades,
      senateTrades,
      combinedTrades: [...houseTrades, ...senateTrades],
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error fetching all political trades:', error);
    throw error;
  }
}

/**
 * Fetch all political profiles (both House and Senate)
 * @returns {Promise<Object>} - Combined political profiles
 */
async function fetchAllPoliticians() {
  try {
    const [representatives, senators] = await Promise.all([
      fetchHouseRepresentatives(),
      fetchSenators()
    ]);
    
    return {
      representatives,
      senators,
      combinedPoliticians: [...representatives, ...senators],
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error fetching all politicians:', error);
    throw error;
  }
}

module.exports = {
  fetchHouseTrades,
  fetchSenateTrades,
  fetchHouseRepresentatives,
  fetchSenators,
  fetchAllPoliticalTrades,
  fetchAllPoliticians
};