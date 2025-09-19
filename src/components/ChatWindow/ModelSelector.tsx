import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { aiModels, type AIModel } from '../../data/models';
import { getProviderIcon, getCapabilityIcons } from './ModelIcons';
import styles from './ModelSelector.module.css';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find the currently selected model
  const currentModel = aiModels.find(model => model.id === selectedModel) || aiModels[0];

  // Filter models based on search term
  const filteredModels = aiModels.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleModelSelect = (model: AIModel) => {
    onModelChange(model.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  return (
    <div className={styles.modelSelector} ref={dropdownRef}>
      {/* Main Button */}
      <button 
        className={styles.selectorButton}
        onClick={toggleDropdown}
        type="button"
      >
        <div className={styles.selectedModel}>
          <div className={styles.modelInfo}>
            {getProviderIcon(currentModel.provider)}
            <span className={styles.modelName}>{currentModel.name}</span>
          </div>
          <ChevronDown 
            size={16} 
            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={styles.dropdown}>
          {/* Search Input */}
          <div className={styles.searchContainer}>
            <Search size={16} className={styles.searchIcon} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* Models List */}
          <div className={styles.modelsList}>
            {filteredModels.length > 0 ? (
              filteredModels.map((model) => (
                <button
                  key={model.id}
                  className={`${styles.modelItem} ${model.id === selectedModel ? styles.selected : ''}`}
                  onClick={() => handleModelSelect(model)}
                  type="button"
                >
                  <div className={styles.modelItemContent}>
                    <div className={styles.modelMainInfo}>
                      {getProviderIcon(model.provider)}
                      <div className={styles.modelDetails}>
                        <span className={styles.modelItemName}>{model.name}</span>
                        <span className={styles.modelProvider}>{model.provider}</span>
                      </div>
                    </div>
                    <div className={styles.capabilities}>
                      {getCapabilityIcons(model.capabilities)}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className={styles.noResults}>
                No models found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;