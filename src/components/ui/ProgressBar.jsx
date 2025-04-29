import React from 'react';
import PropTypes from 'prop-types';
import './ProgressBar.css';

export default function ProgressBar({ 
  value = 0, 
  max = 100, 
  label, 
  showPercentage = true,
  height = '8px',
  variant = 'primary',
  animated = true
}) {
  // Calculate percentage, ensuring it's between 0-100
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  // Determine label to display
  const displayLabel = label || (showPercentage ? `${Math.round(percentage)}%` : '');
  
  return (
    <div className="ui-progress-container" style={{ '--progress-height': height }}>
      <div className="ui-progress-track">
        <div 
          className={`ui-progress-bar ui-progress-${variant} ${animated ? 'ui-progress-animated' : ''}`} 
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={Math.round(percentage)}
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>
      {displayLabel && (
        <div className="ui-progress-label">{displayLabel}</div>
      )}
    </div>
  );
}

ProgressBar.propTypes = {
  value: PropTypes.number,
  max: PropTypes.number,
  label: PropTypes.string,
  showPercentage: PropTypes.bool,
  height: PropTypes.string,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'warning', 'info']),
  animated: PropTypes.bool
};
