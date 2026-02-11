
-- Products table: single source of truth for all product data
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  pack_type TEXT, -- box, pouch, jar, bag, etc.
  pack_size TEXT, -- e.g., "500g", "1kg"
  primary_color TEXT, -- hex or HSL
  secondary_color TEXT,
  compliance_flags JSONB DEFAULT '[]'::jsonb, -- e.g., ["organic", "halal", "lmiv"]
  image_urls TEXT[] DEFAULT '{}'::text[], -- locked product asset images
  video_urls TEXT[] DEFAULT '{}'::text[], -- locked product asset videos
  metadata JSONB DEFAULT '{}'::jsonb, -- any additional structured data
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add product_id to projects table for proper product binding
ALTER TABLE public.projects ADD COLUMN product_id UUID REFERENCES public.products(id);

-- Create index for fast lookups
CREATE INDEX idx_products_brand_id ON public.products(brand_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_projects_product_id ON public.projects(product_id);

-- Trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
