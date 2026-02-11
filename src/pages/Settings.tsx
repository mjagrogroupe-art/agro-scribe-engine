import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BRAND_CONTEXT, COMPLIANCE_RULES, VISUAL_RULES } from '@/lib/constants';
import { Shield, Palette, Eye, AlertTriangle } from 'lucide-react';

export default function Settings() {
  return (
    <AppLayout
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
      title="System Configuration"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Brand Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Brand Identity
            </CardTitle>
            <CardDescription>Locked brand context used by all AI generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Brand</p>
                <p className="font-semibold">{BRAND_CONTEXT.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company</p>
                <p className="font-semibold">{BRAND_CONTEXT.company}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Tone</p>
              <div className="flex gap-2">
                {BRAND_CONTEXT.tone.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Avoid</p>
              <div className="flex flex-wrap gap-2">
                {BRAND_CONTEXT.avoid.map(a => <Badge key={a} variant="outline" className="text-destructive border-destructive/30">{a}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Compliance Rules
            </CardTitle>
            <CardDescription>Non-negotiable rules enforced at system level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(COMPLIANCE_RULES).map(([key, rule]) => (
                <div key={key} className="flex items-start gap-3 rounded-lg border p-3">
                  <AlertTriangle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{rule.label}</p>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Visual Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Visual Guidance
            </CardTitle>
            <CardDescription>Technical constraints for all generated visuals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Aspect Ratio</p>
                <p className="text-lg font-bold text-primary">{VISUAL_RULES.aspectRatio}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Resolution</p>
                <p className="text-lg font-bold text-primary">{VISUAL_RULES.resolution}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Logo Max</p>
                <p className="text-lg font-bold text-primary">{VISUAL_RULES.logoMaxPercent}%</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Text Max</p>
                <p className="text-lg font-bold text-primary">{VISUAL_RULES.textMaxPercent}%</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Safe Zone</p>
                <p className="text-lg font-bold text-primary">{VISUAL_RULES.safeZonePercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operating Principles */}
        <Card>
          <CardHeader>
            <CardTitle>Operating Principles</CardTitle>
            <CardDescription>Core rules governing all AI behavior (non-negotiable)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                'Accuracy > Creativity',
                'Reference > Imagination',
                'Control > Speed',
                'Compliance > Aesthetics',
                'UX Clarity > Feature Density',
              ].map(principle => (
                <div key={principle} className="flex items-center gap-2 rounded-lg border p-3">
                  <Shield className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium">{principle}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
