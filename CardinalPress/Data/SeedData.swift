import Foundation

/// Bundled content for The Cardinal's Toolkit — the companion app to
/// "The Cardinal's Toolkit: The North Carolina Family Caregiver Handbook."
/// Everything ships with the app — no account, no network.
enum SeedData {

    // MARK: - Daily reflections

    static let reflections: [Reflection] = [
        Reflection(
            id: "ref-01",
            text: "The cardinal — North Carolina's own state bird — doesn't fly south when winter comes. It stays, bright against the gray. That's what you're doing, too. Caregiving, at its heart, is staying.",
            attribution: nil
        ),
        Reflection(
            id: "ref-02",
            text: "Caring for yourself is not time stolen from your parent. It's how you make sure the person caring for them shows up whole.",
            attribution: nil
        ),
        Reflection(
            id: "ref-03",
            text: "Some days caregiving looks like love. Some days it looks like paperwork, patience, and a long drive. It's all love.",
            attribution: nil
        ),
        Reflection(
            id: "ref-04",
            text: "You are not failing because you are tired. You are tired because you are doing something enormous.",
            attribution: nil
        ),
        Reflection(
            id: "ref-05",
            text: "Asking for help is not the moment you stopped being enough. It's the moment you started building a team.",
            attribution: nil
        ),
        Reflection(
            id: "ref-06",
            text: "Progress today might be one signed form, one safe shower, one shared laugh over an old story. That counts. That has always counted.",
            attribution: nil
        ),
        Reflection(
            id: "ref-07",
            text: "It is possible to miss someone who is still here — to grieve in small daily pieces. That feeling has a name, it's normal, and you're allowed to have it.",
            attribution: nil
        ),
        Reflection(
            id: "ref-08",
            text: "Grief is the price we pay for love.",
            attribution: "Colin Murray Parkes"
        ),
        Reflection(
            id: "ref-09",
            text: "Your parent doesn't need a perfect caregiver. They need you — rested enough, supported enough, and present.",
            attribution: nil
        ),
        Reflection(
            id: "ref-10",
            text: "What we have once enjoyed we can never lose. All that we love deeply becomes a part of us.",
            attribution: "Helen Keller"
        ),
        Reflection(
            id: "ref-11",
            text: "One decision at a time. You don't have to solve the whole future today — just the next right thing.",
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
            text: "You have handled every hard day so far — a perfect record. Today asks only for today.",
            attribution: nil
        ),
    ]

    // MARK: - Affirmations

    static let affirmations: [String] = [
        "I am doing a hard thing, and I am doing it with love.",
        "Rest is part of caregiving, not a break from it.",
        "I can't do everything. I can do today's things.",
        "Asking for help makes me a better caregiver, not a lesser one.",
        "It's okay to grieve who they were while loving who they are.",
        "Good-enough care, given with love, is good care.",
        "My feelings — even the ugly ones — are allowed.",
        "I can love my parent and still need time away.",
        "The paperwork can wait an hour. My lunch cannot.",
        "I am allowed to laugh today.",
        "Small wins count: a good meal, a calm morning, a returned phone call.",
        "I didn't cause this, and I can't cure it. I can care.",
        "Boundaries protect the caregiver — and the care.",
        "One decision at a time is a real pace.",
        "Someday I'll be glad I was here. Today I'm allowed to just be tired.",
        "Right now, in this breath, I am doing enough.",
    ]

    // MARK: - Journal prompts

    static let journalPrompts: [String] = [
        "What went better today than I expected?",
        "The hardest moment this week was… and I got through it by…",
        "Something my parent said or did that made me smile…",
        "What do I need to ask for help with?",
        "A memory of them from before…",
        "What am I worried about right now, honestly?",
        "One thing I did well as a caregiver this week…",
        "What would I tell a friend in my exact situation?",
    ]

    // MARK: - Articles

