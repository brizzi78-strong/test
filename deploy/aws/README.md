# Moving the fleet to AWS

Everything in `render.yaml` currently deploys to Render with one click
(Blueprint → Apply). This directory is the AWS alternative for all ten of
those services, kept ready the same way `cp17-site.yml` already was for
`cp17-site` — so the move is a decision, not a project, and it is safe to
merge before any of it is applied.

**Nothing here runs automatically.** Every workflow below checks for a
repository variable first and skips itself if that variable is unset. Render
keeps serving every service exactly as it does today until you deliberately
wire a service up.

## Why this exists

This session's sandbox cannot provision AWS directly: the AWS credentials
available to it are a placeholder, and there is no Docker daemon here to
build the seven container images. Both problems disappear once the work
moves to GitHub Actions, which is why every service here deploys through CI
rather than through a command run by hand in a chat session.

## The three patterns

| Pattern | Used by | AWS pieces | Template |
|---|---|---|---|
| Static site | cardinal-care-bridge, cardinal-expenses, cardinal-coverage | S3 (private) + CloudFront + ACM | `static-site.yml` |
| Stateless container | cardinal-coverage-app, memory-care-music-program, cardinal-chat | ECR + App Runner | `app-runner-service.yml` |
| Stateful container | cardinal-books, cardinal-expenses-app, blue-ridge-tax, cardinal-trading | ECR + ECS Fargate + EFS (the disk) + ALB + ACM | `fargate-service.yml` |

`cp17-site.yml` is untouched and stays exactly as it was — it predates this
README and deploys with its own command and its own (unsuffixed) variable
names, both unchanged from before:

```bash
aws cloudformation deploy \
  --region us-east-1 \
  --stack-name cp17-site \
  --template-file deploy/aws/cp17-site.yml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides DomainName=cp17.org GitHubRepo=brizzi78-strong/test
```

Its three variables — `AWS_DEPLOY_ROLE`, `AWS_SITE_BUCKET`,
`AWS_DISTRIBUTION_ID` — carry no suffix, since `.github/workflows/aws-deploy.yml`
already existed and reads exactly those names; every service below this line
is new and gets a suffixed name instead, to keep ten independent roles
distinguishable. If `cp17-site` is the very first stack deployed in the
account, add `CreateOidcProvider=yes` to that command — see "First-ever
setup" below for what that means and why only one stack should ever set it.

The three templates below are each written once and deployed multiple
times — once per service, under that service's own stack name — rather than
copy-pasted per service. Read the templates themselves for the full property
list; this file covers what deploying and wiring them up actually involves.

Every stack creates its **own** IAM deploy role, scoped only to that stack's
own resources — a compromised token for `cardinal-books` cannot touch
`blue-ridge-tax`. All ten roles trust the same GitHub OIDC provider, which an
AWS account may only register once (see "First-ever setup" below).

## Prerequisites

- A real AWS account (this sandbox cannot create one or hold its credentials
  usefully — see the note above).
- The AWS CLI, run from your own machine or a Cloud Shell, **not** from this
  chat.
- This repo's GitHub Settings → Secrets and variables → Actions → Variables,
  where every `AWS_*` name below gets set.

## First-ever setup (once per AWS account)

1. Pick whichever service you want live first. `cardinal-coverage-app` is a
   reasonable start — it already has a working Render deployment and a
   password gate, so nothing is exposed while you get the AWS side right.

2. Deploy that service's stack **without** an image yet:

   ```bash
   aws cloudformation deploy \
     --region us-east-1 \
     --stack-name cardinal-coverage-app \
     --template-file deploy/aws/app-runner-service.yml \
     --capabilities CAPABILITY_IAM \
     --parameter-overrides ServiceName=cardinal-coverage-app ServiceReady=no CreateOidcProvider=yes
   ```

   `CreateOidcProvider=yes` only on this very first stack — an AWS account
   may only have one GitHub Actions OIDC provider. Every stack after this
   one (any of the ten) uses the default, `CreateOidcProvider=no`.

3. Read the outputs and set the two repository variables this service's
   workflow needs:

   ```bash
   aws cloudformation describe-stacks --region us-east-1 \
     --stack-name cardinal-coverage-app --query 'Stacks[0].Outputs' --output table
   ```

   - `AWS_DEPLOY_ROLE_COVERAGE_APP` ← `DeployRoleArn`

4. Set the one secret this service needs (App Runner's instance role can
   already read it — that permission was granted when the stack was
   created):

   ```bash
   aws ssm put-parameter --type SecureString \
     --name /cardinal/cardinal-coverage-app/CC_PASSWORD --value '<a strong password>'
   ```

5. Push to `main` (or re-run the workflow manually from the Actions tab).
   `.github/workflows/aws-deploy-cardinal-coverage-app.yml` builds the image,
   pushes it to the ECR repo the stack just created, flips `ServiceReady` to
   `yes` (creating the actual App Runner service on this first run), and
   applies the env vars and secret.

6. Confirm it: the workflow's `Deploy the App Runner stack` step output
   includes the stack's `ServiceUrl`, or fetch it any time with
   `aws cloudformation describe-stacks --stack-name cardinal-coverage-app
   --query 'Stacks[0].Outputs'`.

Every other service follows steps 2–6 with `CreateOidcProvider` left at its
default (`no`) and that service's own template, name, and variables.

## Repository variables, by service

