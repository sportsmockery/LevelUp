// Music Publishing — platform registration types.

export type PlatformId =
  | 'bmi'
  | 'mlc'
  | 'songtrust'
  | 'soundexchange'
  | 'copyright'
  | 'distributor'
  | 'isrc'
  | 'master';

export type RegistrationStatus =
  | 'not_started'
  | 'in_progress'
  | 'file_generated'
  | 'ready_to_submit'
  | 'submitted'
  | 'confirmed'
  | 'rejected'
  | 'needs_correction'
  | 'superseded'
  | 'complete';

export interface PlatformRegistration {
  id: string;
  org_id: string;
  release_id: string | null;
  track_id: string | null;
  platform: PlatformId;
  status: RegistrationStatus;
  generated_file_id: string | null;
  confirmation_number: string | null;
  confirmation_url: string | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type Severity = 'error' | 'warning';

export interface ValidationIssue {
  platform: PlatformId | 'general';
  severity: Severity;
  field?: string;
  message: string;
  blocking: boolean;
}
