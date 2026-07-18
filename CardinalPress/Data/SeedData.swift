import Foundation

/// Bundled content for The Cardinal's Toolkit — the companion app to
/// "The Caregiver's Cardinal Toolkit" by Rob Brizzi, CDP, with
/// Hope Brizzi, PharmD (Cardinal's Promise Series). Checklists,
/// articles, and phone numbers are drawn from the handbook itself.
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
            text: "Take the next right step.",
            attribution: "The Caregiver's Cardinal Toolkit"
        ),
        Reflection(
            id: "ref-03",
            text: "When everything feels urgent, do not try to solve the whole future. Write down: What changed? What is unsafe today? Who needs to know? What is the next call? That is enough for now.",
            attribution: "The Cardinal Rule, from the handbook"
        ),
        Reflection(
            id: "ref-04",
            text: "You don't have to solve all of this today. Find the most urgent issue, do one thing about it, and then take the next right step. That's it. That's the whole method.",
            attribution: "from the handbook"
        ),
        Reflection(
            id: "ref-05",
            text: "The deeper promise was never \"this exact place, no matter what.\" It is: I will make sure you are cared for. I will protect your dignity. I will not abandon you. Sometimes keeping the deeper promise means changing the plan.",
            attribution: "from the handbook"
        ),
        Reflection(
            id: "ref-06",
            text: "Sometimes \"I'm fine\" means \"I have no room left to fall apart.\" Check your own gauges today, not just theirs.",
            attribution: "from the handbook"
        ),
        Reflection(
            id: "ref-07",
            text: "You are not failing because you are tired. You are tired because you are doing something enormous.",
            attribution: nil
        ),
        Reflection(
            id: "ref-08",
            text: "Asking for help is not the moment you stopped being enough. It's the moment you started building a team.",
            attribution: nil
        ),
        Reflection(
            id: "ref-09",
            text: "Progress today might be one signed form, one safe shower, one shared laugh over an old story. That counts. That has always counted.",
            attribution: nil
        ),
        Reflection(
            id: "ref-10",
            text: "It is possible to miss someone who is still here — to grieve in small daily pieces. That feeling has a name, it's normal, and you're allowed to have it.",
            attribution: nil
        ),
        Reflection(
            id: "ref-11",
            text: "Grief is the price we pay for love.",
            attribution: "Colin Murray Parkes"
        ),
        Reflection(
            id: "ref-12",
            text: "What we have once enjoyed we can never lose. All that we love deeply becomes a part of us.",
            attribution: "Helen Keller"
        ),
        Reflection(
            id: "ref-13",
            text: "Be as kind to yourself today as you would be to a dear friend carrying exactly what you are carrying.",
            attribution: nil
        ),
        Reflection(
            id: "ref-14",
            text: "The cardinal does not sing because the winter is over. It sings because it has a song.",
            attribution: nil
        ),
    ]

    // MARK: - Affirmations

    static let affirmations: [String] = [
        "Take the next right step. That's the whole method.",
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
        "Changing the plan is not breaking the promise.",
        "Right now, in this breath, I am doing enough.",
    ]

    // MARK: - Journal prompts

    static let journalPrompts: [String] = [
        "What changed? What is unsafe today? Who needs to know?",
        "What went better today than I expected?",
        "Something my parent said or did that made me smile…",
        "What do I need to ask for help with?",
        "The next right step is…",
        "What am I worried about right now, honestly?",
        "One thing I did well as a caregiver this week…",
        "What would I tell a friend in my exact situation?",
    ]

    // MARK: - Articles (condensed from the handbook's chapters)

    static let articles: [Article] = [
        Article(
            id: "art-01",
            title: "Caregiver Burnout",
            subtitle: "Sometimes \"I'm fine\" means \"I have no room left\" — Chapter 4",
            symbolName: "flame",
            body: """
Burnout can look like sadness, anger, control, or silence — a daughter who snaps at everyone, a son who stops answering calls, a spouse who cries in the shower. Watch for constant exhaustion, irritability, resentment, trouble sleeping, ignoring your own health, pulling away from friends, feeling trapped, guilt for wanting relief, making more mistakes, and dreading the phone.

The caregiver may never use the word burnout. They may say "I'm fine," or "I don't have a choice." Listen closely. Sometimes "I'm fine" means "I have no room left to fall apart."

If you are at the edge — having thoughts of harming yourself, or afraid of what exhaustion might make you do — call or text 988, the Suicide & Crisis Lifeline, any hour. And tell your own doctor what caregiving is costing you: caregiver depression is a treatable medical condition, not a character flaw.

Respite care exists for exactly this moment. Ask the doctor, a social worker, or the Eldercare Locator (1-800-677-1116) about respite options today — and in North Carolina, ask about Project C.A.R.E. if dementia is part of the picture. Resentment is information. So is exhaustion. Treat them like the vital signs they are.
"""
        ),
        Article(
            id: "art-02",
            title: "The Promise That Traps Families",
            subtitle: "A promise made in one season may need wisdom in another — Chapter 4",
            symbolName: "hand.raised.fingers.spread",
            body: """
Many families carry a promise: "I promised Mom I would never put her in a nursing home." Those promises usually come from love — but they are often made before anyone understands what care may require: before dementia causes wandering, before falls happen at night, before bathing becomes unsafe, before the caregiver has not slept in months.

A promise made in one season may need wisdom in another.

The deeper promise is usually not "I will keep you in this exact place no matter what." It is "I will make sure you are cared for. I will protect your dignity. I will not abandon you."

Sometimes keeping the deeper promise means changing the plan. That is not betrayal. That is love growing up under pressure.
"""
        ),
        Article(
            id: "art-03",
            title: "Home Health vs. Private Duty Care",
            subtitle: "The names sound similar; the services are different — Chapters 6–7",
            symbolName: "stethoscope",
            body: """
This is one of the most common — and most expensive — confusions in caregiving. A family may need both kinds of help, but they are not the same thing, and asking for the wrong one wastes precious weeks.

Home health is medical: intermittent, clinician-ordered visits — nursing, therapy, social work, and limited aide time — typically after illness, wounds, weakness, or decline. Medicare may cover it when requirements are met: a clinician's evaluation, a skilled need, homebound status, and documentation. But it is not long blocks of supervision, and it is not someone to stay with Mom all day.

Private duty care is non-medical daily help, usually paid privately: bathing, meals, companionship, and supervision — including longer blocks and overnight coverage, for when the person cannot safely be alone.

The question is not which one sounds better. It is: what does my parent actually need at home? Ask the doctor, "Can we schedule a provider evaluation to determine whether home health is appropriate?" — not "Can Medicare send someone to stay with Mom?" And if the real need is supervision, start pricing private duty care honestly rather than waiting for a benefit that will not come.
"""
        ),
        Article(
            id: "art-04",
            title: "Inpatient or Under Observation?",
            subtitle: "The one hospital question that changes everything — Chapter 13",
            symbolName: "building.2",
            body: """
A person can spend the night in a hospital bed — several nights, even — and still be considered an outpatient under "observation status." It feels identical from the bedside. On paper, it is a trapdoor.

Why it matters: Medicare Part A may cover a limited skilled nursing facility stay after a hospitalization, but the qualifying stay generally means at least three consecutive days as an admitted inpatient. Observation days and the discharge day do not count. A parent who spent three nights "under observation" may leave the hospital with no covered rehab at all — a surprise worth thousands of dollars, discovered at the worst possible moment. (Many Medicare Advantage plans and some programs waive this — ask.)

So ask early, and more than once: "Is my parent admitted as an inpatient, or under observation status?" Write down the answer and who gave it. Status can change during a stay.

Before discharge, ask what the stay was classified as, how many covered days are available, what you could owe, what happens when coverage ends, and what appeal rights exist. The discharge planner and hospital social worker answer these questions every day — but usually only when asked.
"""
        ),
        Article(
            id: "art-05",
            title: "The Family Meeting",
            subtitle: "Names. Dates. Deadlines. No fog. — Chapter 5",
            symbolName: "person.3",
            body: """
When care needs change, most families communicate by rumor: one sibling talks to Mom, another hears it secondhand, and everyone assumes someone else handled it. A short, structured family meeting replaces the rumor mill.

Use a simple agenda, and do not let the conversation wander into every old family wound: What changed? — name the reason for the meeting in one sentence. What is unsafe today? — falls, wandering, missed medications, unsafe driving or cooking, caregiver exhaustion, no overnight coverage. What matters most to the person receiving care — safety, comfort, or staying home as long as it is safe? What support is needed? Who is responsible for what — names, dates, deadlines, no fog. And when will we meet again? One meeting is not the whole plan.

Choose one point person. That does not mean they do all the work — it means they coordinate communication so nothing falls between siblings. The point person keeps the medication list updated, communicates with doctors, shares updates, and knows where the documents are. They do not have to be the oldest child or the loudest voice — just the person most able to help the plan hold together.

Separate roles from opinions: everyone may have a view, but the meeting assigns jobs. And set the next check-in before you leave the room.
"""
        ),
    ]

    // MARK: - Checklists (from the handbook, with its color system)

    static let checklists: [Checklist] = [
        Checklist(
            id: "cl-first24",
            title: "In the First 24 Hours",
            subtitle: "Seven actions, not seven chapters",
            symbolName: "exclamationmark.triangle",
            tier: .actToday,
            items: [
                ChecklistItem("f24-safety", "Handle immediate safety — the person, the stove, the car keys, the stairs"),
                ChecklistItem("f24-cards", "Photograph the insurance and Medicare cards, front and back"),
                ChecklistItem("f24-meds", "Gather the medication list — or the bottles, in one bag"),
                ChecklistItem("f24-status", "If a hospital is involved, ask: inpatient, or under observation?",
                              detail: "Write down the answer and who gave it — it can decide whether Medicare covers rehab later."),
                ChecklistItem("f24-poa", "Find out who is legally authorized to make decisions — and where the POA papers are"),
                ChecklistItem("f24-notes", "Start a notes page — what changed, when it started, who told you what"),
                ChecklistItem("f24-next", "Do one thing about the most urgent issue — then take the next right step"),
            ]
        ),
        Checklist(
            id: "cl-crisis",
            title: "Emergency Page & Crisis Plan",
            subtitle: "Print it. Post it. A clear call gets better help.",
            symbolName: "phone.badge.checkmark",
            tier: .actToday,
            items: [
                ChecklistItem("er-id", "Full name, date of birth, and address"),
                ChecklistItem("er-dx", "Main diagnoses and allergies"),
                ChecklistItem("er-medloc", "Where the medication list is"),
                ChecklistItem("er-docs", "Doctor names, numbers, and pharmacy"),
                ChecklistItem("er-ins", "Insurance information"),
                ChecklistItem("er-agent", "The healthcare agent, named"),
                ChecklistItem("er-contacts", "Family, facility, home health, and hospice contacts"),
                ChecklistItem("er-hospital", "Preferred hospital"),
                ChecklistItem("er-most", "DNR / MOST / POLST status, if applicable",
                              detail: "Emergency crews need the original, quickly findable."),
                ChecklistItem("er-posted", "Printed and posted where the caregiver can grab it"),
            ]
        ),
        Checklist(
            id: "cl-safety",
            title: "Home Safety After a Fall",
            subtitle: "Small changes prevent big injuries",
            symbolName: "house",
            tier: .watchClosely,
            items: [
                ChecklistItem("hs-rugs", "Loose rugs gone — or taped down"),
                ChecklistItem("hs-clutter", "Clutter and cords out of the walking paths"),
                ChecklistItem("hs-light", "Good lighting, plus a nightlight from bed to bathroom"),
                ChecklistItem("hs-rails", "Stairs have railings"),
                ChecklistItem("hs-grab", "Grab bars in the shower and by the toilet"),
                ChecklistItem("hs-bath", "Shower chair, handheld shower head, non-slip mat"),
                ChecklistItem("hs-toilet", "Raised toilet seat — or bedside commode — if rising is hard"),
                ChecklistItem("hs-chair", "A sturdy chair that is easy to rise from"),
                ChecklistItem("hs-phone", "Phone or call device within reach"),
            ]
        ),
        Checklist(
            id: "cl-folder",
            title: "The Documents Folder: First Five",
            subtitle: "A useful folder beats a perfect folder that never gets built",
            symbolName: "folder",
            tier: .planAhead,
            items: [
                ChecklistItem("folder-meds", "The medication list"),
                ChecklistItem("folder-docs", "The doctor list"),
                ChecklistItem("folder-ins", "Copies of the insurance and Medicare cards"),
                ChecklistItem("folder-health", "The healthcare decision documents",
                              detail: "Healthcare power of attorney and living will / advance directive."),
                ChecklistItem("folder-contacts", "The emergency contacts page"),
                ChecklistItem("folder-where", "The right people know where the folder is"),
                ChecklistItem("folder-alive", "A reminder set to keep it current",
                              detail: "A folder no one can find — or that is out of date — is not doing its job."),
            ]
        ),
        Checklist(
            id: "cl-medlist",
            title: "The Medication List",
            subtitle: "Bring the list, not just the bottles",
            symbolName: "pills",
            tier: .planAhead,
            items: [
                ChecklistItem("med-each", "Every medication: name, dose, when, why, and who prescribed it"),
                ChecklistItem("med-allergy", "Allergies and medication reactions written down"),
                ChecklistItem("med-otc", "Vitamins, supplements, and over-the-counter drugs included"),
                ChecklistItem("med-forms", "Inhalers, eye drops, creams, patches, insulin, oxygen included"),
                ChecklistItem("med-stopped", "Recently stopped medications noted",
                              detail: "A discontinued medication sitting in the cabinet has a way of coming back."),
                ChecklistItem("med-copy", "A copy travels with the caregiver — wallet, phone, or bag"),
                ChecklistItem("med-review", "A pharmacist medication review requested"),
            ]
        ),
    ]

    // MARK: - Numbers That Matter (from the handbook's last page)

    static let urgentHelp: [SupportResource] = [
        SupportResource(
            id: "line-988",
            name: "988 Suicide & Crisis Lifeline",
            detail: "Mental health crisis — yours or theirs, any hour. Call or text 988.",
            actionLabel: "Call or text 988",
            symbolName: "heart.fill",
            url: "tel:988"
        ),
        SupportResource(
            id: "line-eldercare",
            name: "Eldercare Locator",
            detail: "Finding local aging services anywhere in the US. 1-800-677-1116.",
            actionLabel: "Call 1-800-677-1116",
            symbolName: "phone.fill",
            url: "tel:18006771116"
        ),
        SupportResource(
            id: "line-alz",
            name: "Alzheimer's Association Helpline",
            detail: "Dementia questions or a dementia crisis, 24/7. 1-800-272-3900.",
            actionLabel: "Call 1-800-272-3900",
            symbolName: "brain.head.profile",
            url: "tel:18002723900"
        ),
        SupportResource(
            id: "line-nc211",
            name: "NC 211",
            detail: "United Way of North Carolina's free 24/7 line for local help — care, food, housing, transportation.",
            actionLabel: "Dial 2-1-1",
            symbolName: "phone.arrow.up.right.fill",
            url: "tel:211"
        ),
    ]

    static let ncResources: [SupportResource] = [
        SupportResource(
            id: "nc-shiip",
            name: "SHIIP — Medicare Counseling",
            detail: "Free, unbiased Medicare counseling from the NC Department of Insurance. 1-855-408-1212.",
            actionLabel: "Call 1-855-408-1212",
            symbolName: "checkmark.shield",
            url: "tel:18554081212"
        ),
        SupportResource(
            id: "nc-epass",
            name: "ePASS",
            detail: "Apply online for NC Medicaid and other assistance programs.",
            actionLabel: "epass.nc.gov",
            symbolName: "laptopcomputer",
            url: "https://epass.nc.gov"
        ),
        SupportResource(
            id: "nc-dss",
            name: "County DSS",
            detail: "Your county's Department of Social Services — the front door for Medicaid and Adult Protective Services.",
            actionLabel: "Find your county office",
            symbolName: "building.columns",
            url: "https://www.ncdhhs.gov/divisions/social-services/local-dss-directory"
        ),
        SupportResource(
            id: "nc-daas",
            name: "NC Division of Aging and Adult Services",
            detail: "State aging services, including your county's Area Agency on Aging.",
            actionLabel: "ncdhhs.gov/aging",
            symbolName: "person.2.fill",
            url: "https://www.ncdhhs.gov/divisions/aging-and-adult-services"
        ),
        SupportResource(
            id: "nc-care",
            name: "Project C.A.R.E.",
            detail: "NC's respite and support program for families caring for someone with dementia.",
            actionLabel: "Learn more",
            symbolName: "hands.and.sparkles",
            url: "https://www.ncdhhs.gov/divisions/aging-and-adult-services/project-care"
        ),
    ]

    static let nationalResources: [SupportResource] = [
        SupportResource(
            id: "org-medicare",
            name: "Medicare",
            detail: "Medicare questions. 1-800-MEDICARE (1-800-633-4227).",
            actionLabel: "Call 1-800-633-4227",
            symbolName: "cross.circle",
            url: "tel:18006334227"
        ),
        SupportResource(
            id: "org-ship",
            name: "SHIP — State Health Insurance Assistance Program",
            detail: "Free, unbiased Medicare counseling in every state. 1-877-839-2675 · shiphelp.org.",
            actionLabel: "shiphelp.org",
            symbolName: "checkmark.shield.fill",
            url: "https://www.shiphelp.org"
        ),
        SupportResource(
            id: "org-va",
            name: "VA Caregiver Support Line",
            detail: "Caring for a veteran: programs, stipends, and support. 1-855-260-3274.",
            actionLabel: "Call 1-855-260-3274",
            symbolName: "star.circle",
            url: "tel:18552603274"
        ),
        SupportResource(
            id: "org-aps",
            name: "Adult Protective Services",
            detail: "Suspected abuse, neglect, or financial exploitation — statewide hotline in most states.",
            actionLabel: "napsa-now.org",
            symbolName: "shield.lefthalf.filled",
            url: "https://www.napsa-now.org"
        ),
    ]
}
