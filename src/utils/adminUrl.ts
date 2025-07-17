
/**
 * Universal Inventory Admin URL Builder
 * Generates the absolute URL for the Inventory Admin page at /superjp
 * Adapts automatically to any deployment domain or environment
 */

/**
 * Gets the current origin (protocol + domain + port)
 * Works in both browser and SSR environments
 */
const getCurrentOrigin = (): string => {
  // Browser environment
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  
  // SSR fallback - try to get from environment or default
  if (typeof process !== 'undefined' && process.env) {
    const protocol = process.env.VERCEL_URL ? 'https' : 'http';
    const host = process.env.VERCEL_URL || process.env.HOST || 'localhost:3000';
    return `${protocol}://${host}`;
  }
  
  // Ultimate fallback
  return 'http://localhost:3000';
};

/**
 * Builds the absolute URL for the Inventory Admin page
 * Always returns: [current-domain]/superjp
 * 
 * @returns {string} The complete absolute URL to the inventory admin page
 * 
 * @example
 * // In production: "https://miproyecto.com/superjp"
 * // In staging: "https://staging.empresa.ai/superjp"
 * // In development: "http://localhost:3000/superjp"
 */
export const getInventoryAdminUrl = (): string => {
  const origin = getCurrentOrigin();
  return `${origin}/superjp`;
};

/**
 * Constant version for cases where function call is not preferred
 */
export const INVENTORY_ADMIN_URL = getInventoryAdminUrl();

/**
 * Navigates to the inventory admin page programmatically
 * Uses window.location for immediate navigation
 */
export const navigateToInventoryAdmin = (): void => {
  if (typeof window !== 'undefined') {
    window.location.href = getInventoryAdminUrl();
  }
};

/**
 * Checks if the current page is the inventory admin page
 */
export const isInventoryAdminPage = (): boolean => {
  if (typeof window !== 'undefined') {
    return window.location.pathname === '/superjp';
  }
  return false;
};

/**
 * Opens the inventory admin page in a new tab/window
 */
export const openInventoryAdminInNewTab = (): void => {
  if (typeof window !== 'undefined') {
    window.open(getInventoryAdminUrl(), '_blank', 'noopener,noreferrer');
  }
};

// Export default for convenience
export default getInventoryAdminUrl;
