import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'teal';
  size?: 'sm' | 'md' | 'lg' | 'workerHuge';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs rounded-[6px] gap-1.5',
    md: 'h-9 px-4 text-sm rounded-[6px] gap-2',
    lg: 'h-11 px-5 text-base rounded-[8px] gap-2.5',
    workerHuge: 'min-h-[58px] w-full px-5 py-3.5 text-base font-semibold rounded-[8px] gap-3 text-left justify-start shadow-sm',
  };

  const variantStyles = {
    primary: 'bg-[#0F766E] text-white hover:bg-[#115E59] active:bg-[#134E4A] focus:ring-[#0F766E] border border-[#0F766E]',
    teal: 'bg-[#0F766E] text-white hover:bg-[#115E59] active:bg-[#134E4A] focus:ring-[#0F766E] border border-[#0F766E]',
    secondary: 'bg-white text-[#17181A] hover:bg-[#F4F4F1] active:bg-[#EBEBE6] border border-[#E5E5E0] focus:ring-zinc-400',
    outline: 'bg-transparent text-[#17181A] hover:bg-[#F4F4F1] border border-[#D1D1CB] focus:ring-[#0F766E]',
    danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] focus:ring-[#DC2626] border border-[#DC2626]',
    ghost: 'bg-transparent text-[#4A4B4F] hover:text-[#17181A] hover:bg-[#F1F1ED] focus:ring-zinc-300',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
};
