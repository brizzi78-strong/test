import Foundation

/// Bundled catalog and news content. In a future release this will be
/// replaced by a network-backed catalog service.
enum SeedData {
    static let books: [Book] = [
        Book(
            id: "cp-001",
            title: "The Weight of Winter Light",
            author: "Marisol Etxeberria",
            genre: .fiction,
            synopsis: "In a fishing village on the Bay of Biscay, a lighthouse keeper's daughter returns home after twenty years to settle her father's estate — and finds his logbooks describe a ship that never existed. A slow-burning novel about grief, memory, and the stories families keep in the dark.",
            excerpt: "The light turned every fourteen seconds, as it always had, and in the space between turnings the whole house seemed to hold its breath. I counted along with it out of old habit: one for the harbor, two for the breakwater, three for the rocks that had no name because no one who met them ever came back to give them one.",
            pages: 312,
            isbn: "978-1-58836-101-4",
            publicationYear: 2024,
            price: 18.95,
            isForthcoming: false
        ),
        Book(
            id: "cp-002",
            title: "Field Notes from the Understory",
            author: "Deshi Okafor",
            genre: .essays,
            synopsis: "Sixteen essays written over a decade of nights spent in the forests of three continents. Okafor braids mycology, migration, and the ethics of attention into a quietly radical argument: that the small and the slow are where the world actually happens.",
            excerpt: "You learn quickly, lying on the forest floor, that nothing down here is waiting. The waiting is an idea we brought with us, along with the flashlights.",
            pages: 248,
            isbn: "978-1-58836-102-1",
            publicationYear: 2023,
            price: 16.95,
            isForthcoming: false
        ),
        Book(
            id: "cp-003",
            title: "Ninety-Nine Doors",
            author: "Halldóra Vigfúsdóttir",
            genre: .translation,
            synopsis: "Translated from the Icelandic by Peter Aldwych. A woman inherits an apartment building in Reykjavík with ninety-nine doors and, behind each, a tenant who claims to have known her mother better than she did. Winner of the Nordic Council Literature Prize.",
            excerpt: "Door number one opened before I knocked, which I would later understand was the building's way of telling me who was really in charge.",
            pages: 288,
            isbn: "978-1-58836-103-8",
            publicationYear: 2024,
            price: 17.95,
            isForthcoming: false
        ),
        Book(
            id: "cp-004",
            title: "Salt & Circuitry",
            author: "June Park",
            genre: .poetry,
            synopsis: "Park's second collection moves between a childhood in a coastal cannery town and a working life in server farms — two economies of preservation. Poems of brine, copper, humming rooms, and the bodies that keep both kinds of memory cold.",
            excerpt: "My mother sealed fish in tins; / I seal the mornings of strangers / in machines that must never sleep. / Both of us paid by the hour / to stop time.",
            pages: 96,
            isbn: "978-1-58836-104-5",
            publicationYear: 2023,
            price: 15.00,
            isForthcoming: false
        ),
        Book(
            id: "cp-005",
            title: "The Cartographer's Daughter Draws the Sea",
            author: "Amaia Reyes",
            genre: .youngReaders,
            synopsis: "Ages 8–12. Pilar's father maps coastlines for the king, but his maps always stop where the water begins. When he goes missing on a survey voyage, Pilar stows away with his spare compass and a notebook, determined to chart the one thing no one has: the way home.",
            excerpt: "Papa said the sea couldn't be drawn because it never held still. But neither did I, and Grandmother drew me all the time.",
            pages: 176,
            isbn: "978-1-58836-105-2",
            publicationYear: 2024,
            price: 14.95,
            isForthcoming: false
        ),
        Book(
            id: "cp-006",
            title: "A Ledger of Small Rebellions",
            author: "Tomás Ferreira",
            genre: .fiction,
            synopsis: "Lisbon, 1972. A junior accountant at a shipping firm begins keeping a second ledger — not of money, but of everything the dictatorship makes people pretend not to see. A novel about complicity, courage, and the bookkeeping of conscience.",
            excerpt: "Item the first: Senhora Baptista wept in the stairwell and we all agreed, without a word, that it was the onions.",
            pages: 356,
            isbn: "978-1-58836-106-9",
            publicationYear: 2022,
            price: 18.95,
            isForthcoming: false
        ),
        Book(
            id: "cp-007",
            title: "Winterspeak",
            author: "Anya Krylova",
            genre: .translation,
            synopsis: "Translated from the Russian by Elena Marsh. Poems written across forty winters in a village above the Arctic Circle, published in samizdat and carried west a page at a time. This is the first complete English edition, with the translator's celebrated afterword.",
            excerpt: "Here even the thermometer / gives up its opinion quietly, / like everyone else.",
            pages: 144,
            isbn: "978-1-58836-107-6",
            publicationYear: 2023,
            price: 16.00,
            isForthcoming: false
        ),
        Book(
            id: "cp-008",
            title: "The Apiary at the End of the Orchard",
            author: "Ruth Calloway",
            genre: .essays,
            synopsis: "Part memoir, part natural history, Calloway's account of taking over her late brother's beehives becomes a meditation on inheritance — of land, of labor, of the people we couldn't save and the work they leave us.",
            excerpt: "The bees did not know he was gone. For weeks that felt like the cruelest thing, and then, slowly, like the kindest.",
            pages: 224,
            isbn: "978-1-58836-108-3",
            publicationYear: 2025,
            price: 17.50,
            isForthcoming: false
        ),
        Book(
            id: "cp-009",
            title: "Glosario de la Niebla / A Glossary of Fog",
            author: "Estela Marín",
            genre: .poetry,
            synopsis: "A bilingual edition, Spanish and English on facing pages, translated by the author. Marín builds a dictionary of the fogs of her native Galicia — one poem per word the region uses for weather the rest of the world thinks is all the same.",
            excerpt: "Brétema: the fog that arrives / before the ships do, / so the harbor can practice / its forgetting.",
            pages: 128,
            isbn: "978-1-58836-109-0",
            publicationYear: 2025,
            price: 16.00,
            isForthcoming: false
        ),
        Book(
            id: "cp-010",
            title: "The Night Ferry Timetable",
            author: "Marisol Etxeberria",
            genre: .fiction,
            synopsis: "The long-awaited follow-up to The Weight of Winter Light. A retired ferry captain discovers that the last crossing of his career — a night run everyone else remembers as cancelled — is still departing on schedule, every year, with one seat reserved in his name.",
            excerpt: "The timetable listed the 23:40 to Portmiro in faded ink, and beside it, in ink that was not faded at all, my own initials.",
            pages: 304,
            isbn: "978-1-58836-110-6",
            publicationYear: 2026,
            price: 19.95,
            isForthcoming: true
        ),
        Book(
            id: "cp-011",
            title: "How to Build a Boat from a Book",
            author: "Sef Adeyemi",
            genre: .youngReaders,
            synopsis: "Ages 6–9. When the library announces it will close for good, Kofi takes the librarian's joke — 'these books could keep a whole town afloat' — literally. A picture-book celebration of libraries, stubbornness, and reading as rescue. Illustrated by Mei Tanaka.",
            excerpt: "Chapter books make the best planks, Kofi decided. Poetry was for the sails, because it already knew about wind.",
            pages: 48,
            isbn: "978-1-58836-111-3",
            publicationYear: 2026,
            price: 17.99,
            isForthcoming: true
        ),
        Book(
            id: "cp-012",
            title: "Correspondence with a Drowned Town",
            author: "Ilya Vance",
            genre: .essays,
            synopsis: "In 1958, the town of Harrow's Bend was flooded to make a reservoir. Vance, whose grandmother was the town's last postmistress, spends a year writing letters to its former addresses — and, through archives, interviews, and one impossible reply, reconstructs what a community loses when it is asked to disappear for the greater good.",
            excerpt: "The lake is very beautiful. Everyone says so, especially the people it displaced, who say it the way you compliment the suit at a funeral.",
            pages: 272,
            isbn: "978-1-58836-112-0",
            publicationYear: 2024,
            price: 17.95,
            isForthcoming: false
        ),
    ]

