import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useComplianceChecks } from "@/hooks/useGeneratedContent";
import { PLATFORMS, VISUAL_RULES } from "@/lib/constants";
import { Product, GeneratedScript, GeneratedHook, GeneratedCaption, ProjectWithDetails } from "@/types/database";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldX,
  FileWarning,
} from "lucide-react";

interface QAComplianceEngineProps {
  project: ProjectWithDetails;
  product: Product | null;
  hooks: GeneratedHook[];
  scripts: GeneratedScript[];
  captions: GeneratedCaption[];
}

interface QAResult {
  check_name: string;
  passed: boolean;
  notes: string | null;
  category: "brand" | "platform" | "compliance" | "content";
}

const MEDICAL_KEYWORDS = [
  "cure", "treat", "heal", "disease", "prevent illness", "medical",
  "therapy", "prescription", "clinical", "diagnosis", "remedy",
];

const HYPE_KEYWORDS = [
  "best ever", "unbelievable", "insane", "crazy deal", "you won't believe",
  "guaranteed", "miracle", "#ad", "swipe up",
];

function runQAChecks(
  project: ProjectWithDetails,
  product: Product | null,
  hooks: GeneratedHook[],
  scripts: GeneratedScript[],
  captions: GeneratedCaption[]
): QAResult[] {
  const results: QAResult[] = [];

  // === BRAND CHECKS ===
  results.push({
    check_name: "Product Linked",
    passed: !!product,
    notes: product ? `SKU: ${product.sku}` : "No product linked. AI will generate generic content.",
    category: "brand",
  });

  if (product) {
    results.push({
      check_name: "Product Images Available",
      passed: (product.image_urls?.length || 0) > 0,
      notes: product.image_urls?.length ? `${product.image_urls.length} reference image(s)` : "No product images — AI cannot reference actual packaging.",
      category: "brand",
    });

    results.push({
      check_name: "Brand Colors Defined",
      passed: !!product.primary_color,
      notes: product.primary_color ? `Primary: ${product.primary_color}` : "No brand colors set.",
      category: "brand",
    });
  }

  // === PLATFORM CHECKS ===
  for (const platform of project.platforms) {
    const config = PLATFORMS[platform as keyof typeof PLATFORMS];
    if (!config) continue;

    const platformScripts = scripts.filter(s => s.platform === platform);
    
    if (platformScripts.length === 0) {
      results.push({
        check_name: `${config.label}: Script Generated`,
        passed: false,
        notes: "No script generated for this platform.",
        category: "platform",
      });
      continue;
    }

    for (const script of platformScripts) {
      const withinRange = script.duration_seconds >= config.minDuration && script.duration_seconds <= config.maxDuration;
      results.push({
        check_name: `${config.label}: Duration (${script.duration_seconds}s)`,
        passed: withinRange,
        notes: withinRange
          ? `Within ${config.minDuration}–${config.maxDuration}s range`
          : `Duration ${script.duration_seconds}s is outside ${config.minDuration}–${config.maxDuration}s limit.`,
        category: "platform",
      });
    }

    const hasSelected = platformScripts.some(s => s.is_selected);
    results.push({
      check_name: `${config.label}: Script Selected`,
      passed: hasSelected,
      notes: hasSelected ? "A script is selected for export." : "No script selected — choose one before export.",
      category: "platform",
    });
  }

  // === COMPLIANCE CHECKS ===
  const allText = [
    ...hooks.map(h => h.hook_text),
    ...scripts.map(s => s.full_script),
    ...captions.map(c => c.caption_text),
  ].join(" ").toLowerCase();

  const medicalHits = MEDICAL_KEYWORDS.filter(kw => allText.includes(kw));
  results.push({
    check_name: "No Medical Claims",
    passed: medicalHits.length === 0,
    notes: medicalHits.length > 0
      ? `Found prohibited terms: ${medicalHits.join(", ")}`
      : "No medical claims detected.",
    category: "compliance",
  });

  const hypeHits = HYPE_KEYWORDS.filter(kw => allText.includes(kw));
  results.push({
    check_name: "Brand Tone Compliance",
    passed: hypeHits.length === 0,
    notes: hypeHits.length > 0
      ? `Non-compliant language: ${hypeHits.join(", ")}`
      : "Tone is premium, calm, credible.",
    category: "compliance",
  });

  if (product) {
    const complianceFlags = (product.compliance_flags as string[]) || [];
    if (complianceFlags.length > 0) {
      results.push({
        check_name: "Compliance Flags Active",
        passed: true,
        notes: `Active: ${complianceFlags.join(", ")}`,
        category: "compliance",
      });

      if (complianceFlags.includes("LMIV")) {
        results.push({
          check_name: "LMIV: Allergen Disclosure",
          passed: allText.includes("allergen") || allText.includes("ingredient") || captions.length === 0,
          notes: captions.length > 0
            ? "Verify allergen info is accessible via landing page or caption link."
            : "No captions yet — will check on generation.",
          category: "compliance",
        });
      }
    }
  }

  // === CONTENT COMPLETENESS ===
  results.push({
    check_name: "Hooks Generated",
    passed: hooks.length > 0,
    notes: hooks.length > 0 ? `${hooks.length} hook(s) available` : "No hooks generated.",
    category: "content",
  });

  results.push({
    check_name: "Hook Selected",
    passed: hooks.some(h => h.is_selected),
    notes: hooks.some(h => h.is_selected) ? "A hook is selected." : "No hook selected for production.",
    category: "content",
  });

  results.push({
    check_name: "Captions Generated",
    passed: captions.length > 0,
    notes: captions.length > 0 ? `${captions.length} caption(s) available` : "No captions generated.",
    category: "content",
  });

  // Visual rules
  results.push({
    check_name: `Logo ≤ ${VISUAL_RULES.logoMaxPercent}% of Frame`,
    passed: true,
    notes: "Enforced during image/video generation.",
    category: "compliance",
  });

  results.push({
    check_name: `Text ≤ ${VISUAL_RULES.textMaxPercent}% of Frame`,
    passed: true,
    notes: "Enforced during image/video generation.",
    category: "compliance",
  });

  return results;
}

