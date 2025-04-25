import React from 'react';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  square = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const buttonClasses = [
    'ui-button',
    `ui-button-${variant}`,
    `ui-button-${size}`,
    square ? 'ui-button-square' : '',
    disabled ? 'ui-button-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      type={type}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <span className="ui-button-icon ui-button-icon-left">{icon}</span>
      )}
      {!square && children}
      {icon && iconPosition === 'right' && (
        <span className="ui-button-icon ui-button-icon-right">{icon}</span>
      )}
      {square && icon && !children && (
        <span className="ui-button-icon">{icon}</span>
      )}
    </button>
  );
};

export default Button;
