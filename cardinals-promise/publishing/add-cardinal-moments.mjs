import fs from 'fs';
const BOOK = '/home/user/test/cardinals-promise/book/cardinals-toolkit-book.html';
const ATTR = 'A composite drawn from years at the bedside. Names and details changed.';

// One Cardinal Moment per chapter that lacks one. Single composite anecdote that
// turns toward hope, matching the four already in the book.
const M = {
  3: ["A woman kept asking to go home, though she was standing in the house she had lived in for forty years. She did not mean this home. She meant a porch, a dog, her mother's cooking — a place decades behind her. Her son used to correct her — \"Mom, you ARE home\" — and every time, she grew more frightened, more sure she had been taken somewhere strange.",
      "One tired evening he stopped correcting her and asked instead, \"Tell me about home — what's it like there?\" She talked for twenty minutes, and as she talked she calmed. He had not lied to her. He had simply stopped arguing with a country he could no longer follow her into.",
      "You cannot win an argument against a disease. But you can almost always meet the feeling underneath the words."],
  6: ["A daughter believed she had only two choices: quit her job to care for her father, or move him into a facility he did not want. She was already writing her resignation in her head. No one had told her that after his hospital stay, Medicare would send a nurse and a physical therapist to his house for a while, at no cost to them.",
      "Home health bought her six weeks. It was not forever, and it was never meant to be. But it was the bridge that let her keep her paycheck and keep her father in his own kitchen a little longer.",
      "Sometimes the help you need most is the help no one thought to mention. Ask the hospital, plainly: \"Does he qualify for home health?\" — and make them answer before he leaves."],
  7: ["A family hired four hours of help a day and felt quietly ashamed of it, as though love should have been enough on its own. For weeks they apologized to each other for needing it.",
      "The aide, Denise, learned that their father took his coffee with two sugars and liked the ballgame on low. Within a month he was calling her by name and telling her the same three stories he only told people he trusted.",
      "Bringing in a stranger did not replace the family. It gave the family back to him — rested, and glad to see him again instead of exhausted by him."],
  8: ["A mother swore, for years, that she would never set foot in \"one of those places.\" Her daughter toured seven of them anyway, quietly, until she found one that smelled like nothing in particular and had a piano someone actually sat down and played.",
      "Her mother cried on move-in day, and her daughter drove home certain she had done a terrible thing. A month later her mother cried again — this time because she had made a friend at dinner, and had not expected to have a life again.",
      "The fear is almost always of the idea, not the place. Tour the real one. The right building is not an ending; sometimes it is the first company she has had in years."],
  9: ["A husband kept his wife at home two years longer than was safe, because moving her felt like breaking the vow he had made her. He propped chairs against doors and slept in his clothes.",
      "The night she got out anyway, in February, and he found her shaking on the neighbor's steps, something in him finally gave way. Memory care did the one thing his love could not do alone: it locked the doors, so he could go back to being her husband instead of her guard.",
      "Choosing more help is not choosing less love. Sometimes it is the most loving thing left to do."],
  10: ["A man went to rehab after his stroke \"for a week or two,\" and the whole family assumed he would be home by the end of the month. Progress came slower than the movies had promised, and everyone, including him, grew discouraged.",
       "What turned it around was not pushing harder. It was showing up — sitting in on therapy, learning the exercises, and cheering the small things out loud: a spoon lifted, a word that came back, a step without the rail.",
       "Rehab is not a machine you drop someone into and collect them from later. It works best when the family is in the room, counting the inches alongside them."],
  11: ["A daughter refused palliative care for months because she was sure it meant giving up, and her mother was still going to every chemo appointment. She thought accepting comfort was the same as accepting defeat.",
       "When she finally said yes, the palliative nurse simply asked what was making the days so hard — the nausea, the sleepless nights, the pain no one had fully treated — and then fixed what could be fixed. Her mother kept fighting her cancer and, for the first time in months, also felt like a person.",
       "Palliative care is not the opposite of hope. It is comfort walking alongside the fight, so the fight stays bearable."],
  12: ["A family fought the word hospice for weeks. Saying yes felt like signing something they could never take back, so they waited, and their father spent those days gripping the bed rails in pain.",
       "When they finally called, the nurse came that same night. The pain was under control by morning, and for the first time in a week their father slept. Their only regret, they told me later, was every day they had waited.",
       "Hospice is not the day you stop fighting. It is the day comfort becomes the goal — and most families say afterward that they wish they had called sooner."],
  13: ["A son was certain Medicare would cover his mother's long-term care. He found out it would not the way most families do — with a bill, and a jolt of panic, months in.",
       "What Medicare did cover, it covered well: the hospital, the rehab that followed, the home-health nurse, and later, hospice. Knowing where that line fell before the crisis would have spared him a month of dread.",
       "Medicare pays for a great deal — but not the everyday, long-term custodial care most families assume it does. Learn where the line is before you are standing on it."],
  14: ["A daughter was terrified that applying for Medicaid meant her mother would lose the house she had lived in her whole life. She almost did not apply at all, on the strength of a rumor.",
       "A good elder-law attorney walked her through rules far more forgiving than the stories she had heard — the home was often protected, the healthy spouse was not left with nothing. The paperwork was brutal. The catastrophe she had braced for never came.",
       "Medicaid is a maze, not a trap. Get a guide who knows the corridors, and start before the money is gone — not after."],
  15: ["A family paid for care out of pocket and watched their savings go out like a tide, faster every month. The not-knowing was its own kind of dread — every withdrawal felt like the last safe one.",
       "What steadied them was a single page: what the care cost, how many months the money would last at that rate, and exactly what came next when it ran low. The number was frightening. Not knowing the number had been worse.",
       "Private pay is not failure — it is a stage, and it has an exit. Map how long the money lasts and what follows, before the account, and not a plan, makes the decision for you."],
  16: ["A man discovered, only after his father moved into care, that the old man had quietly paid long-term-care insurance premiums for twenty years. The policy was in a drawer no one had thought to open.",
       "It covered most of what he needed — but only once the family learned to file the claim, log the hours of care, and outlast the elimination period before the benefit began. The coverage was real. The paperwork very nearly buried it.",
       "If a policy might exist, find it early and read it twice. The coverage is only ever as good as the claim someone actually files."],
  17: ["A widow was quietly cutting her heart pills in half to stretch them across the month, certain that nothing could be done about the cost and too proud to say so.",
       "When her daughter finally mentioned it to the pharmacist, he knew of a patient-assistance program that brought the price down to almost nothing. She had been rationing her own health in silence for the better part of a year.",
       "No one should have to choose between medicine and groceries alone and unheard. Ask the pharmacist, the doctor, the drug maker — the help exists, but only for the family that asks."],
  18: ["A daughter had no idea her father qualified for a VA benefit called Aid and Attendance — one that would have paid for years of the care he had gone without. He had never made much of his service; he thought it \"wasn't a big deal.\"",
       "Once the claim was finally filed, it changed everything about what he could afford. The only sorrow was the years it might have helped, if anyone had known to ask sooner.",
       "If there was ever a uniform in the family, ask about VA benefits. A war served long ago can still help pay for care today."],
  19: ["When her mother collapsed, a daughter spent the first frantic hour of the emergency not at the bedside but on her knees in a closet, tearing through drawers for an insurance card and some idea of the medications her mother took.",
       "Months later a neighbor showed her a single folder that held all of it — cards, lists, documents, phone numbers — in one place. The next emergency, and there is always a next one, she was ready in ninety seconds.",
       "The folder is boring right up until the day it is everything. Build it now, on a calm afternoon, so that a crisis never has to build it for you."],
  20: ["Three grown children stood in an ICU while a doctor asked, gently, who was authorized to speak for their unconscious father. No one had ever been named. Frightened and grieving, the siblings disagreed about nearly everything, and the hospital could not simply pick one of them.",
       "The days that followed were harder than they needed to be — not because they loved him less, but because one short form, signed on some ordinary afternoon years earlier, had never been signed.",
       "Naming a healthcare agent is not planning to die. It is deciding, calmly and in advance, who holds your voice on the day you cannot use it yourself."],
  21: ["A son sat beside his mother's bed while a doctor asked whether to keep her on the ventilator. She had never written down what she wanted, and had never quite said it out loud. He made the kindest guess he could.",
       "It was not the grief that stayed with him afterward. It was the guessing — the question of whether he had chosen what she would have chosen, a question that no longer had anyone left to answer it.",
       "A living will does not make the loss any smaller. It makes sure the choice was hers — not a guess someone who loved her has to carry for the rest of their life."],
  22: ["A daughter could not pay her father's mortgage. The accounts were all in his name, and after the stroke he could no longer sign anything. The bank, kind as the teller was, could not simply take her word for it.",
       "Setting it right meant guardianship court — months of waiting and thousands of dollars — to do what one signed form, completed while he was still well, would have handled in a single quiet afternoon.",
       "A financial power of attorney is cheap and forgettable today, and priceless the day someone has to keep the lights on for a parent who can no longer sign."],
  23: ["A woman had told everyone who would listen that she never wanted to be resuscitated. But when she collapsed at home, the paramedics who arrived had no choice but to try everything, because there was no signed order anywhere in the house.",
       "Her wishes had been perfectly clear to her family and completely invisible to the people who came through the door. What she wanted lived in conversations; what the crew could follow had to live on paper.",
       "Wishes live in conversations. Medical orders live on the refrigerator, signed by a doctor. Only one of the two is something a paramedic is allowed to honor."],
  24: ["A father kept waving off \"the talk\" — not yet, not yet — every time his children tried to raise what he wanted at the end. There was always a better day for it, and then a stroke took the \"yet\" away in a single morning.",
       "They spent his last months guessing at everything he had never gotten around to telling them, and wishing, over and over, that they had simply pushed through one uncomfortable dinner while there was still time.",
       "The conversation is never convenient and never comfortable. Have it anyway, and early — while the person can still tell you, in their own words, what matters to them."],
  25: ["An ER doctor asked a daughter what medications her mother took, and all she could offer was \"a white one, and a little blue one.\" The gaps cost hours and forced a dangerous guess at the worst possible moment.",
       "After that night she kept a current list — every medication, every dose, every doctor — in her wallet and on her phone. The next emergency visit took minutes instead of hours, because the answer was already in her hand.",
       "A current medication and doctor list is the single most useful page you can carry. Update it the very day anything changes, not the day you need it."],
  26: ["When their father fell at two in the morning, the siblings discovered that none of them knew who to call first, which hospital he should go to, or where he had written down that he never wanted to be put on machines. They improvised, badly, in the dark.",
       "In the calm that came after, they wrote a single page — numbers, hospital, medications, wishes — and taped it inside the kitchen cabinet where anyone could find it. The next scare, they were not guessing.",
       "A crisis is the worst possible time to design a crisis plan. Write the one page while it is quiet, and the frightened version of you at 2 a.m. will be grateful."],
  27: ["A family knew the end was near, but no one had ever said out loud where they wanted it to happen. So when the moment came, they panicked and called 911, and their mother spent her last two days in an ambulance and the emergency room she had begged never to return to.",
       "What haunted them afterward was not that she died. It was where she died — somewhere she had specifically asked not to be — for want of a plan that could have fit on an index card.",
       "The last days will come whether or not there is a plan. A plan is simply how you make them hers, instead of the system's."],
  28: ["A daughter was terrified by the change in her father's breathing — the long pauses, the cooling hands, the deep sleep — certain he was suffering and that she was somehow failing him by not doing more.",
       "The hospice nurse sat with her and explained, gently, what was normal and what it meant. Understanding what she was seeing turned her panic into presence. She stopped bracing against it and simply stayed beside him.",
       "Fear usually comes from not knowing what is normal. When you understand what the last days actually look like, you can stop bracing and start being there."],
  29: ["In the first hour after her mother died, a daughter stood in the quiet with no idea what she was supposed to do — call 911, call the funeral home, call no one? She felt she was already failing at something, and did not even know what.",
       "The hospice nurse had left a single sheet: who to call, in what order, and what could safely wait until morning. It let her stop managing the moment and start, at last, simply grieving her mother.",
       "In the first hours, almost everything can wait longer than you think. The few things that cannot should already be written down — so you are free to just be their child."],
};

