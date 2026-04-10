import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

import { Badge } from '../ui/badge';
import { X, Trash2, Edit, Plus } from 'lucide-react';
import { Asset } from '../../services/assets/AssetService';

interface AssetManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  onUpdate: (asset: Asset) => void;
  onDelete: (assetId: string) => void;
}

export function AssetManagementDialog({ 
  open, 
  onOpenChange, 
  assets, 
  onUpdate, 
  onDelete
}: AssetManagementDialogProps) {
  // 状态管理
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');
  
  // 重置表单
  const resetForm = () => {
    setSelectedAsset(null);
    setEditMode(false);
    setName('');
    setDescription('');
    setTags([]);
    setTagInput('');
    setError('');
  };

  // 选择素材
  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setName(asset.name);
    setDescription(asset.description || '');
    setTags([...asset.tags]);
    setEditMode(false);
    setError('');
  };
  
  // 进入编辑模式
  const handleEdit = () => {
    setEditMode(true);
  };
  
  // 处理标签添加
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  // 处理标签删除
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  // 处理保存
  const handleSave = () => {
    if (!name.trim()) {
      setError('请输入素材名称');
      return;
    }
    
    if (!selectedAsset) return;
    
    const updatedAsset: Asset = {
      ...selectedAsset,
      name: name.trim(),
      description: description.trim() || undefined,
      tags
    };
    
    onUpdate(updatedAsset);
    setSelectedAsset(updatedAsset);
    setEditMode(false);
  };
  
  // 处理删除
  const handleDelete = () => {
    if (!selectedAsset) return;
    
    onDelete(selectedAsset.id);
    resetForm();
  };

  // 过滤用户上传的素材（排除官方、系统素材和Iconify标签的素材）
  const userAssets = assets.filter(asset => 
    asset.uploader !== '官方' && 
    asset.uploader !== '系统' && 
    !asset.tags.some(tag => tag.toLowerCase() === 'iconify')
  );
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">素材管理</DialogTitle>
          <DialogDescription>
            管理您上传的素材
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 素材列表 */}
          <div className="md:col-span-1">
            <h3 className="text-sm font-medium mb-2">素材列表</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {userAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无素材</p>
              ) : (
                userAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedAsset?.id === asset.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}`}
                    onClick={() => handleSelectAsset(asset)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <img 
                          src={asset.thumbnail} 
                          alt={asset.name} 
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{asset.name}</h4>
                        <p className="text-xs text-muted-foreground">{
                          asset.type === 'icon' ? '图标' :
                          asset.type === 'shape' ? '形状' :
                          asset.type === 'connector' ? '连接线' :
                          asset.type === 'iconSet' ? '图标组合' :
                          asset.type === 'fontStyle' ? '字体样式' :
                          asset.type === 'colorScheme' ? '配色方案' :
                          asset.type === 'background' ? '导图背景' :
                          asset.type === 'animation' ? '动画效果' : asset.type
                        }</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* 素材详情和编辑 */}
          <div className="md:col-span-2 min-h-[300px] max-h-[500px] overflow-y-auto">
            {selectedAsset ? (
              <div className="space-y-4">
                {editMode ? (
                  // 编辑模式
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">编辑素材</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">名称</Label>
                      <Input
                        id="edit-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="输入素材名称"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>标签</Label>
                      <div className="flex gap-2">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                          placeholder="输入标签并按回车添加"
                        />
                        <Button size="sm" onClick={handleAddTag}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="flex items-center gap-1">
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 hover:text-destructive"
                              title="删除标签"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">描述（可选）</Label>
                      <Input
                        id="edit-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="输入素材描述"
                      />
                    </div>
                    
                    {error && (
                      <div className="text-sm text-destructive">
                        {error}
                      </div>
                    )}
                    
                    <div className="flex gap-2 justify-end">
                      <Button onClick={handleSave}>
                        保存
                      </Button>
                      <Button variant="outline" onClick={() => setEditMode(false)}>
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 查看模式
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">素材详情</h3>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleEdit}>
                          <Edit className="w-4 h-4 mr-1" />
                          编辑
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleDelete}>
                          <Trash2 className="w-4 h-4 mr-1" />
                          删除
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg border border-muted">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                          <img 
                            src={selectedAsset.thumbnail} 
                            alt={selectedAsset.name} 
                            className="w-12 h-12 object-contain"
                          />
                        </div>
                        <div>
                          <h4 className="text-lg font-medium">{selectedAsset.name}</h4>
                          <p className="text-sm text-muted-foreground">{
                            selectedAsset.type === 'icon' ? '图标' :
                            selectedAsset.type === 'shape' ? '形状' :
                            selectedAsset.type === 'connector' ? '连接线' :
                            selectedAsset.type === 'iconSet' ? '图标组合' :
                            selectedAsset.type === 'fontStyle' ? '字体样式' :
                            selectedAsset.type === 'colorScheme' ? '配色方案' :
                            selectedAsset.type === 'background' ? '导图背景' :
                            selectedAsset.type === 'animation' ? '动画效果' : selectedAsset.type
                          }</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">分类:</span>
                          <span className="text-sm">{selectedAsset.category}</span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="text-sm font-medium">标签:</span>
                          <div className="flex flex-wrap gap-2">
                            {selectedAsset.tags.map((tag, index) => (
                              <Badge key={index} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">上传者:</span>
                          <span className="text-sm">{selectedAsset.uploader}</span>
                        </div>
                        {selectedAsset.description && (
                          <div className="flex items-start gap-1">
                            <span className="text-sm font-medium">描述:</span>
                            <span className="text-sm">{selectedAsset.description}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-60 text-muted-foreground">
                请选择一个素材查看详情
              </div>
            )}
            

          </div>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}