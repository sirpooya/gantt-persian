# Supabase Setup Guide

This project uses Supabase to store Gantt chart data instead of local JSON files.

## Setup Steps

1. **Get your Supabase credentials:**
   - Go to: https://supabase.com/dashboard/project/frmkcwwwaaygrqtcttqb/settings/api
   - Copy your **Project URL** and **anon/public key**

2. **Create environment file:**
   ```bash
   cp env.example .env
   ```

3. **Add your credentials to `.env`:**
   ```env
   VITE_SUPABASE_URL=https://frmkcwwwaaygrqtcttqb.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
   # (Optional legacy support)
   # VITE_SUPABASE_ANON_KEY=your-legacy-anon-key-here
   ```

4. **Create the database table:**
   
   Run this SQL in your Supabase SQL Editor:
   ```sql
   CREATE TABLE IF NOT EXISTS gantt_data (
     id BIGSERIAL PRIMARY KEY,
     data JSONB NOT NULL,
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Create an index for faster queries
   CREATE INDEX IF NOT EXISTS idx_gantt_data_updated_at ON gantt_data(updated_at DESC);
   ```

5. **Set up Row Level Security (RLS):**
   
   For now, we'll allow public read/write. In production, you should set up proper RLS policies:
   ```sql
   -- Allow public read/write (for development)
   ALTER TABLE gantt_data ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Allow public read" ON gantt_data
     FOR SELECT USING (true);
   
   CREATE POLICY "Allow public write" ON gantt_data
     FOR INSERT WITH CHECK (true);
   
   CREATE POLICY "Allow public update" ON gantt_data
     FOR UPDATE USING (true);
   ```

## Template File

The template file `data/gantt-data.template.json` shows the expected data structure. This file is not used by the application but serves as a reference.

