import './Loading.css';

function Loading({ type = 'spinner', size = 'md', text = '' }) {
  const sizeClass = `loading-${size}`;

  const renderLoading = () => {
    switch (type) {
      case 'spinner':
        return (
          <div className={`loading-spinner ${sizeClass}`}>
            <div className="spinner-ring"></div>
          </div>
        );

      case 'dots':
        return (
          <div className={`loading-dots ${sizeClass}`}>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        );

      case 'pulse':
        return (
          <div className={`loading-pulse ${sizeClass}`}>
            <div className="pulse-circle"></div>
          </div>
        );

      case 'bars':
        return (
          <div className={`loading-bars ${sizeClass}`}>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
        );

      case 'cloud':
        return (
          <div className={`loading-cloud ${sizeClass}`}>
            <div className="cloud">☁️</div>
            <div className="upload-arrow">⬆️</div>
          </div>
        );

      case 'progress':
        return (
          <div className={`loading-progress ${sizeClass}`}>
            <div className="progress-track">
              <div className="progress-fill"></div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="loading-container">
      {renderLoading()}
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
}

// Full page loading overlay
export function LoadingOverlay({ text = 'Loading...', type = 'spinner' }) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <Loading type={type} size="lg" />
        <p className="loading-overlay-text">{text}</p>
      </div>
    </div>
  );
}

// Inline loading (for buttons, etc.)
export function LoadingInline({ size = 'sm' }) {
  return (
    <span className="loading-inline">
      <Loading type="spinner" size={size} />
    </span>
  );
}

// Skeleton loader for content
export function LoadingSkeleton({ width = '100%', height = '20px', count = 1 }) {
  return (
    <div className="loading-skeleton-container">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="loading-skeleton"
          style={{ width, height }}
        ></div>
      ))}
    </div>
  );
}

export default Loading;
