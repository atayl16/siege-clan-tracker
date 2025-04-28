import React, { forwardRef } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import './SearchInput.css';

// Use forwardRef to allow the component to receive a ref
const SearchInput = forwardRef(({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  className = "",
  disabled = false
}, ref) => {
  return (
    <div className={`ui-search-container ${className}`}>
      <div className="ui-search-input-wrapper">
        <FaSearch className="ui-search-icon" />
        <input
          ref={ref} // Pass the ref to the input element
          type="text"
          className="ui-search-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        {value && (
          <button
            type="button"
            className="ui-search-clear-button"
            onClick={onClear}
            disabled={disabled}
            aria-label="Clear search"
          >
            <FaTimes className="ui-search-clear-icon" />
          </button>
        )}
      </div>
    </div>
  );
});

// Add a display name for better debugging
SearchInput.displayName = 'SearchInput';

export default SearchInput;
