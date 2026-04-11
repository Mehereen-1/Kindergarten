# 📚 Teacher Panel UI - Fast Beautiful UI

Open http://localhost:3001 or read [QUICK_START.md](./QUICK_START.md)

**Status:** ✅ Production Ready | 6 Components | 15,000+ Words Documentation

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Lama Dev Youtube Channel](https://youtube.com/lamadev) 
- [Next.js](https://nextjs.org/learn)

## Production Deployment Checklist

1. Copy `.env.example` to `.env.local` (or your platform's secret manager) and set real values.
2. Ensure `MONGODB_URI`, SMTP, Twilio, VAPID, and AI provider keys are configured.
3. Set runtime host/origin env values:
	 - `APP_URL`
	 - `HOSTNAME`
	 - `SOCKET_CORS_ORIGINS`
	 - `NEXT_PUBLIC_SOCKET_URL`
	 - `NEXT_PUBLIC_PYTHON_BACKEND_URL`
4. Install dependencies:

```bash
npm ci
```

5. Run pre-deploy checks:

```bash
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
```

6. Start production server:

```bash
npm run start
```

## Security Notes

- Dependencies were updated to patched Next.js 14.2.x line and matching ESLint config.
- Remaining high-risk audit findings may still appear for:
	- `xlsx` (no fix currently published)
	- `next` advisories that require a major upgrade path (`next@16+`)
- Recommended mitigation for `xlsx` usage:
	- Process only trusted files
	- Validate/sanitize upload contents before parsing
	- Isolate parsing path from privileged operations