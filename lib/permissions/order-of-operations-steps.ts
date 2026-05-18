// Music Publishing — pure step definitions, safe to import from client components.
// Server-side state evaluation (getChecklist, overrideStep) lives in order-of-operations.ts.

export type StepId =
  | 'create_org'
  | 'add_artist'
  | 'add_writers'
  | 'add_publishers'
  | 'create_release'
  | 'upload_artwork'
  | 'add_tracks'
  | 'assign_isrcs'
  | 'assign_writer_splits'
  | 'split_approvals'
  | 'assign_publisher_splits'
  | 'validate_platforms'
  | 'generate_exports'
  | 'record_registration_status';

export interface StepDef {
  id: StepId;
  title: string;
  blurb: string;
  dependsOn: StepId[];
}

export const STEPS: StepDef[] = [
  { id: 'create_org',                 title: '1. Create organization',          blurb: 'Set up the tenant that owns this catalog.',                       dependsOn: [] },
  { id: 'add_artist',                 title: '2. Add artist profile',           blurb: 'Legal + stage name. Required for releases.',                       dependsOn: ['create_org'] },
  { id: 'add_writers',                title: '3. Add writers + IPI',            blurb: 'Each writer needs a PRO + IPI before they can earn royalties.',    dependsOn: ['create_org'] },
  { id: 'add_publishers',             title: '4. Add publishers + IPI',         blurb: 'Even self-published writers should have a publisher entity.',      dependsOn: ['create_org'] },
  { id: 'create_release',             title: '5. Create release',               blurb: 'Title, type, label, copyright year, P/C lines.',                   dependsOn: ['add_artist'] },
  { id: 'upload_artwork',             title: '6. Upload artwork',               blurb: 'Distributors require 3000×3000 RGB JPG/PNG.',                      dependsOn: ['create_release'] },
  { id: 'add_tracks',                 title: '7. Add tracks',                   blurb: 'Every track needs title, duration, language.',                     dependsOn: ['create_release'] },
  { id: 'assign_isrcs',               title: '8. Assign ISRCs',                 blurb: 'Each track needs a unique ISRC before distribution.',              dependsOn: ['add_tracks'] },
  { id: 'assign_writer_splits',       title: '9. Assign writer splits',         blurb: 'Writer shares must sum to exactly 100%.',                          dependsOn: ['add_tracks', 'add_writers'] },
  { id: 'split_approvals',            title: '10. Get split approvals',         blurb: 'Each writer must approve their share before publishing.',          dependsOn: ['assign_writer_splits'] },
  { id: 'assign_publisher_splits',    title: '11. Assign publisher splits',     blurb: 'Publisher shares must sum to exactly 100% of publisher side.',     dependsOn: ['assign_writer_splits', 'add_publishers'] },
  { id: 'validate_platforms',         title: '12. Validate per platform',       blurb: 'Run platform-specific validation before generating files.',        dependsOn: ['assign_isrcs', 'split_approvals', 'assign_publisher_splits'] },
  { id: 'generate_exports',           title: '13. Generate registration files', blurb: 'Produce BMI/MLC/Songtrust/SoundExchange/Copyright/Distributor.',   dependsOn: ['validate_platforms'] },
  { id: 'record_registration_status', title: '14. Record registration status',  blurb: 'After you submit on each platform, log confirmation numbers.',     dependsOn: ['generate_exports'] },
];

export interface StepState {
  id: StepId;
  title: string;
  blurb: string;
  status: 'locked' | 'pending' | 'completed' | 'overridden';
  missing: StepId[];
  override?: { reason: string; by: string; at: string };
}
