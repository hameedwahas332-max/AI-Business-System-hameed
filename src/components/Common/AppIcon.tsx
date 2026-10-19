import React from 'react';

interface AppIconProps {
  className?: string;
  size?: number;
  showTile?: boolean;
}

/**
 * Official App Icon for the Enterprise ERP SaaS system.
 * Faithfully renders the 3D isometric emerald-green and polished gold geometric shield emblem:
 * - Rounded dark navy squircle tile base
 * - Golden hexagonal canopy roof
 * - Three ascending gold financial growth chart bars
 * - Faceted outer emerald green shield collar
 * - Golden circuit data traces with polished spherical nodes
 * - Central upward-pointing 3D faceted emerald prism chevron
 */
export const AppIcon: React.FC<AppIconProps> = ({
  className = 'w-10 h-10',
  size,
  showTile = true,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={`shrink-0 ${className}`}
      style={style}
      aria-label="Official App Icon"
      role="img"
    >
      <defs>
        {/* Background Gradients */}
        <radialGradient id="appIconBgGlow" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#14213d" />
          <stop offset="50%" stopColor="#0b1220" />
          <stop offset="100%" stopColor="#04070e" />
        </radialGradient>
        <linearGradient id="appIconTileBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#1e293b" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
        </linearGradient>

        {/* Gold Gradients */}
        <linearGradient id="appIconGoldRoof" x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="25%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="75%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        
        <linearGradient id="appIconGoldBarLeft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="60%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="appIconGoldBarMid" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="60%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="appIconGoldBarRight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="60%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        <radialGradient id="appIconGoldNode" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#fef08a" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="85%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>

        <linearGradient id="appIconGoldWire" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Emerald Gradients */}
        <linearGradient id="appIconEmeraldWingLeftOuter" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="35%" stopColor="#10b981" />
          <stop offset="80%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>

        <linearGradient id="appIconEmeraldWingLeftInner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>

        <linearGradient id="appIconEmeraldWingRightOuter" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="35%" stopColor="#10b981" />
          <stop offset="80%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>

        <linearGradient id="appIconEmeraldWingRightInner" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>

        <linearGradient id="appIconEmeraldChevronTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>

        <linearGradient id="appIconEmeraldChevronLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="60%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        <linearGradient id="appIconEmeraldChevronRight" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="60%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>

        <linearGradient id="appIconEmeraldVBottom" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="50%" stopColor="#047857" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>

        {/* Filters */}
        <filter id="appIconOuterShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="16" stdDeviation="24" floodColor="#000000" floodOpacity="0.75" />
        </filter>

        <filter id="appIconEmblemGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#047857" floodOpacity="0.35" />
          <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#000000" floodOpacity="0.6" />
        </filter>

        <filter id="appIconGoldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* 1. Squircle App Tile Background */}
      {showTile && (
        <>
          <rect
            x="24"
            y="24"
            width="464"
            height="464"
            rx="100"
            ry="100"
            fill="url(#appIconBgGlow)"
            filter="url(#appIconOuterShadow)"
          />
          <rect
            x="24"
            y="24"
            width="464"
            height="464"
            rx="100"
            ry="100"
            fill="none"
            stroke="url(#appIconTileBorder)"
            strokeWidth="2.5"
          />
          <path
            d="M 124 26 L 388 26 C 440 26 470 56 480 100"
            fill="none"
            stroke="#475569"
            strokeWidth="1.5"
            strokeOpacity="0.3"
          />
        </>
      )}

      {/* 2. Main Emblem Group */}
      <g filter="url(#appIconEmblemGlow)">
        {/* Top Gold Canopy Frame */}
        <path
          d="M 256 68 L 366 130 L 354 148 L 256 94 L 158 148 L 146 130 Z"
          fill="url(#appIconGoldRoof)"
          filter="url(#appIconGoldGlow)"
        />

        {/* 3 Rising Gold Financial Bars */}
        <path d="M 218 152 L 234 152 L 234 186 L 218 186 Z" fill="url(#appIconGoldBarLeft)" rx="3" />
        <path d="M 231 152 L 234 152 L 234 186 L 231 186 Z" fill="#b45309" />

        <path d="M 244 134 L 260 134 L 260 186 L 244 186 Z" fill="url(#appIconGoldBarMid)" rx="3" />
        <path d="M 257 134 L 260 134 L 260 186 L 257 186 Z" fill="#b45309" />

        <path d="M 270 114 L 286 114 L 286 186 L 270 186 Z" fill="url(#appIconGoldBarRight)" rx="3" />
        <path d="M 283 114 L 286 114 L 286 186 L 283 186 Z" fill="#b45309" />

        {/* 3. Outer Emerald Wings / Shield Collar */}
        <path
          d="M 148 132 L 86 168 L 86 280 L 256 436 L 256 396 L 126 270 L 126 186 L 148 174 Z"
          fill="url(#appIconEmeraldWingLeftOuter)"
        />

        <path
          d="M 148 132 L 148 248 L 188 288 L 188 154 Z"
          fill="url(#appIconEmeraldWingLeftInner)"
        />
        <path d="M 148 132 L 188 154 L 148 174 Z" fill="#34d399" />

        <path
          d="M 364 132 L 426 168 L 426 280 L 256 436 L 256 396 L 386 270 L 386 186 L 364 174 Z"
          fill="url(#appIconEmeraldWingRightOuter)"
        />

        <path
          d="M 364 132 L 364 248 L 324 288 L 324 154 Z"
          fill="url(#appIconEmeraldWingRightInner)"
        />
        <path d="M 364 132 L 324 154 L 364 174 Z" fill="#10b981" />

        <path d="M 256 396 L 256 436 L 256 436 Z" fill="url(#appIconEmeraldVBottom)" />

        {/* 4. Gold Circuit Wires */}
        <path d="M 148 226 L 188 252" stroke="url(#appIconGoldWire)" strokeWidth="7" strokeLinecap="round" />
        <path d="M 364 226 L 324 252" stroke="url(#appIconGoldWire)" strokeWidth="7" strokeLinecap="round" />
        <path
          d="M 188 316 L 256 376 L 324 316"
          fill="none"
          stroke="url(#appIconGoldWire)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 5. Central 3D Faceted Emerald Chevron */}
        <path d="M 256 198 L 324 252 L 256 296 L 188 252 Z" fill="url(#appIconEmeraldChevronTop)" />
        <path d="M 188 252 L 256 296 L 256 360 L 188 316 Z" fill="url(#appIconEmeraldChevronLeft)" />
        <path d="M 324 252 L 256 296 L 256 360 L 324 316 Z" fill="url(#appIconEmeraldChevronRight)" />

        <path d="M 256 198 L 256 296 L 256 360" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.8" />
        <path d="M 188 252 L 256 198 L 324 252" fill="none" stroke="#a7f3d0" strokeWidth="3" strokeLinecap="round" />

        {/* 6. Polished Gold Spherical Circuit Nodes */}
        <circle cx="148" cy="226" r="15" fill="url(#appIconGoldNode)" filter="url(#appIconGoldGlow)" />
        <circle cx="364" cy="226" r="15" fill="url(#appIconGoldNode)" filter="url(#appIconGoldGlow)" />
        <circle cx="256" cy="376" r="15" fill="url(#appIconGoldNode)" filter="url(#appIconGoldGlow)" />
      </g>
    </svg>
  );
};
