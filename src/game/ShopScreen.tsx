import React from 'react';
import { Zap, Package, Sparkles, Lock } from 'lucide-react';
import { CoinIcon } from './CoinIcon';

interface ShopScreenProps {
  onBack: () => void;
  totalCoins: number;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  price?: number;
  comingSoon: boolean;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'energy_refill',
    name: 'Energy Refill',
    description: 'Restore all energy instantly',
    icon: <Zap className="w-6 h-6 text-energy" />,
    price: 50,
    comingSoon: true,
  },
  {
    id: 'bean_pack_small',
    name: 'Bean Pack (50)',
    description: 'Get 50 bonus beans',
    icon: <CoinIcon size={20} />,
    price: 99,
    comingSoon: true,
  },
  {
    id: 'bean_pack_large',
    name: 'Bean Pack (200)',
    description: 'Get 200 bonus beans + 10% extra',
    icon: <Package className="w-6 h-6 text-gold" />,
    price: 349,
    comingSoon: true,
  },
  {
    id: 'cosmetic_cart',
    name: 'Golden Cart Skin',
    description: 'A shiny golden cart appearance',
    icon: <Sparkles className="w-6 h-6 text-gold" />,
    price: 500,
    comingSoon: true,
  },
];

export const ShopScreen: React.FC<ShopScreenProps> = ({ onBack, totalCoins }) => {
  return (
    <div className="absolute inset-0 flex flex-col z-20 bg-coffee-espresso/95">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-coffee-medium/30">
        <h1 className="text-xl font-bold text-coffee-cream">🛒 Shop</h1>
        <div className="flex items-center gap-1 bg-coffee-dark/40 rounded-full px-3 py-1.5">
          <CoinIcon size={16} />
          <span className="text-gold font-bold text-sm">{totalCoins}</span>
        </div>
      </div>

      {/* Shop Items */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3">
          {SHOP_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`
                relative flex items-center gap-3 p-4 rounded-xl border
                ${item.comingSoon 
                  ? 'bg-coffee-dark/40 border-coffee-medium/20 opacity-60' 
                  : 'bg-coffee-dark/60 border-coffee-medium/40 hover:border-warm-orange/50'
                }
              `}
            >
              {/* Coming Soon Badge */}
              {item.comingSoon && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-coffee-medium/30 rounded-full px-2 py-0.5">
                  <Lock className="w-3 h-3 text-coffee-cream/50" />
                  <span className="text-[10px] text-coffee-cream/50 font-medium">Coming Soon</span>
                </div>
              )}

              {/* Icon */}
              <div className="w-12 h-12 rounded-lg bg-coffee-dark/60 flex items-center justify-center">
                {item.icon}
              </div>

              {/* Details */}
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-coffee-cream">{item.name}</h3>
                <p className="text-xs text-coffee-cream/60">{item.description}</p>
              </div>

              {/* Price */}
              {item.price && (
                <div className="flex items-center gap-1 bg-coffee-dark/40 rounded-lg px-2 py-1">
                  <span className="text-sm">💵</span>
                  <span className="text-xs text-coffee-cream/70">${(item.price / 100).toFixed(2)}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Banner */}
        <div className="mt-6 p-4 rounded-xl bg-coffee-dark/40 border border-coffee-medium/20">
          <p className="text-center text-xs text-coffee-cream/60">
            💡 Shop items will be available in a future update.<br />
            Keep earning beans by playing!
          </p>
        </div>
      </div>

      {/* Footer with back hint */}
      <div className="px-4 py-3 border-t border-coffee-medium/30">
        <p className="text-center text-xs text-coffee-cream/40">
          Tap the <span className="text-warm-orange">Battle</span> tab below to return
        </p>
      </div>
    </div>
  );
};
