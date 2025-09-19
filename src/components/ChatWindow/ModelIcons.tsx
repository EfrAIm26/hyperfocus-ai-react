import { 
  SiGoogle, 
  SiOpenai, 
  SiAnthropic,
  SiPerplexity
} from 'react-icons/si';
import { 
  FaImage, 
  FaCode, 
  FaSearch, 
  FaFilePdf, 
  FaPalette,
  FaRobot,
  FaBolt
} from 'react-icons/fa';
import { RiAiGenerate } from 'react-icons/ri';

// Provider Icons
export const getProviderIcon = (provider: string) => {
  const iconProps = { size: 16, className: 'provider-icon' };
  
  switch (provider.toLowerCase()) {
    case 'google':
      return <SiGoogle {...iconProps} style={{ color: '#4285f4' }} />;
    case 'openai':
      return <SiOpenai {...iconProps} style={{ color: '#00a67e' }} />;
    case 'anthropic':
      return <SiAnthropic {...iconProps} style={{ color: '#d97706' }} />;
    case 'perplexity':
      return <SiPerplexity {...iconProps} style={{ color: '#20b2aa' }} />;
    case 'xai':
      return <FaBolt {...iconProps} style={{ color: '#1DA1F2' }} />;
    case 'qwen':
      return <RiAiGenerate {...iconProps} style={{ color: '#1e40af' }} />;
    case 'deepseek':
      return <FaRobot {...iconProps} style={{ color: '#7c3aed' }} />;
    default:
      return <FaRobot {...iconProps} style={{ color: '#6b7280' }} />;
  }
};

// Capability Icons with tooltips
export const getCapabilityIcons = (capabilities: {
  image_input: boolean;
  web_search: boolean;
  code_generation: boolean;
  pdf_input: boolean;
  image_generation: boolean;
}) => {
  const icons = [];
  const iconProps = { size: 12, className: 'capability-icon' };

  if (capabilities.image_input) {
    icons.push(
      <FaImage 
        key="image-input" 
        {...iconProps} 
        title="Supports image input"
        style={{ color: '#10b981' }}
      />
    );
  }

  if (capabilities.web_search) {
    icons.push(
      <FaSearch 
        key="web-search" 
        {...iconProps} 
        title="Web search capabilities"
        style={{ color: '#3b82f6' }}
      />
    );
  }

  if (capabilities.code_generation) {
    icons.push(
      <FaCode 
        key="code-generation" 
        {...iconProps} 
        title="Code generation"
        style={{ color: '#8b5cf6' }}
      />
    );
  }

  if (capabilities.pdf_input) {
    icons.push(
      <FaFilePdf 
        key="pdf-input" 
        {...iconProps} 
        title="PDF input support"
        style={{ color: '#ef4444' }}
      />
    );
  }

  if (capabilities.image_generation) {
    icons.push(
      <FaPalette 
        key="image-generation" 
        {...iconProps} 
        title="Image generation"
        style={{ color: '#f59e0b' }}
      />
    );
  }

  return icons;
};