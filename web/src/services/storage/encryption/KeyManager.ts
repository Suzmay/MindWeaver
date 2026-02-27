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
    console.log('=== KeyManager.generateKey: 开始生成新密钥 ===');
    try {
      console.log('1. 检查crypto.subtle是否可用');
      if (!crypto || !crypto.subtle) {
        throw new Error('crypto.subtle API 不可用');
      }
      
      console.log('2. 开始生成AES-GCM密钥');
      const key = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      console.log('3. 密钥生成成功');
      this.key = key;
      this.keyGenerated = true;
      
      console.log('4. 开始保存密钥');
      await this.saveKey();
      console.log('5. 密钥保存成功');
      
      console.log('=== KeyManager.generateKey: 密钥生成完成 ===');
      return key;
    } catch (error) {
      console.error('=== KeyManager.generateKey: 密钥生成失败 ===:', error);
      console.error('错误堆栈:', (error as Error).stack);
      throw new Error(`生成密钥失败: ${(error as Error).message}`);
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
      console.error('密钥派生错误:', error);
      throw new Error('派生密钥失败');
    }
  }
  
  // 保存密钥
  private async saveKey(): Promise<void> {
    if (!this.key) {
      throw new Error('没有密钥可保存');
    }
    
    console.log('=== KeyManager.saveKey: 开始保存密钥 ===');
    try {
      console.log('1. 开始导出密钥');
      const exportedKey = await crypto.subtle.exportKey('jwk', this.key);
      console.log('2. 密钥导出成功');
      
      console.log('3. 转换密钥为JSON格式');
      const keyJson = JSON.stringify(exportedKey);
      console.log('4. 密钥JSON转换成功，长度:', keyJson.length);
      
      console.log('5. 开始获取设备指纹');
      const deviceFingerprint = await this.getDeviceFingerprint();
      console.log('6. 设备指纹获取成功:', deviceFingerprint);
      
      const storageKey = `mindweaver_encryption_key_${deviceFingerprint}`;
      console.log('7. 存储键生成成功:', storageKey);
      
      console.log('8. 检查localStorage是否可用');
      if (!localStorage) {
        throw new Error('localStorage 不可用');
      }
      
      console.log('9. 开始存储密钥到localStorage');
      localStorage.setItem(storageKey, keyJson);
      console.log('10. 密钥存储成功');
      
      console.log('=== KeyManager.saveKey: 密钥保存完成 ===');
    } catch (error) {
      console.error('=== KeyManager.saveKey: 密钥保存失败 ===:', error);
      console.error('错误堆栈:', (error as Error).stack);
      throw new Error(`保存密钥失败: ${(error as Error).message}`);
    }
  }
  
  // 加载密钥
  async loadKey(): Promise<CryptoKey | null> {
    console.log('=== KeyManager.loadKey: 开始加载密钥 ===');
    try {
      console.log('1. 开始获取设备指纹');
      const deviceFingerprint = await this.getDeviceFingerprint();
      console.log('2. 设备指纹获取成功:', deviceFingerprint);
      
      const storageKey = `mindweaver_encryption_key_${deviceFingerprint}`;
      console.log('3. 存储键生成成功:', storageKey);
      
      console.log('4. 检查localStorage是否可用');
      if (!localStorage) {
        console.warn('localStorage 不可用');
        return null;
      }
      
      console.log('5. 开始从localStorage获取密钥');
      const keyJson = localStorage.getItem(storageKey);
      console.log('6. 密钥获取结果:', keyJson ? '找到密钥' : '未找到密钥');
      
      if (!keyJson) {
        console.log('7. 密钥不存在，返回null');
        return null;
      }
      
      console.log('8. 解析密钥JSON');
      const exportedKey = JSON.parse(keyJson);
      console.log('9. 密钥JSON解析成功');
      
      console.log('10. 检查crypto.subtle是否可用');
      if (!crypto || !crypto.subtle) {
        throw new Error('crypto.subtle API 不可用');
      }
      
      console.log('11. 开始导入密钥');
      const key = await crypto.subtle.importKey(
        'jwk',
        exportedKey,
        {
          name: 'AES-GCM'
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      console.log('12. 密钥导入成功');
      this.key = key;
      this.keyGenerated = true;
      
      console.log('=== KeyManager.loadKey: 密钥加载完成 ===');
      return key;
    } catch (error) {
      console.error('=== KeyManager.loadKey: 密钥加载失败 ===:', error);
      console.error('错误堆栈:', (error as Error).stack);
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
      console.error('设备指纹错误:', error);
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
      console.error('密钥清除错误:', error);
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
