import React from 'react';
import { Link } from 'react-router-dom';
import logoImage from '../../assests/logo.png';

interface LogoProps {
  variant?: 'light' | 'dark';
  showTagline?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'light',
  showTagline = true,
  className = '',
}) => {
  const isDark = variant === 'dark';

  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 group ${className}`}>
      <div className="flex h-10 w-14 shrink-0 items-center justify-center">
        <img
          src={logoImage}
          alt=""
          className="h-full w-full object-contain"
          style={{ filter: isDark ? 'invert(1) hue-rotate(180deg)' : undefined }}
        />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-extrabold text-xl tracking-tight ${
              isDark ? 'text-slate-900' : 'text-white'
            }`}
          >
            Cricket<span className="text-[#00BFA6]">Vault</span>
          </span>
        </div>
        {showTagline && (
          <span
            className={`text-[10px] font-medium tracking-wider uppercase mt-0.5 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Learn &bull; Improve &bull; Grow
          </span>
        )}
      </div>
    </Link>
  );
};
