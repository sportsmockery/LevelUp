// Music Publishing — training content. Plain-English explainers shown
// throughout the UI so users learn what each registration step actually does.

export type TopicId =
  | 'isrc'
  | 'iswc'
  | 'pro'
  | 'bmi'
  | 'mlc'
  | 'songtrust'
  | 'soundexchange'
  | 'eco'
  | 'writer_share'
  | 'publisher_share'
  | 'p_line'
  | 'c_line'
  | 'split_sheet'
  | 'publishing_admin'
  | 'master_owner';

export interface TrainingEntry {
  title: string;
  definition: string;
  whyItMatters: string;
  whoGetsPaid: string;
  ifSkipped: string;
  commonMistake: string;
}

export const TRAINING: Record<TopicId, TrainingEntry> = {
  isrc: {
    title: 'ISRC (International Standard Recording Code)',
    definition: 'A unique 12-character code identifying a specific recording (a master), e.g. USAB12600001.',
    whyItMatters: 'Distributors, streaming services, and SoundExchange use the ISRC to track plays and pay royalties for the master recording.',
    whoGetsPaid: 'The master owner (label or artist) — typically through a distributor and SoundExchange.',
    ifSkipped: 'Your master plays cannot be tracked across platforms. SoundExchange will not collect digital performance royalties.',
    commonMistake: 'Re-using an ISRC across remixes, edits, or remasters. Each unique recording needs its own ISRC.',
  },
  iswc: {
    title: 'ISWC (International Standard Musical Work Code)',
    definition: 'A unique code identifying a musical work (composition), separate from any recording of it.',
    whyItMatters: 'PROs (BMI, ASCAP, SESAC) and the MLC use the ISWC to track the underlying song across covers and uses.',
    whoGetsPaid: 'Songwriters and music publishers — through PROs (performance) and the MLC (mechanical).',
    ifSkipped: 'Royalties for your song can sit unmatched in PRO/MLC databases until someone manually links the work.',
    commonMistake: 'Thinking ISRC and ISWC are interchangeable. ISRC = recording. ISWC = song.',
  },
  pro: {
    title: 'PRO (Performance Rights Organization)',
    definition: 'BMI, ASCAP, SESAC, GMR — they license public performance of your songs and collect performance royalties.',
    whyItMatters: 'Every songwriter and publisher must be affiliated with exactly one PRO to be paid for radio, TV, live, and streaming performances.',
    whoGetsPaid: 'Songwriters and publishers — typically 50/50 between writer and publisher share of the song.',
    ifSkipped: 'No public performance royalties will ever reach you. Money sits at the PRO indefinitely.',
    commonMistake: 'Registering the same writer with multiple PROs. Choose one and stay consistent everywhere.',
  },
  bmi: {
    title: 'BMI (Broadcast Music, Inc.)',
    definition: 'A US-based PRO. If your writers are BMI-affiliated, register every work with BMI so they can collect performance royalties.',
    whyItMatters: 'BMI distributes performance royalties (radio, TV, streaming, live venues). Unregistered works mean unpaid royalties.',
    whoGetsPaid: 'BMI-affiliated writers and BMI-publisher entities.',
    ifSkipped: 'Performances of your work generate royalties that BMI cannot match to anyone — they go unpaid.',
    commonMistake: 'Forgetting to register a co-writer who is on a different PRO. All writers must be listed even if they go to ASCAP/SESAC.',
  },
  mlc: {
    title: 'The MLC (The Mechanical Licensing Collective)',
    definition: 'The US body that collects and distributes mechanical royalties from interactive streaming (Spotify, Apple Music, etc.).',
    whyItMatters: 'If your works aren\'t registered with the MLC, streaming mechanical royalties sit in the "black box" and may eventually be redistributed by market share — not to you.',
    whoGetsPaid: 'Songwriters and publishers — for mechanical reproduction (each stream is a mechanical use).',
    ifSkipped: 'Months of unclaimed mechanical royalties. Reclaiming them later requires a formal dispute.',
    commonMistake: 'Assuming your distributor handles MLC registration. Most don\'t. You must register directly.',
  },
  songtrust: {
    title: 'Songtrust',
    definition: 'A publishing administrator that registers your works globally and collects publishing royalties on your behalf.',
    whyItMatters: 'Most indie writers can\'t directly affiliate with foreign PROs. A publishing admin like Songtrust handles the global collection net.',
    whoGetsPaid: 'You — minus Songtrust\'s admin fee (15%). They collect from foreign PROs and the MLC.',
    ifSkipped: 'Foreign performance royalties (often 20-40% of total) will never reach you.',
    commonMistake: 'Registering the same work with both Songtrust and another admin. Double-claims trigger disputes and frozen payments.',
  },
  soundexchange: {
    title: 'SoundExchange',
    definition: 'The US body that collects digital performance royalties for the master recording (SiriusXM, internet radio, non-interactive streaming).',
    whyItMatters: 'These are royalties to the master owner and performers — different money than PRO performance royalties (which go to songwriters).',
    whoGetsPaid: 'Featured artist (45%), non-featured musicians/vocalists (5%), master rights owner (50%).',
    ifSkipped: 'Digital radio plays generate royalties that you can never collect retroactively past a few years.',
    commonMistake: 'Not registering as both a recording artist AND a master rights owner if you self-released.',
  },
  eco: {
    title: 'eCO (US Copyright Office)',
    definition: 'The electronic Copyright Office. File Form PA (composition) and Form SR (sound recording) to register your copyrights.',
    whyItMatters: 'Registration is required before you can sue for infringement, and gives you statutory damages eligibility.',
    whoGetsPaid: 'No royalties from eCO directly. But registration is the prerequisite to ever enforcing your rights in court.',
    ifSkipped: 'You cannot sue infringers in US federal court without a registration, and you can only get actual damages (not statutory).',
    commonMistake: 'Filing only the composition (PA) or only the recording (SR). For most releases you need both.',
  },
  writer_share: {
    title: 'Writer share',
    definition: 'The writer-side portion of a song (typically 50%). Split this between songwriters by how much each contributed.',
    whyItMatters: 'PROs and the MLC pay writer share directly to songwriters. The split you register is the split they will pay forever.',
    whoGetsPaid: 'Each songwriter — paid by their PRO directly, then by the MLC for streaming mechanicals.',
    ifSkipped: 'Defaulting to equal splits when contributions weren\'t equal causes disputes years later.',
    commonMistake: 'Forgetting the writer share total must equal 100% across all writers, separately from publisher share.',
  },
  publisher_share: {
    title: 'Publisher share',
    definition: 'The publisher-side portion of a song (typically the other 50%). Allocated to publisher entities (one per writer, usually).',
    whyItMatters: 'The publisher share is collected by publishers from PROs/MLC and (after admin fee) paid to the writer or rights holder.',
    whoGetsPaid: 'Music publishers — who then pay their writers minus the publishing deal\'s split (often 25/75 to 50/50).',
    ifSkipped: 'If no publisher is registered, the publisher share is forfeited at the PRO/MLC.',
    commonMistake: 'Listing the writer\'s name as the publisher. Even self-publishers should create a separate publishing entity with its own IPI.',
  },
  p_line: {
    title: '℗ Line (Phonogram copyright)',
    definition: '"℗ <year> <owner>" — claim of copyright in the sound recording (master).',
    whyItMatters: 'Required on every release. Distributors, eCO, and SoundExchange all parse it.',
    whoGetsPaid: 'No royalties directly, but ownership is established for future enforcement.',
    ifSkipped: 'Distributors will reject your release. eCO Form SR cannot be filed cleanly.',
    commonMistake: 'Using the same entity for ℗ and © when they\'re actually different (label vs publisher vs writer).',
  },
  c_line: {
    title: '© Line (Composition copyright)',
    definition: '"© <year> <owner>" — claim of copyright in the song (composition).',
    whyItMatters: 'Required on every release. Identifies who owns the underlying song, separately from the recording.',
    whoGetsPaid: 'No royalties directly — but anchors the chain of title for publishing income.',
    ifSkipped: 'eCO Form PA filing is incomplete. Foreign collection societies may reject the work.',
    commonMistake: 'Confusing © with ℗. © is for the song. ℗ is for the recording.',
  },
  split_sheet: {
    title: 'Split sheet',
    definition: 'A signed document where every writer agrees in writing to their share of the song.',
    whyItMatters: 'Prevents the most common publishing dispute: "I thought I had 50%, not 25%." Signed splits are bulletproof.',
    whoGetsPaid: 'Everyone listed, at the split they signed for — no future ambiguity.',
    ifSkipped: 'Years later when a song earns real money, disputes arise. Splits get re-litigated and royalties freeze.',
    commonMistake: 'Verbal agreements. Get the split sheet signed on the day the song is finished.',
  },
  publishing_admin: {
    title: 'Publishing administrator',
    definition: 'A service (Songtrust, Sentric, etc.) that registers your works globally and collects publishing income for a percentage.',
    whyItMatters: 'For indie writers, publishing admins are the only practical way to collect foreign and mechanical royalties.',
    whoGetsPaid: 'You — minus the admin fee (typically 10-25%).',
    ifSkipped: 'You leave a substantial percentage of total publishing income on the table.',
    commonMistake: 'Signing with a publishing admin that takes ownership rather than just admin rights. Read the contract.',
  },
  master_owner: {
    title: 'Master owner',
    definition: 'The entity that owns the recording (the master). For self-released music, this is usually you or your LLC.',
    whyItMatters: 'The master owner controls licensing of the recording (sync, samples) and receives the master share of streaming.',
    whoGetsPaid: 'The master owner — through the distributor for streaming and SoundExchange for digital radio.',
    ifSkipped: 'No royalty stream for the recording (separate from songwriting royalties).',
    commonMistake: 'Conflating master ownership with songwriting credit. They are completely separate copyrights.',
  },
};
