import Foundation

/// Bundled content: reflections, affirmations, articles, and support
/// resources. Everything ships with the app — no account, no network.
enum SeedData {

    // MARK: - Daily reflections

    static let reflections: [Reflection] = [
        Reflection(
            id: "ref-01",
            text: "When a cardinal appears in your yard, it is said, a loved one is near. Whatever you believe, let today's small red flashes remind you: what you shared is still yours.",
            attribution: nil
        ),
        Reflection(
            id: "ref-02",
            text: "What we have once enjoyed we can never lose. All that we love deeply becomes a part of us.",
            attribution: "Helen Keller"
        ),
        Reflection(
            id: "ref-03",
            text: "Grief is not a problem to be solved. It is the natural weight of having loved. You do not have to carry it gracefully — only gently.",
            attribution: nil
        ),
        Reflection(
            id: "ref-04",
            text: "Healing does not mean the loss mattered less. It means you are learning to carry it in a way that leaves your hands free for living.",
            attribution: nil
        ),
        Reflection(
            id: "ref-05",
            text: "You do not move on from the people you love. You move forward with them.",
            attribution: nil
        ),
        Reflection(
            id: "ref-06",
            text: "There is no timetable. A year is not too long. A decade is not too long. Grief keeps its own calendar, and yours is the only copy.",
            attribution: nil
        ),
        Reflection(
            id: "ref-07",
            text: "Some days the work of healing is just this: water, food, rest, one open window. That counts. That has always counted.",
            attribution: nil
        ),
        Reflection(
            id: "ref-08",
            text: "Grief is the price we pay for love.",
            attribution: "Colin Murray Parkes"
        ),
        Reflection(
            id: "ref-09",
            text: "The waves never stop coming, but you learn to swim between them — and one day you notice the water holding you up.",
            attribution: nil
        ),
        Reflection(
            id: "ref-10",
            text: "It is allowed to be both: to laugh at the memory and cry at the absence, in the same breath. Neither cancels the other.",
            attribution: nil
        ),
        Reflection(
            id: "ref-11",
            text: "Tell the story again. To a friend, to a page, to the kitchen window. Love that is spoken aloud stays warm.",
            attribution: nil
        ),
        Reflection(
            id: "ref-12",
            text: "Be as kind to yourself today as you would be to a dear friend carrying exactly what you are carrying.",
            attribution: nil
        ),
        Reflection(
            id: "ref-13",
            text: "The cardinal does not sing because the winter is over. It sings because it has a song.",
            attribution: nil
        ),
        Reflection(
            id: "ref-14",
            text: "You survived every hard day so far — a perfect record. Today asks only for today.",
            attribution: nil
        ),
    ]

    // MARK: - Affirmations

    static let affirmations: [String] = [
        "It's okay to have a slow day. Rest is part of healing.",
        "My grief is the shape of my love. I don't have to apologize for either.",
        "I can hold sorrow and gratitude in the same two hands.",
        "I am allowed to feel joy without guilt. Joy honors them too.",
        "One breath at a time is a real pace.",
        "Asking for help is an act of strength, not a failure of it.",
        "I don't have to be finished grieving by anyone's clock.",
        "The love did not end. It changed address.",
        "Today I will treat myself like someone worth taking care of.",
        "Tears are not a setback. They are the heart doing its work.",
        "I can miss them and still build a good life. Both are true.",
        "Small steps count: a shower, a walk, a phone call, a meal.",
        "Hard days are not proof I'm going backward.",
        "I carry them with me — in habits, in phrases, in the way I love.",
        "It's okay that some people don't understand. My grief doesn't need their permission.",
        "Right now, in this breath, I am safe.",
    ]

    // MARK: - Journal prompts

    static let journalPrompts: [String] = [
        "What do I wish I could tell them today?",
        "A memory that made me smile recently…",
        "What has been heaviest this week?",
        "Something they taught me that I still use…",
        "What would taking care of myself look like today?",
        "A moment I felt them near…",
        "What am I ready to forgive — in them, or in myself?",
        "One small thing I'm grateful for today…",
    ]

    // MARK: - Articles

