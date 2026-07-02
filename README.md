# Cardinal Press for iPhone

A SwiftUI iPhone app for **Cardinal Press**, an independent literary publisher. Browse the catalog, read excerpts, follow press news, and keep a personal reading list.

## Features

- **Catalog** — a searchable, filterable grid of the press's titles. Filter by genre (Fiction, Poetry, Essays, In Translation, Young Readers) or search by title/author. Forthcoming titles are badged "Coming Soon". Covers are generated in-app with genre-colored gradients, so the catalog works with no artwork assets or network.
- **Book details** — synopsis, price, page count, ISBN, and publication year, plus a serif-typeset excerpt reader presented as a sheet.
- **News** — press announcements: new seasons, prize shortlists, submission windows.
- **Reading List** — bookmark books from anywhere in the app; the list persists across launches (`UserDefaults`) and supports swipe-to-delete.
- **About** — the press's story, submission guidelines, and contact links.

## Requirements

- Xcode 16 or later
- iOS 17.0+ deployment target, iPhone only

## Running the app

1. Open `CardinalPress.xcodeproj` in Xcode.
2. Select an iPhone simulator (or a device with your signing team set on the *CardinalPress* target).
3. Build and run (⌘R).

There are no external dependencies or packages — the app builds out of the box.

## Architecture

```
CardinalPress/
├── CardinalPressApp.swift      # App entry point; injects the shared store
├── Models/
│   └── Book.swift              # Book, Genre, NewsItem value types
├── Data/
│   ├── BookStore.swift         # ObservableObject: catalog queries + persisted reading list
│   └── SeedData.swift          # Bundled catalog & news content
├── Support/
│   └── Theme.swift             # Brand colors and cover gradients
└── Views/
    ├── ContentView.swift       # Root TabView
    ├── CatalogView.swift       # Searchable grid with genre chips
    ├── BookDetailView.swift    # Detail page + excerpt sheet
    ├── BookCoverView.swift     # Generated gradient cover component
    ├── NewsView.swift          # Press announcements feed
    ├── ReadingListView.swift   # Saved books, persisted
    └── AboutView.swift         # About, submissions, contact
```

The Xcode project uses a file-system-synchronized group (Xcode 16+), so new files added under `CardinalPress/` are picked up automatically — no project-file edits needed.

`SeedData` is the only place that knows the catalog contents; swapping it for a network-backed catalog service later only touches `BookStore`.
