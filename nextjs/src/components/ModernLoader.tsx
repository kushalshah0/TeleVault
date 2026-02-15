'use client'

/**
 * Simple Spinner Loader
 */
export function Loader({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
  };

  return (
    <div className={`inline-block animate-spin rounded-full border-b-2 border-primary ${sizes[size]} ${className}`}></div>
  );
}

/**
 * Modern Spinner Component - Circular spinner with gradient effect
 */
export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  return (
    <div className={`relative ${sizes[size]} ${className}`}>
      <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin"></div>
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-r-primary-400 animate-spin" style={{ animationDuration: '1.5s' }}></div>
    </div>
  );
}

/**
 * Loading Dots Animation
 */
export function LoadingDots({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} bg-primary-500 rounded-full`}
          style={{
            animation: 'bounce 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Modern Full Page Loader
 */
export function ModernLoader({ text = 'Loading...', type = 'spinner' }: { text?: string; type?: 'spinner' | 'dots' | 'cloud' }) {
  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        {type === 'dots' ? (
          <LoadingDots size="lg" />
        ) : type === 'cloud' ? (
          <div className="text-7xl animate-bounce" style={{ animationDuration: '2s' }}>
            ☁️
          </div>
        ) : (
          <Loader size="xl" />
        )}
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 animate-pulse">
          {text}
        </p>
      </div>
    </div>
  );
}

/**
 * Inline Spinner (for buttons)
 */
export function InlineSpinner({ size = 'sm', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return (
    <div className={`text-current ${className}`}>
      <Spinner size={size} />
    </div>
  );
}

/**
 * Loading Skeleton for content placeholders
 */
export function LoadingSkeleton({ count = 1, height = '20px', width = '100%', className = '' }: { count?: number; height?: string; width?: string; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg"
          style={{ 
            height, 
            width,
          }}
        />
      ))}
    </div>
  );
}

export default ModernLoader;
