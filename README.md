# ⏱ Time Block — Hướng dẫn Deploy

## Stack
- **Next.js 14** — framework
- **NextAuth.js** — Google Login
- **Supabase** — database (free tier)
- **Vercel** — hosting (free tier)

---

## Bước 1 — Tạo Google OAuth App

1. Vào https://console.cloud.google.com
2. Tạo project mới (hoặc dùng project có sẵn)
3. Vào **APIs & Services → Credentials → Create Credentials → OAuth client ID**
4. Application type: **Web application**
5. Authorized redirect URIs thêm:
   ```
   http://localhost:3000/api/auth/callback/google
   https://your-app.vercel.app/api/auth/callback/google
   ```
6. Copy **Client ID** và **Client Secret**

---

## Bước 2 — Tạo Supabase Database

1. Vào https://supabase.com → New project
2. Vào **SQL Editor → New query**
3. Copy toàn bộ nội dung file `supabase_schema.sql` và chạy
4. Vào **Project Settings → API** → copy:
   - **Project URL**
   - **anon / public key**

---

## Bước 3 — Deploy lên Vercel

1. Push code lên GitHub:
   ```bash
   git init
   git add .
   git commit -m "init"
   gh repo create timeblock --public --push
   ```

2. Vào https://vercel.com → **New Project** → Import repo vừa tạo

3. Trong Vercel, vào **Settings → Environment Variables**, thêm:

   | Key | Value |
   |-----|-------|
   | `GOOGLE_CLIENT_ID` | (từ bước 1) |
   | `GOOGLE_CLIENT_SECRET` | (từ bước 1) |
   | `NEXTAUTH_SECRET` | chạy `openssl rand -base64 32` để tạo |
   | `NEXTAUTH_URL` | `https://your-app.vercel.app` |
   | `NEXT_PUBLIC_SUPABASE_URL` | (từ bước 2) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (từ bước 2) |

4. Click **Deploy** → Vercel tự build và deploy

---

## Bước 4 — Chạy local (dev)

```bash
# Copy env
cp .env.example .env.local
# Điền các giá trị vào .env.local

# Cài dependencies
npm install

# Chạy dev server
npm run dev
# Mở http://localhost:3000
```

---

## Cấu trúc thư mục

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # Google OAuth
│   │   └── blocks/route.ts              # GET/POST blocks
│   ├── dashboard/page.tsx               # App chính
│   ├── page.tsx                         # Trang login
│   ├── layout.tsx
│   └── providers.tsx
└── lib/
    ├── supabase.ts    # Supabase client
    ├── api.ts         # Fetch helpers
    └── types.ts       # TypeScript types
```

---

## Cách hoạt động

- User đăng nhập → Google trả về email
- Email dùng làm **user key** để lưu data trong Supabase
- Mỗi ngày = 1 row trong bảng `timeblock_days`
- Mỗi user hoàn toàn tách biệt dữ liệu
