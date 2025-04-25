import React from 'react';
import './SelectDropdown.css';

const SelectDropdown = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  labelField = 'label',
  valueField = 'value',
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`ui-select-dropdown ${className}`}>
      <select
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className="ui-select"
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option 
            key={option[valueField]} 
            value={option[valueField]}
          >
            {option[labelField]}
          </option>
        ))}
      </select>
      <div className="ui-select-arrow"></div>
    </div>
  );
};

export default SelectDropdown;
