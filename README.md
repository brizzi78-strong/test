# Software Accounts

A simple CSV-based inventory to organize all your software accounts in one place.
Open `software-accounts.csv` in Excel, Numbers, or Google Sheets and fill in your accounts.

## Categories

The template is pre-grouped into four sections (add or remove rows as needed):

- **Cloud & Hosting** — AWS, GCP, Azure, Vercel, Netlify, Cloudflare, DigitalOcean, etc.
- **Dev Tools** — GitHub, GitLab, npm, Docker Hub, CI/CD, package registries, etc.
- **Productivity & SaaS** — Google Workspace, Notion, Slack, Figma, Zoom, etc.
- **Finance & Billing** — Stripe, PayPal, banking, subscription billing, etc.

## Columns

| Column         | What to put there                                                  |
|----------------|--------------------------------------------------------------------|
| Category       | One of the four sections above                                     |
| Service        | Name of the service (e.g. GitHub)                                  |
| URL            | Login or dashboard URL                                             |
| Login Email    | Email address used to sign in                                      |
| Username       | Username/handle, if different from the email                       |
| Plan/Tier      | e.g. Free, Pro, Team, Enterprise                                   |
| MFA Enabled    | Yes / No — whether two-factor auth is turned on                    |
| Billing Cycle  | Monthly / Annual / None                                            |
| Renewal Date   | Next renewal or expiry date (YYYY-MM-DD)                           |
| Monthly Cost   | Cost per month (annualized if billed yearly)                       |
| Owner          | Who owns/pays for the account (you, a team, etc.)                  |
| Notes          | Anything else worth remembering                                    |

## Example row

```csv
Dev Tools,GitHub,https://github.com,you@example.com,yourhandle,Pro,Yes,Monthly,2026-07-01,4.00,Me,Personal account
```

## Tips

- **Never store passwords here.** Use a dedicated password manager (1Password, Bitwarden, etc.) for secrets. This file is for inventory and organization only.
- Keep the **MFA Enabled** column honest — it doubles as a security checklist.
- Sort or filter by **Renewal Date** to catch upcoming charges, or by **Monthly Cost** to find what to trim.
