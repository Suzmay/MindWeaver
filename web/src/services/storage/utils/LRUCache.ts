export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;
  private accessOrder: K[];
  private maxMemoryUsage: number; // 最大内存使用量（字节）
  private currentMemoryUsage: number; // 当前内存使用量（字节）
  private memoryEstimator: (value: V) => number; // 内存估算函数
  
  constructor(capacity: number, maxMemoryUsage: number = 50 * 1024 * 1024) { // 默认 50MB
    this.capacity = capacity;
    this.cache = new Map();
    this.accessOrder = [];
    this.maxMemoryUsage = maxMemoryUsage;
    this.currentMemoryUsage = 0;
    this.memoryEstimator = this.defaultMemoryEstimator;
  }
  
  // 默认内存估算函数
  private defaultMemoryEstimator(value: V): number {
    try {
      const jsonString = JSON.stringify(value);
      return new Blob([jsonString]).size;
    } catch (error) {
      return 1024; // 默认 1KB
    }
  }
  
  // 设置内存估算函数
  setMemoryEstimator(estimator: (value: V) => number): void {
    this.memoryEstimator = estimator;
    // 重新计算当前内存使用量
    this.currentMemoryUsage = Array.from(this.cache.values())
      .reduce((total, value) => total + this.memoryEstimator(value), 0);
  }
  
  // 获取缓存项
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    
    // 更新访问顺序
    this.updateAccessOrder(key);
    return this.cache.get(key);
  }
  
  // 设置缓存项
  set(key: K, value: V): void {
    // 估算新值的内存使用量
    const valueSize = this.memoryEstimator(value);
    
    // 如果键已存在，减去旧值的内存使用量
    if (this.cache.has(key)) {
      const oldValue = this.cache.get(key);
      if (oldValue) {
        this.currentMemoryUsage -= this.memoryEstimator(oldValue);
      }
    } else {
      // 如果缓存已满，删除最久未使用的项
      while (this.cache.size >= this.capacity || (this.currentMemoryUsage + valueSize) > this.maxMemoryUsage) {
        const lruKey = this.accessOrder.shift();
        if (lruKey !== undefined) {
          const lruValue = this.cache.get(lruKey);
          if (lruValue) {
            this.currentMemoryUsage -= this.memoryEstimator(lruValue);
          }
          this.cache.delete(lruKey);
        } else {
          break;
        }
      }
    }
    
    // 设置缓存项
    this.cache.set(key, value);
    this.currentMemoryUsage += valueSize;
    
    // 更新访问顺序
    this.updateAccessOrder(key);
  }
  
  // 删除缓存项
  delete(key: K): boolean {
    if (!this.cache.has(key)) {
      return false;
    }
    
    const value = this.cache.get(key);
    if (value) {
      this.currentMemoryUsage -= this.memoryEstimator(value);
    }
    
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    return true;
  }
  
  // 清空缓存
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.currentMemoryUsage = 0;
  }
  
  // 获取缓存大小
  size(): number {
    return this.cache.size;
  }
  
  // 检查缓存是否包含键
  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  // 获取所有键
  keys(): K[] {
    return Array.from(this.cache.keys());
  }
  
  // 获取所有值
  values(): V[] {
    return Array.from(this.cache.values());
  }
  
  // 获取内存使用情况
  getMemoryUsage(): {
    current: number;
    max: number;
    percentage: number;
  } {
    const percentage = Math.min((this.currentMemoryUsage / this.maxMemoryUsage) * 100, 100);
    return {
      current: this.currentMemoryUsage,
      max: this.maxMemoryUsage,
      percentage
    };
  }
  
  // 设置最大内存使用量
  setMaxMemoryUsage(maxMemoryUsage: number): void {
    this.maxMemoryUsage = maxMemoryUsage;
    // 如果当前使用量超过新的最大值，清理缓存
    this.cleanupToMemoryLimit();
  }
  
  // 清理到内存限制
  private cleanupToMemoryLimit(): void {
    while (this.currentMemoryUsage > this.maxMemoryUsage && this.cache.size > 0) {
      const lruKey = this.accessOrder.shift();
      if (lruKey !== undefined) {
        const lruValue = this.cache.get(lruKey);
        if (lruValue) {
          this.currentMemoryUsage -= this.memoryEstimator(lruValue);
        }
        this.cache.delete(lruKey);
      } else {
        break;
      }
    }
  }
  
  // 批量添加
  batchSet(items: Array<[K, V]>): void {
    items.forEach(([key, value]) => this.set(key, value));
  }
  
  // 批量删除
  batchDelete(keys: K[]): number {
    let deletedCount = 0;
    keys.forEach(key => {
      if (this.delete(key)) {
        deletedCount++;
      }
    });
    return deletedCount;
  }
  
  // 获取最久未使用的键
  getLRUKey(): K | undefined {
    return this.accessOrder[0];
  }
  
  // 获取最近使用的键
  getMRUKey(): K | undefined {
    return this.accessOrder[this.accessOrder.length - 1];
  }
  
  // 更新访问顺序
  private updateAccessOrder(key: K): void {
    // 移除旧位置
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    // 添加到末尾
    this.accessOrder.push(key);
  }
}

