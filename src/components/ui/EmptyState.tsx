import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-8 text-center border border-dashed border-[#D1D1CB] rounded-[8px] bg-[#FAF9F6] ${className}`}>
      <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[#EBEBE6] flex items-center justify-center text-[#4A4B4F]">
        <Icon className="w-5 h-5 text-[#4A4B4F]" strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-[#17181A]">{title}</h3>
      <p className="text-xs text-[#73757C] mt-1 max-w-sm mx-auto leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