    static let articles: [Article] = [
        Article(
            id: "art-01",
            title: "You Can't Pour from an Empty Cup",
            subtitle: "Caregiver burnout, and why respite isn't optional",
            symbolName: "cup.and.saucer",
            body: """
Family caregivers routinely report exhaustion, poor sleep, back pain, anxiety, and a creeping sense of being erased from their own lives. None of that means you're doing it wrong. It means you're carrying a second full-time life on top of your own — and every load has a limit.

Burnout rarely announces itself. It shows up as snapping at the person you love, dreading the phone, skipping your own doctor's appointments, going numb. If you recognize yourself in that list, treat it the way you'd treat your parent's symptoms: as real, and as something to act on.

The single most effective treatment is respite — regular, scheduled time when someone else is responsible. Not a someday reward; a standing appointment. A sibling's Saturday, a paid aide's afternoon, an adult day program two days a week, a volunteer from church. In North Carolina, your local Area Agency on Aging can help you find respite programs, and Project C.A.R.E. offers respite support specifically for dementia caregivers. Start smaller than you think you need — two protected hours a week — and grow it.

And keep one piece of your old life on the calendar no matter what: the walking group, the choir, the fishing trip. It isn't selfish. It's the part of you your parent would least want this season of life to take.
"""
        ),
        Article(
            id: "art-02",
            title: "The Paperwork That Matters Most",
            subtitle: "Five documents to have in place before a crisis",
            symbolName: "doc.text",
            body: """
The worst time to discover a missing document is in a hospital hallway. A short stack of paperwork, done while your parent can fully participate, prevents most of the legal scrambles families face later.

The core five: a durable power of attorney (so someone can handle finances if your parent can't); a health care power of attorney (so someone can make medical decisions); an advance directive or living will (your parent's own wishes about end-of-life care); a HIPAA authorization (so doctors can talk to you); and an up-to-date will. In North Carolina, advance directives must be signed before two qualified witnesses and notarized, and you can file them with the N.C. Secretary of State's advance directive registry so they can be found when needed.

Just as important as signing them is finding them. Make a "where everything is" sheet: documents, insurance cards, Medicare number, deed, accounts, and the passwords that unlock modern life. Keep copies where the people who'll need them can reach them — not only in a safe-deposit box that's sealed exactly when it's needed most.

A note of care: this app can help you get organized, but it isn't legal advice, and every family's situation differs. An elder law attorney — many offer flat-fee document packages — is worth one afternoon and is far cheaper than untangling things after a crisis.
"""
        ),
        Article(
            id: "art-03",
            title: "Making the House Safe",
            subtitle: "An afternoon of small fixes that prevents the big fall",
            symbolName: "house",
            body: """
Falls are the leading cause of injury for older adults — and most happen at home, on an ordinary day, over something that could have been fixed in five minutes. A single walkthrough with fresh eyes is one of the highest-value afternoons you'll ever spend.

Walk the paths your parent actually uses: bed to bathroom, chair to kitchen, door to mailbox. Clear them completely. Loose rugs go — sentimental or not — or get double-sided tape. Cords move to the wall. Add night lights along the bedroom-to-bathroom route, because that 2 a.m. trip is the most dangerous walk in the house.

The bathroom deserves the most attention: grab bars in the shower and beside the toilet (towel bars are not grab bars), a non-slip mat, a shower chair, and a raised toilet seat if standing is hard. In the kitchen, move daily items between hip and shoulder height so there's no reason to climb. Check that smoke and carbon monoxide detectors work, set the water heater no higher than 120°F, and post emergency numbers in large print by the phone.

Then look at the stairs: railings on both sides, secure, with good light and marked edges. If the doctor has suggested a cane or walker, make sure it's actually within reach at the bedside — the fanciest walker in the world prevents nothing from across the room. Medicare and the VA sometimes cover home-safety equipment; your Area Agency on Aging can point you to programs that help pay for modifications.
"""
        ),
        Article(
            id: "art-04",
            title: "Talking With Your Parent About Help",
            subtitle: "How to have the conversation nobody wants to start",
            symbolName: "bubble.left.and.bubble.right",
            body: """
Most caregiving conflict isn't really about the car keys, the aide, or the move. It's about dignity. Your parent has spent a lifetime being the one who helps, decides, and provides — and every conversation about "help" can sound to them like a demotion from adult to dependent.

So start earlier than feels necessary, and start with questions, not conclusions. "Dad, if you ever needed a hand with the house, how would you want that to work?" lands very differently than "Dad, we've decided you need someone." Whenever possible, offer choices between acceptable options rather than yes/no ultimatums — people rarely fight the option they picked themselves.

Pick your moments and your battles. One topic at a time, in private, unhurried, never in front of an audience. Lead with what you see and how you feel, not verdicts: "I noticed two falls this month and I'm scared" invites a conversation; "You can't stay here alone" starts a standoff. Expect the first conversation to fail. Its job is to plant the seed, not sign the paperwork.

If you hit a wall, borrow authority. Many parents will hear from a doctor, a pastor, or an old friend what they cannot hear from their child. And through it all, protect the relationship: you can win the argument about the shower chair and lose something more valuable. Aim to be their ally against the problem — not the newest problem.
"""
        ),
        Article(
            id: "art-05",
            title: "When It's Time for More Help",
            subtitle: "Reading the signs, knowing the options, surviving the guilt",
            symbolName: "figure.2.arms.open",
            body: """
There is usually no single dramatic moment when home care stops being enough — just an accumulation: a second fall, medications missed, food spoiling in the fridge, wandering, your own health starting to crack. If you keep asking yourself whether it's time, that question is itself information.

Know the ladder of options, because "more help" rarely means a nursing home. It usually starts with a few hours of in-home help a week, then adult day programs (which also give you respite), then more hours, then assisted living, memory care, or skilled nursing — each step matched to actual needs. In North Carolina, your county's Area Agency on Aging and NC 211 can map what exists near you and what it costs; the Eldercare Locator (1-800-677-1116) does the same nationwide.

Watch your own gauges as closely as your parent's. Caregivers who are drowning routinely rate their parent as "fine" while their own blood pressure, sleep, and marriage say otherwise. If a professional — a doctor, a discharge planner, a care manager — tells you the current plan isn't sustainable, believe them.

And about the guilt: choosing more help is not breaking a promise. The promise was never "I will do everything with my own two hands until I collapse." It was "I will make sure you are safe and loved." Sometimes the most faithful way to keep that promise is to bring in reinforcements — and to arrive as the daughter or son again, instead of only the exhausted nurse.
"""
        ),
    ]

