import React from 'react';
import './Card.css';

const CardGrid = ({ children, className = '', ...props }) => {
  return (
    <div className={`ui-card-grid ${className}`} {...props}>
      {children}
    </div>
  );
};

export default CardGrid;
