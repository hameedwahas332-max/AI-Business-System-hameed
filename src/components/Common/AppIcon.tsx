import React from 'react';

interface AppIconProps {
  className?: string;
  size?: number;
  showTile?: boolean;
}

/**
 * Official App Icon for "نظام المحاسبي الذكي ERP" (Smart Accounting ERP).
 * Displays the high-fidelity emerald-gold shield icon with neural circuit nodes.
 */
export const AppIcon: React.FC<AppIconProps> = ({
  className = 'w-10 h-10',
  size,
  showTile = true,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <img
      src="/app-icon.png"
      alt="شعار نظام المحاسبي الذكي ERP"
      className={`shrink-0 rounded-xl object-contain drop-shadow-lg select-none ${className}`}
      style={style}
      loading="eager"
    />
  );
};
