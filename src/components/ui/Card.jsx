import React from 'react';
import './Card.css';

const Card = ({
  children,
  variant = 'default',
  hover = true,
  className = '',
  ...props
}) => {
  const cardClasses = [
    'ui-card',
    `ui-card-${variant}`,
    hover ? 'ui-card-hover' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

// Sub-components for structured content
Card.Header = ({ children, className = '', ...props }) => (
  <div className={`ui-card-header ${className}`} {...props}>
    {children}
  </div>
);

Card.Body = ({ children, className = '', ...props }) => (
  <div className={`ui-card-body ${className}`} {...props}>
    {children}
  </div>
);

Card.Footer = ({ children, className = '', ...props }) => (
  <div className={`ui-card-footer ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
