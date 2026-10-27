import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, AlertOctagon, Info } from 'lucide-react';

export type BadgeVariant = 'green' | 'amber' | 'red' | 'neutral' | 'teal' | 'critical' | 'high' | 'medium' | 'low';

export interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  label,
  icon,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';

  let colorClasses = 'bg-[#F4F4F1] text-[#4A4B4F] border-[#E5E5E0]';
  let defaultIcon: React.ReactNode = null;

  switch (variant) {
    case 'green':
    case 'low':
      colorClasses = 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]';
      defaultIcon = <CheckCircle2 className="w-3 h-3 text-[#15803D]" strokeWidth={2} />;
      break;
    case 'amber':
    case 'medium':
      colorClasses = 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
      defaultIcon = <Clock className="w-3 h-3 text-[#B45309]" strokeWidth={2} />;
      break;
    case 'red':
    case 'high':
      colorClasses = 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]';
      defaultIcon = <AlertTriangle className="w-3 h-3 text-[#B91C1C]" strokeWidth={2} />;
      break;
    case 'critical':
      colorClasses = 'bg-[#450A0A] text-[#FEE2E2] border-[#7F1D1D]';
      defaultIcon = <AlertOctagon className="w-3 h-3 text-[#EF4444]" strokeWidth={2} />;
      break;
    case 'teal':
      colorClasses = 'bg-[#F0FDFA] text-[#0F766E] border-[#CCFBF1]';
      defaultIcon = <Info className="w-3 h-3 text-[#0F766E]" strokeWidth={2} />;
      break;
    case 'neutral':
    default:
      colorClasses = 'bg-[#F1F1ED] text-[#4A4B4F] border-[#E5E5E0]';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-[4px] select-none ${sizeClasses} ${colorClasses} ${className}`}
    >
      {icon || defaultIcon}
      <span>{label}</span>
    </span>
  );
};
