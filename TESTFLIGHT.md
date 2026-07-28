# TestFlight Beta Kit — The Cardinal's Toolkit

Everything to paste into App Store Connect and send to testers. The app is
already technically upload-ready (bundle id `com.cardinalpress.CardinalPress`,
v1.0 build 1, no special permissions). Replace every **[bracketed]** value.

---

## 1. App Store Connect → TestFlight fields

| Field | Value |
|---|---|
| Beta App Name | Cardinal's Toolkit |
| Feedback Email | brizzi78@icloud.com |
| Marketing URL | https://thecardinalspromise.com |
| Privacy Policy URL | https://thecardinalspromise.com/privacy (see note below) |
| Beta App Description | *A companion to the caregiver handbook — checklists, a medication list, gentle self-care tools, and trusted phone numbers for families caring for an aging parent. Everything stays on your phone.* |
| Export Compliance | **No** — the app uses no encryption beyond Apple's standard HTTPS, so answer "None of the algorithms mentioned above." |

> **Privacy note:** even though nothing leaves the device, App Store Connect
> wants a privacy URL. A one-paragraph page saying "this app collects nothing,
> stores everything on your device, has no account and no analytics" is enough.
> I can draft that page too — just ask.

---

## 2. "What to Test" — paste into the TestFlight build's Test Details

Thank you for testing **The Cardinal's Toolkit** — a companion to the caregiver
handbook, for families caring for an aging parent. Everything you enter stays on
your phone: no account, nothing sent anywhere.

Please tap through all five tabs, and especially try the new things:

**Today**
- Tap a mood ("How is your heart today?"). Come back tomorrow — does your week fill in?
- Open the red "In the First 24 Hours" and check a few items.

**Medications (new)**
- On the Today screen, tap **Medications**. Add a couple of real medications —
  name, dose, when, why, who prescribed it. Edit one. Delete one. Reorder them.
- Tap the **Share** icon (top-left). If you texted that list to a family member,
  would it read clearly?

**Checklists**
- Open any checklist, check some items, then use the **···** menu → **Share this
  checklist**. Does the shared text make sense to someone who isn't looking at the app?

**Tools**
- Try Breathe, Come Back to Now, and Gentle Words.

**Journal**
- Write an entry (tap a prompt to start). Reopen and edit it.

**Backup**
- Go to **Resources → About → Export a backup**. Does the exported text include
  your checklists, medications, and journal?

**What we most want to know:**
1. Anything confusing, or wording that felt wrong for a caregiver?
2. Did anything crash, freeze, or look broken? (what screen, what you tapped)
3. Is the text big enough to read comfortably?
4. What's missing that you'd reach for on a hard day?

To report: in the TestFlight app, take a screenshot and it offers to send feedback,
or email **brizzi78@icloud.com**.

---

## 3. Tester invite message (email or text)

> **Subject: Would you help me test the Cardinal's Toolkit app?**
>
> Hi [name],
>
> I've been building a small iPhone app to go with my caregiver book, *The
> Cardinal's Toolkit* — checklists, a medication list, gentle tools, and trusted
> phone numbers for families caring for an aging parent. Before it goes public,
> I'd love your eyes on it.
>
> It takes about two minutes:
> 1. Install **TestFlight** from the App Store (it's free — Apple's official app for testing).
> 2. On your iPhone, tap this invite link: **[TestFlight public link]**
> 3. Open the app and poke around — especially **Medications** and **Checklists**.
>
> There are no accounts, and nothing you enter ever leaves your phone. If anything
> feels confusing or breaks, just tell me — that's exactly what helps.
>
> Thank you,
> Rob

*Tip: in App Store Connect → TestFlight, create a **Public Link** so you can share
one URL with anyone instead of adding emails one at a time.*

---

## 4. Short feedback questionnaire

Send this (Google Form, email, or text) to anyone who tries it:

1. On a hard caregiving day, would this app help? (1–5) — and why?
2. What one thing was **most** useful?
3. What one thing was **confusing or annoying**?
4. Did anything crash or look broken? (which screen + what you did)
5. Was the text easy to read without zooming? (yes / no)
6. What's **missing** that you'd want on a hard day?
7. Would you recommend it to another caregiver? (1–5)

---

## 5. After the beta

The app beta panel already flagged a backlog worth watching for in real feedback:
inclusive "parent / the person you love" language, a Dynamic Type (large-text)
pass, adding your own contacts to Resources, appointment/"questions for the
doctor" notes, and optional gentle reminders. If testers echo any of these,
that's the v1.1 list. See `cardinals-promise/reviews/app-beta-panel-report.md`.
