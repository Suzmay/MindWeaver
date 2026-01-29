export class KeyManager {
  private static instance: KeyManager;
  private key: CryptoKey | null = null;
  private keyGenerated = false;
  
  private constructor() {}
  
  static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }
  
  // 生成新密钥
  async generateKey(): Promise<CryptoKey> {
    try {
      const key = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      this.key = key;
      this.keyGenerated = true;
      await this.saveKey();
      
      return key;
    } catch (error) {
      throw new Error('Failed to generate key');
    }
  }
  
  // 从密码派生密钥
  async deriveKey(password: string, salt?: Uint8Array): Promise<CryptoKey> {
    try {
      if (!salt) {
        salt = crypto.getRandomValues(new Uint8Array(16));
      }
      
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt.buffer as ArrayBuffer,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      this.key = key;
      this.keyGenerated = true;
      await this.saveKey();
      
      return key;
    } catch (error) {
      console.error('Key derivation error:', error);
      throw new Error('Failed to derive key');
    }
  }
  
  // 保存密钥
  private async saveKey(): Promise<void> {
    if (!this.key) {
      throw new Error('No key to save');
    }
    
    try {
      // 导出密钥为可存储格式
      const exportedKey = await crypto.subtle.exportKey('jwk', this.key);
      const keyJson = JSON.stringify(exportedKey);
      
      // 使用设备指纹增强安全性
      const deviceFingerprint = await this.getDeviceFingerprint();
      const storageKey = `mindweaver_encryption_key_${deviceFingerprint}`;
      
      // 存储到 localStorage
      localStorage.setItem(storageKey, keyJson);
    } catch (error) {
      console.error('Key save error:', error);
      throw new Error('Failed to save key');
    }
  }
  
  // 加载密钥
  async loadKey(): Promise<CryptoKey | null> {
    try {
      const deviceFingerprint = await this.getDeviceFingerprint();
      const storageKey = `mindweaver_encryption_key_${deviceFingerprint}`;
      const keyJson = localStorage.getItem(storageKey);
      
      if (!keyJson) {
        return null;
      }
      
      const exportedKey = JSON.parse(keyJson);
      const key = await crypto.subtle.importKey(
        'jwk',
        exportedKey,
        {
          name: 'AES-GCM'
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      this.key = key;
      this.keyGenerated = true;
      
      return key;
    } catch (error) {
      return null;
    }
  }
  
  // 获取设备指纹
  private async getDeviceFingerprint(): Promise<string> {
    try {
      // 收集设备信息
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx!.fillText('device_fingerprint', 0, 0);
      const canvasHash = canvas.toDataURL();
      
      const navigatorInfo = JSON.stringify({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory
      });
      
      // 生成哈希
      const encoder = new TextEncoder();
      const data = encoder.encode(canvasHash + navigatorInfo);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex.substring(0, 16);
    } catch (error) {
      console.error('Device fingerprint error:', error);
      return 'default_fingerprint';
    }
  }
  
  // 获取当前密钥
  getKey(): CryptoKey | null {
    return this.key;
  }
  
  // 检查密钥是否已生成
  hasKey(): boolean {
    return this.keyGenerated;
  }
  
  // 清除密钥
  clearKey(): void {
    this.key = null;
    this.keyGenerated = false;
    
    // 清除存储的密钥
    try {
      const deviceFingerprint = this.getDeviceFingerprint();
      const storageKey = `mindweaver_encryption_key_${deviceFingerprint}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Key clear error:', error);
    }
  }
  
  // 生成备份码（12个单词）
  generateBackupCode(): string {
    const wordList = [
      'apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew',
      'kiwi', 'lemon', 'mango', 'nectarine', 'orange', 'peach', 'quince', 'raspberry',
      'strawberry', 'tangerine', 'watermelon', 'zucchini', 'avocado', 'broccoli',
      'carrot', 'daikon', 'eggplant', 'fennel', 'garlic', 'horseradish', 'jalapeno',
      'kale', 'lettuce', 'mushroom', 'onion', 'parsnip', 'radish', 'spinach', 'turnip'
    ];
    
    const words = [];
    for (let i = 0; i < 12; i++) {
      const randomIndex = Math.floor(Math.random() * wordList.length);
      words.push(wordList[randomIndex]);
    }
    
    return words.join('-');
  }
}
