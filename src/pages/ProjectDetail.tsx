import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProject } from '@/hooks/useProjects';
import { useGeneratedHooks, useGeneratedScripts, useComplianceChecks } from '@/hooks/useGeneratedContent';
import { StatusBadge } from '@/components/ui/status-badge';
import { PlatformBadge } from '@/components/ui/platform-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MARKETS, CONTENT_TYPES, LANGUAGES } from '@/lib/constants';
import { Sparkles, FileText, Eye, MessageSquare, CheckCircle, Download, Loader2, ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ImageGenerator } from '@/components/projects/ImageGenerator';
import { PlatformTarget } from '@/types/database';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id);
  const { data: hooks } = useGeneratedHooks(id);
  const { data: scripts } = useGeneratedScripts(id);
  const { data: compliance } = useComplianceChecks(id);
  const [generating, setGenerating] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const generateContent = async (type: 'hooks' | 'scripts' | 'captions') => {
    if (!project) return;
    setGenerating(type);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: { projectId: project.id, type }
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: [type, id] });
      toast({ title: 'Content generated', description: `${type} have been created successfully.` });
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Loading...' }]}>
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Not Found' }]}>
        <Card><CardContent className="py-12 text-center">Project not found</CardContent></Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: project.name }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{project.name}</h1>
              <StatusBadge status={project.status as any} />
            </div>
            <p className="mt-1 text-muted-foreground">
              {project.product_sku && `SKU: ${project.product_sku} • `}
              {LANGUAGES[project.language as keyof typeof LANGUAGES]?.label}
            </p>
          </div>
          <div className="flex gap-2">
            {project.status === 'approved' && (
              <Button><Download className="mr-2 h-4 w-4" />Export All</Button>
            )}
          </div>
        </div>

        {/* Project Info */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Platforms</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {project.platforms.map((p) => <PlatformBadge key={p} platform={p as any} />)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Content Types</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {project.content_types.map((c) => (
                <span key={c} className="rounded bg-secondary px-2 py-1 text-xs">
                  {CONTENT_TYPES[c as keyof typeof CONTENT_TYPES]?.label}
                </span>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Markets</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {project.markets.map((m) => (
                <span key={m} className="rounded bg-secondary px-2 py-1 text-xs">
                  {MARKETS[m as keyof typeof MARKETS]?.flag} {MARKETS[m as keyof typeof MARKETS]?.label}
                </span>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="hooks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="hooks"><Sparkles className="mr-2 h-4 w-4" />Hooks</TabsTrigger>
            <TabsTrigger value="scripts"><FileText className="mr-2 h-4 w-4" />Scripts</TabsTrigger>
            <TabsTrigger value="visual"><Eye className="mr-2 h-4 w-4" />Visual</TabsTrigger>
            <TabsTrigger value="captions"><MessageSquare className="mr-2 h-4 w-4" />Captions</TabsTrigger>
            <TabsTrigger value="compliance"><CheckCircle className="mr-2 h-4 w-4" />QA</TabsTrigger>
          </TabsList>

          <TabsContent value="hooks" className="space-y-4">
            <div className="flex justify-between">
              <div><h3 className="font-medium">AI Hook Generator</h3><p className="text-sm text-muted-foreground">Generate 4 hook options optimized for the first 2 seconds</p></div>
              <Button onClick={() => generateContent('hooks')} disabled={generating === 'hooks'}>
                {generating === 'hooks' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Hooks
              </Button>
            </div>
            {hooks && hooks.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {hooks.map((hook) => (
                  <Card key={hook.id} className={hook.is_selected ? 'ring-2 ring-primary' : ''}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm capitalize">{hook.hook_type.replace('_', ' ')} Hook</CardTitle>
                      {hook.retention_score && <CardDescription>Retention Score: {hook.retention_score}%</CardDescription>}
                    </CardHeader>
                    <CardContent><p className="text-sm">{hook.hook_text}</p></CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No hooks generated yet. Click "Generate Hooks" to create options.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="scripts" className="space-y-4">
            <div className="flex justify-between">
              <div><h3 className="font-medium">AI Script Generator</h3><p className="text-sm text-muted-foreground">Platform-aware scripts with proper duration</p></div>
              <Button onClick={() => generateContent('scripts')} disabled={generating === 'scripts'}>
                {generating === 'scripts' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Generate Scripts
              </Button>
            </div>
            {scripts && scripts.length > 0 ? (
              <div className="space-y-4">
                {scripts.map((script) => (
                  <Card key={script.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm"><PlatformBadge platform={script.platform as any} /></CardTitle>
                        <span className="text-sm text-muted-foreground">{script.duration_seconds}s</span>
                      </div>
                    </CardHeader>
                    <CardContent><pre className="whitespace-pre-wrap text-sm">{script.full_script}</pre></CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No scripts generated yet.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="visual">
            <ImageGenerator 
              projectId={project.id} 
              platforms={project.platforms as PlatformTarget[]} 
            />
          </TabsContent>
          <TabsContent value="captions"><Card><CardContent className="py-8 text-center text-muted-foreground">Generate captions after approving scripts.</CardContent></Card></TabsContent>
          <TabsContent value="compliance">
            <Card>
              <CardContent className="py-8">
                {compliance && compliance.length > 0 ? (
                  <div className="space-y-2">
                    {compliance.map((check) => (
                      <div key={check.id} className="flex items-center gap-2">
                        <CheckCircle className={`h-4 w-4 ${check.passed ? 'text-status-approved' : 'text-status-qa-failed'}`} />
                        <span>{check.check_name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">QA checks will run before export.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}