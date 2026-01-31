function EmptyState({ 
  icon = '📦', 
  title = 'No items found', 
  description = '', 
  action,
  actionLabel,
  className = '' 
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && actionLabel && (
        <button
          onClick={action}
          className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white 
            rounded-lg font-medium transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
