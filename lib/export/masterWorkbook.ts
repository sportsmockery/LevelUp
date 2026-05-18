// Master Workbook — catalog-wide 10-tab XLSX covering every release in an org.
// Tabs: Release Info, Tracks, Writers, Publishers, Splits, ISRC Ledger,
// Platform Status, Custom Fields, Generated Files, Audit Log.

import { getServiceClient } from '@/lib/supabase-publishing-server';
import { archiveFile } from '@/lib/files/workbookArchive';
import { buildXlsx, fmtDuration, type Sheet } from '@/lib/export/spreadsheet';
import type { GeneratedFile } from '@/types/exports';

export async function buildMasterWorkbook(orgId: string, createdBy: string | null): Promise<GeneratedFile | null> {
  const sb = getServiceClient();
  if (!sb) return null;

  const [
    { data: org },
    { data: releases },
    { data: tracks },
    { data: writers },
    { data: publishers },
    { data: trackWriters },
    { data: trackPublishers },
    { data: isrcs },
    { data: registrations },
    { data: customFields },
    { data: customValues },
    { data: files },
    { data: audits },
  ] = await Promise.all([
    sb.from('organizations').select('name,slug').eq('id', orgId).maybeSingle(),
    sb.from('releases').select('*').eq('org_id', orgId),
    sb.from('tracks').select('*').eq('org_id', orgId),
    sb.from('writer_profiles').select('*').eq('org_id', orgId),
    sb.from('publisher_profiles').select('*').eq('org_id', orgId),
    sb.from('track_writers').select('*'),
    sb.from('track_publishers').select('*'),
    sb.from('isrc_codes').select('*').eq('org_id', orgId),
    sb.from('platform_registrations').select('*').eq('org_id', orgId),
    sb.from('custom_fields').select('*').eq('org_id', orgId),
    sb.from('custom_field_values').select('*'),
    sb.from('generated_files').select('*').eq('org_id', orgId),
    sb.from('audit_logs').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(2000),
  ]);

  const orgName = org?.name ?? 'Organization';
  const trackIds = new Set((tracks ?? []).map((t: any) => t.id));
  const releaseById = new Map((releases ?? []).map((r: any) => [r.id, r]));
  const writerById = new Map((writers ?? []).map((w: any) => [w.id, w]));
  const publisherById = new Map((publishers ?? []).map((p: any) => [p.id, p]));
  const trackById = new Map((tracks ?? []).map((t: any) => [t.id, t]));

  const releaseSheet: Sheet = {
    name: 'Releases',
    headers: ['title', 'type', 'primary_artist', 'label', 'upc', 'catalog_number', 'release_date', 'language', 'genre', 'copyright_year', 'p_line', 'c_line', 'distributor', 'artwork_path', 'notes'],
    rows: (releases ?? []).map((r: any) => ({
      title: r.release_title, type: r.release_type, primary_artist: r.primary_artist,
      label: r.label_name, upc: r.upc, catalog_number: r.catalog_number,
      release_date: r.release_date, language: r.language, genre: r.genre,
      copyright_year: r.copyright_year, p_line: r.p_line, c_line: r.c_line,
      distributor: r.distributor, artwork_path: r.artwork_path, notes: r.notes,
    })),
  };

  const tracksSheet: Sheet = {
    name: 'Tracks',
    headers: ['release', 'track_number', 'title', 'version', 'duration', 'duration_ms', 'isrc', 'iswc', 'language', 'explicit', 'instrumental', 'bpm', 'key'],
    rows: (tracks ?? []).map((t: any) => ({
      release: releaseById.get(t.release_id)?.release_title ?? '',
      track_number: t.track_number, title: t.track_title, version: t.version,
      duration: fmtDuration(t.duration_ms), duration_ms: t.duration_ms,
      isrc: t.isrc, iswc: t.iswc, language: t.language,
      explicit: t.explicit, instrumental: t.instrumental,
      bpm: t.bpm, key: t.musical_key,
    })),
  };

  const writersSheet: Sheet = {
    name: 'Writers',
    headers: ['legal_name', 'stage_name', 'pro', 'ipi_number', 'country', 'email', 'phone', 'notes'],
    rows: (writers ?? []).map((w: any) => ({
      legal_name: w.legal_name, stage_name: w.stage_name, pro: w.pro,
      ipi_number: w.ipi_number, country: w.country, email: w.email, phone: w.phone, notes: w.notes,
    })),
  };

  const publishersSheet: Sheet = {
    name: 'Publishers',
    headers: ['publisher_name', 'legal_entity_name', 'pro', 'ipi_number', 'publisher_type', 'admin_company', 'territory', 'ownership_percentage', 'email', 'phone', 'notes'],
    rows: (publishers ?? []).map((p: any) => ({
      publisher_name: p.publisher_name, legal_entity_name: p.legal_entity_name,
      pro: p.pro, ipi_number: p.ipi_number, publisher_type: p.publisher_type,
      admin_company: p.admin_company, territory: p.territory,
      ownership_percentage: p.ownership_percentage,
      email: p.email, phone: p.phone, notes: p.notes,
    })),
  };

  const splitsSheet: Sheet = {
    name: 'Splits',
    headers: ['release', 'track', 'side', 'party', 'pro', 'ipi', 'role', 'share_percent', 'approval_status'],
    rows: [
      ...(trackWriters ?? []).filter((tw: any) => trackIds.has(tw.track_id)).map((tw: any) => {
        const t = trackById.get(tw.track_id);
        const r = t ? releaseById.get(t.release_id) : null;
        const w = writerById.get(tw.writer_profile_id);
        return {
          release: r?.release_title ?? '', track: t?.track_title ?? '',
          side: 'writer', party: w?.legal_name ?? '', pro: w?.pro ?? '', ipi: w?.ipi_number ?? '',
          role: tw.role, share_percent: Number(tw.share_percent), approval_status: tw.approval_status,
        };
      }),
      ...(trackPublishers ?? []).filter((tp: any) => trackIds.has(tp.track_id)).map((tp: any) => {
        const t = trackById.get(tp.track_id);
        const r = t ? releaseById.get(t.release_id) : null;
        const p = publisherById.get(tp.publisher_profile_id);
        return {
          release: r?.release_title ?? '', track: t?.track_title ?? '',
          side: 'publisher', party: p?.publisher_name ?? '', pro: p?.pro ?? '', ipi: p?.ipi_number ?? '',
          role: '', share_percent: Number(tp.share_percent), approval_status: '',
        };
      }),
    ],
  };

  const isrcSheet: Sheet = {
    name: 'ISRC Ledger',
    headers: ['isrc', 'status', 'assigned_track', 'assigned_release', 'assigned_date', 'country_code', 'registrant_code', 'year', 'designation_code', 'notes'],
    rows: (isrcs ?? []).map((i: any) => {
      const t = i.track_id ? trackById.get(i.track_id) : null;
      const r = t ? releaseById.get(t.release_id) : (i.release_id ? releaseById.get(i.release_id) : null);
      return {
        isrc: i.isrc_code, status: i.status, assigned_track: t?.track_title ?? '',
        assigned_release: r?.release_title ?? '',
        assigned_date: i.assigned_date, country_code: i.country_code,
        registrant_code: i.registrant_code, year: i.year, designation_code: i.designation_code,
        notes: i.notes,
      };
    }),
  };

  const platformSheet: Sheet = {
    name: 'Platform Status',
    headers: ['release', 'platform', 'status', 'confirmation_number', 'confirmation_url', 'submitted_at', 'confirmed_at', 'notes'],
    rows: (registrations ?? []).map((r: any) => {
      const rel = r.release_id ? releaseById.get(r.release_id) : null;
      return {
        release: rel?.release_title ?? '', platform: r.platform, status: r.status,
        confirmation_number: r.confirmation_number, confirmation_url: r.confirmation_url,
        submitted_at: r.submitted_at, confirmed_at: r.confirmed_at, notes: r.notes,
      };
    }),
  };

  const customFieldsSheet: Sheet = {
    name: 'Custom Fields',
    headers: ['entity_type', 'field_key', 'field_label', 'field_type', 'options', 'entity_id', 'value'],
    rows: [],
  };
  const fieldById = new Map((customFields ?? []).map((cf: any) => [cf.id, cf]));
  for (const v of customValues ?? []) {
    const cf = fieldById.get(v.custom_field_id);
    if (!cf) continue;
    customFieldsSheet.rows.push({
      entity_type: cf.entity_type, field_key: cf.field_key,
      field_label: cf.field_label, field_type: cf.field_type,
      options: JSON.stringify(cf.options ?? []),
      entity_id: v.entity_id,
      value: typeof v.value === 'string' ? v.value : JSON.stringify(v.value ?? null),
    });
  }
  // Also list field definitions that have no values, so the schema is exported even when empty.
  for (const cf of customFields ?? []) {
    if (!(customValues ?? []).some((v: any) => v.custom_field_id === cf.id)) {
      customFieldsSheet.rows.push({
        entity_type: cf.entity_type, field_key: cf.field_key,
        field_label: cf.field_label, field_type: cf.field_type,
        options: JSON.stringify(cf.options ?? []),
        entity_id: '',
        value: '',
      });
    }
  }

  const filesSheet: Sheet = {
    name: 'Generated Files',
    headers: ['platform', 'release', 'file_name', 'file_type', 'version', 'created_at', 'file_path', 'notes'],
    rows: (files ?? []).map((f: any) => {
      const r = f.release_id ? releaseById.get(f.release_id) : null;
      return {
        platform: f.platform, release: r?.release_title ?? '',
        file_name: f.file_name, file_type: f.file_type, version: f.version,
        created_at: f.created_at, file_path: f.file_path, notes: f.notes,
      };
    }),
  };

  const auditSheet: Sheet = {
    name: 'Audit Log',
    headers: ['created_at', 'entity_type', 'entity_id', 'action', 'old_value', 'new_value'],
    rows: (audits ?? []).map((a: any) => ({
      created_at: a.created_at, entity_type: a.entity_type, entity_id: a.entity_id,
      action: a.action,
      old_value: a.old_value ? JSON.stringify(a.old_value) : '',
      new_value: a.new_value ? JSON.stringify(a.new_value) : '',
    })),
  };

  const sheets: Sheet[] = [
    releaseSheet, tracksSheet, writersSheet, publishersSheet, splitsSheet,
    isrcSheet, platformSheet, customFieldsSheet, filesSheet, auditSheet,
  ];

  const xlsx = await buildXlsx(sheets);
  const fileName = `Master_Workbook_${(org?.slug ?? 'org')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return await archiveFile({
    orgId,
    releaseId: null,
    platform: 'master',
    fileName,
    fileType: 'workbook_xlsx',
    buffer: xlsx,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    createdBy,
    notes: `Catalog snapshot for ${orgName}`,
  });
}
