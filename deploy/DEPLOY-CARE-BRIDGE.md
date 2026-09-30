# Deploying Cardinal Care Bridge to AWS

The static site in `cardinal-care-bridge/` (the landing page and the Family
Care Homes directory) is hosted on AWS: a private S3 bucket served through
CloudFront over HTTPS. There is no server, no build step, and nothing to
patch. Typical cost is under $1 a month at this traffic.

This replaces the Render static site. The live WordPress site at
`cardinalscarebridge.com` is **not** affected — it stays where it is. This
site gets its own hostname (a subdomain, or just the CloudFront URL) until
you decide otherwise.

## What gets created

| Resource | Purpose |
| --- | --- |
| S3 bucket `cardinal-care-bridge-<account-id>` | Holds the site files. Private — nothing is reachable except through CloudFront. Versioned, so a bad upload can be rolled back. |
| CloudFront distribution | Serves the site worldwide over HTTPS with security headers, compression, and a proper 404 page. |
| Origin Access Control | Lets CloudFront read the bucket without making it public. |
| ACM certificate + Route 53 records | Only if you give the stack a domain and a Route 53 hosted zone. |

Everything is defined in `deploy/aws/care-bridge-stack.yml` (CloudFormation)
and applied by `deploy/aws/deploy-care-bridge.sh`.

## First deploy, by hand

You need the AWS CLI v2 signed in to the account, with permission to manage
CloudFormation, S3, CloudFront, ACM, and Route 53.

```bash
# From the repo root. No domain yet — you get a *.cloudfront.net URL.
./deploy/aws/deploy-care-bridge.sh
```

The script prints the live URL at the end. Re-running it is safe: it updates
the stack if the template changed, re-uploads only changed files, and clears
the CDN cache.

## Adding a custom domain

The apex `cardinalscarebridge.com` belongs to WordPress, so this site lives on
a subdomain. Two cases:

**DNS is in Route 53.** Pass the domain and the zone; the stack issues the
certificate and creates the records itself:

```bash
DOMAIN_NAME=guide.cardinalscarebridge.com \
HOSTED_ZONE_ID=Z0123456789ABCDEFGHIJ \
./deploy/aws/deploy-care-bridge.sh
```

**DNS is somewhere else** (WordPress.com, GoDaddy). Request a certificate in
ACM in `us-east-1` for the subdomain, complete its DNS validation where your
DNS lives, then:

```bash
DOMAIN_NAME=guide.cardinalscarebridge.com \
CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/... \
./deploy/aws/deploy-care-bridge.sh
```

The script then tells you the CloudFront hostname to point a CNAME at.

## Automatic deploys from GitHub

`.github/workflows/deploy-care-bridge.yml` runs the same script on every push
to `main` that touches the site or its infrastructure. It authenticates with
OpenID Connect, so no long-lived AWS keys are stored in GitHub.

One-time setup:

1. In IAM, add GitHub as an OIDC identity provider
   (`token.actions.githubusercontent.com`, audience `sts.amazonaws.com`) if
   the account doesn't have one.
2. Create a role that trusts that provider for
   `repo:brizzi78-strong/test:ref:refs/heads/main`, with permissions for
   CloudFormation, S3, CloudFront, ACM, and Route 53.
3. In the repository settings, add the secret `AWS_DEPLOY_ROLE_ARN` with the
   role's ARN, and create a `production` environment.
4. Optionally add repository variables `CARE_BRIDGE_DOMAIN_NAME` and either
   `CARE_BRIDGE_HOSTED_ZONE_ID` or `CARE_BRIDGE_CERTIFICATE_ARN`.

After that, merging to `main` deploys.

## What is never uploaded

`cardinal-care-bridge/README.md` and `cardinal-care-bridge/BRAND.md` are
internal notes and are excluded from every upload. Keep anything you don't
want public out of that folder or add it to the exclude list in the script.

## Retiring the Render service

Removing the entry from `render.yaml` stops Render from deploying new
versions, but the existing service keeps running until you delete it in the
Render dashboard (Settings → Delete Web Service). Do that once the AWS URL
is confirmed working.

## Rolling back

The bucket is versioned. To restore a previous version of a file:

```bash
aws s3api list-object-versions --bucket cardinal-care-bridge-<account-id> --prefix index.html
aws s3api copy-object --bucket cardinal-care-bridge-<account-id> --key index.html \
  --copy-source "cardinal-care-bridge-<account-id>/index.html?versionId=<id>"
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

Or simply check out the previous commit and run the deploy script again.
