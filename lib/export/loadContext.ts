import { supabaseServer } from '../supabase-server';
import type {
  ReleaseContext,
  Release,
  Track,
  TrackWriter,
  TrackPublisher,
  TrackPerformer,
  TrackProducer,
  WriterProfile,
  PublisherProfile,
  ISRCCode,
  CustomField,
  CustomFieldValue,
} from '@/types/catalog';

export async function loadReleaseContext(releaseId: string): Promise<ReleaseContext> {
  if (!supabaseServer) throw new Error('Supabase server client not configured');

  const { data: release, error: rErr } = await supabaseServer
    .from('releases')
    .select('*')
    .eq('id', releaseId)
    .single();
  if (rErr || !release) throw rErr || new Error('Release not found');

  const { data: tracks } = await supabaseServer
    .from('tracks')
    .select('*')
    .eq('release_id', releaseId)
    .order('track_number', { ascending: true });

  const trackIds = (tracks ?? []).map((t) => t.id);

  const [writersRes, publishersRes, performersRes, producersRes, isrcsRes] = await Promise.all([
    supabaseServer.from('track_writers').select('*').in('track_id', trackIds.length ? trackIds : ['00000000-0000-0000-0000-000000000000']),
    supabaseServer.from('track_publishers').select('*').in('track_id', trackIds.length ? trackIds : ['00000000-0000-0000-0000-000000000000']),
    supabaseServer.from('track_performers').select('*').in('track_id', trackIds.length ? trackIds : ['00000000-0000-0000-0000-000000000000']),
    supabaseServer.from('track_producers').select('*').in('track_id', trackIds.length ? trackIds : ['00000000-0000-0000-0000-000000000000']),
    supabaseServer.from('isrc_codes').select('*').eq('release_id', releaseId),
  ]);

  const writers = groupBy<TrackWriter>((writersRes.data ?? []) as TrackWriter[], (w) => w.track_id);
  const publishers = groupBy<TrackPublisher>((publishersRes.data ?? []) as TrackPublisher[], (p) => p.track_id);
  const performers = groupBy<TrackPerformer>((performersRes.data ?? []) as TrackPerformer[], (p) => p.track_id);
  const producers = groupBy<TrackProducer>((producersRes.data ?? []) as TrackProducer[], (p) => p.track_id);

  const writerProfileIds = unique((writersRes.data ?? []).map((w) => w.writer_profile_id).filter(Boolean) as string[]);
  const publisherProfileIds = unique((publishersRes.data ?? []).map((p) => p.publisher_profile_id).filter(Boolean) as string[]);

  const [wpRes, ppRes, cfRes] = await Promise.all([
    writerProfileIds.length
      ? supabaseServer.from('writer_profiles').select('*').in('id', writerProfileIds)
      : Promise.resolve({ data: [] as WriterProfile[] }),
    publisherProfileIds.length
      ? supabaseServer.from('publisher_profiles').select('*').in('id', publisherProfileIds)
      : Promise.resolve({ data: [] as PublisherProfile[] }),
    supabaseServer.from('custom_fields').select('*').eq('organization_id', release.organization_id),
  ]);

  const writerProfiles = indexBy<WriterProfile>((wpRes.data ?? []) as WriterProfile[], (w) => w.id);
  const publisherProfiles = indexBy<PublisherProfile>((ppRes.data ?? []) as PublisherProfile[], (p) => p.id);

  const customFieldIds = ((cfRes.data ?? []) as CustomField[]).map((cf) => cf.id);
  const entityIds = [release.id, ...trackIds];
  const { data: cfvData } = customFieldIds.length
    ? await supabaseServer
        .from('custom_field_values')
        .select('*')
        .in('custom_field_id', customFieldIds)
        .in('entity_id', entityIds)
    : { data: [] as CustomFieldValue[] };

  return {
    release: release as Release,
    tracks: (tracks ?? []) as Track[],
    writers,
    publishers,
    performers,
    producers,
    writerProfiles,
    publisherProfiles,
    isrcs: (isrcsRes.data ?? []) as ISRCCode[],
    customFields: (cfRes.data ?? []) as CustomField[],
    customFieldValues: (cfvData ?? []) as CustomFieldValue[],
  };
}

function groupBy<T>(rows: T[], key: (row: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const row of rows) {
    const k = key(row);
    (out[k] ||= []).push(row);
  }
  return out;
}

function indexBy<T>(rows: T[], key: (row: T) => string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const row of rows) out[key(row)] = row;
  return out;
}

function unique<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}
