import React from 'react';
import coinGoldSvg from '@/assets/coin-gold.svg';

interface CoinIconProps {
  size?: number;
  className?: string;
}

export const CoinIcon: React.FC<CoinIconProps> = ({ size = 18, className = '' }) => (
  <img src={coinGoldSvg} alt="coin" width={size} height={size} className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }} />
);
