# Supabase Storage Setup (JSON File Storage)

This project uses Supabase Storage to store the Gantt chart JSON file, not SQL tables.

## Setup Steps

1. **Get your Supabase credentials** (already done):
   - Your `.env` file is already configured with:
     - `VITE_SUPABASE_URL=https://frmkcwwwaaygrqtcttqb.supabase.co`
     - `VITE_SUPABASE_ANON_KEY=your-key`

2. **Create a Storage Bucket:**
   
   Go to: https://supabase.com/dashboard/project/frmkcwwwaaygrqtcttqb/storage/buckets
   
   - Click "New bucket"
   - Name: `gantt-data`
   - Make it **Public** (so the app can read/write)
   - Click "Create bucket"

3. **Set Bucket Policies (if needed):**
   
   Go to: https://supabase.com/dashboard/project/frmkcwwwaaygrqtcttqb/storage/policies
   
   For the `gantt-data` bucket, create policies:
   
   **Read Policy:**
   ```sql
   CREATE POLICY "Public read access" ON storage.objects
     FOR SELECT USING (bucket_id = 'gantt-data');
   ```
   
   **Write Policy:**
   ```sql
   CREATE POLICY "Public write access" ON storage.objects
     FOR INSERT WITH CHECK (bucket_id = 'gantt-data');
   
   CREATE POLICY "Public update access" ON storage.objects
     FOR UPDATE USING (bucket_id = 'gantt-data');
   ```

4. **Upload initial JSON file (optional):**
   
   You can upload `data/gantt-data.template.json` to the bucket as `gantt-data.json` to start with sample data, or the app will create it automatically on first save.

## How It Works

- The app stores `gantt-data.json` in Supabase Storage
- No SQL tables needed - just a JSON file in cloud storage
- The template file `data/gantt-data.template.json` shows the expected structure

## Restart Dev Server

After setting up the bucket, restart your dev server:
```bash
npm run dev
```

