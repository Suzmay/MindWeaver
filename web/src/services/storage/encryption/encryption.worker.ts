// Encryption Web Worker

interface EncryptionRequest {
  id: string;
  action: 'encrypt' | 'decrypt' | 'generateChecksum';
  data: any;
  key?: CryptoKey;
}

interface EncryptionResponse {
  id: string;
  result?: any;
  error?: string;
}

self.onmessage = async (event: MessageEvent<EncryptionRequest>) => {
  const { id, action, data, key } = event.data;
  let result: any;
  let error: string | undefined;

  try {
    switch (action) {
      case 'encrypt':
        if (!key) {
          throw new Error('No encryption key provided');
        }
        result = await encrypt(data, key);
        break;
      case 'decrypt':
        if (!key) {
          throw new Error('No encryption key provided');
        }
        result = await decrypt(data, key);
        break;
      case 'generateChecksum':
        result = await generateChecksum(data);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err) {
    error = (err as Error).message;
  }

  const response: EncryptionResponse = {
    id,
    result,
    error
  };

  self.postMessage(response);
};

// 加密数据
async function encrypt(data: any, key: CryptoKey): Promise<string> {
  try {
    const jsonData = JSON.stringify(data);
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(jsonData);
    
    // 生成随机 IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 加密
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      key,
      plaintext
    );
    
    // 组合 IV + 密文 + AuthTag
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    return arrayBufferToBase64(combined.buffer);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

// 解密数据
async function decrypt(encryptedData: string, key: CryptoKey): Promise<any> {
  try {
    const combined = base64ToArrayBuffer(encryptedData);
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
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// 生成校验和
async function generateChecksum(data: any): Promise<string> {
  try {
    const jsonData = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonData);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Checksum generation error:', error);
    throw new Error('Failed to generate checksum');
  }
}

// ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}
