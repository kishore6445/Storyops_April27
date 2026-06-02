#!/bin/bash
set -a
source /vercel/share/.env.project
source /vercel/share/.env.snowflake
set +a

# Create .env.local from the sourced variables
cat > /vercel/share/v0-project/.env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
EOF

echo "[v0] Environment variables synced to .env.local"
