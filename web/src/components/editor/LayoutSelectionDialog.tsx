import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Card, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { LayoutMode, LayoutDirection } from './LayoutManager';

interface LayoutOption {
  mode: LayoutMode;
  direction: LayoutDirection;
  name: string;
  description: string;
}

interface LayoutSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (layout: { mode: LayoutMode; direction: LayoutDirection; category: string }) => void;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    mode: 'mindmap',
    direction: 'horizontal',
    name: '思维导图 - 水平',
    description: '中心发散式布局，水平方向',
  },
  {
    mode: 'mindmap',
    direction: 'vertical',
    name: '思维导图 - 垂直',
    description: '中心发散式布局，垂直方向',
  },
  {
    mode: 'tree',
    direction: 'horizontal',
    name: '树状 - 水平',
    description: '层级分明的树状结构，水平方向',
  },
  {
    mode: 'tree',
    direction: 'vertical',
    name: '树状 - 垂直',
    description: '层级分明的树状结构，垂直方向',
  },
  {
    mode: 'organization',
    direction: 'vertical',
    name: '组织结构图',
    description: '自上而下的层级结构',
  },
  {
    mode: 'fishbone',
    direction: 'horizontal',
    name: '鱼骨图',
    description: '因果分析布局',
  },
];

export const LayoutSelectionDialog: React.FC<LayoutSelectionDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [category, setCategory] = useState('个人');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[700px] sm:max-w-[700px]" style={{ width: '700px', height: '500px' }}>
        <DialogHeader>
          <DialogTitle>创建思维导图</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* 类别选择 */}
          <div className="space-y-2">
            <Label htmlFor="category">类别</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="选择类别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="个人">个人</SelectItem>
                <SelectItem value="工作">工作</SelectItem>
                <SelectItem value="学习">学习</SelectItem>
                <SelectItem value="项目">项目</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 布局选择 */}
          <div className="space-y-2">
            <Label>布局方式</Label>
            <div className="grid gap-3 w-full" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {LAYOUT_OPTIONS.map((option) => (
                <Card
                  key={`${option.mode}-${option.direction}`}
                  className="cursor-pointer hover:border-primary/30 transition-all w-full"
                  onClick={() => onSelect({ mode: option.mode, direction: option.direction, category })}
                >
                  <CardContent className="p-4">
                    <h3 className="font-medium text-lg">{option.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};
