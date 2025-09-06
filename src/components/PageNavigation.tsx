'use client';

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PageNavigation({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  className = '' 
}: PageNavigationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-center gap-4 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2 ${className}`}>
      {/* Previous button */}
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        className={`p-1 rounded-md transition-colors ${
          currentPage <= 1 
            ? 'text-gray-300 cursor-not-allowed' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
        aria-label="Previous page"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-2">
        {Array.from({ length: Math.min(7, totalPages) }, (_, index) => {
          let pageNum;
          
          if (totalPages <= 7) {
            pageNum = index + 1;
          } else if (currentPage <= 4) {
            if (index < 5) pageNum = index + 1;
            else if (index === 5) return <span key="ellipsis1" className="text-gray-400">...</span>;
            else pageNum = totalPages;
          } else if (currentPage >= totalPages - 3) {
            if (index === 0) pageNum = 1;
            else if (index === 1) return <span key="ellipsis2" className="text-gray-400">...</span>;
            else pageNum = totalPages - 6 + index;
          } else {
            if (index === 0) pageNum = 1;
            else if (index === 1) return <span key="ellipsis3" className="text-gray-400">...</span>;
            else if (index >= 2 && index <= 4) pageNum = currentPage - 2 + (index - 2);
            else if (index === 5) return <span key="ellipsis4" className="text-gray-400">...</span>;
            else pageNum = totalPages;
          }

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 text-sm font-medium rounded-md transition-colors ${
                currentPage === pageNum
                  ? 'bg-primary-main text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        className={`p-1 rounded-md transition-colors ${
          currentPage >= totalPages
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
        aria-label="Next page"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Page info */}
      <div className="text-sm text-gray-500 ml-2">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
}