function block(paras) {
  const ps = paras.map((t, i) =>
    i === paras.length - 1
      ? `  <p>${t}</p>`
      : `  <p>${t}</p>`).join('\n');
  return `<div class="cardmoment">
  <div class="cm-kicker">Cardinal Moment</div>
  <div class="cm-orn">— ❖ —</div>
${ps}
  <div class="cm-attr">${ATTR}</div>
</div>
`;
}

let src = fs.readFileSync(BOOK, 'utf8');
let added = 0;
for (const ch of Object.keys(M).map(Number).sort((a, b) => a - b)) {
  const anchor = `<span class="chapnum">Chapter ${ch}</span>`;
  const at = src.indexOf(anchor);
  if (at < 0) { console.log(`!! chapter ${ch} anchor not found`); continue; }
  const close = src.indexOf('</section>', at);
  if (close < 0) { console.log(`!! chapter ${ch} </section> not found`); continue; }
  // guard: don't double-insert if this chapter already has a moment before its close
  const chunk = src.slice(at, close);
  if (chunk.includes('class="cardmoment"')) { console.log(`-- chapter ${ch} already has a moment, skipping`); continue; }
  src = src.slice(0, close) + block(M[ch]) + src.slice(close);
  added++;
}
fs.writeFileSync(BOOK, src);
console.log(`inserted ${added} Cardinal Moments; total now ${(src.match(/class="cardmoment"/g) || []).length}`);