    // MARK: - Planning checklists

    static let checklists: [Checklist] = [
        Checklist(
            id: "cl-docs",
            title: "The Essential Documents",
            subtitle: "Five papers to have in place before a crisis",
            symbolName: "doc.text",
            items: [
                ChecklistItem("docs-dpoa", "Durable power of attorney signed",
                              detail: "Lets a trusted person handle finances if your parent can't."),
                ChecklistItem("docs-hcpoa", "Health care power of attorney signed",
                              detail: "Names who makes medical decisions when they can't."),
                ChecklistItem("docs-ad", "Advance directive / living will completed",
                              detail: "In NC: two qualified witnesses and a notary. Consider the NC Secretary of State registry."),
                ChecklistItem("docs-hipaa", "HIPAA authorization on file with doctors",
                              detail: "So providers can legally talk to you."),
                ChecklistItem("docs-will", "Will located and current"),
                ChecklistItem("docs-cards", "Copies of insurance and Medicare cards made"),
                ChecklistItem("docs-map", "\"Where everything is\" sheet written",
                              detail: "Documents, accounts, deed, keys, passwords — and who has copies."),
            ]
        ),
        Checklist(
            id: "cl-safety",
            title: "Home Safety Walkthrough",
            subtitle: "An afternoon of fixes that prevents the big fall",
            symbolName: "house",
            items: [
                ChecklistItem("safe-paths", "Walking paths cleared — rugs, cords, clutter"),
                ChecklistItem("safe-grab", "Grab bars in shower and beside toilet",
                              detail: "Towel bars are not grab bars."),
                ChecklistItem("safe-night", "Night lights from bedroom to bathroom"),
                ChecklistItem("safe-stairs", "Stair railings secure on both sides, edges lit"),
                ChecklistItem("safe-bath", "Non-slip mat and shower chair in place"),
                ChecklistItem("safe-alarms", "Smoke and CO detectors tested"),
                ChecklistItem("safe-water", "Water heater set to 120°F or lower"),
                ChecklistItem("safe-numbers", "Emergency numbers posted large-print by the phone"),
                ChecklistItem("safe-aid", "Cane or walker within reach at the bedside"),
            ]
        ),
        Checklist(
            id: "cl-medical",
            title: "Medical Information Kit",
            subtitle: "One folder that travels to every appointment",
            symbolName: "cross.case",
            items: [
                ChecklistItem("med-list", "Current medication list with doses and times"),
                ChecklistItem("med-allergy", "Allergy list written down"),
                ChecklistItem("med-history", "One-page health history and diagnoses summary"),
                ChecklistItem("med-docs", "Doctors' names and numbers listed"),
                ChecklistItem("med-pharmacy", "Pharmacy name and number listed"),
                ChecklistItem("med-hospital", "Preferred hospital noted"),
                ChecklistItem("med-most", "DNR or MOST form location known (if one exists)",
                              detail: "Emergency crews need the original, quickly findable."),
                ChecklistItem("med-copies", "A copy of the kit in your car or bag"),
            ]
        ),
        Checklist(
            id: "cl-discharge",
            title: "Hospital Discharge Day",
            subtitle: "The most dangerous handoff in health care, tamed",
            symbolName: "cross.circle",
            items: [
                ChecklistItem("dis-instructions", "Written discharge instructions in hand — and understood"),
                ChecklistItem("dis-meds", "Every medication change reconciled against the old list",
                              detail: "Ask directly: what's new, what stopped, what changed dose?"),
                ChecklistItem("dis-followup", "Follow-up appointments booked before leaving"),
                ChecklistItem("dis-equipment", "Home equipment ordered and delivery confirmed"),
                ChecklistItem("dis-warning", "Warning signs to watch for written down"),
                ChecklistItem("dis-call", "Who to call after hours — name and number"),
                ChecklistItem("dis-ride", "Transportation home arranged"),
                ChecklistItem("dis-help", "First week of extra help scheduled"),
            ]
        ),
    ]

