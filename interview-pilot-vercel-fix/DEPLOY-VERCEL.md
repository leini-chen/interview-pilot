# Deploy InterviewPilot to Vercel

The original local-only server could not be used as a Vercel function entrypoint. This version provides `api/status.js`, `api/session.js`, and `api/report.js`, each with a default request handler, plus a shared backend in `lib/handler.mjs`.

## Project settings

1. Replace the deployed source with this complete project, including `api/`, `lib/`, `dist/`, `package.json`, and `vercel.json`.
2. Set **Root Directory** to the directory containing `package.json` and `vercel.json`, not `dist`.
3. Set **Framework Preset** to **Other**. Clear previous custom framework overrides.
4. Build command: `npm run build`. Output Directory: `dist`. Node.js: **22.x**. The included `vercel.json` sets the build/output values.
5. Under **Settings → Environment Variables**, add `OPENAI_API_KEY` for the intended deployment environments. Optional: `OPENAI_REALTIME_MODEL=gpt-realtime-2.1` and `OPENAI_FEEDBACK_MODEL=gpt-4.1-mini`.
6. Deploy the changed source. For a custom domain or an alias not covered by Vercel's provided deployment/production host variables, set `APP_ORIGIN=https://your-domain.example` and redeploy.

Never upload `.env` or put a key in `dist/`. This deployment reads secrets from Vercel environment variables only. Redeploy after changing environment variables.

## Verify

- `/` should display the setup page.
- `/api/status` should return JSON with `configured: true` after adding a key. This checks configuration presence, not provider permissions or billing.
- Join a short interview and allow microphone access. WebRTC media flows between the browser and OpenAI; a Vercel function is needed only to establish the session and generate the final report, not to stay open throughout the call.
- If the page works but a call fails, inspect the `/api/session` response or Vercel function logs. Authentication, quota, and model access errors are separate from the original invalid-export error.

This is still a private-test build. Credits, Stripe payments, durable usage metering, and server-enforced account quotas are not implemented. Keep the deployment protected while testing so uninvited visitors cannot spend your API budget. The in-memory concurrency counter is per function instance, not a global production rate limit.

Local execution remains `npm start`. Automated checks: `npm test`.

Reference: https://vercel.com/docs/functions/runtimes/node-js
