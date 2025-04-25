import React from 'react';
import './Badge.css';

const Badge = ({
  children,
  variant = 'primary',
  pill = false,
  className = '',
  ...props
}) => {
  const badgeClasses = [
    'ui-badge',
    `ui-badge-${variant}`,
    pill ? 'ui-badge-pill' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={badgeClasses} {...props}>
      {children}
    </span>
  );
};

export default Badge;
