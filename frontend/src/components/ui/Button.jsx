import { forwardRef } from 'react';

const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  loading = false,
  icon,
  className = '',
  ...props 
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500 shadow-sm',
    secondary: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-400',
    danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 shadow-sm',
    success: 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-500 shadow-sm',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-gray-400',
    outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:ring-primary-500',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs sm:text-sm gap-1.5',
    md: 'px-4 py-2 sm:py-2.5 text-sm gap-2',
    lg: 'px-6 py-2.5 sm:py-3 text-base gap-2',
  };
  
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!loading && icon && <span>{icon}</span>}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
