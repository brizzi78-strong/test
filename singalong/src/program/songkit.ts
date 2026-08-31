/**
 * The Memory Care Music Program's song kit: a starter library of
 * public-domain sing-along standards, plus the four-week rotating session
 * plans that use them. This is the content half of the program described in
 * ../../PROGRAM.md — the app half (profiles, playlists, sessions, logging)
 * already exists.
 *
 * Rights basis: every song here was published in the US before 1931 (see
 * each entry's `published` year), so the composition and these lyric
 * excerpts are in the US public domain as of 2026 — the same
 * no-licensed-content rule the rest of the app holds to. PD covers the
 * songs, not every printed arrangement: a modern hymnal harmonization or
 * choral setting carries its own copyright, so facilities should sing from
 * these lyrics or a period score, not photocopied modern settings. Audio
 * stays the facility's own (`audioUrl` is left unset by the seeder).
 *
 * Provenance: this kit was reviewed for minstrel-show material. Three songs
 * from an earlier draft (Camptown Races, Oh! Susanna, and the closing number
 * Good Night Ladies — all written for or derived from the blackface minstrel
 * stage) were replaced with clean-provenance standards. "I've Been Working
 * on the Railroad" is retained: it entered print in 1894 as the
 * minstrel-dialect "Levee Song," and the text here is the 20th-century
 * schoolbook version — do not extend it with verses found online. The two
 * spirituals are credited to their tradition and, where known, their
 * composers. If you add songs, avoid the common trap: much "old American
 * folk" (Dixie, Turkey in the Straw, Buffalo Gals, Polly Wolly Doodle,
 * Jimmy Crack Corn) is also minstrel material.
 *
 * Why songs this old for residents whose youth was the 1940s–60s? The group
 * sing-along canon is communal music — songs learned at school, church, and
 * family gatherings — and these standards are still in it. But be honest
 * about the constraint: the pre-1931 rule is what lets this repo ship lyric
 * text, and it costs the kit the WWII-era songs (You Are My Sunshine,
 * Sentimental Journey) that land hardest with today's cohort. Song titles
 * are not copyrightable, so PROGRAM.md carries a titles-only list of
 * recommended local additions a facility can enter from its own songbook.
 * Era-of-youth personal favorites belong in the program's other arm
 * (personalized listening from the facility's own audio sources).
 */

export interface KitSong {
  title: string;
  /** Composer/lyricist credit, or the tradition the song belongs to. */
  artist: string;
  /** Decade of first US publication (or of the standard sung text). */
  era: string;
  /** Year of first publication — the basis of the public-domain claim. */
  published: number;
  tags: string[];
  lyrics: string;
}

/** Sung as everyone settles in — the same opener every session, by design. */
export const GATHERING_SONG = "Hail, Hail, the Gang's All Here";

/** The closing ritual — the same goodbye every session, by design. */
export const CLOSING_SONG = 'Till We Meet Again';

