import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProducts, useCreateProduct, useDeleteProduct, useUpdateProduct, CreateProductInput } from '@/hooks/useProducts';
import { Product } from '@/types/database';
import { Plus, Package, Trash2, Image, Video, Loader2, AlertTriangle } from 'lucide-react';
import { ProductImageUploader } from '@/components/products/ProductImageUploader';

const PACK_TYPES = ['Box', 'Pouch', 'Jar', 'Bag', 'Can', 'Tray', 'Gift Set'];
const COMPLIANCE_OPTIONS = ['Organic', 'Halal', 'Kosher', 'LMIV', 'Vegan', 'Gluten-Free', 'Non-GMO'];

function ProductCard({ product, onDelete }: { product: Product; onDelete: (id: string) => void }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{product.name}</CardTitle>
            <CardDescription className="font-mono text-xs">{product.sku}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onDelete(product.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {product.pack_type && (
            <Badge variant="outline">{product.pack_type}</Badge>
          )}
          {product.pack_size && (
            <Badge variant="secondary">{product.pack_size}</Badge>
          )}
        </div>
        {product.primary_color && (
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded-full border"
              style={{ backgroundColor: product.primary_color }}
            />
            {product.secondary_color && (
              <div
                className="h-4 w-4 rounded-full border"
                style={{ backgroundColor: product.secondary_color }}
              />
            )}
            <span className="text-xs text-muted-foreground">Brand Colors</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {(product.compliance_flags as string[] || []).map((flag) => (
            <Badge key={flag} variant="outline" className="text-xs bg-primary/5">
              {flag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Image className="h-3 w-3" />
            {product.image_urls?.length || 0} images
          </span>
          <span className="flex items-center gap-1">
            <Video className="h-3 w-3" />
            {product.video_urls?.length || 0} videos
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<CreateProductInput>({
    sku: '',
    name: '',
    description: '',
    pack_type: '',
    pack_size: '',
    primary_color: '',
    secondary_color: '',
    compliance_flags: [],
    image_urls: [],
    video_urls: [],
  });
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');

  const handleCreate = async () => {
    if (!form.sku || !form.name) return;
    await createProduct.mutateAsync(form);
    setIsOpen(false);
    setForm({ sku: '', name: '', description: '', pack_type: '', pack_size: '', primary_color: '', secondary_color: '', compliance_flags: [], image_urls: [], video_urls: [] });
  };

  const toggleCompliance = (flag: string) => {
    setForm(prev => ({
      ...prev,
      compliance_flags: prev.compliance_flags?.includes(flag)
        ? prev.compliance_flags.filter(f => f !== flag)
        : [...(prev.compliance_flags || []), flag],
    }));
  };

  const addImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setForm(prev => ({ ...prev, image_urls: [...(prev.image_urls || []), imageUrlInput.trim()] }));
    setImageUrlInput('');
  };

  const addVideoUrl = () => {
    if (!videoUrlInput.trim()) return;
    setForm(prev => ({ ...prev, video_urls: [...(prev.video_urls || []), videoUrlInput.trim()] }));
    setVideoUrlInput('');
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Products' }]}
      title="Product Catalog"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Manage your product catalog. Products are the single source of truth for all AI-generated content.
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Product data is READ-ONLY once saved. All AI generation will reference this data exactly.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU *</Label>
                    <Input placeholder="TAV-PIST-500G" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Product Name *</Label>
                    <Input placeholder="Premium Pistachios" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Product description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pack Type</Label>
                    <Select value={form.pack_type} onValueChange={v => setForm({ ...form, pack_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {PACK_TYPES.map(t => <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pack Size</Label>
                    <Input placeholder="500g" value={form.pack_size} onChange={e => setForm({ ...form, pack_size: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" className="w-12 h-9 p-1" value={form.primary_color || '#000000'} onChange={e => setForm({ ...form, primary_color: e.target.value })} />
                      <Input placeholder="#hex" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" className="w-12 h-9 p-1" value={form.secondary_color || '#000000'} onChange={e => setForm({ ...form, secondary_color: e.target.value })} />
                      <Input placeholder="#hex" value={form.secondary_color} onChange={e => setForm({ ...form, secondary_color: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Compliance Flags</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMPLIANCE_OPTIONS.map(flag => (
                      <Badge
                        key={flag}
                        variant={form.compliance_flags?.includes(flag) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleCompliance(flag)}
                      >
                        {flag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <ProductImageUploader
                  imageUrls={form.image_urls || []}
                  onChange={(urls) => setForm(prev => ({ ...prev, image_urls: urls }))}
                />

                <div className="space-y-2">
                  <Label>Product Video URLs</Label>
                  <div className="flex gap-2">
                    <Input placeholder="https://..." value={videoUrlInput} onChange={e => setVideoUrlInput(e.target.value)} />
                    <Button type="button" variant="outline" size="sm" onClick={addVideoUrl}>Add</Button>
                  </div>
                  {form.video_urls && form.video_urls.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {form.video_urls.map((url, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          Video {i + 1}
                          <button className="ml-1" onClick={() => setForm(p => ({ ...p, video_urls: p.video_urls?.filter((_, idx) => idx !== i) }))}>×</button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                  <AlertTriangle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <p className="text-muted-foreground">Product assets are <strong>reference-locked</strong>. AI will never modify, redesign, or replace your product packaging or visuals.</p>
                </div>

                <Button onClick={handleCreate} disabled={createProduct.isPending || !form.sku || !form.name} className="w-full">
                  {createProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Product to Catalog
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}><CardHeader><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-12 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onDelete={(id) => deleteProduct.mutate(id)} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No products yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">Add your first product to start generating content.</p>
              <Button onClick={() => setIsOpen(true)} className="mt-4"><Plus className="mr-2 h-4 w-4" />Add Product</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
