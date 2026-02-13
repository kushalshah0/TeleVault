'use client'

import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {label}
          </label>
        )}
        <input
          className={`
            flex h-10 w-full rounded-lg border border-input 
            bg-background px-3 py-2 text-sm 
            ring-offset-background 
            file:border-0 file:bg-transparent file:text-sm file:font-medium 
            placeholder:text-muted-foreground 
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
            disabled:cursor-not-allowed disabled:opacity-50
            transition-all duration-200
            ${error ? 'border-destructive focus-visible:ring-destructive' : ''}
            ${className}
          `}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-destructive">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