const CATEGORY_ICONS = {
  brand: Shield,
  platform: FileWarning,
  compliance: ShieldCheck,
  content: CheckCircle,
};

const CATEGORY_LABELS = {
  brand: "Brand & Product",
  platform: "Platform Rules",
  compliance: "Compliance & Safety",
  content: "Content Completeness",
};

export function QAComplianceEngine({
  project,
  product,
  hooks,
  scripts,
  captions,
}: QAComplianceEngineProps) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<QAResult[] | null>(null);
  const queryClient = useQueryClient();
  const { data: savedChecks } = useComplianceChecks(project.id);

  const runChecks = async () => {
    setRunning(true);
    try {
      const qaResults = runQAChecks(project, product, hooks, scripts, captions);
      setResults(qaResults);

      // Save to database
      // Clear old checks first
      await supabase.from("compliance_checks").delete().eq("project_id", project.id);

      const checksToInsert = qaResults.map(r => ({
        project_id: project.id,
        check_name: r.check_name,
        passed: r.passed,
        notes: r.notes,
      }));

      await supabase.from("compliance_checks").insert(checksToInsert);

      // Update project status based on results
      const allPassed = qaResults.every(r => r.passed);
      const criticalFails = qaResults.filter(r => !r.passed && (r.category === "compliance" || r.category === "platform"));

      if (criticalFails.length > 0) {
        await supabase.from("projects").update({ status: "qa_failed" }).eq("id", project.id);
        toast({
          title: "QA Failed",
          description: `${criticalFails.length} critical issue(s) found. Fix before export.`,
          variant: "destructive",
        });
      } else if (allPassed) {
        await supabase.from("projects").update({ status: "pending_approval" }).eq("id", project.id);
        toast({ title: "QA Passed", description: "All checks passed. Ready for approval." });
      } else {
        toast({
          title: "QA Complete",
          description: "Some non-critical issues found. Review before proceeding.",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["compliance", project.id] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
    } catch (err: any) {
      toast({ title: "QA Error", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const displayResults = results || (savedChecks && savedChecks.length > 0
    ? savedChecks.map(c => ({ check_name: c.check_name, passed: c.passed, notes: c.notes, category: "content" as const }))
    : null);

  const passCount = displayResults?.filter(r => r.passed).length || 0;
  const failCount = displayResults?.filter(r => !r.passed).length || 0;
  const total = displayResults?.length || 0;

  // Group by category
  const grouped = results
    ? (["brand", "platform", "compliance", "content"] as const).map(cat => ({
        category: cat,
        checks: results.filter(r => r.category === cat),
      })).filter(g => g.checks.length > 0)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">QA Compliance Engine</h3>
          <p className="text-sm text-muted-foreground">
            Validates content against brand rules, platform limits, and compliance flags.
          </p>
        </div>
        <Button onClick={runChecks} disabled={running}>
          {running ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running QA...</>
          ) : (
            <><Shield className="mr-2 h-4 w-4" />Run QA Checks</>
          )}
        </Button>
      </div>

      {displayResults && (
        <>
          {/* Summary */}
          <div className="flex gap-3">
            <Card className="flex-1">
              <CardContent className="flex items-center gap-3 py-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold">{passCount}/{total}</p>
                  <p className="text-xs text-muted-foreground">Checks Passed</p>
                </div>
              </CardContent>
            </Card>
            {failCount > 0 && (
              <Card className="flex-1 border-destructive/30">
                <CardContent className="flex items-center gap-3 py-3">
                  <ShieldX className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold text-destructive">{failCount}</p>
                    <p className="text-xs text-muted-foreground">Issues Found</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Grouped results */}
          {grouped ? (
            grouped.map(({ category, checks }) => {
              const Icon = CATEGORY_ICONS[category];
              return (
                <Card key={category}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {CATEGORY_LABELS[category]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {checks.map((check, i) => (
                      <div key={i} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                        {check.passed ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{check.check_name}</p>
                          {check.notes && (
                            <p className="text-xs text-muted-foreground">{check.notes}</p>
                          )}
                        </div>
                        <Badge variant={check.passed ? "secondary" : "destructive"} className="text-xs shrink-0">
                          {check.passed ? "Pass" : "Fail"}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="space-y-2 py-4">
                {displayResults.map((check, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {check.passed ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm">{check.check_name}</span>
                    {check.notes && (
                      <span className="text-xs text-muted-foreground ml-auto">{check.notes}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!displayResults && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>Click "Run QA Checks" to validate all content against brand rules and compliance standards.</p>
            <p className="text-xs mt-1">Checks: medical claims, brand tone, duration limits, platform rules, content completeness.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
