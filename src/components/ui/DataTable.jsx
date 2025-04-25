import React from 'react';
import './DataTable.css';

const DataTable = ({
  columns,
  data,
  onRowClick,
  selectedRowId,
  keyField = 'id',
  emptyMessage = 'No data available',
  loading = false,
  error = null,
  className = '',
  ...props
}) => {
  if (loading) return <div className="ui-data-loading">Loading data...</div>;
  if (error) return <div className="ui-data-error">{error}</div>;
  
  return (
    <div className={`ui-data-table-container ${className}`} {...props}>
      {data.length === 0 ? (
        <div className="ui-data-empty">{emptyMessage}</div>
      ) : (
        <table className="ui-data-table">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th 
                  key={index}
                  className={column.className || ''}
                  style={column.style || {}}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={item[keyField]}
                className={item[keyField] === selectedRowId ? 'selected-row' : ''}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map((column, colIndex) => (
                  <td 
                    key={colIndex}
                    className={column.className || ''}
                    style={column.style || {}}
                  >
                    {column.render ? column.render(item) : item[column.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DataTable;
