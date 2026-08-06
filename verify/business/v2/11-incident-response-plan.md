# Incident Response Plan
**Blue Ridge Press LLC ("the Company") — Raleigh, North Carolina**

*This document is a starting template for the Company's internal use only. It is NOT legal advice. It must be reviewed, completed, and localized by a licensed attorney before the Company relies on it. It does not create, and must not imply, that any attorney or compliance professional prepared or reviewed it.*

---

## 1. Purpose

This plan tells the Company what to do when a data incident occurs — a suspected or confirmed unauthorized access to, loss of, or disclosure of the personal information the Company holds. Because the Company handles sensitive information about people's employment, education, and references, a fast, disciplined response matters.

## 2. Breach-Notification Note (Counsel Must Confirm)

North Carolina and federal law impose **specific breach-notification obligations and deadlines** that depend on the type of information, the number of individuals, and the circumstances. The notification triggers, recipients, and timelines in this plan are **placeholders**. When an incident involves personal information, the Company must **engage counsel promptly** to confirm exactly who must be notified and by when. Do not rely on the placeholder timelines as legal deadlines.

## 3. Roles

| Role | Who | Responsibility |
|---|---|---|
| Incident Lead | Owner/operator (Rob Brizzi) | Directs the response; final decisions; approves notifications |
| Legal counsel | [outside attorney, to be engaged] | Confirms legal obligations and notice content/timing |
| Technical support | [IT/security contact or vendor, if/when engaged] | Containment, forensics, remediation |
| Communications | Owner/operator | Consistent, accurate messaging to affected parties |

Until additional personnel exist, the owner/operator holds these roles and engages outside help as needed.

## 4. Response Phases

### 4.1 Detect & Report
- Anyone who suspects an incident reports it to the Incident Lead **immediately** — same day.
- The Incident Lead opens an Incident Record with date/time, reporter, and what is known.
- Report channel: [internal incident contact].

### 4.2 Contain
- Take immediate steps to stop ongoing exposure: revoke or reset compromised credentials, disable affected accounts, isolate affected devices/systems, and preserve evidence.
- Do **not** destroy logs or wipe systems in a way that loses forensic evidence; containment must preserve, not erase.

### 4.3 Assess
Determine, and record:
- What happened and how.
- What data was involved (categories, and whether it includes personal information).
- Whose data was affected and approximately how many individuals.
- Whether the data was encrypted or otherwise protected.
- Whether the exposure is contained or ongoing.

The assessment drives whether notification obligations are triggered — a question confirmed with counsel.

### 4.4 Notify
Working with counsel, the Company determines and documents:

| Potential recipient | Trigger (counsel to confirm) | Timeline (placeholder) |
|---|---|---|
| Affected individuals | Personal information reasonably believed exposed | Within [X] days of determination |
| Affected Clients | Client data or a Client's subject affected | Within [X] days |
| NC Attorney General / regulators | As required by NC / federal law | As legally required [confirm] |
| Consumer reporting agencies | If required by applicable law | As legally required [confirm] |
| Law enforcement | If criminal activity is suspected | As appropriate |

Notifications state, at minimum and as counsel confirms: what happened, what information was involved, what the Company is doing, and what the recipient can do to protect themselves. The Company does not delay legally required notice, and does not over-notify beyond what law and good judgment support.

### 4.5 Remediate
- Fix the root cause (patch, reconfigure, tighten access, replace a vendor, retrain).
- Restore affected systems and data from clean backups.
- Verify the vulnerability is closed and monitoring is in place.

### 4.6 Post-Incident Review
Within **[X] days** of closing the incident, the Incident Lead documents:
- Timeline of the incident and response.
- Root cause.
- What worked and what failed in the response.
- Corrective actions, owners, and due dates.
- Any updates needed to this plan or to the Information Security Policy.

## 5. Documentation

Every incident has an Incident Record retained per the Record Retention Policy, containing the detection report, assessment, decisions, notifications sent, remediation, and post-incident review. These records may be subject to legal privilege when prepared with counsel — route them through the Incident Lead.

## 6. Preparedness

- Keep current contact details for counsel and any technical/security vendors.
- Maintain and test backups so clean restoration is possible.
- Review this plan at least annually and after any actual incident, and update contacts and placeholders as they become known.

---

*All bracketed timelines and recipients are placeholders. Notification obligations must be confirmed with counsel at the time of any incident.*
