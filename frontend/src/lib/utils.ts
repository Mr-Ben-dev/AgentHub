// ============================================================================
// Utility functions
// ============================================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | undefined | null, decimals = 2): string {
  if (num == null || isNaN(num)) return '0';
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(decimals) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(decimals) + 'K';
  }
  return num.toFixed(decimals);
}

export function formatPercent(num: number | undefined | null): string {
  if (num == null || isNaN(num)) return '+0.00%';
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function getDirectionColor(direction: string): string {
  switch (direction.toLowerCase()) {
    case 'up':
    case 'over':
    case 'yes':
      return 'text-success';
    case 'down':
    case 'under':
    case 'no':
      return 'text-danger';
    default:
      return 'text-slate-400';
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'open':
      return 'badge-info';
    case 'resolved_win':
    case 'win':
      return 'badge-success';
    case 'resolved_loss':
    case 'loss':
      return 'badge-danger';
    case 'cancelled':
      return 'badge-warning';
    default:
      return 'badge-info';
  }
}

export function getMarketKindEmoji(kind: string): string {
  switch (kind.toLowerCase()) {
    case 'crypto':
      return '₿';
    case 'sports':
      return '⚽';
    case 'prediction':
    case 'predictionapp':
      return '🎯';
    default:
      return '📊';
  }
}