    static let articles: [Article] = [
        Article(
            id: "art-01",
            title: "Grief Has No Timetable",
            subtitle: "Why 'stages' are a map, not a schedule",
            symbolName: "clock",
            body: """
You may have heard of the "five stages of grief" — denial, anger, bargaining, depression, acceptance. They were first described by Elisabeth Kübler-Ross to explain how people face their own dying, and they were never meant as a checklist for the bereaved to complete in order.

Real grief is less like a staircase and more like weather. Anger can arrive months before sadness. Acceptance can visit on a Tuesday and be gone by Friday. You can feel fine at the funeral and be undone a year later by a song in a grocery store. None of this means you are grieving wrongly. There is no wrongly.

Researchers who study bereavement describe an "oscillation" — we swing between confronting the loss and taking breaks from it, between looking back and getting on with the day. Both motions are the work. The breaks are not avoidance; they are how a heart paces itself.

So if you take one thing from this page, let it be this: you are not behind. Grief that still aches after a year, or five, is not a disorder — it is devotion looking for its new form. Give it the time it actually takes, which is exactly as long as it takes.
"""
        ),
        Article(
            id: "art-02",
            title: "Why Cardinals?",
            subtitle: "The story behind the red bird at the window",
            symbolName: "bird",
            body: """
In many families — especially across North America, where the northern cardinal stays through the winter — there is a saying: "When a cardinal appears, a loved one is near." Red against the snow, faithful to one place, singing in the coldest months: it is not hard to see why this bird became a messenger.

Folklore aside, there is something genuinely useful in the tradition. Psychologists who study bereavement talk about "continuing bonds" — the healthy, ongoing relationship we keep with people who have died. We continue bonds when we cook their recipe, wear their watch, talk to them on the drive home. A cardinal at the feeder can be part of that: a cue to pause, remember, and feel connected.

You do not have to believe anything in particular for this to help. The moment of noticing — stopping mid-task because something red crossed the yard — is a small, built-in memorial. It interrupts the noise. It gives the missing a place to land.

So this app borrows the cardinal as its emblem: not a claim about the afterlife, but an invitation to keep noticing. Whatever your red bird is — a song, a smell, a certain slant of light — let it find you.
"""
        ),
        Article(
            id: "art-03",
            title: "Caring for a Grieving Body",
            subtitle: "Sleep, food, movement, and why grief is physical",
            symbolName: "figure.walk",
            body: """
Grief is not only an emotion. It is a full-body event. In the early months many people report exhaustion, a tight chest, a foggy mind, a changed appetite, and sleep that either won't come or won't stop. If your body feels like it's been through something, that's because it has.

Start with the floor, not the ceiling. Aim for the minimums: water within reach, one real meal a day, horizontal in bed at a regular hour even if sleep is patchy. You are not trying to optimize anything right now; you are keeping a system running through a storm.

Gentle movement helps more than almost anything — not as self-improvement, but as discharge. A daily walk, even ten minutes, gives the agitation somewhere to go and hands your mind something rhythmic to hold. If tears come while you walk, let them. Moving and weeping are old companions.

Watch for the places grief wants shortcuts: alcohol to sleep, screens to numb, work to hide. None of these make you a failure — they make you human — but notice when a comfort starts costing more than it gives. And if your body stays in crisis for months — no sleep, no appetite, no capacity — that is a reason to see a doctor. Grief is a load; you're allowed help carrying it.
"""
        ),
        Article(
            id: "art-04",
            title: "Supporting Someone Who Grieves",
            subtitle: "What to say, what to skip, and how to stay",
            symbolName: "person.2",
            body: """
If you are reading this for someone else's loss, the most important thing you can know is this: you cannot fix it, and you are not supposed to. Your job is smaller and much harder — to stay.

Skip the silver linings. "They're in a better place," "everything happens for a reason," "at least it was quick" — these are attempts to close a wound that needs to stay open a while. What helps instead is witness: "I miss her too." "This is so unfair." "I'm here, and I'm not going anywhere." Say the person's name; the bereaved are rarely reminded of their loss by hearing it — they are relieved someone else remembers.

Make offers concrete. "Let me know if you need anything" hands the grieving person a job. Instead: "I'm bringing dinner Thursday — leave the cooler on the porch if you don't feel like talking." "I'll take the kids Saturday morning." "I'm driving you to the appointment."

Then — and this is where most support fails — stay past the casseroles. The hardest stretch often begins around month two, when the cards stop and the world moves on. Put a note in your calendar: their birthday, the anniversary, a random Tuesday in the fall. A two-line message that says "thinking of you and of him today" can matter more than anything you did the first week.
"""
        ),
        Article(
            id: "art-05",
            title: "When to Reach for More Help",
            subtitle: "The difference between grief and grief that's stuck",
            symbolName: "hand.raised",
            body: """
Most grief, given time and support, finds a livable shape on its own. But sometimes it gets stuck — and knowing the signs means you can reach for help sooner rather than later.

Clinicians now recognize "prolonged grief disorder": grief that, a year or more after the loss, still dominates every day — constant yearning, disbelief, inability to re-enter life, feeling that part of you died too. It affects a meaningful minority of bereaved people, and it responds well to targeted therapy. Seeking that help is not failing at grief; it is treating an injury that didn't heal straight.

Reach out promptly — without waiting a year — if you notice: thoughts of harming yourself or of not wanting to be here; drinking or substance use that is climbing; an inability to work, eat, or care for people who depend on you; or grief layered on trauma, such as a sudden or violent loss.

Where to start: a grief counselor or therapist (many specialize in bereavement), a local hospice's bereavement program — most offer free groups open to the whole community, not just hospice families — or your doctor, who can screen for depression that sometimes moves in alongside grief. And if you are ever in crisis, the support lines in this app's Resources tab are staffed around the clock. You do not have to earn help by suffering longer first.
"""
        ),
    ]

