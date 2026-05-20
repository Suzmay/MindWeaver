import React, { useState, useEffect } from 'react';
import { Upload, FolderOpen, Layout, Package, FileText, Clock, ExternalLink, Folder, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';

import { ExportService, MindWeaverFile } from '../services/export/ExportService';
import { Work } from '../models/Work';
import { useStorage } from '../context/StorageContext';
import { EncryptionService } from '../services/storage/encryption/EncryptionService';
import { KeyManager } from '../services/storage/encryption/KeyManager';
import { toast } from 'sonner';
import { assetService, MindWeaverAssetsFile } from '../services/assets/AssetService';

export function MarketPage() {
  const storage = useStorage();
  const [encryptionService, setEncryptionService] = useState<EncryptionService | null>(null);
  const [keyManager, setKeyManager] = useState<KeyManager | null>(null);
  
  // 作品上传相关状态
  const [isWorkDragActive, setIsWorkDragActive] = useState(false);
  const [workFileInputRef] = useState(React.createRef<HTMLInputElement>());
  const [workImportUrl, setWorkImportUrl] = useState('');
  const [isParsingWorkUrl, setIsParsingWorkUrl] = useState(false);

  // 模板上传相关状态
  const [isTemplateDragActive, setIsTemplateDragActive] = useState(false);
  const [templateFileInputRef] = useState(React.createRef<HTMLInputElement>());
  const [templateImportUrl, setTemplateImportUrl] = useState('');
  const [isParsingTemplateUrl, setIsParsingTemplateUrl] = useState(false);
  
  // 分享链接导入的模板列表
  const [sharedTemplates, setSharedTemplates] = useState<{ url: string; data: any }[]>([]);

  // 素材上传相关状态
  const [isAssetDragActive, setIsAssetDragActive] = useState(false);
  const [assetFileInputRef] = useState(React.createRef<HTMLInputElement>());
  const [assetImportUrl, setAssetImportUrl] = useState('');
  const [isParsingAssetUrl, setIsParsingAssetUrl] = useState(false);
  const [sharedAssets, setSharedAssets] = useState<{ file: string; data: MindWeaverAssetsFile }[]>([]);

  // 分享链接导入的作品列表
  const [sharedWorks, setSharedWorks] = useState<{ url: string; data: MindWeaverFile; category: string }[]>([]);

  useEffect(() => {
    setEncryptionService(EncryptionService.getInstance());
    setKeyManager(KeyManager.getInstance());
  }, []);

  // 作品文件选择（预览模式）
  const handleWorkFileSelect = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.version || !data.data?.nodes) {
        toast.error('无效的文件格式');
        return;
      }

      const mindWeaverFile: MindWeaverFile = {
        version: data.version,
        title: data.title || '导入的思维导图',
        createdAt: data.createdAt || new Date().toISOString(),
        exportedAt: data.exportedAt || new Date().toISOString(),
        data: {
          nodes: data.data.nodes,
          layout: data.data.layout,
          canvasBackground: data.data.canvasBackground
        }
      };

      const existingWork = sharedWorks.find(w => w.data.title === mindWeaverFile.title);
      if (!existingWork) {
        setSharedWorks(prev => [...prev, { url: file.name, data: mindWeaverFile, category: '个人' }]);
      }

      toast.success('已解析文件');
    } catch (error) {
      console.error('文件解析失败:', error);
      toast.error('文件解析失败，请重试');
    }
  };

  // 作品链接导入（预览模式）
  const handleWorkUrlImport = async () => {
    if (!workImportUrl.trim()) {
      toast.error('请输入分享链接');
      return;
    }

    setIsParsingWorkUrl(true);

    try {
      const data = ExportService.parseShareLink(workImportUrl);
      if (!data) {
        toast.error('无法解析链接，请确保这是有效的分享链接');
        return;
      }

      if (!data.data?.nodes || data.data.nodes.length === 0) {
        toast.error('链接中不包含有效的思维导图数据');
        return;
      }

      const existingWork = sharedWorks.find(w => w.url === workImportUrl);
      if (!existingWork) {
        setSharedWorks(prev => [...prev, { url: workImportUrl, data, category: '个人' }]);
      }

      toast.success('已解析分享链接');
    } catch (error) {
      console.error('解析分享链接失败:', error);
      toast.error('解析分享链接失败，请重试');
    } finally {
      setIsParsingWorkUrl(false);
      setWorkImportUrl('');
    }
  };

  // 从分享链接导入作品到本地
  const importSharedWork = async (sharedWork: { url: string; data: MindWeaverFile; category: string }) => {
    if (!encryptionService || !keyManager) return;
    doImportWork(sharedWork);
  };

  // 移除分享链接预览
  const removeSharedWork = (url: string) => {
    setSharedWorks(prev => prev.filter(w => w.url !== url));
  };

  // 实际执行导入作品
  const doImportWork = async (workData: { url: string; data: MindWeaverFile; category: string }) => {
    if (!encryptionService || !keyManager) return;

    try {
      let title = workData.data.title || '导入的思维导图';
      
      // 检查是否有重名作品
      const existingTitles = storage.works.map((w: Work) => w.title);
      let finalTitle = title;
      let counter = 1;
      
      // 如果重名，添加(1), (2)等后缀
      while (existingTitles.includes(finalTitle)) {
        finalTitle = `${title}(${counter})`;
        counter++;
      }

      const work = await storage.createWork({
        title: finalTitle,
        category: workData.category,
        tags: ['导入'],
        nodes: workData.data.data.nodes.length
      });

      let key = keyManager.getKey();
      if (!key) {
        key = await keyManager.generateKey();
      }

      const encryptedWorkData = {
        title: finalTitle,
        nodes: workData.data.data.nodes,
        layout: workData.data.data.layout,
        canvasBackground: workData.data.data.canvasBackground
      };
      const encryptedData = await encryptionService.encrypt(encryptedWorkData, key);
      await storage.updateWork(work.id, { 
        encryptedData,
        layout: workData.data.data.layout
      });

      setSharedWorks(prev => prev.filter(w => w.url !== workData.url));
      toast.success('已导入作品界面');
    } catch (error) {
      console.error('作品导入失败:', error);
      toast.error('作品导入失败，请重试');
    }
  };

  // 模板文件选择（预览模式）
  const handleTemplateFileSelect = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.version || (!data.nodesData && !data.data?.nodes)) {
        toast.error('无效的模板文件格式');
        return;
      }

      const existingTemplate = sharedTemplates.find(t => t.url === file.name);
      if (!existingTemplate) {
        setSharedTemplates(prev => [...prev, { url: file.name, data }]);
      }

      toast.success('已解析模板文件');
    } catch (error) {
      console.error('模板文件解析失败:', error);
      toast.error('模板文件解析失败，请重试');
    }
  };

  // 模板链接导入（预览模式）
  const handleTemplateUrlImport = async () => {
    if (!templateImportUrl.trim()) {
      toast.error('请输入分享链接');
      return;
    }

    setIsParsingTemplateUrl(true);

    try {
      const urlObj = new URL(templateImportUrl);
      const encoded = urlObj.searchParams.get('data');
      
      let data;
      if (encoded) {
        const json = decodeURIComponent(atob(encoded));
        data = JSON.parse(json);
      } else {
        data = ExportService.parseShareLink(templateImportUrl);
      }

      if (!data || (!data.version && !data.nodesData)) {
        toast.error('无法解析链接，请确保这是有效的分享链接');
        return;
      }

      const existingTemplate = sharedTemplates.find(t => t.url === templateImportUrl);
      if (!existingTemplate) {
        setSharedTemplates(prev => [...prev, { url: templateImportUrl, data }]);
      }

      toast.success('已解析分享链接');
    } catch (error) {
      console.error('解析模板链接失败:', error);
      toast.error('解析模板链接失败，请重试');
    } finally {
      setIsParsingTemplateUrl(false);
      setTemplateImportUrl('');
    }
  };

  // 从分享链接导入模板到本地
  const importSharedTemplate = async (sharedTemplate: { url: string; data: any }) => {
    try {
      const blob = new Blob([JSON.stringify(sharedTemplate.data)], { type: 'application/json' });
      await storage.importTemplate(blob);

      setSharedTemplates(prev => prev.filter(t => t.url !== sharedTemplate.url));
      toast.success('模板导入成功！');
    } catch (error) {
      console.error('模板导入失败:', error);
      toast.error('模板导入失败，请重试');
    }
  };

  // 移除模板预览
  const removeSharedTemplate = (url: string) => {
    setSharedTemplates(prev => prev.filter(t => t.url !== url));
  };

  const handleAssetFileSelect = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 检查是否是素材文件格式
      if (!data.version || !data.assets || !Array.isArray(data.assets)) {
        toast.error('无效的素材文件格式');
        return;
      }

      const assetsFile: MindWeaverAssetsFile = data;

      const existingAsset = sharedAssets.find(a => a.file === file.name);
      if (!existingAsset) {
        setSharedAssets(prev => [...prev, { file: file.name, data: assetsFile }]);
      }

      toast.success('已解析素材文件');
    } catch (error) {
      console.error('素材文件解析失败:', error);
      toast.error('素材文件解析失败，请重试');
    }
  };

  // 导入素材到用户素材库
  const importSharedAssets = async (sharedAsset: { file: string; data: MindWeaverAssetsFile }) => {
    try {
      const blob = new Blob([JSON.stringify(sharedAsset.data)], { type: 'application/json' });
      const result = await assetService.importAssets(blob, 'skip');

      if (result.errors.length > 0) {
        toast.warning(`部分素材导入失败: ${result.errors.join(', ')}`);
      } else {
        toast.success(`成功导入 ${result.imported} 个素材${result.skipped > 0 ? `，跳过 ${result.skipped} 个重复素材` : ''}`);
      }

      // 从预览列表中移除
      setSharedAssets(prev => prev.filter(a => a.file !== sharedAsset.file));
    } catch (error) {
      console.error('素材导入失败:', error);
      toast.error('素材导入失败，请重试');
    }
  };

  // 移除素材预览
  const removeSharedAsset = (fileName: string) => {
    setSharedAssets(prev => prev.filter(a => a.file !== fileName));
  };

  // 素材拖拽处理
  const handleAssetDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsAssetDragActive(true);
  };

  const handleAssetDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsAssetDragActive(false);
  };

  const handleAssetUrlImport = async () => {
    if (!assetImportUrl.trim()) {
      toast.error('请输入分享链接');
      return;
    }

    try {
      setIsParsingAssetUrl(true);
      const data = assetService.parseShareLink(assetImportUrl);
      if (!data) {
        toast.error('无法解析链接，请确保这是有效的素材分享链接');
        return;
      }

      const existingAsset = sharedAssets.find(a => a.file === '分享链接');
      if (!existingAsset) {
        setSharedAssets(prev => [...prev, { file: '分享链接', data }]);
      }

      setAssetImportUrl('');
      toast.success('已解析分享链接');
    } catch (error) {
      console.error('解析素材链接失败:', error);
      toast.error('解析素材链接失败，请重试');
    } finally {
      setIsParsingAssetUrl(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部标题栏 */}
      <div className="flex items-center p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold">市场</h1>
          <p className="text-muted-foreground mt-1">
            分享和发现思维导图作品、模板和素材
          </p>
        </div>
      </div>

      {/* 分类标签页 */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="work" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 h-14">
            <TabsTrigger value="work" className="gap-3 text-base h-full">
              <FolderOpen className="w-5 h-5" />
              作品
            </TabsTrigger>
            <TabsTrigger value="template" className="gap-3 text-base h-full">
              <Layout className="w-5 h-5" />
              模板
            </TabsTrigger>
            <TabsTrigger value="asset" className="gap-3 text-base h-full">
              <Package className="w-5 h-5" />
              素材
            </TabsTrigger>
          </TabsList>

          {/* 作品分类 */}
          <TabsContent value="work">
            <div className="space-y-6">
              <Card className="rounded-2xl border-2 border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="p-4 bg-primary/10 rounded-2xl">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="font-semibold text-lg mb-1">导入作品</h3>
                      <p className="text-sm text-muted-foreground">
                        从分享链接或 .mmw 文件导入思维导图作品
                      </p>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsWorkDragActive(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsWorkDragActive(false); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsWorkDragActive(false);
                          const files = Array.from(e.dataTransfer.files);
                          if (files.length > 0 && (files[0].name.endsWith('.mmw') || files[0].name.endsWith('.json'))) {
                            handleWorkFileSelect(files[0]);
                          } else {
                            toast.error('请选择 .mmw 或 .json 格式的文件');
                          }
                        }}
                        onClick={() => workFileInputRef.current?.click()}
                        className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                          isWorkDragActive
                            ? 'border-primary bg-primary/10'
                            : 'border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10'
                        }`}
                      >
                        <input
                          ref={workFileInputRef}
                          type="file"
                          accept=".mmw,.json"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleWorkFileSelect(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                          aria-label="选择作品文件"
                        />
                        <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {isWorkDragActive ? '松开文件' : '上传文件'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="粘贴分享链接..."
                          value={workImportUrl}
                          onChange={(e) => setWorkImportUrl(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleWorkUrlImport()}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleWorkUrlImport}
                          disabled={isParsingWorkUrl}
                        >
                          {isParsingWorkUrl ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            '解析'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 分享链接导入的作品列表 */}
              {sharedWorks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-primary" />
                    分享链接导入
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sharedWorks.map((sharedWork) => (
                      <Card
                        key={sharedWork.url}
                        className={`
                          rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group 
                          border-2 border-primary/10 hover:border-primary/30 bg-card
                          hover:scale-[1.03]
                        `}
                      >
                        <CardContent className="p-0">
                          <div className="flex items-center justify-center relative overflow-hidden h-40 rounded-t-2xl" style={{ backgroundColor: 'hsl(200 75% 85% / 0.2)' }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                            <FileText className="w-16 h-16 text-primary/60" />
                            <button
                              onClick={() => removeSharedWork(sharedWork.url)}
                              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 hover:bg-slate-300 dark:bg-slate-700/90 hover:bg-slate-600 transition-all"
                            >
                              <span className="text-muted-foreground text-sm">×</span>
                            </button>
                          </div>
                          <div className="p-5">
                            <h3 className="truncate mb-2">{sharedWork.data.title}</h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(sharedWork.data.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                              </span>
                              <span className="text-muted-foreground/50">•</span>
                              <span>{sharedWork.data.data.nodes.length} 个节点</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 rounded-lg text-xs border-primary/30 bg-primary/5 text-primary">
                                分享导入
                              </span>
                            </div>
                            <div className="mt-3">
                              <Select
                                value={sharedWork.category}
                                onValueChange={(value) => {
                                  setSharedWorks(prev => prev.map(w =>
                                    w.url === sharedWork.url ? { ...w, category: value } : w
                                  ));
                                }}
                              >
                                <SelectTrigger className="h-9">
                                  <Folder className="w-4 h-4 mr-2" />
                                  <SelectValue placeholder="选择分类" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="个人">个人</SelectItem>
                                  <SelectItem value="工作">工作</SelectItem>
                                  <SelectItem value="学习">学习</SelectItem>
                                  <SelectItem value="项目">项目</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="mt-3">
                              <Button
                                className="w-full gap-2 rounded-xl"
                                onClick={() => importSharedWork(sharedWork)}
                              >
                                <CheckCircle className="w-4 h-4" />
                                导入作品
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {sharedWorks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">作品市场</p>
                  <p>发现其他用户分享的精彩思维导图作品</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 模板分类 */}
          <TabsContent value="template">
            <div className="space-y-6">
              <Card className="rounded-2xl border-2 border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="p-4 bg-primary/10 rounded-2xl">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="font-semibold text-lg mb-1">导入模板</h3>
                      <p className="text-sm text-muted-foreground">
                        从分享链接或 .json 文件导入思维导图模板
                      </p>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsTemplateDragActive(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsTemplateDragActive(false); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsTemplateDragActive(false);
                          const files = Array.from(e.dataTransfer.files);
                          if (files.length > 0 && files[0].name.endsWith('.json')) {
                            handleTemplateFileSelect(files[0]);
                          } else {
                            toast.error('请选择 .json 格式的文件');
                          }
                        }}
                        onClick={() => templateFileInputRef.current?.click()}
                        className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                          isTemplateDragActive
                            ? 'border-primary bg-primary/10'
                            : 'border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10'
                        }`}
                      >
                        <input
                          ref={templateFileInputRef}
                          type="file"
                          accept=".json"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleTemplateFileSelect(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                          aria-label="选择模板文件"
                        />
                        <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {isTemplateDragActive ? '松开文件' : '上传文件'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="粘贴分享链接..."
                          value={templateImportUrl}
                          onChange={(e) => setTemplateImportUrl(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleTemplateUrlImport()}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleTemplateUrlImport}
                          disabled={isParsingTemplateUrl}
                        >
                          {isParsingTemplateUrl ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            '解析'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {sharedTemplates.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-primary" />
                    分享链接导入
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sharedTemplates.map((sharedTemplate) => (
                      <Card
                        key={sharedTemplate.url}
                        className={`
                          rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group 
                          border-2 border-primary/10 hover:border-primary/30 bg-card
                          hover:scale-[1.03]
                        `}
                      >
                        <CardContent className="p-0">
                          <div className="flex items-center justify-center relative overflow-hidden h-40 rounded-t-2xl" style={{ backgroundColor: 'hsl(200 75% 85% / 0.2)' }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                            <Layout className="w-16 h-16 text-primary/60" />
                            <button
                              onClick={() => removeSharedTemplate(sharedTemplate.url)}
                              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 hover:bg-slate-300 dark:bg-slate-700/90 hover:bg-slate-600 transition-all"
                            >
                              <span className="text-muted-foreground text-sm">×</span>
                            </button>
                          </div>
                          <div className="p-5">
                            <h3 className="truncate mb-2">{sharedTemplate.data.title || '未命名模板'}</h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {sharedTemplate.data.exportedAt ? new Date(sharedTemplate.data.exportedAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '未知时间'}
                              </span>
                              <span className="text-muted-foreground/50">•</span>
                              <span>{sharedTemplate.data.nodesData?.length || 0} 个节点</span>
                            </div>
                            {sharedTemplate.data.tags && sharedTemplate.data.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {sharedTemplate.data.tags.map((tag: string, i: number) => (
                                  <span key={i} className="px-2 py-1 rounded-lg text-xs border-primary/30 bg-primary/5 text-primary">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            {sharedTemplate.data.description && (
                              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                {sharedTemplate.data.description}
                              </p>
                            )}
                            <div className="mt-3">
                              <Button
                                className="w-full gap-2 rounded-xl"
                                onClick={() => importSharedTemplate(sharedTemplate)}
                              >
                                <CheckCircle className="w-4 h-4" />
                                导入模板
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {sharedTemplates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Layout className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">模板市场</p>
                  <p>使用预设模板快速创建思维导图</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 素材分类 */}
          <TabsContent value="asset">
            <div className="space-y-6">
              <Card className="rounded-2xl border-2 border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="p-4 bg-primary/10 rounded-2xl">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="font-semibold text-lg mb-1">导入素材</h3>
                      <p className="text-sm text-muted-foreground">
                        从分享链接或 .mwassets 文件导入素材资源
                      </p>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div
                        onDragOver={handleAssetDragOver}
                        onDragLeave={handleAssetDragLeave}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsAssetDragActive(false);
                          const files = Array.from(e.dataTransfer.files);
                          if (files.length > 0 && (files[0].name.endsWith('.mwassets') || files[0].name.endsWith('.json'))) {
                            handleAssetFileSelect(files[0]);
                          } else {
                            toast.error('请选择 .mwassets 或 .json 格式的文件');
                          }
                        }}
                        onClick={() => assetFileInputRef.current?.click()}
                        className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                          isAssetDragActive
                            ? 'border-primary bg-primary/10'
                            : 'border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10'
                        }`}
                      >
                        <input
                          ref={assetFileInputRef}
                          type="file"
                          accept=".mwassets,.json"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleAssetFileSelect(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                          aria-label="选择素材文件"
                        />
                        <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {isAssetDragActive ? '松开文件' : '上传文件'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="粘贴分享链接..."
                          value={assetImportUrl}
                          onChange={(e) => setAssetImportUrl(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAssetUrlImport()}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleAssetUrlImport}
                          disabled={isParsingAssetUrl}
                        >
                          {isParsingAssetUrl ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            '解析'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 素材预览列表 */}
              {sharedAssets.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    待导入素材
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sharedAssets.map((sharedAsset) => (
                      <Card
                        key={sharedAsset.file}
                        className={`
                          rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group
                          border-2 border-primary/10 hover:border-primary/30 bg-card
                          hover:scale-[1.03]
                        `}
                      >
                        <CardContent className="p-0">
                          <div className="flex items-center justify-center relative overflow-hidden h-40 rounded-t-2xl" style={{ backgroundColor: 'hsl(200 75% 85% / 0.2)' }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                            <Package className="w-16 h-16 text-primary/60" />
                            <button
                              onClick={() => removeSharedAsset(sharedAsset.file)}
                              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 hover:bg-slate-300 dark:bg-slate-700/90 hover:bg-slate-600 transition-all"
                            >
                              <span className="text-muted-foreground text-sm">×</span>
                            </button>
                          </div>
                          <div className="p-5">
                            <h4 className="truncate mb-2 font-medium">{sharedAsset.data.metadata?.name || sharedAsset.file}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(sharedAsset.data.exportedAt).toLocaleDateString('zh-CN')}
                              </span>
                              <span className="text-muted-foreground/50">•</span>
                              <span>{sharedAsset.data.assets.length} 个素材</span>
                            </div>
                            {sharedAsset.data.metadata?.assetTypes && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {sharedAsset.data.metadata.assetTypes.map((type, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {sharedAsset.data.metadata?.description && (
                              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                {sharedAsset.data.metadata.description}
                              </p>
                            )}
                            <div className="mt-3">
                              <Button
                                className="w-full gap-2 rounded-xl"
                                onClick={() => importSharedAssets(sharedAsset)}
                              >
                                <CheckCircle className="w-4 h-4" />
                                导入素材
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {sharedAssets.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium mb-2">素材商店</p>
                  <p>获取精美的背景、图标和动画等素材</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
