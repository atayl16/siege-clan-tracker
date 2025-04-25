import React from 'react';
import './SearchInput.css';

const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`ui-search-input ${className}`}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        {...props}
      />
      {value && (
        <button
          className="ui-search-clear"
          onClick={onClear}
          disabled={disabled}
          type="button"
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default SearchInput;
