import React from 'react';
import './EmptyState.css';

const EmptyState = ({
  title,
  description,
  icon,
  action,
  className = '',
  ...props
}) => {
  return (
    <div className={`ui-empty-state ${className}`} {...props}>
      {icon && <div className="ui-empty-state-icon">{icon}</div>}
      {title && <h3 className="ui-empty-state-title">{title}</h3>}
      {description && <p className="ui-empty-state-description">{description}</p>}
      {action && <div className="ui-empty-state-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