export const SONG_KIT: KitSong[] = [
  {
    title: "Hail, Hail, the Gang's All Here",
    artist: 'Arthur Sullivan (music, 1879) / Theodore Morse & D. A. Esrom (1917)',
    era: '1910s',
    published: 1917,
    tags: ['gathering', 'upbeat', 'ritual'],
    lyrics: [
      "Hail! Hail! The gang's all here,",
      'What the heck do we care,',
      'What the heck do we care,',
      "Hail! Hail! The gang's all here,",
      'What the heck do we care now!',
    ].join('\n'),
  },
  {
    // The closing ritual: a genuine farewell song that promises return, and
    // it addresses the whole circle — replacing "Good Night, Ladies," which
    // was a Christy's Minstrels exit number and sang goodbye to half the room.
    title: 'Till We Meet Again',
    artist: 'Richard A. Whiting & Raymond B. Egan',
    era: '1910s',
    published: 1918,
    tags: ['closing', 'gentle', 'ritual', 'waltz'],
    lyrics: [
      'Smile the while you kiss me sad adieu,',
      'When the clouds roll by I’ll come to you.',
      'Then the skies will seem more blue,',
      'Down in lovers’ lane, my dearie.',
      'Wedding bells will ring so merrily,',
      'Every tear will be a memory.',
      'So wait and pray each night for me,',
      'Till we meet again.',
    ].join('\n'),
  },
  {
    title: 'Home on the Range',
    artist: 'Brewster M. Higley (words) & Daniel E. Kelley (music)',
    era: '1870s',
    // Higley's poem published 25 Dec 1873 (Smith County Pioneer); a 1934
    // federal case traced it there and ruled all versions public domain.
    published: 1873,
    tags: ['home', 'gentle', 'western'],
    lyrics: [
      'Oh, give me a home where the buffalo roam,',
      'Where the deer and the antelope play,',
      'Where seldom is heard a discouraging word,',
      'And the skies are not cloudy all day.',
      '',
      'Home, home on the range,',
      'Where the deer and the antelope play,',
      'Where seldom is heard a discouraging word,',
      'And the skies are not cloudy all day.',
    ].join('\n'),
  },
  {
    // Replaces "Oh! Susanna" (Foster minstrel song; the original second
    // verse contains racist content). Same slot, better fit for the theme.
    title: 'Home! Sweet Home!',
    artist: 'John Howard Payne & Henry Bishop',
    era: '1820s',
    published: 1823,
    tags: ['home', 'gentle'],
    lyrics: [
      "'Mid pleasures and palaces though we may roam,",
      'Be it ever so humble, there’s no place like home.',
      'A charm from the skies seems to hallow us there,',
      'Which, seek through the world, is ne’er met with elsewhere.',
      '',
      'Home, home, sweet, sweet home,',
      'There’s no place like home,',
      'There’s no place like home.',
    ].join('\n'),
  },
  {
    title: 'My Wild Irish Rose',
    artist: 'Chauncey Olcott',
    era: '1890s',
    published: 1899,
    tags: ['home', 'love', 'waltz'],
    lyrics: [
      'My wild Irish rose, the sweetest flower that grows.',
      'You may search everywhere, but none can compare',
      'With my wild Irish rose.',
      'My wild Irish rose, the dearest flower that grows.',
      'And some day for my sake, she may let me take',
      'The bloom from my wild Irish rose.',
    ].join('\n'),
  },
  {
    title: 'Down by the Old Mill Stream',
    artist: 'Tell Taylor',
    era: '1910s',
    published: 1910,
    tags: ['home', 'love', 'gentle'],
    lyrics: [
      'Down by the old mill stream, where I first met you,',
      'With your eyes of blue, dressed in gingham too.',
      'It was there I knew that you loved me true.',
      'You were sixteen, my village queen,',
      'By the old mill stream.',
    ].join('\n'),
  },
  {
    title: 'Let Me Call You Sweetheart',
    artist: 'Leo Friedman & Beth Slater Whitson',
    era: '1910s',
    published: 1910,
    tags: ['love', 'waltz', 'gentle'],
    lyrics: [
      "Let me call you sweetheart, I'm in love with you.",
      'Let me hear you whisper that you love me too.',
      'Keep the love-light glowing in your eyes so true.',
      "Let me call you sweetheart, I'm in love with you.",
    ].join('\n'),
  },
  {
    title: 'Take Me Out to the Ball Game',
    artist: 'Jack Norworth & Albert Von Tilzer',
    era: '1900s',
    published: 1908,
    tags: ['fun', 'upbeat', 'baseball'],
    lyrics: [
      'Take me out to the ball game,',
      'Take me out with the crowd.',
      "Buy me some peanuts and Cracker Jack,",
      "I don't care if I never get back.",
      "Let me root, root, root for the home team,",
      "If they don't win it's a shame.",
      "For it's one, two, three strikes, you're out",
      'At the old ball game.',
    ].join('\n'),
  },
  {
    title: 'Daisy Bell (A Bicycle Built for Two)',
    artist: 'Harry Dacre',
    era: '1890s',
    published: 1892,
    tags: ['fun', 'love', 'waltz'],
    lyrics: [
      'Daisy, Daisy, give me your answer, do.',
      "I'm half crazy all for the love of you.",
      "It won't be a stylish marriage,",
      "I can't afford a carriage,",
      "But you'll look sweet upon the seat",
      'Of a bicycle built for two.',
    ].join('\n'),
  },
  {
    title: 'In the Good Old Summertime',
    artist: 'George Evans & Ren Shields',
    era: '1900s',
    published: 1902,
    tags: ['fun', 'seasons', 'waltz'],
    lyrics: [
      'In the good old summertime, in the good old summertime,',
      'Strolling through the shady lanes with your baby mine.',
      "You hold her hand and she holds yours, and that's a very good sign",
      "That she's your tootsie-wootsie in the good old summertime.",
    ].join('\n'),
  },
  {
    // First printed 1894 as "Levee Song" (minstrel dialect); this is the
    // 20th-century schoolbook text. Do not extend with verses found online.
    title: "I've Been Working on the Railroad",
    artist: 'Traditional (first printed 1894)',
    era: '1890s',
    published: 1894,
    tags: ['fun', 'upbeat', 'folk'],
    lyrics: [
      "I've been working on the railroad, all the livelong day.",
      "I've been working on the railroad, just to pass the time away.",
      "Can't you hear the whistle blowing? Rise up so early in the morn.",
      "Can't you hear the captain shouting, \"Dinah, blow your horn!\"",
    ].join('\n'),
  },
  {
    // Replaces "Camptown Races" (a blackface-minstrel number) in the
    // movement slot: same marchable, clap-along energy, clean provenance,
    // and deeply familiar to this cohort.
    title: "It's a Long Way to Tipperary",
    artist: 'Jack Judge & Harry Williams',
    era: '1910s',
    published: 1912,
    tags: ['movement', 'upbeat', 'march'],
    lyrics: [
      "It's a long way to Tipperary,",
      "It's a long way to go.",
      "It's a long way to Tipperary,",
      'To the sweetest girl I know!',
      'Goodbye, Piccadilly,',
      'Farewell, Leicester Square!',
      "It's a long, long way to Tipperary,",
      'But my heart’s right there.',
    ].join('\n'),
  },
  {
    // Secular text of the African American spiritual "When the Chariot
    // Comes" (printed 1899); this railroad version first printed 1927.
    title: "She'll Be Comin' 'Round the Mountain",
    artist: 'Traditional (from the spiritual "When the Chariot Comes")',
    era: '1920s',
    published: 1927,
    tags: ['movement', 'upbeat', 'folk'],
    lyrics: [
      "She'll be comin' 'round the mountain when she comes,",
      "She'll be comin' 'round the mountain when she comes,",
      "She'll be comin' 'round the mountain,",
      "She'll be comin' 'round the mountain,",
      "She'll be comin' 'round the mountain when she comes.",
    ].join('\n'),
  },
  {
    title: 'Shine On, Harvest Moon',
    // Writers of record; authorship also claimed for Dave Stamper.
    artist: 'Nora Bayes & Jack Norworth',
    era: '1900s',
    published: 1908,
    tags: ['evening', 'love', 'gentle'],
    lyrics: [
      'Shine on, shine on, harvest moon, up in the sky.',
      "I ain't had no lovin' since January, February, June, or July.",
      "Snow time ain't no time to stay outdoors and spoon,",
      'So shine on, shine on, harvest moon, for me and my gal.',
    ].join('\n'),
  },
  {
    title: 'By the Light of the Silvery Moon',
    artist: 'Gus Edwards & Edward Madden',
    era: '1900s',
    published: 1909,
    tags: ['evening', 'love', 'gentle'],
    lyrics: [
      'By the light of the silvery moon,',
      "I want to spoon, to my honey I'll croon love's tune.",
      'Honeymoon, keep a-shining in June.',
      'Your silvery beams will bring love dreams,',
      "We'll be cuddling soon, by the silvery moon.",
    ].join('\n'),
  },
  {
    title: 'Beautiful Dreamer',
    artist: 'Stephen Foster',
    era: '1860s',
    published: 1864,
    tags: ['evening', 'gentle', 'slow'],
    lyrics: [
      'Beautiful dreamer, wake unto me,',
      'Starlight and dewdrops are waiting for thee.',
      'Sounds of the rude world, heard in the day,',
      "Lulled by the moonlight have all passed away.",
    ].join('\n'),
  },
  {
    title: 'Amazing Grace',
    // Newton's 1779 text; the familiar NEW BRITAIN tune pairing dates to
    // 1835 (Southern Harmony). Taken up by enslaved and freed Black
    // Americans; later a civil-rights anthem.
    artist: 'John Newton (words, 1779); tune NEW BRITAIN (1835 pairing)',
    era: '1770s',
    published: 1779,
    tags: ['comfort', 'hymn', 'gentle'],
    lyrics: [
      'Amazing grace, how sweet the sound,',
      'That saved a wretch like me.',
      'I once was lost, but now am found,',
      'Was blind, but now I see.',
    ].join('\n'),
  },
  {
    title: 'Swing Low, Sweet Chariot',
    // African American spiritual, most likely composed in the late 1860s by
    // Wallis and Minerva Willis, Choctaw Freedpeople; first published 1872
    // in the Fisk Jubilee Singers' collection.
    artist: 'Wallis & Minerva Willis (African American spiritual, c. 1860s)',
    era: '1870s',
    published: 1872,
    tags: ['comfort', 'spiritual', 'gentle'],
    lyrics: [
      "Swing low, sweet chariot, comin' for to carry me home,",
      "Swing low, sweet chariot, comin' for to carry me home.",
      '',
      'I looked over Jordan, and what did I see,',
      "Comin' for to carry me home?",
      "A band of angels comin' after me,",
      "Comin' for to carry me home.",
    ].join('\n'),
  },
  {
    title: 'Danny Boy',
    artist: 'Frederic Weatherly (words, 1913), to the Londonderry Air',
    era: '1910s',
    published: 1913,
    tags: ['comfort', 'gentle', 'irish'],
    lyrics: [
      'Oh Danny boy, the pipes, the pipes are calling',
      'From glen to glen, and down the mountain side.',
      "The summer's gone, and all the roses falling,",
      "'Tis you, 'tis you must go, and I must bide.",
    ].join('\n'),
  },
  {
    title: 'When the Saints Go Marching In',
    // African American spiritual central to the New Orleans jazz funeral —
    // a dirge on the way to the cemetery, swung on the way back. Sung here
    // as sacred music in Week 4's core, not filed under "exercise."
    // PD basis: the sung version evolved in the early 1900s from gospel
    // antecedents including "When the Saints Are Marching In" (pub. 1896);
    // no single first printing of this exact text is documented. The kit
    // ships the traditional lyric only — no arrangement.
    artist: 'Traditional African American spiritual (New Orleans)',
    era: '1900s',
    published: 1896,
    tags: ['comfort', 'spiritual', 'upbeat'],
    lyrics: [
      'Oh, when the saints go marching in,',
      'Oh, when the saints go marching in,',
      'Oh Lord, I want to be in that number,',
      'When the saints go marching in.',
    ].join('\n'),
  },
  {
    // Week 4's movement song: up-tempo comfort, made for this theme.
    title: 'Pack Up Your Troubles in Your Old Kit-Bag',
    artist: 'Felix Powell & George Asaf',
    era: '1910s',
    published: 1915,
    tags: ['movement', 'upbeat', 'comfort'],
    lyrics: [
      'Pack up your troubles in your old kit-bag,',
      'And smile, smile, smile.',
      "While you've a lucifer to light your fag,",
      'Smile, boys, that’s the style.',
      "What's the use of worrying?",
      'It never was worth while, so',
      'Pack up your troubles in your old kit-bag,',
      'And smile, smile, smile.',
    ].join('\n'),
  },
];