    static let news: [NewsItem] = [
        NewsItem(
            id: "news-001",
            date: date(2026, 6, 18),
            headline: "Fall 2026 list announced",
            body: "We're thrilled to announce our Fall 2026 season, led by Marisol Etxeberria's The Night Ferry Timetable and Sef Adeyemi's picture-book debut How to Build a Boat from a Book. Both titles are open for pre-order now through your local independent bookstore."
        ),
        NewsItem(
            id: "news-002",
            date: date(2026, 5, 4),
            headline: "Glosario de la Niebla shortlisted for the Ashbury Translation Prize",
            body: "Estela Marín's bilingual collection has been shortlisted for this year's Ashbury Prize, recognizing outstanding poetry in translation. The winner will be announced in September. Congratulations, Estela!"
        ),
        NewsItem(
            id: "news-003",
            date: date(2026, 3, 12),
            headline: "Open submissions window: June 1–30",
            body: "Our annual open reading period returns this June. We're seeking literary fiction, essay collections, and poetry — no agent required. See the About tab for guidelines. Last year's window brought us Ruth Calloway's The Apiary at the End of the Orchard; this year we can't wait to see what finds us."
        ),
        NewsItem(
            id: "news-004",
            date: date(2026, 1, 22),
            headline: "Ninety-Nine Doors enters its fifth printing",
            body: "Halldóra Vigfúsdóttir's prize-winning novel continues to find readers — we've returned to press for a fifth printing, with a new foreword by translator Peter Aldwych arriving in the paperback edition this spring."
        ),
        NewsItem(
            id: "news-005",
            date: date(2025, 11, 3),
            headline: "Cardinal Press turns ten",
            body: "Ten years, forty-two books, one very tired espresso machine. Thank you to our authors, translators, booksellers, and readers for a decade of small books that stay. Here's to the next shelf."
        ),
    ]

    private static func date(_ year: Int, _ month: Int, _ day: Int) -> Date {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        components.hour = 9
        return Calendar(identifier: .gregorian).date(from: components) ?? .distantPast
    }
}
