# Supabase Auth Quick Reference

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Register   │  │    Login     │  │  Admin Panel │           │
│  │              │  │              │  │              │           │
│  │ username     │  │ username     │  │ Toggle Admin │           │
│  │ password     │  │ password     │  │ Hide Members │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                  │                  │                   │
│         │                  │                  │                   │
│  ┌──────▼──────────────────▼──────────────────▼───────────────┐  │
│  │              AuthContext (src/context/)                     │  │
│  │  - Manages user state                                       │  │
│  │  - Handles authentication                                   │  │
│  │  - Provides isAdmin, user, etc.                             │  │
│  └──────┬──────────────────┬──────────────────┬───────────────┘  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          │ signUp()         │ POST             │ POST + JWT
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│  Supabase Auth  │ │ Netlify Function │ │  Netlify Function    │
│                 │ │                  │ │                      │
│  signUp()       │ │ auth-login-with- │ │ admin-toggle-user-   │
│  - Creates auth │ │ username         │ │ admin                │
│    user         │ │                  │ │                      │
│  - Stores in    │ │ 1. Username->    │ │ 1. Validate JWT      │
│    auth.users   │ │    Email lookup  │ │ 2. Check is_admin    │
│                 │ │ 2. signInWith    │ │ 3. Update user       │
│                 │ │    Password()    │ │                      │
│                 │ │ 3. Return token  │ │                      │
└────────┬────────┘ └─────────┬────────┘ └──────────┬───────────┘
         │                    │                      │
         │ INSERT             │ SELECT               │ UPDATE
         ▼                    ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ auth.users (managed by Supabase)                         │   │
│  │  - id (UUID)                                             │   │
│  │  - email (username@siege-clan.app)                       │   │
│  │  - encrypted_password                                    │   │
│  │  - raw_user_meta_data { username: "..." }               │   │
│  └────────┬─────────────────────────────────────────────────┘   │
│           │                                                      │
│           │ TRIGGER: on_auth_user_created                        │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ public.users (application data)                          │   │
│  │  - id (UUID) ← Same as auth.users.id                     │   │
│  │  - username (text)                                       │   │
│  │  - email (text)                                          │   │
│  │  - supabase_auth_id (UUID) ← Same as id                  │   │
│  │  - is_admin (boolean) ← ONLY SET VIA EDGE FUNCTION       │   │
│  │  - created_at                                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  RLS POLICIES:                                                    │
│  ✓ Users can view their own profile (auth.uid())                 │
│  ✓ Anonymous can read user info (for login lookup)               │
│  ✓ Users CANNOT update is_admin (column-level security)          │
│  ✓ Service role has full access (for edge functions)             │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### 1. Two User Tables

**auth.users** (Managed by Supabase)
- Stores authentication credentials
- Handles password hashing, JWT tokens
- Email format: `username@siege-clan.app`

**public.users** (Your application data)
- Stores application-specific user data
- Auto-created by database trigger
- Linked via `id` field (same UUID as auth.users)

### 2. Username to Email Conversion

```javascript
// User registers with:
username: "john"
password: "secret123"

// Stored in Supabase as:
email: "john@siege-clan.app"
password: [hashed by Supabase]
metadata: { username: "john" }

// public.users trigger creates:
id: [UUID from auth.users]
username: "john"
email: "john@siege-clan.app"
supabase_auth_id: [same UUID]
is_admin: false
```

### 3. Login Flow

```javascript
1. User enters: username="john", password="secret123"
2. Frontend calls: POST /.netlify/functions/auth-login-with-username
3. Edge function:
   a. Looks up email: SELECT email FROM users WHERE username='john'
      → Returns: "john@siege-clan.app"
   b. Authenticates: supabase.auth.signInWithPassword(email, password)
   c. Returns: session tokens + user data
4. Frontend: Sets session in Supabase client
5. User is logged in
```

### 4. Admin Authorization

```javascript
1. Admin action triggered (e.g., hide member)
2. Frontend gets JWT token from session
3. Frontend calls edge function with Authorization header
4. Edge function validates:
   a. Decode JWT → get user.id
   b. Check: SELECT is_admin FROM users WHERE id = user.id
   c. If is_admin = true → allow operation
   d. If is_admin = false → return 403 Forbidden
5. Edge function uses service role key to perform operation
```

### 5. Database Trigger

```sql
-- Trigger: on_auth_user_created
-- Fires: AFTER INSERT ON auth.users
-- Action: Creates matching record in public.users

When auth.users gets new user:
  ↓
Trigger calls handle_new_user()
  ↓
Inserts into public.users:
  - id = auth.users.id
  - username = metadata.username OR email prefix
  - email = auth.users.email
  - supabase_auth_id = auth.users.id
  - is_admin = false
```

