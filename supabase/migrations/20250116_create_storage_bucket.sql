-- Create storage bucket for ACF content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'acf-content',
  'acf-content',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the acf-content bucket
-- Allow public read access to all files
CREATE POLICY "Public read access for acf-content"
ON storage.objects
FOR SELECT
USING (bucket_id = 'acf-content');

-- Allow service role to manage all files
CREATE POLICY "Service role can manage acf-content"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'acf-content');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to acf-content"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'acf-content');

-- Allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update acf-content"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'acf-content');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete acf-content"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'acf-content');