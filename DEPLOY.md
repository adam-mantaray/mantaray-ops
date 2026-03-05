# Permanent Deployment Setup (5 min)

## Option A — Vercel (recommended)

1. Go to https://vercel.com/new → Import `adam-mantaray/mantaray-ops`
2. Add env vars from `.env.local` (LINEAR_API_KEY, LINEAR_TEAM_ID, GITHUB_TOKEN, OPS_PIN)
3. Click Deploy — auto-deploys on every push to main

## Option B — Netlify

1. Go to https://app.netlify.com/start → Import `adam-mantaray/mantaray-ops`
2. Build command: `next build`
3. Add same env vars

## Current temporary URL (Cloudflare Tunnel)
Ask Tarek for the live tunnel URL — it's running on Ahmed's MacBook until a permanent host is set up.
PIN: 2695

Note: Tunnel URL changes on restart. Set up Vercel/Netlify for a permanent URL.
