// Utility functions for handling transaction IDs

import { Sale } from '../types';

/**
 * Get the display-friendly transaction ID
 * Uses custom_id if available, otherwise falls back to truncated UUID
 */
export const getTransactionDisplayId = (sale: Sale): string => {
  if (sale.custom_id) {
    return sale.custom_id;
  }
  
  // Fallback to truncated UUID if custom_id is not available
  return `#${sale.id.substring(0, 8)}...`;
};

/**
 * Get the full transaction ID for search purposes
 * Includes both custom_id and UUID for comprehensive searching
 */
export const getTransactionSearchableText = (sale: Sale): string => {
  const parts = [sale.id];
  if (sale.custom_id) {
    parts.push(sale.custom_id);
  }
  return parts.join(' ');
};

/**
 * Format transaction ID for display in lists and tables
 */
export const formatTransactionId = (sale: Sale): string => {
  return sale.custom_id || `#${sale.id.substring(0, 8)}`;
};
