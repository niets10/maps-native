# Field Atlas

A cross-platform (iOS, Android, web) app for tracking which countries you've visited — built with [Expo](https://expo.dev) (React Native + Expo Router) and [Supabase](https://supabase.com) for authentication and data storage.

- 🗺️ Interactive world map — tap a country to mark it visited
- 📊 Stats — % of the world explored, broken down by continent
- 🔎 Searchable country list
- 🔐 Email/password, magic link, and Google sign-in via Supabase Auth
- 🔄 Realtime sync — your visited countries stay in sync across devices

## Stack

| Layer          | Choice                                                       |
| -------------- | ------------------------------------------------------------- |
| App framework  | Expo (React Native + Expo Router), runs on iOS/Android/web from one codebase |
| Auth           | Supabase Auth (email/password, magic link, Google OAuth)     |
| Database       | Supabase Postgres, with Row Level Security                   |
| Map            | `react-native-svg` + `@svg-maps/world` (renders identically on native and web) |
| Fonts          | Fraunces (display), Work Sans (body), IBM Plex Mono (labels) |

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run the contents of [`supabase/schema.sql`](./supabase/schema.sql). This creates:
   - `profiles` — one row per user, auto-created on sign-up via a trigger
   - `visited_countries` — the core data (`user_id`, `country_code`, `visited_at`, `notes`)
   - Row Level Security policies so every user can only read/write their own rows
   - Realtime enabled on `visited_countries` so changes sync live across devices/tabs
3. Go to **Project Settings -> API** and copy your **Project URL** and **anon public key**.
4. Copy `.env.example` to `.env` and fill in those two values:

   ```bash
   cp .env.example .env
   ```

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

If these aren't set, the app will show a "Connect your Supabase project" setup screen instead of crashing.

### Enable email auth

Email/password and magic links work out of the box once your project exists — no extra config needed. By default Supabase requires email confirmation for new sign-ups; you can toggle that under **Authentication -> Providers -> Email** while developing.

### Enable Google sign-in (optional)

1. In the Supabase Dashboard, go to **Authentication -> Providers -> Google** and follow the linked steps to create an OAuth Client ID in Google Cloud Console.
2. Add your redirect URLs in the Google Cloud Console's **Authorized redirect URIs**:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback` (Supabase's own callback)
3. In the Supabase Dashboard, paste your Google **Client ID** and **Client Secret** into the Google provider settings and enable it.
4. For the app to redirect back correctly after sign-in on native, this project already registers the `maps://` URL scheme (see `app.json`) and listens for it in `src/lib/auth-context.tsx`. On web, Supabase redirects directly back to your app's URL.

Full guide: [Supabase Google Auth docs](https://supabase.com/docs/guides/auth/social-login/auth-google).

## 2. Run the app

```bash
npm install
npx expo start
```

Then press `w` for web, or scan the QR code with [Expo Go](https://expo.dev/go) / open in a simulator for iOS/Android.

## 3. Deploy to Vercel (web / PWA)

The repo is configured for a static Expo web export (`vercel.json` + `public/manifest.json`).

1. Push the project to GitHub and import it in [Vercel](https://vercel.com/new) (or run `npx vercel` from the project root).
2. In the Vercel project settings, add these environment variables (same values as `.env`):
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy. Build uses `npx expo export -p web` and serves the `dist/` folder.
4. In Supabase → **Authentication → URL Configuration**, add your Vercel URL to **Site URL** and **Redirect URLs** (e.g. `https://your-app.vercel.app` and `https://your-app.vercel.app/**`).
5. On iPhone: open the site in **Safari** → Share → **Add to Home Screen**.

Local production build check:

```bash
npm run build:web
npx expo serve
```

## Project structure

```
src/
  app/                 Screens (file-based routing via Expo Router)
    index.tsx          Map tab
    explore.tsx         Countries tab (searchable list)
    profile.tsx         Profile tab (stats + sign out)
    _layout.tsx         Root layout: fonts, auth provider, auth gate
  components/
    auth-screen.tsx      Sign in / sign up / magic link / Google
    world-map.tsx         Cross-platform SVG world map
    app-tabs.tsx          Native tab bar (iOS/Android)
    app-tabs.web.tsx       Floating tab bar (web)
  lib/
    supabase.ts           Supabase client (cross-platform storage)
    auth-context.tsx      Session state + sign-in/up/out methods
    use-visited-countries.ts  Data hook — fetch/toggle visited countries
    stats.ts              Per-continent stats calculation
  constants/
    countries.ts           Reference list of ~196 countries with continents
    theme.ts                Colors, fonts, spacing ("Field Atlas" theme)
supabase/
  schema.sql              Run this in the Supabase SQL editor
```

## Notes

- The app icon/splash assets are still the Expo defaults (`assets/images/icon.png`, `splash-icon.png`) — swap these for your own branding before shipping.
- On web, `react-native-svg` logs a harmless console warning about touch-responder props on the map's `<Path>` elements. It doesn't affect functionality — tapping a country works correctly on both web and native.
