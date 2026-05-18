export type TrainingTopic =
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

export const TRAINING: Record<TrainingTopic, TrainingEntry> = {
  isrc: {
    title: 'What is an ISRC?',
    definition: 'A 12-character International Standard Recording Code that uniquely identifies a specific sound recording.',
    whyItMatters: 'It identifies which recording is being played on streaming, radio, and download platforms so royalties are tracked correctly.',
    whoGetsPaid: 'The master recording rights holder (often the label or the artist if they retain masters).',
    ifSkipped: 'Plays may go unattributed and royalties may be unclaimable through SoundExchange and other recording-royalty platforms.',
    commonMistake: 'Using the same ISRC for two different versions (radio edit vs. explicit). Each version needs a unique ISRC.',
  },
  iswc: {
    title: 'What is an ISWC?',
    definition: 'An 11-character International Standard Musical Work Code that identifies the underlying composition (lyrics + melody), not the recording.',
    whyItMatters: 'It identifies the song itself so publishing royalties for any cover or version flow to the right writers and publishers.',
    whoGetsPaid: 'Songwriters and publishers via PROs and the MLC.',
    ifSkipped: 'Performance and mechanical royalties may not match to the correct work across collection societies.',
    commonMistake: 'Confusing an ISRC (recording) with an ISWC (composition). They are different identifiers for different rights.',
  },
  pro: {
    title: 'What is a PRO?',
    definition: 'A Performing Rights Organization (BMI, ASCAP, SESAC) collects performance royalties when a composition is played publicly.',
    whyItMatters: 'Without a PRO affiliation, no one collects performance royalties for your songs.',
    whoGetsPaid: 'Songwriters and publishers receive a split of performance royalties from broadcasters, venues, and streaming.',
    ifSkipped: 'Performance royalties go uncollected and are eventually written off.',
    commonMistake: 'Affiliating each writer with a different PRO without coordinating splits at registration time.',
  },
  bmi: {
    title: 'What is BMI?',
    definition: 'Broadcast Music, Inc. — one of the major U.S. performing rights organizations.',
    whyItMatters: 'BMI collects performance royalties for affiliated songwriters and publishers when their songs are performed.',
    whoGetsPaid: 'BMI-affiliated songwriters and their associated publishers.',
    ifSkipped: 'If you are a BMI writer and do not register the work, BMI will not collect or distribute royalties for it.',
    commonMistake: 'Forgetting to register the publisher side as well as the writer side.',
  },
  mlc: {
    title: 'What is the MLC?',
    definition: 'The Mechanical Licensing Collective collects U.S. mechanical (streaming/download) royalties for songwriters and publishers.',
    whyItMatters: 'Mechanical royalties from interactive streaming flow through the MLC. No registration = no payout.',
    whoGetsPaid: 'Songwriters and publishers who registered the work in the MLC public database.',
    ifSkipped: 'Mechanical royalties pile up unclaimed and may eventually be redistributed.',
    commonMistake: 'Assuming a distributor or label automatically registers compositions with the MLC. They typically do not.',
  },
  songtrust: {
    title: 'What is Songtrust?',
    definition: 'A third-party publishing administrator that registers songs globally on the songwriter\'s behalf.',
    whyItMatters: 'Songtrust simplifies international collection for writers who do not have their own publishing infrastructure.',
    whoGetsPaid: 'Songwriters net of Songtrust\'s admin fee.',
    ifSkipped: 'Foreign mechanical and performance royalties may be very difficult to collect individually.',
    commonMistake: 'Double-registering a work with Songtrust and another publisher, causing conflict claims.',
  },
  soundexchange: {
    title: 'What is SoundExchange?',
    definition: 'SoundExchange collects digital performance royalties (Pandora, SiriusXM, webcasters) for sound recording owners and performers.',
    whyItMatters: 'These are different royalties from PRO performance — they go to the recording side, not the composition side.',
    whoGetsPaid: 'Master rights holder (50%), featured artist (45%), non-featured performers (5%).',
    ifSkipped: 'Digital performance royalties are forfeited.',
    commonMistake: 'Only registering with a PRO and assuming SoundExchange is automatic — it is not.',
  },
  eco: {
    title: 'What is eCO Copyright?',
    definition: 'The U.S. Copyright Office\'s online registration system (eCO) for formally registering authorship of a work.',
    whyItMatters: 'Registration provides legal evidence of ownership and is required before filing an infringement lawsuit in the U.S.',
    whoGetsPaid: 'No direct royalty — but copyright registration enables statutory damages and attorney\'s fees in litigation.',
    ifSkipped: 'You can still own the copyright but lose the ability to claim statutory damages or sue easily.',
    commonMistake: 'Registering the sound recording but forgetting to register the underlying composition (or vice versa).',
  },
  writer_share: {
    title: 'What is a writer share?',
    definition: 'The percentage of the writer\'s royalty pie owed to a specific songwriter for a song.',
    whyItMatters: 'It determines how performance and mechanical royalties are divided among collaborators.',
    whoGetsPaid: 'Each songwriter on the work in proportion to their share.',
    ifSkipped: 'Disputes, withheld royalties, and rejected platform registrations.',
    commonMistake: 'Splits that do not total 100%. Always confirm the math before submitting.',
  },
  publisher_share: {
    title: 'What is a publisher share?',
    definition: 'The publisher portion of the song\'s royalty pie (traditionally 50%, with the writer keeping 50%).',
    whyItMatters: 'Publishers handle administration, registration, and licensing in exchange for their share.',
    whoGetsPaid: 'The publisher(s) named on the registration.',
    ifSkipped: 'No one administers the work, and licensing requests may go unanswered.',
    commonMistake: 'Listing a publisher without an IPI number, which causes registrations to fail.',
  },
  p_line: {
    title: 'What is a P-line?',
    definition: 'The phonogram copyright notice (℗ year + owner) identifying who owns the sound recording.',
    whyItMatters: 'It tells the world who controls the master recording rights.',
    whoGetsPaid: 'The named P-line owner collects master-side royalties (SoundExchange, master licensing).',
    ifSkipped: 'Ambiguity about who owns the master recording can delay digital performance royalty payments.',
    commonMistake: 'Using the artist name when the label or LLC actually owns the master.',
  },
  c_line: {
    title: 'What is a C-line?',
    definition: 'The copyright notice (© year + owner) identifying who owns the underlying composition.',
    whyItMatters: 'It identifies the composition copyright owner separately from the recording.',
    whoGetsPaid: 'The composition owner (publisher) receives sync and licensing income.',
    ifSkipped: 'Sync licensing and publisher royalties may be misrouted.',
    commonMistake: 'Using the same entity in both P-line and C-line when ownership is actually split.',
  },
  split_sheet: {
    title: 'What is a split sheet?',
    definition: 'A signed document recording each collaborator\'s share of a song, agreed by everyone present at writing.',
    whyItMatters: 'It is the primary evidence of intent if a dispute later arises.',
    whoGetsPaid: 'Whoever is listed on the split sheet, in the percentages listed.',
    ifSkipped: 'Years-long disputes over who wrote what and what they are owed.',
    commonMistake: 'Forgetting to sign the split sheet in the session — getting signatures later is much harder.',
  },
  publishing_admin: {
    title: 'What is a publishing administrator?',
    definition: 'A company that registers and collects publishing royalties on the writer\'s behalf, without taking copyright ownership.',
    whyItMatters: 'A writer keeps ownership of their songs while delegating the work of collection.',
    whoGetsPaid: 'The writer keeps the publisher share net of the admin fee (typically 10-15%).',
    ifSkipped: 'Self-administering requires direct PRO, MLC, CMO relationships globally — usually impractical.',
    commonMistake: 'Signing an "exclusive publishing" deal instead of an admin deal, transferring ownership.',
  },
  master_owner: {
    title: 'What is a master recording owner?',
    definition: 'The entity (artist, label, LLC) that owns the actual recorded audio file (the master).',
    whyItMatters: 'The master owner controls licensing, distribution, and collects master-side royalties.',
    whoGetsPaid: 'The named master owner — usually via SoundExchange for digital performances and distributors for streams.',
    ifSkipped: 'Without a clear master owner, master-side royalties cannot be collected.',
    commonMistake: 'Confusing master rights with publishing rights — they are separate revenue streams.',
  },
};
