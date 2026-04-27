# Inventory Manager

Food inventory management system — Next.js + Supabase + Vercel

## STEP 1 — Set Up Supabase Database

1. Supabase Dashboard → SQL Editor
2. Run supabase/schema.sql
3. Run supabase/seed.sql (loads 642 products from your Excel file)

### Create your first admin user:
Supabase Dashboard → Authentication → Users → Add User, then run:
```sql
update auth.users set raw_user_meta_data = '{"role":"admin"}'::jsonb
where email = 'your-admin@email.com';
update public.users_profiles set role='admin', full_name='Your Name'
where id = (select id from auth.users where email='your-admin@email.com');
```

## STEP 2 — Deploy to Vercel

1. Push this folder to GitHub
2. vercel.com → New Project → Import repo
3. Add Environment Variables:
   - NEXT_PUBLIC_SUPABASE_URL = https://gqascwkggnaepsanntsnc.supabase.co
   - NEXT_PUBLIC_SUPABASE_ANON_KEY = (your anon key)
   - SUPABASE_SERVICE_ROLE_KEY = (from Supabase → Project Settings → API)
4. Deploy!

## STEP 3 — Configure Supabase Auth Redirect

After deploying, add your Vercel URL to:
Supabase → Authentication → URL Configuration → Redirect URLs
