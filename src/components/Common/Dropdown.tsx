import React from 'react';
import styles from './Dropdown.module.css';

interface DropdownItem {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  items: DropdownItem[];
}

const Dropdown: React.FC<DropdownProps> = ({ isOpen, onClose, position, items }) => {
  if (!isOpen) return null;

  return (
    <div 
      className={styles.dropdown}
      style={{ left: position.x, top: position.y }}
      onMouseLeave={onClose}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={`${styles.dropdownItem} ${item.variant === 'danger' ? styles.danger : ''}`}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.icon && <span className={styles.icon}>{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default Dropdown;