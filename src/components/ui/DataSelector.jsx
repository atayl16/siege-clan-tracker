import React, { useState, useEffect } from 'react';
import SearchInput from './SearchInput';
import DataTable from './DataTable';
import SelectDropdown from './SelectDropdown';
import './DataSelector.css';

const DataSelector = ({
  data = [],
  columns,
  onSelect,
  selectedId = null,
  keyField = 'id',
  searchFields = ['name'],
  searchPlaceholder = 'Search...',
  viewMode = 'table',
  labelField = 'name',
  valueField = 'id',
  loading = false,
  error = null,
  emptyMessage = 'No data available',
  disabled = false,
  className = '',
  ...props
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState(data);

  // Filter data when search term or data changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(data);
      return;
    }

    const lowercaseSearch = searchTerm.toLowerCase();
    const filtered = data.filter(item =>
      searchFields.some(field => {
        const value = item[field]?.toString()?.toLowerCase();
        return value && value.includes(lowercaseSearch);
      })
    );

    setFilteredData(filtered);
  }, [searchTerm, data, searchFields]);

  const handleRowClick = (item) => {
    if (onSelect && !disabled) {
      onSelect(item);
    }
  };

  const handleSelectChange = (e) => {
    if (onSelect && !disabled) {
      const selectedItem = data.find(item => item[valueField]?.toString() === e.target.value);
      if (selectedItem) {
        onSelect(selectedItem);
      }
    }
  };

  return (
    <div className={`ui-data-selector ${className}`} {...props}>
      <SearchInput
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onClear={() => setSearchTerm('')}
        placeholder={searchPlaceholder}
        disabled={disabled || loading}
      />

      {viewMode === 'dropdown' ? (
        <SelectDropdown
          value={selectedId}
          onChange={handleSelectChange}
          options={filteredData}
          labelField={labelField}
          valueField={valueField}
          placeholder="Select an option"
          disabled={disabled || loading}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedId}
          keyField={keyField}
          loading={loading}
          error={error}
          emptyMessage={emptyMessage}
        />
      )}
    </div>
  );
};

export default DataSelector;