Static sites (per service, from `static-site.yml`'s outputs):

| Service | Deploy role var | Bucket var | Distribution var |
|---|---|---|---|
| cardinal-care-bridge | `AWS_DEPLOY_ROLE_CARE_BRIDGE` | `AWS_SITE_BUCKET_CARE_BRIDGE` | `AWS_DISTRIBUTION_ID_CARE_BRIDGE` |
| cardinal-expenses | `AWS_DEPLOY_ROLE_EXPENSES` | `AWS_SITE_BUCKET_EXPENSES` | `AWS_DISTRIBUTION_ID_EXPENSES` |
| cardinal-coverage | `AWS_DEPLOY_ROLE_COVERAGE` | `AWS_SITE_BUCKET_COVERAGE` | `AWS_DISTRIBUTION_ID_COVERAGE` |

Stateless containers (App Runner) — each needs only its deploy role; the
workflow reads everything else from the stack's own outputs at deploy time:

| Service | Deploy role var |
|---|---|
| cardinal-coverage-app | `AWS_DEPLOY_ROLE_COVERAGE_APP` |
| memory-care-music-program | `AWS_DEPLOY_ROLE_MUSIC_PROGRAM` |
| cardinal-chat | `AWS_DEPLOY_ROLE_CHAT` |

Stateful containers (Fargate) — each needs its own deploy role and,
optionally, its own domain; plus two variables **shared across all four**,
since a VPC and its subnets are account-level, not per-service:

| Service | Deploy role var | Domain var (optional) |
|---|---|---|
| cardinal-books | `AWS_DEPLOY_ROLE_BOOKS` | `AWS_DOMAIN_BOOKS` |
| cardinal-expenses-app | `AWS_DEPLOY_ROLE_EXPENSES_APP` | `AWS_DOMAIN_EXPENSES_APP` |
| blue-ridge-tax | `AWS_DEPLOY_ROLE_TAX` | `AWS_DOMAIN_TAX` |
| cardinal-trading | `AWS_DEPLOY_ROLE_TRADING` | `AWS_DOMAIN_TRADING` |

Shared, set once:

- `AWS_VPC_ID` — get with `aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query "Vpcs[0].VpcId" --output text`
- `AWS_SUBNET_IDS` — **two or more public subnets, comma-separated**, from
  `aws ec2 describe-subnets --filters Name=vpc-id,Values=<AWS_VPC_ID> --query "Subnets[].SubnetId" --output text`

Leave a domain variable unset and that Fargate service serves plain HTTP off
its own load balancer's DNS name (the stack's `LoadBalancerDnsName` output) —
no certificate can be issued without a real domain to validate against. Add
the domain later by re-running the `cloudformation deploy` step with
`DomainName=` set; nothing else about the service changes.

## Secrets

Every gated service reads its password (and, for `cardinal-chat`, the
Anthropic API key) from SSM Parameter Store at runtime — never from a CI
variable, and never from this template. Set each one, once, after that
service's first `ServiceReady=no` bootstrap deploy:

```bash
aws ssm put-parameter --type SecureString \
  --name /cardinal/<service-name>/<NAME> --value '<value>'
```

| Service | Secrets to set |
|---|---|
| cardinal-coverage-app | `CC_PASSWORD` |
| cardinal-chat | `ANTHROPIC_API_KEY`, `CHAT_PASSWORD` |
| cardinal-books | `BOOKS_PASSWORD` |
| cardinal-expenses-app | `EXPENSES_PASSWORD` |
| blue-ridge-tax | `TAXFILE_PASSWORD` |
| memory-care-music-program, cardinal-trading | none — no gate, matching Render |

## Why the workflows call two extra scripts

`deploy/aws/apprunner-source-config.py` and `deploy/aws/ecs-register-taskdef.py`
exist because raw CloudFormation cannot turn a variable-length list of
per-service environment variables and secrets into the properties App
Runner and ECS need, without a custom Lambda-backed resource. Rather than
add one, the durable infrastructure (the repo, the roles, the network, the
volume, the load balancer) is CloudFormation's job, and the part that
changes on every deploy — which image, which env vars, which secrets — is
built by these two small, tested scripts and applied with one follow-up CLI
call. Nothing here is bespoke per service beyond the values already visible
in `render.yaml`.

## Cost

Rough, at low traffic, on top of whatever else the account already runs:

| Piece | Approx. |
|---|---|
| Static site (S3 + CloudFront) | $1–2/mo each |
| App Runner (0.25 vCPU / 0.5 GB, low traffic) | ~$5–8/mo each |
| Fargate task (0.25 vCPU / 0.5 GB) | ~$9/mo each |
| Application Load Balancer | ~$16/mo each (one per Fargate service) |
| EFS (a few GB, SQLite-sized) | under $1/mo each |
| ECR, CloudWatch Logs | a few cents each |

The four Fargate services each get their own ALB rather than sharing one,
matching the render.yaml's own per-service isolation — simpler to reason
about and to tear down independently, at the cost of roughly $48/mo more
than a shared ALB would be. Consolidating them behind one ALB with
host-header routing is a reasonable later optimization, not a correctness
concern.

## Cutting a domain over

Only after a service's first successful deploy: repoint its domain's DNS at
the stack's `DistributionDomainName` (static sites) or `LoadBalancerDnsName`
(Fargate services) output. Render and AWS can both serve the same content
simultaneously during the switch, so there is no downtime and no rush. To go
back, point the DNS at Render again.

## Tearing a stack down

```bash
aws cloudformation delete-stack --stack-name <service-name>
```

Static-site and App Runner stacks delete cleanly. A Fargate stack's EFS
volume holds real data — CloudFormation will refuse to delete a non-empty
`AWS::EFS::FileSystem` in some configurations, so back up `/data` first if
the service ever held anything worth keeping.
