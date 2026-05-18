'use client';

import { createContext, useContext } from 'react';
import type { Organization } from '@/types/catalog';

interface OrgContextValue {
  orgs: Organization[];
  activeOrgId: string | null;
  setActiveOrgId: (id: string | null) => void;
}

export const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used inside ToolingLayout');
  return ctx;
}

export const ACTIVE_ORG_KEY = 'mp_active_org_id';
