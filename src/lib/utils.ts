import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with commas as thousand separators
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with commas
 */
export function formatCurrency(num: number, decimals: number = 2): string {
  return num.toLocaleString('en-GB', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })
}

/**
 * Format a number with commas (no currency symbol)
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string with commas
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('en-GB', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })
}
