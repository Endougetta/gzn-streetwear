#!/usr/bin/env bash
set -euo pipefail

: "${GZN_PRODUCTION_DB_ID:?Set the UUID of the production D1 database}"
: "${VITE_IMPRINT_URL:?Set the published imprint URL}"
: "${VITE_PRIVACY_URL:?Set the published privacy URL}"
: "${MAIL_FROM:?Set the verified sender}"
if [[ ! "$GZN_PRODUCTION_DB_ID" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ || "$GZN_PRODUCTION_DB_ID" == "00000000-0000-4000-8000-000000000001" ]]; then
  echo "A real production D1 UUID is required." >&2
  exit 1
fi

export VITE_HOSTED_REVIEW=0
npm run build
# Separate generated config keeps the tracked local database configuration intact.
node --input-type=module <<'JS'
import { writeFileSync } from 'node:fs'
const config = {
  name: 'gzn-streetwear',
  pages_build_output_dir: './dist',
  compatibility_date: '2026-11-18',
  d1_databases: [{
    binding: 'DB', database_name: 'gzn-waitlist-production',
    database_id: process.env.GZN_PRODUCTION_DB_ID, migrations_dir: 'migrations'
  }],
  vars: {
    SITE_URL: 'https://gzn-streetwear.pages.dev',
    MAIL_FROM: process.env.MAIL_FROM,
    WAITLIST_ENABLED: '1'
  }
}
if (process.env.MAIL_REPLY_TO) config.vars.MAIL_REPLY_TO = process.env.MAIL_REPLY_TO
writeFileSync('wrangler.production.json', JSON.stringify(config, null, 2))
JS
