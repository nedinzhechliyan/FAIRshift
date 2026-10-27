import React from 'react';

export interface StatProps {
  label: string;
  value: string | number;
  subValue?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  alertLevel?: 'none' | 'caution' | 'critical' | 'teal';
  onClick?: () => void;
  className?: string;
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  subValue,
  badge,
  icon,
  alertLevel = 'none',
  onClick,
  className = '',
}) => {
  const borderMap = {
    none: 'border-[#E5E5E0] bg-white',
    caution: 'border-[#FDE68A] bg-[#FFFBEB]',
    critical: 'border-[#FECACA] bg-[#FEF2F2]',
    teal: 'border-[#CCFBF1] bg-[#F0FDFA]',
  };

  return (
    <div
      onClick={onClick}
      className={`border rounded-[6px] p-3.5 transition-all ${borderMap[alertLevel]} ${
        onClick ? 'cursor-pointer hover:shadow-xs' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-medium text-[#73757C] truncate">{label}</span>
        {icon && <span className="text-[#73757C]">{icon}</span>}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xl font-bold tracking-tight text-[#17181A] tabular-nums font-mono-code">
          {value}
        </span>
        {badge}
      </div>

      {subValue && (
        <p className="text-[11px] text-[#73757C] mt-1 truncate">
          {subValue}
        </p>
      )}
    </div>
  );
};
