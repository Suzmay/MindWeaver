export interface WorkShard {
  workId: string;
  shardId: string;
  levelRange: {
    start: number;
    end: number;
  };
  nodeCount: number;
  data: string; // 加密的分片数据
  checksum: string;
  createdAt: string;
  lastModified: string;
}

export class ShardManager {
  private static instance: ShardManager;
  private shardSize = 100; // 每个分片包含的节点数
  private shardCache = new Map<string, WorkShard>();
  
  private constructor() {}
  
  static getInstance(): ShardManager {
    if (!ShardManager.instance) {
      ShardManager.instance = new ShardManager();
    }
    return ShardManager.instance;
  }
  
  // 生成分片
  generateShards(workId: string, nodes: any[]): WorkShard[] {
    const shards: WorkShard[] = [];
    const now = new Date().toISOString();
    
    // 按节点数分片
    for (let i = 0; i < nodes.length; i += this.shardSize) {
      const endIndex = Math.min(i + this.shardSize, nodes.length);
      const shardNodes = nodes.slice(i, endIndex);
      
      const shard: WorkShard = {
        workId,
        shardId: `${workId}_shard_${i}`,
        levelRange: {
          start: i,
          end: endIndex - 1
        },
        nodeCount: shardNodes.length,
        data: JSON.stringify(shardNodes),
        checksum: this.generateChecksum(shardNodes),
        createdAt: now,
        lastModified: now
      };
      
      shards.push(shard);
      this.shardCache.set(shard.shardId, shard);
    }
    
    return shards;
  }
  
  // 合并分片
  mergeShards(shards: WorkShard[]): any[] {
    // 按分片索引排序
    shards.sort((a, b) => a.levelRange.start - b.levelRange.start);
    
    // 合并节点数据
    const nodes: any[] = [];
    shards.forEach(shard => {
      const shardNodes = JSON.parse(shard.data);
      nodes.push(...shardNodes);
    });
    
    return nodes;
  }
  
  // 获取分片
  getShard(shardId: string): WorkShard | undefined {
    return this.shardCache.get(shardId);
  }
  
  // 清除缓存
  clearCache(workId: string): void {
    for (const [shardId, shard] of this.shardCache.entries()) {
      if (shard.workId === workId) {
        this.shardCache.delete(shardId);
      }
    }
  }
  
  // 生成校验和
  private generateChecksum(data: any): string {
    const jsonData = JSON.stringify(data);
    let checksum = 0;
    for (let i = 0; i < jsonData.length; i++) {
      checksum = ((checksum << 5) - checksum) + jsonData.charCodeAt(i);
      checksum = checksum & checksum;
    }
    return checksum.toString(16);
  }
}
