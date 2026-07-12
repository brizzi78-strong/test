# The Cardinal's Toolkit — iPhone App

The companion app to **_The Cardinal's Toolkit: The North Carolina Family Caregiver Handbook_** by Rob Brizzi — practical tools to help you stay organized and prepared while caring for an aging parent.

The cardinal is North Carolina's state bird: it stays through every winter. So do caregivers.

Everything is private and offline: no account, no network, no analytics. Journal entries, mood check-ins, and checklist progress never leave the device.

## The four pillars, as tabs

### Today
- A **daily reflection** written for caregivers — encouragement that changes each day.
- A **mood check-in** ("How is your heart today?") from *Struggling* to *Peaceful*, with a last-7-days strip.
- The living cardinal mascot (he breathes, blinks, and flicks his tail) and quick links to the tools.

### Checklists — *Planning & Checklists*
Interactive checklists with progress saved on-device:
- **The Essential Documents** — POA, health care POA, advance directive (with NC witness/notary notes), HIPAA, will, "where everything is" sheet
- **Home Safety Walkthrough** — the afternoon of fixes that prevents the big fall
- **Medical Information Kit** — the folder that travels to every appointment
- **Hospital Discharge Day** — taming health care's most dangerous handoff

### Tools — *Practical Tools*
For the caregiver's own heart:
- **Breathe** — guided breathing (in 4 · hold 4 · out 6) with an animated circle
- **Come Back to Now** — the 5-4-3-2-1 grounding exercise
- **Gentle Words** — 16 affirmations written for caregiving's hardest days

### Journal
Private entries with mood, optional title, and caregiver-specific starter prompts ("What do I need to ask for help with?"). Edit, swipe-to-delete; persisted via `UserDefaults`.

### Resources — *Support & Resources*
- **When you need help now**: Eldercare Locator, NC 211, Alzheimer's Association 24/7 Helpline, 988
- **North Carolina**: Division of Aging & Adult Services, SHIIP Medicare counseling, Project C.A.R.E., Adult Protective Services
- **National**: Family Caregiver Alliance, AARP Caregiving, VA Caregiver Support, Medicare.gov
- **Gentle reading**: five in-app articles — caregiver burnout, the essential paperwork, home safety, talking with your parent about help, and when it's time for more care
- **About** — the book, the bird, the privacy promise, and a clear "not medical/legal advice" note

## Requirements

- Xcode 16 or later
- iOS 17.0+ deployment target, iPhone only

## Running the app

1. Open `CardinalPress.xcodeproj` in Xcode.
2. Select an iPhone simulator (or a device with your signing team set on the target).
3. Build and run (⌘R). There are no external dependencies.

CI builds the app on a macOS runner on every push (`.github/workflows/ios-build.yml`) and uploads the simulator `.app` bundle as a workflow artifact.

## Architecture

```
CardinalPress/
├── CardinalPressApp.swift      # App entry point; injects the shared store
├── Models/
│   └── Models.swift            # Mood, JournalEntry, MoodCheckIn, Reflection, Article, SupportResource, Checklist
├── Data/
│   ├── CompanionStore.swift    # ObservableObject: journal, check-ins, checklist progress (all persisted)
│   └── SeedData.swift          # ALL content: reflections, affirmations, prompts, articles, checklists, resources
├── Support/
│   └── Theme.swift             # Cover palette: cardinal red, navy, gold, cream
└── Views/
    ├── ContentView.swift       # Root TabView (Today · Checklists · Tools · Journal · Resources)
    ├── TodayView.swift         # Reflection, mood check-in, week strip, quick tools
    ├── ChecklistsView.swift    # Progress rings, item toggles, per-list reset
    ├── ToolsView.swift         # Tool cards + care disclaimer
    ├── BreathingView.swift     # Animated guided breathing
    ├── GroundingView.swift     # 5-4-3-2-1 walkthrough
    ├── AffirmationsView.swift  # Swipeable affirmation deck
    ├── JournalView.swift       # Entry list + editor sheet with prompts
    ├── ResourcesView.swift     # Urgent / NC / national resources + articles
    ├── AboutView.swift         # The book, the bird, privacy, disclaimer
    └── CardinalMark.swift      # Code-drawn cardinal emblem + LivingCardinal animation
```

All content lives in `SeedData.swift` — reflections, checklists, articles, and resource links can be edited there without touching any view code, which makes syncing the app with new editions of the workbook a one-file change.

## A note of care

This app supports organization and caregiver self-care. It is not medical, legal, or financial advice. In an emergency call 911; for local aging services anywhere in the US call the Eldercare Locator at 1-800-677-1116, or dial 2-1-1 in North Carolina.
