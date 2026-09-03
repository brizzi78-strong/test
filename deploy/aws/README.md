# cp17.org on AWS

The site currently runs on GitHub Pages, which is free and already serving
cp17.org over HTTPS. This directory is the AWS alternative, kept ready so
the move is a decision rather than a project.

## What this builds

| Piece | What it does |
|---|---|
| S3 bucket | Holds the files. Private, encrypted, versioned; blocks non-TLS requests outright. |
| CloudFront | The only thing allowed to read the bucket. Serves over TLS 1.2+ and adds HSTS and the other standard security headers. |
| ACM certificate | The HTTPS certificate for `cp17.org` and `www.cp17.org`. Renews itself. |
| Deploy role | Lets GitHub Actions publish using a short-lived token. No AWS keys are created or stored anywhere. |

Roughly $1–2/month at this traffic level, mostly the CloudFront minimums.

## Honest note on security

The site is three static HTML pages: no login, no database, no user data,
no funds. There is nothing on it for an attacker to take, and GitHub Pages
already serves it over HTTPS from hardened infrastructure. This stack is
tidier and gives more control — it is not a fix for a security problem the
site currently has.

The security that matters for CARD lives in the wallet keys and the
contract, not the web host.

## Deploying it

Run in **us-east-1** — CloudFront only accepts certificates issued there.

```bash
aws cloudformation deploy \
  --region us-east-1 \
  --stack-name cp17-site \
  --template-file deploy/aws/cp17-site.yml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides DomainName=cp17.org GitHubRepo=brizzi78-strong/test
```

The stack pauses while the certificate validates. ACM publishes two CNAME
records — add them at the DNS host (currently WordPress.com), and the stack
finishes on its own once they resolve.

If the account already has the GitHub Actions OIDC provider registered, add
`CreateOidcProvider=no` to the parameter overrides; an account may only have
one.

## Wiring up the deploys

Read the outputs:

```bash
aws cloudformation describe-stacks --region us-east-1 \
  --stack-name cp17-site --query 'Stacks[0].Outputs' --output table
```

Then set three **repository variables** in GitHub
(Settings → Secrets and variables → Actions → Variables):

- `AWS_DEPLOY_ROLE` — the `DeployRoleArn` output
- `AWS_SITE_BUCKET` — the `BucketName` output
- `AWS_DISTRIBUTION_ID` — the `DistributionId` output

`.github/workflows/aws-deploy.yml` skips itself until `AWS_DEPLOY_ROLE`
exists, so it is harmless to merge before any of this is done.

## Cutting the domain over

Only after a deploy has succeeded and the CloudFront URL serves the site:
repoint `cp17.org` and `www.cp17.org` at the `DistributionDomainName`
output. Both hosts can serve simultaneously during the switch, so there is
no downtime and no rush.

To go back, point the DNS at GitHub Pages again — that setup is left intact.