    // MARK: - Support lines & organizations

    static let urgentHelp: [SupportResource] = [
        SupportResource(
            id: "line-eldercare",
            name: "Eldercare Locator",
            detail: "Connects you to local aging services anywhere in the US. Weekdays, 1-800-677-1116.",
            actionLabel: "Call 1-800-677-1116",
            symbolName: "phone.fill",
            url: "tel:18006771116"
        ),
        SupportResource(
            id: "line-nc211",
            name: "NC 211",
            detail: "United Way of North Carolina's free 24/7 line for local help — care, food, housing, transportation.",
            actionLabel: "Dial 2-1-1",
            symbolName: "phone.arrow.up.right.fill",
            url: "tel:211"
        ),
        SupportResource(
            id: "line-alz",
            name: "Alzheimer's Association Helpline",
            detail: "24/7 support for dementia caregivers — crisis moments included. 1-800-272-3900.",
            actionLabel: "Call 1-800-272-3900",
            symbolName: "brain.head.profile",
            url: "tel:18002723900"
        ),
        SupportResource(
            id: "line-988",
            name: "988 Suicide & Crisis Lifeline",
            detail: "Caregivers hit walls too. Free, confidential support 24/7 — call or text 988.",
            actionLabel: "Call or text 988",
            symbolName: "heart.fill",
            url: "tel:988"
        ),
    ]

    static let ncResources: [SupportResource] = [
        SupportResource(
            id: "nc-daas",
            name: "NC Division of Aging and Adult Services",
            detail: "The state's front door to aging services, including your county's Area Agency on Aging.",
            actionLabel: "ncdhhs.gov/aging",
            symbolName: "building.columns",
            url: "https://www.ncdhhs.gov/divisions/aging-and-adult-services"
        ),
        SupportResource(
            id: "nc-shiip",
            name: "SHIIP — Medicare Counseling",
            detail: "Free, unbiased Medicare help from the NC Department of Insurance. 1-855-408-1212.",
            actionLabel: "Call 1-855-408-1212",
            symbolName: "checkmark.shield",
            url: "tel:18554081212"
        ),
        SupportResource(
            id: "nc-care",
            name: "Project C.A.R.E.",
            detail: "NC's respite and support program for families caring for someone with dementia.",
            actionLabel: "Learn more",
            symbolName: "person.2.fill",
            url: "https://www.ncdhhs.gov/divisions/aging-and-adult-services/project-care"
        ),
        SupportResource(
            id: "nc-aps",
            name: "Adult Protective Services",
            detail: "If you suspect an older adult is being abused, neglected, or exploited, report it to your county DSS.",
            actionLabel: "How to report",
            symbolName: "shield.lefthalf.filled",
            url: "https://www.ncdhhs.gov/divisions/social-services/adult-protective-services"
        ),
    ]

    static let nationalResources: [SupportResource] = [
        SupportResource(
            id: "org-fca",
            name: "Family Caregiver Alliance",
            detail: "Practical guides, state-by-state help, and caregiver education.",
            actionLabel: "caregiver.org",
            symbolName: "text.book.closed",
            url: "https://www.caregiver.org"
        ),
        SupportResource(
            id: "org-aarp",
            name: "AARP Family Caregiving",
            detail: "Checklists, legal basics, and a caregiver support line.",
            actionLabel: "aarp.org/caregiving",
            symbolName: "person.crop.circle.badge.checkmark",
            url: "https://www.aarp.org/caregiving/"
        ),
        SupportResource(
            id: "org-va",
            name: "VA Caregiver Support",
            detail: "If your parent is a veteran: programs, stipends, and a support line. 1-855-260-3274.",
            actionLabel: "Call 1-855-260-3274",
            symbolName: "star.circle",
            url: "tel:18552603274"
        ),
        SupportResource(
            id: "org-medicare",
            name: "Medicare.gov",
            detail: "Coverage lookups, plan comparison, and \"what does Medicare cover?\" answers.",
            actionLabel: "medicare.gov",
            symbolName: "cross.circle",
            url: "https://www.medicare.gov"
        ),
    ]
}
