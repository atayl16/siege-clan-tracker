import React from 'react';
import './StatGroup.css';

const StatGroup = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`ui-stat-group ${className}`} {...props}>
      {children}
    </div>
  );
};

const Stat = ({
  label,
  value,
  className = '',
  ...props
}) => {
  return (
    <div className={`ui-stat ${className}`} {...props}>
      <div className="ui-stat-value">{value}</div>
      <div className="ui-stat-label">{label}</div>
    </div>
  );
};

StatGroup.Stat = Stat;

export default StatGroup;
