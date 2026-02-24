import React from 'react';
import { Play, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PauseMenuProps {
  tipsSoFar: number;
  onContinue: () => void;
  onLeave: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  tipsSoFar,
  onContinue,
  onLeave,
}) => {
  return (
    <div className="absolute inset-0 bg-coffee-espresso/90 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-coffee-dark/95 rounded-2xl p-6 max-w-xs w-full mx-4 shadow-2xl border border-coffee-medium/50">
        {/* Header */}
        <h2 className="text-2xl font-bold text-coffee-cream text-center mb-6">
          ⏸️ PAUSED
        </h2>
        
        {/* Tips earned so far */}
        <div className="bg-coffee-espresso/50 rounded-xl p-4 mb-6 text-center">
          <p className="text-coffee-cream/70 text-sm mb-1">Tips so far</p>
          <p className="text-gold text-2xl font-bold">${tipsSoFar}</p>
        </div>
        
        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onContinue}
            className="w-full bg-warm-orange hover:bg-warm-orange/90 text-coffee-foam text-lg py-6 rounded-xl shadow-lg"
          >
            <Play className="w-5 h-5 mr-2" />
            Continue
          </Button>
          
          <Button
            onClick={onLeave}
            variant="outline"
            className="w-full border-coffee-cream/30 text-coffee-cream hover:bg-coffee-dark/50 text-lg py-6 rounded-xl"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Leave
          </Button>
        </div>
        
        {/* Leave info */}
        <p className="text-coffee-cream/50 text-xs text-center mt-4">
          Leaving keeps your tips but won't count as a win
        </p>
      </div>
    </div>
  );
};
