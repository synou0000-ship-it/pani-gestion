import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'brand';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
}) => {
  const variantStyles = {
    brand: 'bg-emerald-50 text-emerald-800 border-emerald-200/90 font-bold',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/90 font-bold',
    danger: 'bg-rose-50 text-rose-800 border-rose-200/90 font-bold',
    warning: 'bg-amber-50 text-amber-900 border-amber-200/90 font-bold',
    info: 'bg-sky-50 text-sky-800 border-sky-200/90 font-bold',
    neutral: 'bg-neutral-100 text-neutral-800 border-neutral-200 font-semibold',
  };

  const dotColors = {
    brand: 'bg-emerald-600',
    success: 'bg-emerald-600',
    danger: 'bg-rose-600',
    warning: 'bg-amber-600',
    info: 'bg-sky-600',
    neutral: 'bg-neutral-500',
  };

  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-serif rounded border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]} shrink-0`} />
      )}
      {children}
    </span>
  );
};
