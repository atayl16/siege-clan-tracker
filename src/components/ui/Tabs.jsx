import React from 'react';
import './Tabs.css';

const Tabs = ({
  activeTab,
  onChange,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`ui-tabs-container ${className}`} {...props}>
      <div className="ui-tabs-nav">
        {/*
          React.Children.map passes null and false through, so a caller writing
          {condition ? <Tabs.Tab .../> : null} used to crash here on
          `tab.props`. Conditional tabs are a reasonable thing to write, so
          skip anything that is not an element.
        */}
        {React.Children.map(children, (tab) => tab?.props && (
          <button
            key={tab.props.tabId}
            className={`ui-tab ${tab.props.tabId === activeTab ? 'ui-tab-active' : ''}`}
            onClick={() => onChange(tab.props.tabId)}
          >
            {tab.props.icon && <span className="ui-tab-icon">{tab.props.icon}</span>}
            <span className="ui-tab-label">{tab.props.label}</span>
            {tab.props.badge && <span className="ui-tab-badge">{tab.props.badge}</span>}
          </button>
        ))}
      </div>
      <div className="ui-tabs-content">
        {React.Children.map(children, (tab) => tab?.props && (
          <div 
            key={tab.props.tabId} 
            className={`ui-tab-pane ${tab.props.tabId === activeTab ? 'ui-tab-pane-active' : ''}`}
          >
            {tab.props.tabId === activeTab && tab.props.children}
          </div>
        ))}
      </div>
    </div>
  );
};

const Tab = ({ children }) => {
  return children;
};

Tabs.Tab = Tab;

export default Tabs;
