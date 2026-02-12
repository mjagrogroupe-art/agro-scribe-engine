
-- Create storage bucket for product assets
INSERT INTO storage.buckets (id, name, public) VALUES ('product-assets', 'product-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Product assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-assets');

-- Allow anyone to upload (no auth)
CREATE POLICY "Anyone can upload product assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-assets');

-- Allow anyone to delete product assets
CREATE POLICY "Anyone can delete product assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-assets');
