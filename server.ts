import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { redisService } from './src/services/redisService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rvirjqlaffiflodseior.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2aXJqcWxhZmZpZmxvZHNlaW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1Njc4NDksImV4cCI6MjA5MzE0Mzg0OX0.9XL76rb6DsUbRDOvZx5jhsnGksHINn88ftyQpDxmva4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes with Redis Caching ---

  // Helper for cache-aside GET
  const getWithCache = async (res: any, cacheKey: string, fetchFn: () => Promise<any>, ttl: number = 600) => {
    try {
      // 1. Check Cache
      const cachedData = await redisService.get(cacheKey);
      if (cachedData) {
        console.log(`Cache Hit: ${cacheKey}`);
        return res.json({ data: cachedData, source: 'cache' });
      }

      // 2. Cache Miss -> Fetch from DB
      console.log(`Cache Miss: ${cacheKey}`);
      const data = await fetchFn();
      
      // 3. Store in Redis
      await redisService.set(cacheKey, data, ttl);

      return res.json({ data, source: 'database' });
    } catch (err: any) {
      console.error(`Error in GET ${cacheKey}:`, err);
      // Fallback to fetch if Redis fails
      try {
        const data = await fetchFn();
        return res.json({ data, source: 'database_fallback' });
      } catch (dbErr: any) {
        return res.status(500).json({ error: dbErr.message });
      }
    }
  };

  // 1. Subjects API
  app.get('/api/subjects', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    
    const cacheKey = redisService.generateKey(userId as string, 'subjects');
    await getWithCache(res, cacheKey, async () => {
      const { data, error } = await supabase.from('subjects').select('*').eq('user_id', userId);
      if (error) throw error;
      return data;
    });
  });

  // 2. Decks API
  app.get('/api/decks', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const cacheKey = redisService.generateKey(userId as string, 'decks');
    await getWithCache(res, cacheKey, async () => {
      const { data, error } = await supabase.from('decks').select('*').eq('user_id', userId);
      if (error) throw error;
      return data;
    });
  });

  // 3. Flashcards API
  app.get('/api/flashcards', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const cacheKey = redisService.generateKey(userId as string, 'flashcards');
    await getWithCache(res, cacheKey, async () => {
      const { data, error } = await supabase.from('flashcards').select('*').eq('user_id', userId);
      if (error) throw error;
      return data;
    });
  });

  // 4. Profile API
  app.get('/api/profile', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const cacheKey = redisService.generateKey(userId as string, 'profile');
    await getWithCache(res, cacheKey, async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error && error.code !== 'PGRST116') throw error; // ignore no rows error
      return data;
    });
  });

  // 5. Write Proxy (POST/PUT/DELETE) - Invalidates Cache
  app.post('/api/proxy', async (req, res) => {
    const { table, action, data, id, userId } = req.body;
    
    if (!userId || !table || !action) {
      return res.status(400).json({ error: 'Missing required fields: userId, table, action' });
    }

    try {
      let result;
      if (action === 'upsert') {
        result = await supabase.from(table).upsert(data);
      } else if (action === 'delete') {
        result = await supabase.from(table).delete().eq('id', id);
      } else {
         return res.status(400).json({ error: 'Invalid action' });
      }

      if (result.error) throw result.error;

      // --- Invalidate Cache ---
      // We invalidate the specific resource for this user
      // Note: mapping 'profiles' table to 'profile' resource key if needed
      const resourceKey = table === 'profiles' ? 'profile' : table;
      const cacheKey = redisService.generateKey(userId, resourceKey);
      await redisService.del(cacheKey);
      console.log(`Cache Invalidated: ${cacheKey}`);

      return res.json({ success: true, data: result.data });
    } catch (err: any) {
      console.error(`Error in proxy ${action} on ${table}:`, err);
      return res.status(500).json({ error: err.message });
    }
  });

  // --- Vite / Static Handling ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