/**
 * One themed session in the four-week rotating cycle. `coreTitles` are the
 * middle of the session; the seeder builds each playlist as
 * gathering → core songs → movement song → closing, per the session arc in
 * PROGRAM.md. Repetition across weeks (anchors every session, a familiar
 * movement song) is deliberate — routine and familiarity are what make the
 * format work in memory care.
 *
 * Week 4 is faith music (hymns and spirituals) and is opt-in for everyone —
 * see PROGRAM.md's facilitation notes. It is also a farewell-heavy set:
 * staff it heavier, expect tears (they are usually the point, not a
 * failure), and don't run it the week after a death on the unit.
 */
export interface SessionPlan {
  key: string;
  name: string;
  focus: string;
  coreTitles: string[];
  movementTitle: string;
}

export const SESSION_PLANS: SessionPlan[] = [
  {
    key: 'home-and-heart',
    name: 'Week 1 — Songs of Home & Heart',
    focus: 'Belonging and warmth: songs about home, sweethearts, and the places people came from.',
    coreTitles: ['Home on the Range', 'Home! Sweet Home!', 'My Wild Irish Rose', 'Down by the Old Mill Stream'],
    movementTitle: "She'll Be Comin' 'Round the Mountain",
  },
  {
    key: 'out-and-about',
    name: 'Week 2 — Out & About',
    focus: 'Energy and fun: ball games, bicycles, summer strolls — the up-tempo crowd-pleasers.',
    coreTitles: [
      'Take Me Out to the Ball Game',
      'Daisy Bell (A Bicycle Built for Two)',
      'In the Good Old Summertime',
      "I've Been Working on the Railroad",
    ],
    movementTitle: "It's a Long Way to Tipperary",
  },
  {
    key: 'moon-and-stars',
    name: 'Week 3 — Moon & Stars',
    focus: 'Winding down: moonlight songs, sung softer and slower.',
    coreTitles: [
      'Shine On, Harvest Moon',
      'By the Light of the Silvery Moon',
      'Beautiful Dreamer',
      'Let Me Call You Sweetheart',
    ],
    movementTitle: "She'll Be Comin' 'Round the Mountain",
  },
  {
    key: 'comfort-and-joy',
    name: 'Week 4 — Comfort & Joy',
    focus: 'Reassurance: hymns and spirituals, sung as the sacred music they are. Opt-in for everyone.',
    coreTitles: ['Amazing Grace', 'Swing Low, Sweet Chariot', 'When the Saints Go Marching In', 'Danny Boy'],
    movementTitle: 'Pack Up Your Troubles in Your Old Kit-Bag',
  },
];

/**
 * Which plan is "this week"? The cycle simply rotates by ISO week number, so
 * every device agrees and staff never have to remember where the rotation
 * stands. Facilities that want to pin a different week can start sessions
 * from any playlist — this is a default, not a lock.
 */
export function currentPlanIndex(date: Date = new Date()): number {
  const jan1 = Date.UTC(date.getUTCFullYear(), 0, 1);
  const day = Math.floor((date.getTime() - jan1) / 86400000);
  return Math.floor(day / 7) % SESSION_PLANS.length;
}
