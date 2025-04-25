import React from 'react';
import './LoadingIndicator.css';

const LoadingIndicator = ({
  text = 'Loading...',
  size = 'md',
  className = '',
  ...props
}) => {
  const spinnerClasses = [
    'ui-loading-spinner',
    `ui-loading-spinner-${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="ui-loading-container" {...props}>
      <div className={spinnerClasses}></div>
      {text && <div className="ui-loading-text">{text}</div>}
    </div>
  );
};

export default LoadingIndicator;
