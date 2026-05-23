<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Deployment

Vercel project: `fakture-online` (`prj_KdTCYnY5A9nlK7WzdxwqMdirIO7Q`, team `team_GOCZJxfkaKv75fJ42qi1LCMP`).

The GitHub → Vercel auto-deploy webhook is broken (history rewrite during the
security overhaul broke its trust chain). Until it's reconnected in the Vercel
dashboard, **trigger production deploys manually via the deploy hook**:

```bash
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_KdTCYnY5A9nlK7WzdxwqMdirIO7Q/i8T2hlBNet"
```

The hook deploys the current `master` branch. It returns `{"job":{"id":"..."}}` —
poll Vercel MCP `list_deployments` to watch for the new build.

If this hook is ever rotated or leaked, regenerate it from the Vercel project
settings page (Settings → Git → Deploy Hooks) and replace the URL above.
