export class LocalAIService {
  private static instance: LocalAIService;
  private baseUrl: string = 'http://localhost:11434/api';
  private model: string = 'llama2-chinese';
  
  /**
   * 清理 Markdown 格式，移除所有格式标记和图标标记
   * @param text 包含 Markdown 格式的文本
   * @returns 纯文本内容
   */
  private cleanMarkdown(text: string): string {
    let result = text;
    
    // 1. 移除图标标记（大图标和小图标）
    result = result.replace(/:icon-[\w-]+?-large:/g, '');
    result = result.replace(/:icon-[\w-]+?:/g, '');
    
    // 2. 移除标题标记 (#, ##)
    result = result.replace(/^#{1,6}\s*/gm, '');
    
    // 3. 移除列表标记 (-, *, +, 1., 2., 等)
    result = result.replace(/^([-*+]|\d+\.)\s*/gm, '');
    
    // 4. 移除粗体标记 (**text**)
    result = result.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // 5. 移除斜体标记 (*text*)
    result = result.replace(/\*(.*?)\*/g, '$1');
    
    // 6. 移除下划线标记 (__text__)
    result = result.replace(/__(.*?)__/g, '$1');
    
    // 7. 清理多余的空行和空白
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.trim();
    
    return result;
  }

  private constructor() {}

  static getInstance(): LocalAIService {
    if (!LocalAIService.instance) {
      LocalAIService.instance = new LocalAIService();
    }
    return LocalAIService.instance;
  }

  /**
   * 设置Ollama服务地址
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * 设置使用的模型
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * 检查Ollama服务是否可用
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.baseUrl}/tags`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('Ollama服务不可用:', error);
      return false;
    }
  }

  /**
   * 获取可用的模型列表
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tags`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.models) {
          return data.models.map((model: any) => model.name);
        }
      }
      return [];
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return [];
    }
  }

  /**
   * 生成文本摘要
   */
  async generateSummary(content: string, maxLength: number = 150): Promise<string> {
    try {
      // 首先检查服务是否可用并获取可用模型
      const isAvailable = await this.isServiceAvailable();
      if (!isAvailable) {
        throw new Error('Ollama服务不可用');
      }

      const availableModels = await this.getAvailableModels();
      
      // 如果默认模型不在可用模型中，尝试使用其他模型
      let useModel = this.model;
      if (!availableModels.includes(useModel)) {
        // 优先使用 llama2-chinese
        if (availableModels.includes('llama2-chinese')) {
          useModel = 'llama2-chinese';
          console.log('使用模型:', useModel);
        } else if (availableModels.includes('qwen:0.5b')) {
          useModel = 'qwen:0.5b';
          console.log('使用模型:', useModel);
        } else if (availableModels.includes('llama2')) {
          useModel = 'llama2';
          console.log('使用模型:', useModel);
        } else if (availableModels.length > 0) {
          useModel = availableModels[0];
          console.log('使用模型:', useModel);
        } else {
          throw new Error('没有可用的模型');
        }
      }

      // 清理 Markdown 格式，只保留纯文本
      const cleanContent = this.cleanMarkdown(content);
      const prompt = `请为以下内容生成简洁、准确的中文摘要，${maxLength}字以内，请自检确保不要超过${maxLength}字：\n\n${cleanContent}`;
      
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: useModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: maxLength
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.response) {
          return data.response.trim();
        }
      }
      
      return '摘要生成失败';
    } catch (error) {
      console.error('生成摘要失败:', error);
      const availableModels = await this.getAvailableModels().catch(() => []);
      
      let errorMessage = '无法连接到Ollama服务，请从 https://ollama.com 下载并安装Ollama，然后启动服务。';
      
      if (availableModels.length > 0) {
        errorMessage += `\n\n您当前已安装的模型：${availableModels.join('、')}`;
      }
      
      errorMessage += '\n\n推荐下载以下模型：\n# 推荐中文模型（适合生成中文摘要）\nollama pull llama2-chinese\n\n# 或使用轻量级模型（速度更快）\nollama pull qwen:0.5b\n\n# 或使用通用模型\nollama pull llama2';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * 对话功能（用于Mindy助手）
   */
  async chat(messages: Array<{role: string, content: string}>): Promise<string> {
    try {
      // 首先检查服务是否可用并获取可用模型
      const isAvailable = await this.isServiceAvailable();
      if (!isAvailable) {
        throw new Error('Ollama服务不可用');
      }

      const availableModels = await this.getAvailableModels();
      
      // 如果默认模型不在可用模型中，尝试使用其他模型
      let useModel = this.model;
      if (!availableModels.includes(useModel)) {
        // 优先使用 llama2-chinese
        if (availableModels.includes('llama2-chinese')) {
          useModel = 'llama2-chinese';
          console.log('使用模型:', useModel);
        } else if (availableModels.includes('qwen:0.5b')) {
          useModel = 'qwen:0.5b';
          console.log('使用模型:', useModel);
        } else if (availableModels.includes('llama2')) {
          useModel = 'llama2';
          console.log('使用模型:', useModel);
        } else if (availableModels.length > 0) {
          useModel = availableModels[0];
          console.log('使用模型:', useModel);
        } else {
          throw new Error('没有可用的模型');
        }
      }

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: useModel,
          messages: messages,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.message && data.message.content) {
          return data.message.content.trim();
        }
      }
      
      return '抱歉，我无法理解您的问题。';
    } catch (error) {
      console.error('对话失败:', error);
      const availableModels = await this.getAvailableModels().catch(() => []);
      
      let errorMessage = '无法连接到Ollama服务，请从 https://ollama.com 下载并安装Ollama，然后启动服务。';
      
      if (availableModels.length > 0) {
        errorMessage += `\n\n您当前已安装的模型：${availableModels.join('、')}`;
      }
      
      errorMessage += '\n\n推荐下载以下模型：\n# 推荐中文模型（适合生成中文摘要）\nollama pull llama2-chinese\n\n# 或使用轻量级模型（速度更快）\nollama pull qwen:0.5b\n\n# 或使用通用模型\nollama pull llama2';
      
      throw new Error(errorMessage);
    }
  }
}
