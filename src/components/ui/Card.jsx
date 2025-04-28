import React from "react";
import "./Card.css";

export default function Card({ 
  children, 
  className = "", 
  variant = "default", 
  hover = false, 
  clickable = false, // This prop is causing the warning
  ...props 
}) {
  // Create a new props object without the clickable prop
  const { ...domProps } = props;
  
  return (
    <div 
      className={`ui-card ui-card-${variant} ${hover ? 'ui-card-hover' : ''} ${clickable ? 'ui-card-clickable' : ''} ${className}`}
      {...domProps}
    >
      {children}
    </div>
  );
}

// Card sub-components
Card.Header = function CardHeader({ children, className = "", ...props }) {
  return (
    <div className={`ui-card-header ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children, className = "", ...props }) {
  return (
    <div className={`ui-card-body ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ children, className = "", ...props }) {
  return (
    <div className={`ui-card-footer ${className}`} {...props}>
      {children}
    </div>
  );
};
