// src/data/models.ts
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: {
    image_input: boolean;
    web_search: boolean;
    code_generation: boolean;
    pdf_input: boolean;
    image_generation: boolean;
  };
}

export const aiModels: AIModel[] = [
  {
    "id": "x-ai/grok-4",
    "name": "Grok 4",
    "provider": "xAI",
    "capabilities": { "image_input": true, "web_search": true, "code_generation": true, "pdf_input": true, "image_generation": false }
  },
  {
    "id": "anthropic/claude-opus-4",
    "name": "Claude 4 Opus",
    "provider": "Anthropic",
    "capabilities": { "image_input": true, "web_search": false, "code_generation": true, "pdf_input": true, "image_generation": false }
  },
  {
    "id": "anthropic/claude-sonnet-4",
    "name": "Claude 4 Sonnet",
    "provider": "Anthropic",
    "capabilities": { "image_input": true, "web_search": false, "code_generation": true, "pdf_input": true, "image_generation": false }
  },
  {
    "id": "openai/gpt-5",
    "name": "GPT-5",
    "provider": "OpenAI",
    "capabilities": { "image_input": true, "web_search": true, "code_generation": true, "pdf_input": true, "image_generation": false }
  },
  {
    "id": "google/gemini-2.5-flash-image-preview",
    "name": "Gemini Nano Banana (Image Gen)",
    "provider": "Google",
    "capabilities": { "image_input": true, "web_search": false, "code_generation": false, "pdf_input": false, "image_generation": true }
  },
  {
    "id": "google/gemini-2.5-pro",
    "name": "Gemini 2.5 Pro",
    "provider": "Google",
    "capabilities": { "image_input": true, "web_search": false, "code_generation": true, "pdf_input": true, "image_generation": false }
  },
  {
    "id": "perplexity/sonar-deep-research",
    "name": "Perplexity Sonar Deep Research",
    "provider": "Perplexity",
    "capabilities": { "image_input": false, "web_search": true, "code_generation": true, "pdf_input": false, "image_generation": false }
  },
  {
    "id": "perplexity/sonar-reasoning-pro",
    "name": "Perplexity Sonar Reasoning Pro",
    "provider": "Perplexity",
    "capabilities": { "image_input": false, "web_search": true, "code_generation": true, "pdf_input": false, "image_generation": false }
  },
  {
    "id": "x-ai/grok-code-fast-1",
    "name": "Grok Code Fast 1",
    "provider": "xAI",
    "capabilities": { "image_input": false, "web_search": false, "code_generation": true, "pdf_input": false, "image_generation": false }
  },
  {
    "id": "qwen/qwen3-30b-a3b",
    "name": "Qwen3 30B A3B",
    "provider": "Qwen",
    "capabilities": { "image_input": false, "web_search": false, "code_generation": true, "pdf_input": true, "image_generation": false }
  },
  {
    "id": "deepseek/deepseek-chat-v3-0324:free",
    "name": "DeepSeek V3 (Free)",
    "provider": "DeepSeek",
    "capabilities": { "image_input": false, "web_search": false, "code_generation": true, "pdf_input": true, "image_generation": false }
  }
];