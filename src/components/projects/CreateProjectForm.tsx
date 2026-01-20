import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCreateProject } from '@/hooks/useProjects';
import { PLATFORMS, CONTENT_TYPES, MARKETS, LANGUAGES } from '@/lib/constants';
import { PlatformTarget, ContentType, MarketRegion, LanguageCode } from '@/types/database';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  product_sku: z.string().max(50).optional(),
  language: z.enum(['en', 'fr', 'de']),
  platforms: z.array(z.enum(['tiktok', 'instagram_reels', 'facebook_reels', 'youtube_shorts']))
    .min(1, 'Select at least one platform'),
  content_types: z.array(z.enum(['education', 'product', 'authority', 'trust']))
    .min(1, 'Select at least one content type'),
  markets: z.array(z.enum(['fr', 'de', 'gcc', 'global']))
    .min(1, 'Select at least one market'),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateProjectForm() {
  const navigate = useNavigate();
  const createProject = useCreateProject();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      product_sku: '',
      language: 'en',
      platforms: [],
      content_types: [],
      markets: [],
    },
  });

  const onSubmit = async (values: FormValues) => {
    const project = await createProject.mutateAsync({
      name: values.name,
      product_sku: values.product_sku,
      language: values.language as LanguageCode,
      platforms: values.platforms as PlatformTarget[],
      content_types: values.content_types as ContentType[],
      markets: values.markets as MarketRegion[],
    });
    
    if (project) {
      navigate(`/projects/${project.id}`);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Basic information about your content project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Summer Campaign - Pistachios" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product_sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product SKU (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., TAV-PIST-500G" {...field} />
                  </FormControl>
                  <FormDescription>
                    Link this content to a specific product
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(LANGUAGES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label} ({value.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Platform Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Targets</CardTitle>
            <CardDescription>
              Select all platforms where this content will be published
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="platforms"
              render={() => (
                <FormItem>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Object.entries(PLATFORMS).map(([key, value]) => (
                      <FormField
                        key={key}
                        control={form.control}
                        name="platforms"
                        render={({ field }) => (
                          <FormItem
                            key={key}
                            className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(key as PlatformTarget)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, key])
                                    : field.onChange(
                                        field.value?.filter((v) => v !== key)
                                      );
                                }}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-medium">
                                {value.label}
                              </FormLabel>
                              <FormDescription>
                                {value.minDuration}–{value.maxDuration}s duration
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Content Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Content Type</CardTitle>
            <CardDescription>
              What type of content are you creating?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="content_types"
              render={() => (
                <FormItem>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Object.entries(CONTENT_TYPES).map(([key, value]) => (
                      <FormField
                        key={key}
                        control={form.control}
                        name="content_types"
                        render={({ field }) => (
                          <FormItem
                            key={key}
                            className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(key as ContentType)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, key])
                                    : field.onChange(
                                        field.value?.filter((v) => v !== key)
                                      );
                                }}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-medium">
                                {value.label}
                              </FormLabel>
                              <FormDescription>
                                {value.description}
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Market Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Target Markets</CardTitle>
            <CardDescription>
              Select the markets for this content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="markets"
              render={() => (
                <FormItem>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    {Object.entries(MARKETS).map(([key, value]) => (
                      <FormField
                        key={key}
                        control={form.control}
                        name="markets"
                        render={({ field }) => (
                          <FormItem
                            key={key}
                            className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(key as MarketRegion)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, key])
                                    : field.onChange(
                                        field.value?.filter((v) => v !== key)
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-medium">
                              {value.flag} {value.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createProject.isPending}>
            {createProject.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Project
          </Button>
        </div>
      </form>
    </Form>
  );
}