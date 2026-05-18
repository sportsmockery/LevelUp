// Shared helpers for /api/publishing/* routes.

import { NextResponse } from 'next/server';
import { getRouteClient, getServiceClient } from '@/lib/supabase-publishing-server';
import type { Release, Track, TrackPublisher, TrackWriter, WriterProfile, PublisherProfile } from '@/types/catalog';
import type { ReleaseContext } from '@/lib/validation/catalog-validation';

export async function requireUser() {
  const supabase = await getRouteClient();
  if (!supabase) return { error: NextResponse.json({ error: 'no_supabase' }, { status: 500 }) } as const;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'not_authenticated' }, { status: 401 }) } as const;
  return { user, supabase } as const;
}

export async function loadReleaseContext(orgId: string, releaseId: string): Promise<{ ctx: ReleaseContext; orgName: string } | null> {
  const svc = getServiceClient();
  if (!svc) return null;

  const { data: org } = await svc.from('organizations').select('name').eq('id', orgId).maybeSingle();
  const { data: release } = await svc.from('releases').select('*').eq('id', releaseId).maybeSingle();
  if (!release) return null;

  const { data: tracks } = await svc.from('tracks').select('*').eq('release_id', releaseId).order('track_number');
  const trackIds = (tracks ?? []).map((t: any) => t.id);

  const [{ data: trackWriters }, { data: trackPublishers }, { data: writers }, { data: publishers }] = await Promise.all([
    trackIds.length ? svc.from('track_writers').select('*').in('track_id', trackIds) : Promise.resolve({ data: [] }),
    trackIds.length ? svc.from('track_publishers').select('*').in('track_id', trackIds) : Promise.resolve({ data: [] }),
    svc.from('writer_profiles').select('*').eq('org_id', orgId),
    svc.from('publisher_profiles').select('*').eq('org_id', orgId),
  ]);

  return {
    orgName: org?.name ?? 'Unknown Org',
    ctx: {
      release: release as Release,
      tracks: (tracks ?? []) as Track[],
      writers: (writers ?? []) as WriterProfile[],
      publishers: (publishers ?? []) as PublisherProfile[],
      trackWriters: (trackWriters ?? []) as TrackWriter[],
      trackPublishers: (trackPublishers ?? []) as TrackPublisher[],
    },
  };
}
