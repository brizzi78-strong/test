/**
 * The Memory Care Music Program's song kit: a starter library of
 * public-domain sing-along standards, plus the four-week rotating session
 * plans that use them. This is the content half of the program described in
 * ../../PROGRAM.md — the app half (profiles, playlists, sessions, logging)
 * already exists.
 *
 * Every song here was published before 1931 (or is traditional), so both the
 * composition and these lyrics are in the US public domain — the same
 * no-licensed-content rule the rest of the app holds to. Lyrics are the
 * commonly sung first verse and/or chorus, which is what a group actually
 * sings; audio stays the facility's own (`audioUrl` is left unset by the
 * seeder for the facility to fill in).
 *
 * Why songs this old for residents whose youth was the 1940s–60s? The group
 * sing-along canon is communal-childhood music — songs learned at school,
 * church, and family gatherings — and for today's memory-care residents that
 * canon is exactly these standards. Era-of-youth personal favorites belong in
 * the program's other arm (personalized listening from the facility's own
 * audio sources), where no lyrics are needed.
 */

export interface KitSong {
  title: string;
  /** Composer/lyricist credit (or "Traditional"). */
  artist: string;
  /** Decade of publication, or "traditional" — matches Song.era. */
  era: string;
  tags: string[];
  lyrics: string;
}

/** Sung as everyone settles in — the same opener every session, by design. */
export const GATHERING_SONG = "Hail, Hail, the Gang's All Here";

/** The closing ritual — the same goodbye every session, by design. */
export const CLOSING_SONG = 'Good Night, Ladies';

export const SONG_KIT: KitSong[] = [
  {
    title: "Hail, Hail, the Gang's All Here",
    artist: 'Theodore Morse & D. A. Esrom',
    era: '1910s',
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
    title: 'Good Night, Ladies',
    artist: 'Traditional',
    era: 'traditional',
    tags: ['closing', 'gentle', 'ritual'],
    lyrics: [
      'Good night, ladies! Good night, ladies!',
      "Good night, ladies! We're going to leave you now.",
      'Merrily we roll along, roll along, roll along,',
      "Merrily we roll along, o'er the deep blue sea.",
    ].join('\n'),
  },
  {
    title: 'Home on the Range',
    artist: 'Traditional (Higley & Kelley)',
    era: 'traditional',
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
    title: 'Oh! Susanna',
    artist: 'Stephen Foster',
    era: '1840s',
    tags: ['home', 'upbeat', 'folk'],
    lyrics: [
      'I come from Alabama with a banjo on my knee,',
      "I'm going to Louisiana, my true love for to see.",
      '',
      "Oh! Susanna, oh don't you cry for me,",
      'For I come from Alabama with a banjo on my knee.',
    ].join('\n'),
  },
  {
    title: 'My Wild Irish Rose',
    artist: 'Chauncey Olcott',
    era: '1890s',
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
    tags: ['home', 'love', 'gentle'],
    lyrics: [
      'Down by the old mill stream, where I first met you,',
      'With your eyes of blue, dressed in gingham too.',
      'It was there I knew that you loved me true.',
      'You were sixteen, my village queen,',
      'Down by the old mill stream.',
    ].join('\n'),
  },
  {
    title: 'Let Me Call You Sweetheart',
    artist: 'Leo Friedman & Beth Slater Whitson',
    era: '1910s',
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
    tags: ['fun', 'seasons', 'waltz'],
    lyrics: [
      'In the good old summertime, in the good old summertime,',
      'Strolling through the shady lanes with your baby mine.',
      "You hold her hand and she holds yours, and that's a very good sign",
      "That she's your tootsie-wootsie in the good old summertime.",
    ].join('\n'),
  },
  {
    title: "I've Been Working on the Railroad",
    artist: 'Traditional',
    era: 'traditional',
    tags: ['fun', 'upbeat', 'folk'],
    lyrics: [
      "I've been working on the railroad, all the livelong day.",
      "I've been working on the railroad, just to pass the time away.",
      "Can't you hear the whistle blowing? Rise up so early in the morn.",
      "Can't you hear the captain shouting, \"Dinah, blow your horn!\"",
    ].join('\n'),
  },
  {
    title: 'Camptown Races',
    artist: 'Stephen Foster',
    era: '1850s',
    tags: ['movement', 'upbeat', 'folk'],
    lyrics: [
      'The Camptown ladies sing this song, doo-dah, doo-dah,',
      'The Camptown racetrack five miles long, oh, doo-dah day.',
      '',
      "Goin' to run all night, goin' to run all day,",
      "I'll bet my money on the bobtail nag,",
      'Somebody bet on the bay.',
    ].join('\n'),
  },
  {
    title: "She'll Be Comin' 'Round the Mountain",
    artist: 'Traditional',
    era: 'traditional',
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
    artist: 'Nora Bayes & Jack Norworth',
    era: '1900s',
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
    tags: ['evening', 'love', 'gentle'],
    lyrics: [
      'By the light of the silvery moon,',
      "I want to spoon, to my honey I'll croon love's tune.",
      'Honeymoon, keep a-shining in June.',
      "Your silvery beams will bring love's dreams,",
      "We'll be cuddling soon, by the silvery moon.",
    ].join('\n'),
  },
  {
    title: 'Beautiful Dreamer',
    artist: 'Stephen Foster',
    era: '1860s',
    tags: ['evening', 'gentle', 'lullaby'],
    lyrics: [
      'Beautiful dreamer, wake unto me,',
      'Starlight and dewdrops are waiting for thee.',
      'Sounds of the rude world, heard in the day,',
      "Lulled by the moonlight have all passed away.",
    ].join('\n'),
  },
  {
    title: 'Amazing Grace',
    artist: 'John Newton (Traditional melody)',
    era: 'traditional',
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
    artist: 'Traditional (spiritual)',
    era: 'traditional',
    tags: ['comfort', 'spiritual', 'gentle'],
    lyrics: [
      "Swing low, sweet chariot, comin' for to carry me home,",
      "Swing low, sweet chariot, comin' for to carry me home.",
      'I looked over Jordan, and what did I see,',
      "Comin' for to carry me home?",
      "A band of angels comin' after me,",
      "Comin' for to carry me home.",
    ].join('\n'),
  },
  {
    title: 'Danny Boy',
    artist: 'Frederic Weatherly (trad. melody)',
    era: '1910s',
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
    artist: 'Traditional (spiritual)',
    era: 'traditional',
    tags: ['movement', 'spiritual', 'upbeat'],
    lyrics: [
      'Oh, when the saints go marching in,',
      'Oh, when the saints go marching in,',
      'Oh Lord, I want to be in that number,',
      'When the saints go marching in.',
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
    coreTitles: ['Home on the Range', 'Oh! Susanna', 'My Wild Irish Rose', 'Down by the Old Mill Stream'],
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
    movementTitle: 'Camptown Races',
  },
  {
    key: 'moon-and-stars',
    name: 'Week 3 — Moon & Stars',
    focus: 'Winding down: moonlight songs and lullabies, sung softer and slower.',
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
    focus: 'Reassurance: hymns and spirituals many residents have sung their whole lives.',
    coreTitles: ['Amazing Grace', 'Swing Low, Sweet Chariot', 'Danny Boy'],
    movementTitle: 'When the Saints Go Marching In',
  },
];
