import React from 'react';

interface AppIconProps {
  className?: string;
  size?: number;
  showTile?: boolean;
}

/**
 * Official Ultra-Luxurious App Icon for "نظام المحاسبي الذكي ERP" (Smart Accounting ERP).
 * Features:
 * - Royal obsidian squircle tile with multi-stage depth shadow and double gold/emerald chamfer rim
 * - Golden architectural pediment canopy with imperial crown crest and apex sparkle
 * - 4 ascending 3D gold financial growth bars with chiseled bevels
 * - Broad 3D heraldic emerald wings with multifaceted gem lighting
 * - Central 3D diamond-cut emerald chevron representing algorithmic accounting intelligence
 * - 24K polished gold neural circuit data traces with radiant spherical connection nodes
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
      aria-label="نظام المحاسبي الذكي ERP"
      role="img"
    >
      <defs>
        {/* Background Radial & Linear Gradients */}
        <radialGradient id="luxBgGlow" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="35%" stopColor="#0f172a" />
          <stop offset="70%" stopColor="#090d16" />
          <stop offset="100%" stopColor="#020408" />
        </radialGradient>

        <linearGradient id="luxTileOuterRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd700" stopOpacity="0.85" />
          <stop offset="25%" stopColor="#f59e0b" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#334155" stopOpacity="0.3" />
          <stop offset="75%" stopColor="#10b981" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
        </linearGradient>

        <linearGradient id="luxTileInnerRim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
        </linearGradient>

        {/* 24K Polished Gold Gradients */}
        <linearGradient id="luxGoldCrown" x1="0%" y1="0%" x2="100%" y2="60%">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="18%" stopColor="#d97706" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fffbeb" />
          <stop offset="65%" stopColor="#fbbf24" />
          <stop offset="85%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>

        <linearGradient id="luxGoldRoofFace" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* 4 Stepped Financial Bars */}
        <linearGradient id="luxGoldBar1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="45%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="luxGoldBar2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="45%" stopColor="#fef9c3" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="luxGoldBar3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="45%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="luxGoldBar4" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="40%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>

        {/* Rich Emerald Jewels & Facets */}
        <linearGradient id="luxEmeraldWingLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="25%" stopColor="#10b981" />
          <stop offset="60%" stopColor="#059669" />
          <stop offset="90%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>

        <linearGradient id="luxEmeraldWingLeftInner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="45%" stopColor="#059669" />
          <stop offset="85%" stopColor="#064e3b" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>

        <linearGradient id="luxEmeraldWingRight" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="25%" stopColor="#10b981" />
          <stop offset="60%" stopColor="#059669" />
          <stop offset="90%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>

        <linearGradient id="luxEmeraldWingRightInner" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="45%" stopColor="#059669" />
          <stop offset="85%" stopColor="#064e3b" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>

        <linearGradient id="luxEmeraldApexDiamond" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="35%" stopColor="#34d399" />
          <stop offset="70%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        <linearGradient id="luxEmeraldApexLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        <linearGradient id="luxEmeraldApexRight" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="60%" stopColor="#047857" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>

        {/* Polished Gold Spherical Circuit Nodes */}
        <radialGradient id="luxGoldNodeSphere" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="22%" stopColor="#fef08a" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="85%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>

        <linearGradient id="luxGoldWire" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="30%" stopColor="#fbbf24" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>

        {/* Filters for 3D Prominence and High Fidelity Glow */}
        <filter id="luxTileShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="24" stdDeviation="28" floodColor="#000000" floodOpacity="0.85" />
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.5" />
        </filter>

        <filter id="luxEmblemDepth" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#047857" floodOpacity="0.45" />
          <feDropShadow dx="0" dy="20" stdDeviation="24" floodColor="#000000" floodOpacity="0.7" />
        </filter>

        <filter id="luxGoldHighlight" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#fbbf24" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* 1. Luxurious Squircle App Tile */}
      {showTile && (
        <g filter="url(#luxTileShadow)">
          {/* Main Tile Body */}
          <rect
            x="20"
            y="20"
            width="472"
            height="472"
            rx="108"
            ry="108"
            fill="url(#luxBgGlow)"
          />

          {/* Precision Outer Chamfer Border */}
          <rect
            x="20"
            y="20"
            width="472"
            height="472"
            rx="108"
            ry="108"
            fill="none"
            stroke="url(#luxTileOuterRim)"
            strokeWidth="3.5"
          />

          {/* Internal Specular Glass Highlight */}
          <rect
            x="24"
            y="24"
            width="464"
            height="464"
            rx="104"
            ry="104"
            fill="none"
            stroke="url(#luxTileInnerRim)"
            strokeWidth="2"
          />

          {/* Subtle Top Frosted Light Arc */}
          <path
            d="M 120 23 L 392 23 C 445 23 475 53 487 106"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.8"
            strokeOpacity="0.4"
          />
        </g>
      )}

      {/* 2. Main Executive Crest Group */}
      <g filter="url(#luxEmblemDepth)">
        {/* Top Imperial Canopy Arch (Hexagonal Crown Roof) */}
        <path
          d="M 256 56 L 378 126 L 364 146 L 256 86 L 148 146 L 134 126 Z"
          fill="url(#luxGoldCrown)"
          filter="url(#luxGoldHighlight)"
        />
        <path
          d="M 256 56 L 256 86 L 364 146 L 378 126 Z"
          fill="url(#luxGoldRoofFace)"
          opacity="0.9"
        />

        {/* Apex Sparkle Star (Diamond Brilliance) */}
        <path
          d="M 256 40 L 260 52 L 272 56 L 260 60 L 256 72 L 252 60 L 240 56 L 252 52 Z"
          fill="#ffffff"
          filter="url(#luxGoldHighlight)"
        />

        {/* 4 Stepped Ascending 3D Financial Growth Bars */}
        {/* Bar 1 (Lowest) */}
        <path d="M 204 158 L 220 158 L 220 192 L 204 192 Z" fill="url(#luxGoldBar1)" rx="2.5" />
        <path d="M 217 158 L 220 158 L 220 192 L 217 192 Z" fill="#92400e" />

        {/* Bar 2 (Medium Low) */}
        <path d="M 228 142 L 244 142 L 244 192 L 228 192 Z" fill="url(#luxGoldBar2)" rx="2.5" />
        <path d="M 241 142 L 244 142 L 244 192 L 241 192 Z" fill="#92400e" />

        {/* Bar 3 (Medium High) */}
        <path d="M 252 124 L 268 124 L 268 192 L 252 192 Z" fill="url(#luxGoldBar3)" rx="2.5" />
        <path d="M 265 124 L 268 124 L 268 192 L 265 192 Z" fill="#92400e" />

        {/* Bar 4 (Highest Peak) */}
        <path d="M 276 102 L 292 102 L 292 192 L 276 192 Z" fill="url(#luxGoldBar4)" rx="2.5" />
        <path d="M 289 102 L 292 102 L 292 192 L 289 192 Z" fill="#78350f" />

        {/* 3. Outer Emerald Wings (Majestic Shield Frame) */}
        {/* Left Wing Outer Chiseled Bevel */}
        <path
          d="M 136 128 L 74 166 L 74 286 L 256 446 L 256 404 L 116 276 L 116 186 L 136 172 Z"
          fill="url(#luxEmeraldWingLeft)"
        />

        {/* Left Wing Inner Bevel Facet */}
        <path
          d="M 136 128 L 136 252 L 180 294 L 180 152 Z"
          fill="url(#luxEmeraldWingLeftInner)"
        />
        <path d="M 136 128 L 180 152 L 136 172 Z" fill="#34d399" />

        {/* Right Wing Outer Chiseled Bevel */}
        <path
          d="M 376 128 L 438 166 L 438 286 L 256 446 L 256 404 L 396 276 L 396 186 L 376 172 Z"
          fill="url(#luxEmeraldWingRight)"
        />

        {/* Right Wing Inner Bevel Facet */}
        <path
          d="M 376 128 L 376 252 L 332 294 L 332 152 Z"
          fill="url(#luxEmeraldWingRightInner)"
        />
        <path d="M 376 128 L 332 152 L 376 172 Z" fill="#10b981" />

        {/* Bottom Joining V-Apex Keystone */}
        <path d="M 256 404 L 256 446 L 256 446 Z" fill="#047857" />

        {/* 4. Gold Neural Circuit Wires (Smart ERP Connectivity) */}
        <path
          d="M 136 230 L 180 258"
          stroke="url(#luxGoldWire)"
          strokeWidth="7.5"
          strokeLinecap="round"
        />
        <path
          d="M 376 230 L 332 258"
          stroke="url(#luxGoldWire)"
          strokeWidth="7.5"
          strokeLinecap="round"
        />
        <path
          d="M 180 324 L 256 388 L 332 324"
          fill="none"
          stroke="url(#luxGoldWire)"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Auxiliary Micro-Data Lines */}
        <path
          d="M 180 258 L 220 286"
          stroke="#fef08a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />
        <path
          d="M 332 258 L 292 286"
          stroke="#fef08a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />

        {/* 5. Central 3D Faceted Emerald Diamond Chevron (The Smart Engine) */}
        {/* Top Reflective Diamond Facet */}
        <path
          d="M 256 198 L 332 258 L 256 306 L 180 258 Z"
          fill="url(#luxEmeraldApexDiamond)"
        />

        {/* Left 3D Drop Facet */}
        <path
          d="M 180 258 L 256 306 L 256 376 L 180 324 Z"
          fill="url(#luxEmeraldApexLeft)"
        />

        {/* Right 3D Drop Facet */}
        <path
          d="M 332 258 L 256 306 L 256 376 L 332 324 Z"
          fill="url(#luxEmeraldApexRight)"
        />

        {/* Razor-Sharp Center Ridge Light Line */}
        <path
          d="M 256 198 L 256 306 L 256 376"
          stroke="#a7f3d0"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.95"
        />

        {/* Top Edge Specular Crease */}
        <path
          d="M 180 258 L 256 198 L 332 258"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* 6. Polished 24K Gold Spherical Circuit Nodes */}
        {/* Left Spherical Node */}
        <circle
          cx="136"
          cy="230"
          r="16"
          fill="url(#luxGoldNodeSphere)"
          filter="url(#luxGoldHighlight)"
        />
        <circle cx="132" cy="226" r="4" fill="#ffffff" opacity="0.85" />

        {/* Right Spherical Node */}
        <circle
          cx="376"
          cy="230"
          r="16"
          fill="url(#luxGoldNodeSphere)"
          filter="url(#luxGoldHighlight)"
        />
        <circle cx="372" cy="226" r="4" fill="#ffffff" opacity="0.85" />

        {/* Bottom Apex Node */}
        <circle
          cx="256"
          cy="388"
          r="17"
          fill="url(#luxGoldNodeSphere)"
          filter="url(#luxGoldHighlight)"
        />
        <circle cx="252" cy="384" r="4.5" fill="#ffffff" opacity="0.9" />

        {/* Golden Diamond Core Accent */}
        <polygon
          points="256,238 266,252 256,266 246,252"
          fill="#fef08a"
          filter="url(#luxGoldHighlight)"
        />
      </g>
    </svg>
  );
};
