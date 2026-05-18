export interface CopyrightPacketEntry {
  title_of_work: string;
  type_of_work: 'sound_recording' | 'musical_composition' | 'both';
  authors: Array<{ name: string; role: string }>;
  claimants: string[];
  year_of_completion: number | null;
  date_of_publication: string | null;
  nation_of_publication: string | null;
  sound_recording_owner: string | null;
  composition_owner: string | null;
  lyrics: string | null;
  deposit_material_notes: string | null;
  rights_and_permissions_contact: string | null;
}