    // MARK: - Support lines & organizations

    static let crisisLines: [SupportResource] = [
        SupportResource(
            id: "line-988",
            name: "988 Suicide & Crisis Lifeline",
            detail: "Free, confidential support 24/7 (US). Call or text 988.",
            actionLabel: "Call 988",
            symbolName: "phone.fill",
            url: "tel:988"
        ),
        SupportResource(
            id: "line-text",
            name: "Crisis Text Line",
            detail: "Text HOME to 741741 to reach a volunteer crisis counselor (US).",
            actionLabel: "Text HOME to 741741",
            symbolName: "message.fill",
            url: "sms:741741&body=HOME"
        ),
        SupportResource(
            id: "line-samhsa",
            name: "SAMHSA National Helpline",
            detail: "Treatment referrals for mental health and substance use, 24/7 (US). 1-800-662-4357.",
            actionLabel: "Call 1-800-662-HELP",
            symbolName: "phone.arrow.up.right.fill",
            url: "tel:18006624357"
        ),
        SupportResource(
            id: "line-intl",
            name: "Outside the United States?",
            detail: "Find a helpline in your country at findahelpline.com.",
            actionLabel: "Find a helpline",
            symbolName: "globe",
            url: "https://findahelpline.com"
        ),
    ]

    static let organizations: [SupportResource] = [
        SupportResource(
            id: "org-dougy",
            name: "The Dougy Center",
            detail: "Grief support for children, teens, and families.",
            actionLabel: "dougy.org",
            symbolName: "figure.2.and.child.holdinghands",
            url: "https://www.dougy.org"
        ),
        SupportResource(
            id: "org-wyg",
            name: "What's Your Grief",
            detail: "Practical, plainspoken articles and courses on grieving.",
            actionLabel: "whatsyourgrief.com",
            symbolName: "text.book.closed",
            url: "https://whatsyourgrief.com"
        ),
        SupportResource(
            id: "org-mff",
            name: "Modern Loss",
            detail: "Candid conversation about grief and resilience.",
            actionLabel: "modernloss.com",
            symbolName: "bubble.left.and.bubble.right",
            url: "https://modernloss.com"
        ),
        SupportResource(
            id: "org-nacg",
            name: "National Alliance for Children's Grief",
            detail: "Resources and a directory of local children's grief support.",
            actionLabel: "nacg.org",
            symbolName: "heart.circle",
            url: "https://nacg.org"
        ),
    ]
}
