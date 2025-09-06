'use client';

interface A4PreviewToggleProps {
  isA4Mode: boolean;
  onToggle: (isA4Mode: boolean) => void;
  className?: string;
}

export function A4PreviewToggle({ isA4Mode, onToggle, className = '' }: A4PreviewToggleProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm font-medium text-gray-700">Display Mode:</span>
      
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onToggle(false)}
          className={`
            px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
            ${!isA4Mode 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Responsive
          </div>
        </button>
        
        <button
          onClick={() => onToggle(true)}
          className={`
            px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
            ${isA4Mode 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            A4 Preview
          </div>
        </button>
      </div>

    </div>
  );
}
