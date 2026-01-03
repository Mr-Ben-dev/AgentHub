// ============================================================================
// PriceDisplay - Real-time price ticker with animations
// ============================================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatPrice } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, Bitcoin } from 'lucide-react';

interface CryptoPrice {
  symbol: string;
  price: number;
  formatted?: string;
  timestamp: number;
}

interface PriceResponse {
  btc: CryptoPrice;
  eth: CryptoPrice;
}

interface PriceDisplayProps {
  symbol?: string;
  showAll?: boolean;
  className?: string;
}

export default function PriceDisplay({ symbol, showAll = false, className }: PriceDisplayProps) {
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});

  const { data: priceData } = useQuery<PriceResponse>({
    queryKey: ['prices'],
    queryFn: async () => {
      const response = await api.getPrices();
      return response as unknown as PriceResponse;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Convert nested response to flat format
  const prices: Record<string, number> = priceData 
    ? {
        btc: priceData.btc?.price ?? 0,
        eth: priceData.eth?.price ?? 0,
      }
    : {};

  // Track price changes for animations
  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      setPrevPrices(prices);
    }
  }, [priceData]);

  if (!priceData) return null;

  const entries = symbol
    ? [[symbol.toLowerCase(), prices[symbol.toLowerCase()] || 0]] as [string, number][]
    : showAll
    ? Object.entries(prices)
    : Object.entries(prices).slice(0, 2);

  return (
    <div className={cn('flex items-center gap-4', className)}>
      {entries.map(([sym, price]) => {
        const prevPrice = prevPrices[sym] || price;
        const isUp = price > prevPrice;
        const isDown = price < prevPrice;
        const changePercent = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0;
        
        // Price is in cents, convert to dollars for display
        const displayPrice = price / 100;

        return (
          <motion.div
            key={sym}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 bg-slate-800/30 px-3 py-1.5 rounded-lg border border-slate-700/50"
          >
            <Bitcoin className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-slate-400">{sym}</span>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={price}
                initial={{ y: isUp ? 10 : -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: isUp ? -10 : 10, opacity: 0 }}
                className={cn(
                  'font-mono font-semibold transition-colors',
                  isUp && 'text-emerald-400',
                  isDown && 'text-red-400',
                  !isUp && !isDown && 'text-white'
                )}
              >
                {formatPrice(displayPrice)}
              </motion.span>
            </AnimatePresence>
            {Math.abs(changePercent) > 0.01 && (
              <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center',
                  isUp && 'text-emerald-400',
                  isDown && 'text-red-400'
                )}
              >
                {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
