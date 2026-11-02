import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-serif font-semibold rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none tracking-wide';

  const variantStyles = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-sm shadow-emerald-600/20 focus:ring-emerald-500',
    secondary: 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-900 focus:ring-neutral-700 shadow-xs',
    success: 'bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-700 shadow-sm shadow-emerald-700/20 focus:ring-emerald-500',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-sm shadow-rose-600/20 focus:ring-rose-500',
    outline: 'border border-neutral-300 hover:bg-neutral-50 text-neutral-800 bg-white shadow-xs focus:ring-neutral-400',
    ghost: 'hover:bg-neutral-100 text-neutral-700 focus:ring-neutral-300',
  };

  const sizeStyles = {
    xs: 'text-xs px-2.5 py-1 gap-1',
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
