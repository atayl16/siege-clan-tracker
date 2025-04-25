import React from 'react';
import './FormInput.css';

const FormInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className={`ui-form-group ${error ? 'ui-form-group-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="ui-form-label">
          {label}
          {required && <span className="ui-form-required">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="ui-form-input"
        {...props}
      />
      {error && <div className="ui-form-error">{error}</div>}
    </div>
  );
};

export default FormInput;
