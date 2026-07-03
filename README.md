# The Cardinal's Companion

A SwiftUI iPhone app offering **resources and tools for healing** — a gentle companion for anyone grieving or going through a hard season. The cardinal, said to appear when a loved one is near, is the app's emblem.

Everything is private and offline: no account, no network, no analytics. Journal entries and mood check-ins never leave the device.

## Features

### Today
- A **daily reflection** — a short, comforting thought that changes each day.
- A **mood check-in** ("How is your heart today?") with a five-point scale from *Struggling* to *Peaceful*, plus a strip showing your last week.
- Quick access to the healing tools.

### Tools
- **Breathe** — guided breathing (in 4 · hold 4 · out 6) with an animated circle to follow. The long exhale is what settles the nervous system.
- **Come Back to Now** — the classic 5-4-3-2-1 grounding exercise, walked through step by step across the five senses.
- **Gentle Words** — a swipeable deck of affirmations written specifically for grief's hardest days.

### Journal
- Private entries with a mood, an optional title, and free writing.
- **Starter prompts** ("What do I wish I could tell them today?") for blank-page days.
- Edit, swipe-to-delete; persisted on-device via `UserDefaults` (JSON-encoded).

### Resources
- **Crisis support**: 988 Suicide & Crisis Lifeline, Crisis Text Line, SAMHSA helpline (tap-to-call/text), and an international helpline finder.
- **Gentle reading**: five in-app articles — grief's non-linear timeline, the cardinal tradition and "continuing bonds," caring for a grieving body, supporting a grieving friend, and when to seek professional help.
- **Organizations**: The Dougy Center, What's Your Grief, Modern Loss, and the National Alliance for Children's Grief.
- **About** — the app's story, privacy promise, and a clear "this is not therapy" note of care.

## Requirements

- Xcode 16 or later
- iOS 17.0+ deployment target, iPhone only

## Running the app

1. Open `CardinalPress.xcodeproj` in Xcode.
2. Select an iPhone simulator (or a device with your signing team set on the target).
3. Build and run (⌘R). There are no external dependencies.

## Architecture

```
CardinalPress/
├── CardinalPressApp.swift      # App entry point; injects the shared store
├── Models/
│   └── Models.swift            # Mood, JournalEntry, MoodCheckIn, Reflection, Article, SupportResource
├── Data/
│   ├── CompanionStore.swift    # ObservableObject: journal + check-ins (persisted), daily reflection
│   └── SeedData.swift          # Reflections, affirmations, prompts, articles, support resources
├── Support/
│   └── Theme.swift             # Cardinal palette, tool gradients, mood colors
└── Views/
    ├── ContentView.swift       # Root TabView (Today · Tools · Journal · Resources)
    ├── TodayView.swift         # Reflection card, mood check-in, week strip, quick tools
    ├── ToolsView.swift         # Tool cards + care disclaimer
    ├── BreathingView.swift     # Animated guided breathing
    ├── GroundingView.swift     # 5-4-3-2-1 walkthrough
    ├── AffirmationsView.swift  # Swipeable affirmation deck
    ├── JournalView.swift       # Entry list + editor sheet with prompts
    ├── ResourcesView.swift     # Crisis lines, articles, organizations
    └── AboutView.swift         # Story, privacy, disclaimer
```

The Xcode project uses a file-system-synchronized group (Xcode 16+), so new files added under `CardinalPress/` are picked up automatically.

All content lives in `SeedData.swift` — reflections, affirmations, prompts, articles, and resource links can be edited there without touching any view code.

## A note of care

This app offers comfort and self-care tools. It is not therapy and not a substitute for professional mental-health care. If you are in crisis in the US, call or text **988**; elsewhere, find a helpline at [findahelpline.com](https://findahelpline.com).
