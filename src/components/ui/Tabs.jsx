import React from 'react';
import './Tabs.css';

/**
 * A row of tabs over the open tab's content.
 *
 * `heading` puts the page's title on the same row as the tabs (wrapping
 * above them when there isn't room), instead of on a row of its own above
 * them: title, gaps and tabs took about 180px before any content.
 */
const Tabs = ({
  activeTab,
  onChange,
  children,
  className = '',
  heading,
  ...props
}) => {
  const nav = (
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
  );

  return (
    <div className={`ui-tabs-container ${className}`} {...props}>
      {heading ? (
        <div className="ui-tabs-header">
          <h2 className="ui-tabs-heading">{heading}</h2>
          {nav}
        </div>
      ) : nav}
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
