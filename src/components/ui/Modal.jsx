import React from "react";
import "./Modal.css";

const Modal = ({ 
  isOpen, 
  onClose, 
  title,
  children, 
  size = "medium", 
  className = "" 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div 
        className={`ui-modal-container ui-modal-${size} ${className}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="ui-modal-header">
          <h3 className="ui-modal-title">{title}</h3>
          <button className="ui-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="ui-modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

// Additional components for easier usage
Modal.Header = ({ children, className = "" }) => (
  <div className={`ui-modal-header ${className}`}>{children}</div>
);

Modal.Title = ({ children, className = "" }) => (
  <h3 className={`ui-modal-title ${className}`}>{children}</h3>
);

Modal.Body = ({ children, className = "" }) => (
  <div className={`ui-modal-content ${className}`}>{children}</div>
);

Modal.Footer = ({ children, className = "" }) => (
  <div className={`ui-modal-actions ${className}`}>{children}</div>
);

export default Modal;
