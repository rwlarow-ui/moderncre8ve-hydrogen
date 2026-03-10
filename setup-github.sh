#!/bin/bash
# Run this from inside the moderncre8ve-seo-truth-layer directory
# Prerequisites: gh CLI authenticated (gh auth login)

set -e

echo "=== ModernCre8ve SEO Truth Layer — GitHub Setup ==="

# 1. Init git repo
git init
git add -A
git commit -m "$(cat <<'EOF'
Initial release: SEO Truth Layer v1.0.0

Automated weekly SEO intelligence pipeline for the ModernCre8ve
Hydrogen storefront. Pulls GSC + GA4 data, merges into a single
truth table, generates prioritized actions, and delivers a weekly brief.

Pipeline: pull_gsc → pull_ga4 → merge_truth → actions → report
Schedule: Every Monday 11:00 UTC via GitHub Actions
Outputs: gsc_raw.csv, ga4_raw.csv, seo_truth_merged.csv, seo_actions.csv, weekly_brief.md

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# 2. Create GitHub repo (private by default)
gh repo create rwlarow-ui/moderncre8ve-seo-truth-layer \
  --private \
  --source=. \
  --description "Automated weekly SEO intelligence for ModernCre8ve Hydrogen storefront" \
  --push

echo ""
echo "=== Done! ==="
echo "Repo: https://github.com/rwlarow-ui/moderncre8ve-seo-truth-layer"
echo ""
echo "Next steps:"
echo "  1. Add GitHub Secrets (repo → Settings → Secrets → Actions):"
echo "     - GOOGLE_SERVICE_ACCOUNT_JSON"
echo "     - GA4_PROPERTY_ID"
echo "     - SITE_URL = https://moderncre8ve.com/"
echo "  2. Go to Actions tab → Run workflow to test"
