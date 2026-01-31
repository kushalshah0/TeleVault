function Breadcrumbs({ items = [], onNavigate }) {
  return (
    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <div key={item.id || index} className="flex items-center">
          {index > 0 && (
            <span className="mx-2 text-gray-400 dark:text-gray-600">/</span>
          )}
          {index === items.length - 1 ? (
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {item.label}
            </span>
          ) : (
            <button
              onClick={() => onNavigate(item)}
              className="text-gray-600 dark:text-gray-400 hover:text-primary-600 
                dark:hover:text-primary-400 transition-colors font-medium"
            >
              {item.label}
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}

export default Breadcrumbs;
