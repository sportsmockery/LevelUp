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
  | 'missing_information'
  | 'ready'
  | 'file_generated'
  | 'submitted'
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'needs_correction'
  | 'skipped';

export interface PlatformRegistration {
  id: string;
  organization_id: string;
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
  updated_at: string;
  created_at: string;
}

export interface ValidationIssue {
  platform: PlatformId | 'catalog';
  severity: 'error' | 'warning';
  field: string;
  message: string;
  blocking: boolean;
}

export const PLATFORM_LABELS: Record<PlatformId, string> = {
  bmi: 'BMI',
  mlc: 'MLC',
  songtrust: 'Songtrust',
  soundexchange: 'SoundExchange',
  copyright: 'eCO Copyright',
  distributor: 'Distributor',
  isrc: 'ISRC',
  master: 'Master Workbook',
};
