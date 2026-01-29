import React, { useState, useEffect } from 'react';
import { KeyManager } from '../services/storage/encryption/KeyManager';
import { StorageService } from '../services/storage/StorageService';

interface FirstLaunchGuideProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export const FirstLaunchGuide: React.FC<FirstLaunchGuideProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const [keyOption, setKeyOption] = useState<'auto' | 'custom'>('auto');
  const [customPassword, setCustomPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const keyManager = KeyManager.getInstance();
  const storageService = StorageService.getInstance();

  // 检查是否已经初始化
  useEffect(() => {
    checkIfInitialized();
  }, []);

  const checkIfInitialized = async () => {
    try {
      const key = await keyManager.loadKey();
      if (key) {
        // 已经初始化，直接完成引导
        onComplete();
      }
    } catch (error) {
      console.error('Error checking initialization:', error);
    }
  };

  // 生成备份码
  const generateBackupCode = (): string => {
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
  };

  // 处理下一步
  const handleNextStep = async () => {
    setError('');

    if (step === 1) {
      // 进入第二步
      setStep(2);
    } else if (step === 2) {
      // 处理密钥生成
      setIsLoading(true);

      try {
        if (keyOption === 'auto') {
          // 自动生成密钥
          await keyManager.generateKey();
        } else {
          // 自定义密码
          if (customPassword !== confirmPassword) {
            setError('密码确认不匹配');
            setIsLoading(false);
            return;
          }

          if (customPassword.length < 8) {
            setError('密码长度至少为8个字符');
            setIsLoading(false);
            return;
          }

          // 从密码派生密钥
          await keyManager.deriveKey(customPassword);
        }

        // 生成备份码
        const code = generateBackupCode();
        setBackupCode(code);

        // 进入第三步
        setStep(3);
      } catch (error) {
        setError('密钥生成失败，请重试');
        console.error('Error generating key:', error);
      } finally {
        setIsLoading(false);
      }
    } else if (step === 3) {
      // 完成引导
      try {
        // 初始化存储服务
        await storageService.initialize();
        onComplete();
      } catch (error) {
        setError('存储服务初始化失败，请重试');
        console.error('Error initializing storage:', error);
      }
    }
  };

  // 处理上一步
  const handlePrevStep = () => {
    setError('');
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">欢迎使用 MindWeaver</h2>

        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">数据安全说明</h3>
            <p className="mb-4 text-gray-600">
              MindWeaver 将您的思维导图数据安全地存储在本地，并使用 AES-256-GCM 加密算法保护您的数据。
              即使有人访问您的设备，也无法查看您的思维导图内容。
            </p>
            <p className="mb-4 text-gray-600">
              首次使用时，我们需要为您设置加密密钥。您可以选择使用系统自动生成的密钥（推荐），或设置自定义密码。
            </p>
            <div className="mb-4">
              <label className="block mb-2 font-medium">
                <input
                  type="radio"
                  name="keyOption"
                  value="auto"
                  checked={keyOption === 'auto'}
                  onChange={() => setKeyOption('auto')}
                  className="mr-2"
                />
                使用系统自动生成的密钥（推荐）
              </label>
              <label className="block font-medium">
                <input
                  type="radio"
                  name="keyOption"
                  value="custom"
                  checked={keyOption === 'custom'}
                  onChange={() => setKeyOption('custom')}
                  className="mr-2"
                />
                设置自定义密码
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {keyOption === 'auto' ? '系统自动生成密钥' : '设置自定义密码'}
            </h3>
            
            {keyOption === 'custom' && (
              <div className="mb-4">
                <div className="mb-2">
                  <label className="block mb-1 font-medium">密码</label>
                  <input
                    type="password"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="请输入密码（至少8个字符）"
                  />
                </div>
                <div className="mb-2">
                  <label className="block mb-1 font-medium">确认密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="请再次输入密码"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="mb-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2">正在生成密钥...</p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">密钥备份</h3>
            <p className="mb-4 text-gray-600">
              请记录以下备份码，在更换设备时可以使用它恢复您的数据：
            </p>
            <div className="mb-4 p-3 bg-gray-100 rounded font-mono text-center break-all">
              {backupCode}
            </div>
            <p className="mb-4 text-red-600 font-medium">
              重要：请妥善保管此备份码，一旦丢失将无法恢复您的数据！
            </p>
            <p className="mb-4 text-gray-600">
              您可以在设置页面查看和修改密钥，或通过备份码恢复数据。
            </p>
          </div>
        )}

        <div className="flex justify-between mt-6">
          {step > 1 && (
            <button
              onClick={handlePrevStep}
              className="px-4 py-2 border border-gray-300 rounded bg-gray-100 hover:bg-gray-200"
            >
              上一步
            </button>
          )}
          {step === 1 && onSkip && (
            <button
              onClick={onSkip}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              跳过
            </button>
          )}
          <div className="flex-1"></div>
          <button
            onClick={handleNextStep}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {step === 3 ? '完成' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FirstLaunchGuide;
