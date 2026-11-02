import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border border-neutral-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-neutral-300 transition-all duration-150 p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'emerald' | 'blue' | 'rose' | 'amber' | 'purple' | 'slate' | 'brand';
  compact?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'slate',
}) => {
  const colorMap = {
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      borderHover: 'hover:border-emerald-300',
      accent: 'border-t-2 border-t-emerald-600',
    },
    brand: {
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      borderHover: 'hover:border-emerald-300',
      accent: 'border-t-2 border-t-emerald-600',
    },
    blue: {
      iconBg: 'bg-sky-50 text-sky-700 border-sky-200',
      borderHover: 'hover:border-sky-300',
      accent: 'border-t-2 border-t-sky-600',
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-700 border-rose-200',
      borderHover: 'hover:border-rose-300',
      accent: 'border-t-2 border-t-rose-600',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
      borderHover: 'hover:border-amber-300',
      accent: 'border-t-2 border-t-amber-600',
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-700 border-purple-200',
      borderHover: 'hover:border-purple-300',
      accent: 'border-t-2 border-t-purple-600',
    },
    slate: {
      iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
      borderHover: 'hover:border-slate-300',
      accent: 'border-t-2 border-t-slate-500',
    },
  };

  const scheme = colorMap[color] || colorMap.slate;

  return (
    <div className={`group relative bg-white rounded-lg border border-neutral-200/90 ${scheme.accent} ${scheme.borderHover} shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 p-3.5 sm:p-4 overflow-hidden flex flex-col justify-between`}>
      {/* Top row: Title and Color-coded Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-neutral-600 truncate">
          {title}
        </span>
        <div className={`p-2 rounded-md border ${scheme.iconBg} shrink-0 transition-transform group-hover:scale-105 duration-200 shadow-xs`}>
          {icon}
        </div>
      </div>

      {/* Main value - Times New Roman */}
      <div className="mt-2.5">
        <div className="text-xl sm:text-2xl font-bold font-serif text-neutral-900 tracking-tight leading-tight">
          {value}
        </div>
        {subtitle && (
          <p className="mt-1 text-[11px] text-neutral-500 font-serif italic truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* Trend if present */}
      {trend && (
        <div className="mt-2 text-[10px] flex items-center gap-1 font-serif">
          <span className={trend.isPositive ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
};
