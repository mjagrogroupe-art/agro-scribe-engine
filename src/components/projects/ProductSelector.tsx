import { useProducts } from '@/hooks/useProducts';
import { Product } from '@/types/database';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle } from 'lucide-react';

interface ProductSelectorProps {
  value: string | undefined;
  onValueChange: (productId: string) => void;
}

export function ProductSelector({ value, onValueChange }: ProductSelectorProps) {
  const { data: products, isLoading } = useProducts();

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger><SelectValue placeholder="Loading products..." /></SelectTrigger>
      </Select>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-accent" />
        <span>No products in catalog. <a href="/products" className="underline text-primary">Add products first</a>.</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a product..." />
      </SelectTrigger>
      <SelectContent>
        {products.map((product) => (
          <SelectItem key={product.id} value={product.id}>
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{product.name}</span>
              <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
              {product.pack_type && (
                <Badge variant="outline" className="text-xs ml-1">{product.pack_type}</Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProductSummary({ product }: { product: Product }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="font-medium">{product.name}</span>
        </div>
        <Badge variant="outline" className="font-mono text-xs">{product.sku}</Badge>
      </div>
      {product.description && (
        <p className="text-sm text-muted-foreground">{product.description}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {product.pack_type && <Badge variant="secondary">{product.pack_type}</Badge>}
        {product.pack_size && <Badge variant="secondary">{product.pack_size}</Badge>}
        {(product.compliance_flags as string[] || []).map(flag => (
          <Badge key={flag} variant="outline" className="text-xs">{flag}</Badge>
        ))}
      </div>
      {product.primary_color && (
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: product.primary_color }} />
          {product.secondary_color && <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: product.secondary_color }} />}
        </div>
      )}
    </div>
  );
}
