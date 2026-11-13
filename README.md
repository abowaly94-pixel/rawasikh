# رواسخ — Rawasikh

Web platform for Rawasikh Educational Services: course delivery, academic
services, an online store, and an admin dashboard for managing content,
students, teachers, and schools.

## Tech stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (database, auth, storage, edge functions)

## Getting started

Requires Node.js & npm.

```sh
# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build
```

## Project structure

- `src/pages` — route-level pages (public site + `dashboard/` admin pages)
- `src/components` — shared UI and layout components
- `src/integrations/supabase` — Supabase client and generated types
- `src/i18n/locales` — translations (ar, en, fr, ur)
- `supabase/migrations` — database schema migrations
- `supabase/functions` — Supabase edge functions
