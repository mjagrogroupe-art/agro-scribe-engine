import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, ImageIcon, X, Loader2, Link as LinkIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProductImageUploaderProps {
  imageUrls: string[];
  onChange: (urls: string[]) => void;
  productId?: string;
}

export function ProductImageUploader({ imageUrls, onChange, productId }: ProductImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Validate files
    const validFiles = fileArray.filter(f => {
      if (!f.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: `${f.name} is not an image.`, variant: "destructive" });
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: `${f.name} exceeds 10MB limit.`, variant: "destructive" });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of validFiles) {
        const ext = file.name.split(".").pop() || "jpg";
        const folder = productId || "new";
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("product-assets")
          .upload(path, file, { contentType: file.type });

        if (uploadError) {
          toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("product-assets")
          .getPublicUrl(path);

        newUrls.push(urlData.publicUrl);
      }

      if (newUrls.length > 0) {
        onChange([...imageUrls, ...newUrls]);
        toast({
          title: `${newUrls.length} image${newUrls.length > 1 ? "s" : ""} uploaded`,
          description: "Product assets saved to storage.",
        });
      }
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
    e.target.value = "";
  };

  const addUrl = () => {
    if (!urlInput.trim()) return;
    onChange([...imageUrls, urlInput.trim()]);
    setUrlInput("");
  };

  const removeImage = (index: number) => {
    onChange(imageUrls.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <Label>Product Images</Label>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="upload" className="text-xs"><Upload className="mr-1 h-3 w-3" />Upload</TabsTrigger>
          <TabsTrigger value="url" className="text-xs"><LinkIcon className="mr-1 h-3 w-3" />URL</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-2">
          <div
            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Click or drag images here
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Supports JPG, PNG, WebP • Max 10MB • Multiple files
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUrl()}
            />
            <Button type="button" variant="outline" size="sm" onClick={addUrl}>
              Add
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Image preview grid */}
      {imageUrls.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {imageUrls.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
              <img
                src={url}
                alt={`Product asset ${i + 1}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3 text-destructive" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-background/60 px-1 py-0.5">
                <span className="text-[10px] text-foreground">#{i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {imageUrls.length === 0 && (
        <p className="text-xs text-muted-foreground">No images added yet. Upload files or paste URLs.</p>
      )}
    </div>
  );
}
