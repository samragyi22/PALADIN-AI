import React from 'react';

/**
 * PaladinLogo — Custom SVG Logo Component for PALADIN AI
 * Represents the Guardian Shield + Neural Intelligence Spark Core.
 */
export const PaladinLogo = ({ size = 24, className = '', glow = true }) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {glow && (
        <div 
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-amber-500 blur-md opacity-60 animate-pulse"
          style={{ transform: 'scale(1.15)' }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          {/* Shield Outer Gradient */}
          <linearGradient id="paladinShieldGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Golden Core Spark Gradient */}
          <linearGradient id="paladinGoldGrad" x1="10" y1="10" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Glowing Border Gradient */}
          <linearGradient id="paladinBorderGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>

        {/* Shield Outer Base Path */}
        <path
          d="M20 3L34 8V18C34 27.5 28 34.5 20 37C12 34.5 6 27.5 6 18V8L20 3Z"
          fill="url(#paladinShieldGrad)"
          stroke="url(#paladinBorderGrad)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Inner Tech Chevron Accent */}
        <path
          d="M20 7L30 11V18C30 24.5 25.5 30.5 20 32.5C14.5 30.5 10 24.5 10 18V11L20 7Z"
          fill="#080710"
          fillOpacity="0.65"
          stroke="#8b5cf6"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Central 4-Point AI Intelligence Spark Core */}
        <path
          d="M20 12L22.2 17.8L28 20L22.2 22.2L20 28L17.8 22.2L12 20L17.8 17.8L20 12Z"
          fill="url(#paladinGoldGrad)"
          filter="drop-shadow(0px 0px 4px rgba(245, 158, 11, 0.8))"
        />

        {/* Micro Tech Node Dots */}
        <circle cx="20" cy="20" r="1.5" fill="#ffffff" />
        <circle cx="20" cy="7" r="1" fill="#fbbf24" />
        <circle cx="34" cy="8" r="1" fill="#a78bfa" />
        <circle cx="6" cy="8" r="1" fill="#a78bfa" />
      </svg>
    </div>
  );
};

export default PaladinLogo;
