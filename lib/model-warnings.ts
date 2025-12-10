/**
 * Utility functions for Ollama model size warnings and performance guidance
 */

export type ModelSizeCategory = 'small' | 'medium' | 'large' | 'very-large';

export interface ModelWarning {
  category: ModelSizeCategory;
  color: 'green' | 'blue' | 'yellow' | 'red';
  badge: string;
  title: string;
  message: string;
  recommendation?: string;
  minRAM?: string;
}

/**
 * Categorize model by size in GB
 */
export function getModelSizeCategory(sizeGB: number): ModelSizeCategory {
  if (sizeGB < 5) return 'small';
  if (sizeGB < 10) return 'medium';
  if (sizeGB < 50) return 'large';
  return 'very-large';
}

/**
 * Get performance warning for a model based on its size
 */
export function getModelWarning(sizeGB: number, modelName?: string): ModelWarning {
  const category = getModelSizeCategory(sizeGB);
  
  // Special handling for known large models
  const isDeepSeek = modelName?.toLowerCase().includes('deepseek');
  const isR1 = modelName?.toLowerCase().includes('r1');
  
  switch (category) {
    case 'small':
      return {
        category: 'small',
        color: 'green',
        badge: '✓ Recommended',
        title: 'Lightweight & Fast',
        message: 'This model is perfect for Santa letters. Quick responses with minimal resource usage.',
        minRAM: '4-8 GB',
      };
    
    case 'medium':
      return {
        category: 'medium',
        color: 'blue',
        badge: '✓ Good Choice',
        title: 'Balanced Performance',
        message: 'This model provides good quality responses with reasonable resource usage.',
        minRAM: '8-16 GB',
      };
    
    case 'large':
      return {
        category: 'large',
        color: 'yellow',
        badge: '⚠ Large Model',
        title: 'Higher Resource Usage',
        message: 'This model will use significant RAM and may slow down letter generation. Consider a smaller model for better performance.',
        recommendation: 'Recommended: llama3.2:latest or mistral:latest for faster responses',
        minRAM: '16-32 GB',
      };
    
    case 'very-large':
      if (isDeepSeek || isR1) {
        return {
          category: 'very-large',
          color: 'red',
          badge: '⚠ Very Large Model',
          title: 'DeepSeek R1 - Advanced Reasoning',
          message: 'DeepSeek R1 is a 671B parameter reasoning model (~47GB). It provides exceptional quality but requires substantial resources and generates responses slowly (30+ seconds per letter).',
          recommendation: 'Only use if you have 64GB+ RAM and can accept slow response times. For most users, llama3.2:latest provides excellent quality with 10x faster speed.',
          minRAM: '64+ GB',
        };
      }
      
      return {
        category: 'very-large',
        color: 'red',
        badge: '⚠ Very Large Model',
        title: 'Extreme Resource Requirements',
        message: 'This model requires massive amounts of RAM and will be very slow for letter generation. Strongly consider using a smaller model.',
        recommendation: 'Recommended: llama3.2:latest, llama3.1:latest, or mistral:latest',
        minRAM: '64+ GB',
      };
  }
}

/**
 * Check if a model requires confirmation before use
 */
export function requiresConfirmation(sizeGB: number): boolean {
  return sizeGB >= 10; // Large and very-large models
}

/**
 * Get estimated response time based on model size
 */
export function getEstimatedResponseTime(sizeGB: number): string {
  if (sizeGB < 5) return '5-10 seconds';
  if (sizeGB < 10) return '10-20 seconds';
  if (sizeGB < 50) return '20-40 seconds';
  return '30-60+ seconds';
}

/**
 * Get color class for Tailwind CSS based on warning color
 */
export function getColorClasses(color: 'green' | 'blue' | 'yellow' | 'red'): {
  bg: string;
  border: string;
  text: string;
  badge: string;
} {
  switch (color) {
    case 'green':
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        badge: 'bg-green-500/20 text-green-300',
      };
    case 'blue':
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        badge: 'bg-blue-500/20 text-blue-300',
      };
    case 'yellow':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        badge: 'bg-yellow-500/20 text-yellow-300',
      };
    case 'red':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        badge: 'bg-red-500/20 text-red-300',
      };
  }
}
