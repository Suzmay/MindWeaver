import { useState } from 'react';
import { Layout, Star, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface Template {
  id: string;
  name: string;
  isDefault?: boolean;
}

export function TemplatesPage() {
  const [templates] = useState<Template[]>([
    {
      id: '1',
      name: '默认模板',
      isDefault: true,
    },
    {
      id: '2',
      name: '商务战略',
    },
    {
      id: '3',
      name: '项目规划',
    },
    {
      id: '4',
      name: '创意头脑风暴',
    },
  ]);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1>模板中心</h1>
        <Button className="rounded-2xl gap-2 bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold">
          <Layout className="w-5 h-5" />
          新建模板
        </Button>
      </div>

      <p className="text-muted-foreground">
        选择预设模板，快速开始你的思维导图创作
      </p>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="rounded-2xl shadow-ocean hover:shadow-ocean-lg transition-all duration-200 hover:scale-[1.03] cursor-pointer group border-2 border-primary/10 hover:border-primary/30"
          >
            <CardContent className="p-0">
              {/* Preview */}
              <div className="h-40 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/15 rounded-t-2xl flex items-center justify-center relative overflow-hidden">
                {/* Simple mind map preview illustration */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Center node */}
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-ocean">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    {/* Branch nodes */}
                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-secondary to-accent rounded-xl shadow-sm" />
                    <div className="absolute -right-12 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-secondary to-accent rounded-xl shadow-sm" />
                    <div className="absolute left-1/2 -translate-x-1/2 -top-10 w-8 h-8 bg-gradient-to-br from-secondary to-accent rounded-xl shadow-sm" />
                  </div>
                </div>

                {template.isDefault && (
                  <Badge className="absolute top-3 right-3 bg-warning text-white rounded-lg gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    默认
                  </Badge>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="mb-3">{template.name}</h3>
                <Button className="w-full rounded-xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 text-white font-semibold shadow-sm">
                  使用此模板
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
