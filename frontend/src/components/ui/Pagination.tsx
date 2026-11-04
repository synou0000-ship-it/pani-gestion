import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1 && (!totalItems || totalItems <= (itemsPerPage || 15))) {
    return null;
  }

  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div
      className={`px-3 py-3 sm:px-5 sm:py-3.5 bg-slate-50/80 border-t border-slate-200/90 flex flex-col xs:flex-row items-center justify-between gap-2.5 text-xs text-slate-600 font-serif ${className}`}
    >
      {/* Compteur éléments */}
      <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
        {totalItems !== undefined ? (
          <>
            Total : <span className="font-bold text-slate-800">{totalItems}</span> élément{totalItems > 1 ? 's' : ''} • Page{' '}
            <span className="font-bold text-slate-800">{currentPage}</span> / {safeTotalPages}
          </>
        ) : (
          <>
            Page <span className="font-bold text-slate-800">{currentPage}</span> sur{' '}
            <span className="font-bold text-slate-800">{safeTotalPages}</span>
          </>
        )}
      </div>

      {/* Boutons de pagination */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          icon={<ChevronLeft className="h-4 w-4" />}
          className="font-serif text-xs min-h-[36px] px-2.5"
          aria-label="Page précédente"
        >
          <span className="hidden sm:inline">Précédent</span>
        </Button>

        {/* Numéros de page clés sur desktop */}
        <div className="hidden md:flex items-center gap-1">
          {Array.from({ length: Math.min(5, safeTotalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (safeTotalPages > 5 && currentPage > 3) {
              pageNum = currentPage - 3 + i;
              if (pageNum > safeTotalPages) pageNum = safeTotalPages - 4 + i;
            }
            if (pageNum < 1) pageNum = i + 1;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                  currentPage === pageNum
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= safeTotalPages}
          onClick={() => onPageChange(currentPage + 1)}
          icon={<ChevronRight className="h-4 w-4" />}
          className="font-serif text-xs min-h-[36px] px-2.5 flex-row-reverse"
          aria-label="Page suivante"
        >
          <span className="hidden sm:inline">Suivant</span>
        </Button>
      </div>
    </div>
  );
};

