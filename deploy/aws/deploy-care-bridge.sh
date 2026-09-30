#!/usr/bin/env bash
# Deploy the Cardinal Care Bridge static site to AWS (S3 + CloudFront).
#
# One command, safe to re-run: creates or updates the CloudFormation stack,
# uploads cardinal-care-bridge/, and invalidates the CDN cache.
#
#   ./deploy/aws/deploy-care-bridge.sh
#
# Optional environment:
#   DOMAIN_NAME       e.g. guide.cardinalscarebridge.com   (blank = CloudFront URL only)
#   HOSTED_ZONE_ID    Route 53 zone for DOMAIN_NAME        (blank = DNS managed elsewhere)
#   CERTIFICATE_ARN   existing ACM cert in us-east-1       (only if DOMAIN_NAME set, zone blank)
#   STACK_NAME        default: cardinal-care-bridge
#
# Requires: AWS CLI v2 with credentials that can manage CloudFormation, S3,
# CloudFront, ACM and (if used) Route 53. See deploy/DEPLOY-CARE-BRIDGE.md.

set -euo pipefail

REGION="us-east-1" # CloudFront certificates must be in us-east-1; keep the stack there too.
STACK_NAME="${STACK_NAME:-cardinal-care-bridge}"
SITE_DIR="$(cd "$(dirname "$0")/../.." && pwd)/cardinal-care-bridge"
TEMPLATE="$(cd "$(dirname "$0")" && pwd)/care-bridge-stack.yml"

DOMAIN_NAME="${DOMAIN_NAME:-}"
HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-}"
CERTIFICATE_ARN="${CERTIFICATE_ARN:-}"

if [[ -n "$DOMAIN_NAME" && -z "$HOSTED_ZONE_ID" && -z "$CERTIFICATE_ARN" ]]; then
  echo "DOMAIN_NAME is set but neither HOSTED_ZONE_ID nor CERTIFICATE_ARN is." >&2
  echo "Either let Route 53 manage the zone, or issue a cert in ACM (us-east-1) and pass its ARN." >&2
  exit 1
fi

echo "==> Deploying stack '$STACK_NAME' in $REGION"
aws cloudformation deploy \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE" \
  --parameter-overrides \
    "DomainName=$DOMAIN_NAME" \
    "HostedZoneId=$HOSTED_ZONE_ID" \
    "CertificateArn=$CERTIFICATE_ARN" \
  --no-fail-on-empty-changeset

output() {
  aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
BUCKET="$(output BucketName)"
DIST_ID="$(output DistributionId)"
SITE_URL="$(output SiteUrl)"

echo "==> Uploading $SITE_DIR to s3://$BUCKET"
# README.md and BRAND.md are internal notes, not site content — never publish them.
aws s3 sync "$SITE_DIR/" "s3://$BUCKET/" \
  --region "$REGION" \
  --delete \
  --exclude "README.md" \
  --exclude "BRAND.md" \
  --exclude ".DS_Store" \
  --cache-control "public, max-age=300"

echo "==> Invalidating CloudFront distribution $DIST_ID"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" --output text --query 'Invalidation.Id'

echo
echo "Live at: $SITE_URL"
if [[ -n "$DOMAIN_NAME" && -z "$HOSTED_ZONE_ID" ]]; then
  echo "DNS is managed outside Route 53: point a CNAME for $DOMAIN_NAME at $(output CloudFrontUrl | sed 's#https://##')"
fi
