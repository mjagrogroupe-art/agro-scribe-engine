import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ImageIcon, Trash2, Check, Download, Sparkles } from "lucide-react";
import { useGeneratedImages, useGenerateImage, useSelectImage, useDeleteImage, GeneratedImage } from "@/hooks/useGeneratedImages";
import { PlatformTarget } from "@/types/database";

interface ImageGeneratorProps {
  projectId: string;
  platforms: PlatformTarget[];
}

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram_reels: "Instagram Reels",
  facebook_reels: "Facebook Reels",
  youtube_shorts: "YouTube Shorts",
  instagram_post: "Instagram Post",
  facebook_post: "Facebook Post",
};

const IMAGE_TYPES = [
  { value: "social_post", label: "Social Post" },
  { value: "thumbnail", label: "Video Thumbnail" },
  { value: "story_cover", label: "Story Cover" },
];

export function ImageGenerator({ projectId, platforms }: ImageGeneratorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>(platforms[0] || "tiktok");
  const [imageType, setImageType] = useState<string>("social_post");
  const [customPrompt, setCustomPrompt] = useState<string>("");

  const { data: images, isLoading: loadingImages } = useGeneratedImages(projectId);
  const generateImage = useGenerateImage();
  const selectImage = useSelectImage();
  const deleteImage = useDeleteImage();

  const handleGenerate = () => {
    generateImage.mutate({
      projectId,
      platform: selectedPlatform,
      imageType,
      customPrompt: customPrompt.trim() || undefined,
    });
  };

  const handleSelect = (image: GeneratedImage) => {
    selectImage.mutate({ imageId: image.id, projectId });
  };

  const handleDelete = (image: GeneratedImage) => {
    deleteImage.mutate({ imageId: image.id, projectId });
  };

  const handleDownload = (image: GeneratedImage) => {
    const link = document.createElement("a");
    link.href = image.image_url;
    link.download = `${image.platform}-${image.image_type}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Extend platforms with post options
  const allPlatforms = [
    ...platforms,
    ...(platforms.includes("instagram_reels" as PlatformTarget) ? ["instagram_post" as const] : []),
    ...(platforms.includes("facebook_reels" as PlatformTarget) ? ["facebook_post" as const] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Generator Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Image Generator
          </CardTitle>
          <CardDescription>
            Generate platform-optimized images for your social media content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {allPlatforms.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PLATFORM_LABELS[p] || p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Image Type</Label>
              <Select value={imageType} onValueChange={setImageType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom Prompt (Optional)</Label>
            <Textarea
              placeholder="Add custom instructions for the AI... (leave empty for automatic generation based on project context)"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={generateImage.isPending}
            className="w-full"
          >
            {generateImage.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Image...
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                Generate Image
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Images Grid */}
      <div>
        <h3 className="mb-4 font-medium">Generated Images</h3>
        {loadingImages ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : images && images.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => (
              <Card 
                key={image.id} 
                className={`overflow-hidden transition-all ${
                  image.is_selected ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="relative aspect-square bg-muted">
                  <img
                    src={image.image_url}
                    alt={`Generated ${image.image_type} for ${image.platform}`}
                    className="h-full w-full object-cover"
                  />
                  {image.is_selected && (
                    <div className="absolute left-2 top-2">
                      <Badge className="bg-primary">
                        <Check className="mr-1 h-3 w-3" /> Selected
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {PLATFORM_LABELS[image.platform] || image.platform}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {image.image_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSelect(image)}
                      disabled={image.is_selected || selectImage.isPending}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Select
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(image)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(image)}
                      disabled={deleteImage.isPending}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No images generated yet. Use the generator above to create your first image.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
