function Card({ children, className = '', hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 
        dark:border-gray-700 shadow-sm
        ${hover ? 'hover:shadow-soft transition-shadow cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
}

function CardBody({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
