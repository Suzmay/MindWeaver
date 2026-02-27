import { EncryptionWorkerService } from './EncryptionWorkerService';

export class EncryptionService {
  private static instance: EncryptionService;
  private workerService = EncryptionWorkerService.getInstance();
  private useWorker = true; // 控制是否使用 Worker
  
  private constructor() {}
  
  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }
  
  // 加密数据
  async encrypt(data: any, key: CryptoKey): Promise<string> {
    console.log('EncryptionService.encrypt: 开始加密数据', data);
    try {
      // 尝试使用 Worker
      if (this.useWorker) {
        try {
          console.log('EncryptionService.encrypt: 尝试使用 Worker 加密');
          const result = await this.workerService.encrypt(data, key);
          console.log('EncryptionService.encrypt: Worker 加密成功');
          return result;
        } catch (error) {
          console.warn('EncryptionService.encrypt: Worker 加密失败，降级到同步加密:', error);
          this.useWorker = false; // 禁用 Worker
        }
      }
      
      // 同步加密作为降级方案
      console.log('EncryptionService.encrypt: 使用同步加密');
      const jsonData = JSON.stringify(data);
      console.log('EncryptionService.encrypt: 数据转换为 JSON', jsonData);
      const encoder = new TextEncoder();
      const plaintext = encoder.encode(jsonData);
      console.log('EncryptionService.encrypt: 数据编码为 Uint8Array', plaintext.length, 'bytes');
      
      // 生成随机 IV
      console.log('EncryptionService.encrypt: 生成随机 IV');
      const iv = crypto.getRandomValues(new Uint8Array(12));
      console.log('EncryptionService.encrypt: IV 生成成功', iv);
      
      // 加密
      console.log('EncryptionService.encrypt: 开始执行加密操作');
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128
        },
        key,
        plaintext
      );
      console.log('EncryptionService.encrypt: 加密操作成功', ciphertext.byteLength, 'bytes');
      
      // 组合 IV + 密文 + AuthTag
      console.log('EncryptionService.encrypt: 组合 IV 和密文');
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ciphertext), iv.length);
      console.log('EncryptionService.encrypt: 组合完成', combined.length, 'bytes');
      
      const result = this.arrayBufferToBase64(combined.buffer);
      console.log('EncryptionService.encrypt: 转换为 Base64 成功', result.length, 'characters');
      return result;
    } catch (error) {
      console.error('EncryptionService.encrypt: 加密失败', error);
      throw new Error('加密数据失败');
    }
  }
  
  // 解密数据
  async decrypt(encryptedData: string, key: CryptoKey): Promise<any> {
    try {
      // 尝试使用 Worker
      if (this.useWorker) {
        try {
          return await this.workerService.decrypt(encryptedData, key);
        } catch (error) {
          console.warn('Worker 解密失败，降级到同步解密:', error);
          this.useWorker = false; // 禁用 Worker
        }
      }
      
      // 同步解密作为降级方案
      const combined = this.base64ToArrayBuffer(encryptedData);
      const combinedArray = new Uint8Array(combined);
      
      // 分离 IV 和密文
      const iv = combinedArray.subarray(0, 12);
      const ciphertext = combinedArray.subarray(12);
      
      // 解密
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128
        },
        key,
        ciphertext
      );
      
      const decoder = new TextDecoder();
      const jsonData = decoder.decode(decrypted);
      
      return JSON.parse(jsonData);
    } catch (error) {
      console.error('解密错误:', error);
      throw new Error('解密数据失败');
    }
  }
  
  // ArrayBuffer 转 Base64
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  // Base64 转 ArrayBuffer
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
  }
  
  // 生成校验和
  async generateChecksum(data: any): Promise<string> {
    try {
      // 尝试使用 Worker
      if (this.useWorker) {
        try {
          return await this.workerService.generateChecksum(data);
        } catch (error) {
          console.warn('Worker 校验和生成失败，降级到同步生成:', error);
          this.useWorker = false; // 禁用 Worker
        }
      }
      
      // 同步生成校验和作为降级方案
      const jsonData = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonData);
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      console.error('校验和生成错误:', error);
      throw new Error('生成校验和失败');
    }
  }
  
  // 验证校验和
  async verifyChecksum(data: any, checksum: string): Promise<boolean> {
    try {
      const generatedChecksum = await this.generateChecksum(data);
      return generatedChecksum === checksum;
    } catch (error) {
      console.error('校验和验证错误:', error);
      return false;
    }
  }
}
