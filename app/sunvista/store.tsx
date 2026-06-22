'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Job, JobStage } from '@/lib/sunvista/schemas';
import { SEED_JOBS } from '@/lib/sunvista/mock/projects';

const STORAGE_KEY = 'sunvista-buildai-jobs-v1';

interface StoreValue {
  jobs: Job[];
  activeJobId: string | null;
  setActiveJobId: (id: string | null) => void;
  activeJob: Job | null;
  addJob: (job: Job) => void;
  updateJob: (id: string, patch: Partial<Job>) => void;
  moveJob: (id: string, stage: JobStage) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function SunVistaProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>(SEED_JOBS);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load any demo session from localStorage once on mount so created jobs
  // persist across page reloads. Synchronous setState here is intentional —
  // we hydrate client-only state from an external store after the first render.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { jobs: Job[]; activeJobId: string | null };
        if (Array.isArray(parsed.jobs) && parsed.jobs.length) setJobs(parsed.jobs);
        if (parsed.activeJobId) setActiveJobId(parsed.activeJobId);
      }
    } catch {
      // ignore corrupt state
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ jobs, activeJobId }));
    } catch {
      // ignore quota errors
    }
  }, [jobs, activeJobId, hydrated]);

  const addJob = useCallback((job: Job) => {
    setJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)]);
    setActiveJobId(job.id);
  }, []);

  const updateJob = useCallback((id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const moveJob = useCallback((id: string, stage: JobStage) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, stage } : j)));
  }, []);

  const resetDemo = useCallback(() => {
    setJobs(SEED_JOBS);
    setActiveJobId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const activeJob = jobs.find((j) => j.id === activeJobId) || null;

  return (
    <StoreContext.Provider
      value={{ jobs, activeJobId, setActiveJobId, activeJob, addJob, updateJob, moveJob, resetDemo }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useSunVista(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useSunVista must be used within SunVistaProvider');
  return ctx;
}
