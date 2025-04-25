import React from 'react';
import './Message.css';

const Message = ({
  children,
  type = 'info',
  icon,
  className = '',
  ...props
}) => {
  const messageClasses = [
    'ui-message',
    `ui-message-${type}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={messageClasses} {...props}>
      {icon && <span className="ui-message-icon">{icon}</span>}
      <span className="ui-message-content">{children}</span>
    </div>
  );
};

export default Message;
