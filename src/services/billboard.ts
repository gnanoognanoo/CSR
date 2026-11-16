import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { CsrBillboardMember } from '../types/database.types';

export const DEFAULT_BILLBOARD: CsrBillboardMember[] = [
  {
    id: 1,
    position: 1,
    name: 'Paul Bryton Raj',
    title: 'Executive Council Member',
    division: 'Research & Development',
    year: 'II Year',
    department: 'Artificial Intelligence and Data Science',
    member_id: null,
  },
  {
    id: 2,
    position: 2,
    name: 'GNANESHWAR R',
    title: 'Executive Council Member',
    division: 'Software Engineering',
    year: 'II Year',
    department: 'Computer Science and Engineering',
    member_id: null,
  },
  {
    id: 3,
    position: 3,
    name: 'Krishanth',
    title: 'Executive Council Member',
    division: 'Software Engineering',
    year: 'II Year',
    department: 'Computer Science and Engineering',
    member_id: null,
  },
  {
    id: 4,
    position: 4,
    name: 'Shivanya Arunachalam',
    title: 'Executive Council Member',
    division: 'Software Engineering',
    year: 'II Year',
    department: 'Computer Science and Engineering',
    member_id: null,
  },
  {
    id: 5,
    position: 5,
    name: 'NHESIKA S G',
    title: 'Executive Council Member',
    division: 'Software Engineering',
    year: 'II Year',
    department: 'Artificial Intelligence and Data Science',
    member_id: null,
  },
  {
    id: 6,
    position: 6,
    name: 'Council Member 6',
    title: 'Council Representative',
    division: 'Research & Advanced Systems',
    year: 'III Year',
    department: 'Electronics and Communication Engineering',
    member_id: null,
  },
];

const LOCAL_STORAGE_KEY = 'csr_billboard_members_v1';

/**
 * Fetch the 6 Billboard members from Supabase `csr_billboard`,
 * with fallback to localStorage or default council.
 */
export async function getBillboardMembers(): Promise<{ items: CsrBillboardMember[]; fromSupabase: boolean; error?: string }> {
  // Check localStorage first as fast cache
  let localData: CsrBillboardMember[] | null = null;
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      localData = JSON.parse(cached);
    }
  } catch {
    // ignore
  }

  if (!isSupabaseConfigured) {
    return { items: localData || DEFAULT_BILLBOARD, fromSupabase: false };
  }

  try {
    const { data, error } = await supabase
      .from('csr_billboard')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      // Table may not yet be created in Supabase SQL editor; fall back gracefully
      return { items: localData || DEFAULT_BILLBOARD, fromSupabase: false, error: error.message };
    }

    if (data && data.length > 0) {
      const mapped = data as CsrBillboardMember[];
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mapped));
      } catch {}
      return { items: mapped, fromSupabase: true };
    }

    return { items: localData || DEFAULT_BILLBOARD, fromSupabase: true };
  } catch (err: any) {
    return { items: localData || DEFAULT_BILLBOARD, fromSupabase: false, error: err.message };
  }
}

/**
 * Update the 6 Billboard members in Supabase (or localStorage fallback)
 */
export async function saveBillboardMembers(items: CsrBillboardMember[]): Promise<{ success: boolean; error?: string }> {
  // Always update localStorage so changes are immediately visible
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {}

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    // Upsert into csr_billboard
    const upserts = items.map(item => ({
      position: item.position,
      name: item.name ? item.name.trim() : '',
      title: item.title ? item.title.trim() : '',
      division: item.division || 'Software Engineering',
      year: item.year || '',
      department: item.department || '',
      avatar_url: item.avatar_url || null,
      member_id: item.member_id || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('csr_billboard')
      .upsert(upserts, { onConflict: 'position' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