## File Reference

### Frontend Files
```
src/
├── context/
│   └── AuthContext.jsx          ← Main auth logic
├── components/
│   ├── Login.jsx                ← Login form (no changes needed)
│   └── Navbar.jsx
└── pages/
    └── RegistrationForm.jsx     ← Register form (no changes needed)
```

### Backend Files
```
netlify/functions/
├── auth-login-with-username.js  ← NEW: Username login endpoint
├── admin-toggle-user-admin.js   ← Admin promotion endpoint
├── admin-toggle-member-visibility.js
└── utils/
    └── adminHelpers.js          ← UPDATE: Change line 104
```

### Database Files
```
supabase/migrations/
├── 20250116000001_prepare_auth_migration.sql
├── 20250116000002_auto_create_users.sql
├── 20250116000003_auth_rls_policies.sql
└── 20250116000004_admin_helper_functions.sql
```

## Common Operations

### Register New User
```javascript
// Frontend (no changes to current code)
await register("username", "password123");

// What happens:
// 1. Calls supabase.auth.signUp() with email: username@siege-clan.app
// 2. Trigger auto-creates public.users record
// 3. User logged in automatically
```

### Login User
```javascript
// Frontend (no changes to current code)
await login("username", "password123");

// What happens:
// 1. Calls /.netlify/functions/auth-login-with-username
// 2. Edge function converts username → email
// 3. Edge function calls Supabase auth
// 4. Returns session tokens
```

### Make User Admin
```sql
-- In Supabase SQL Editor:
UPDATE public.users
SET is_admin = true
WHERE username = 'targetuser';
```

### Remove Admin
```sql
-- In Supabase SQL Editor:
UPDATE public.users
SET is_admin = false
WHERE username = 'targetuser';
```

### Check Admin Status
```sql
-- In Supabase SQL Editor:
SELECT username, is_admin
FROM public.users
WHERE is_admin = true;
```

## Environment Variables

### Required in .env (Local Development)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # SECRET - Never commit!
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8888
```

### Required in Netlify Dashboard
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # SECRET
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Security Features

| Feature | How It's Implemented |
|---------|---------------------|
| Password Security | Supabase Auth handles hashing (bcrypt) |
| JWT Validation | Edge functions verify tokens with Supabase |
| Admin Protection | Column-level RLS prevents self-promotion |
| Session Management | Supabase handles token refresh |
| CORS Protection | Edge functions validate origin |
| Email Privacy | Server-side username→email conversion |
| SQL Injection | Parameterized queries throughout |
| RLS Policies | Row-level security on all tables |

## Comparison: Old vs New

| Aspect | Old System | New System |
|--------|-----------|------------|
| Password Storage | Custom SHA-256 hash | Supabase bcrypt |
| User Creation | Manual in both tables | Auto-trigger |
| Login | Username → hash → validate | Username → email → Supabase auth |
| Session | localStorage only | Supabase session + JWT |
| Admin Check | Custom logic | JWT + RLS policies |
| Security | Hybrid (fragile) | Industry standard |

## Quick Troubleshooting

| Issue | Quick Fix |
|-------|-----------|
| Login fails | Check user exists: `SELECT * FROM users WHERE username='...'` |
| Admin access denied | Check admin status: `UPDATE users SET is_admin=true WHERE username='...'` |
| Trigger not working | Re-run migration 002 |
| 403 on admin functions | Verify JWT token in request headers |
| User not created | Check trigger exists: `SELECT * FROM pg_trigger WHERE tgname='on_auth_user_created'` |

## Testing Checklist

- [ ] New user can register with username
- [ ] User record auto-created in both tables
- [ ] User can login with username (not email)
- [ ] Session persists on page refresh
- [ ] Admin can be promoted via SQL
- [ ] Admin can access admin panel
- [ ] Admin can toggle member visibility
- [ ] Non-admin gets 403 on admin actions
- [ ] Logout clears session properly
- [ ] Users cannot self-promote to admin

## Next Steps After Implementation

1. **Test thoroughly** with the checklist above
2. **Migrate existing users** (if any)
3. **Remove legacy code** (password hashing)
4. **Monitor logs** for any issues
5. **Document** any custom changes
6. **Consider adding**:
   - Password reset flow
   - Email verification (if using real emails)
   - OAuth providers (Google, GitHub)
   - Two-factor authentication

## Support Files

- **Complete Solution**: `SUPABASE_AUTH_SOLUTION.md`
- **Step-by-Step Guide**: `AUTH_IMPLEMENTATION_GUIDE.md`
- **This Reference**: `AUTH_QUICK_REFERENCE.md`
