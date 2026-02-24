import React from 'react';
import { Button } from '@/components/ui/button';
import type { EvoTrait } from './types';

interface EvoPopupProps {
  options: EvoTrait[];
  onSelect: (trait: EvoTrait) => void;
}

export const EvoPopup: React.FC<EvoPopupProps> = ({ options, onSelect }) => {
  return (
    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50 p-4">
      <div className="bg-coffee-dark rounded-2xl p-6 max-w-sm w-full border-2 border-gold/50 shadow-2xl">
        <h2 className="text-2xl font-bold text-gold text-center mb-2">
          ⭐ EVOLUTION!
        </h2>
        <p className="text-coffee-cream text-center mb-6 text-sm">
          Choose a trait:
        </p>
        
        <div className="flex flex-col gap-3">
          {options.map((trait) => (
            <Button
              key={trait.id}
              onClick={() => onSelect(trait)}
              className="h-auto py-4 px-4 bg-coffee-medium hover:bg-coffee-light border border-coffee-light/30 flex items-center gap-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-3xl">{trait.icon}</span>
              <div className="flex-1">
                <div className="font-bold text-coffee-foam">{trait.name}</div>
                <div className="text-sm text-coffee-cream/80">{trait.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
