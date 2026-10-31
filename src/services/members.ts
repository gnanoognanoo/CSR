import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { members as staticMembers, memberDivisions, type Member } from '../members/data';
import type {
  CsrMember,
  CsrProfile,
  CreateMemberInput,
  UpdateMemberInput,
  UserRole,
  CsrApplication,
  CreateApplicationInput,
  ApplicationStatus,
} from '../types/database.types';

export function mapDbMemberToMember(row: CsrMember): Member {
  return {
    id: row.id,
    name: row.name,
    divisionId: row.division_id,
    division: row.division,
    year: row.year,
    department: row.department,
    role: row.role,
  };
}

/**
 * Fetch all members.
 * Tries Supabase first. The local roster is used only when Supabase is not configured;
 * configured database errors and empty tables are returned as-is, without stale fallback data.
 */
export async function getMembers(): Promise<{ members: Member[]; raw: CsrMember[]; fromSupabase: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return {
      members: [...staticMembers],
      raw: staticMembers.map(m => ({
        id: m.id,
        name: m.name,
        division_id: m.divisionId || '',
        division: m.division || '',
        year: m.year,
        department: m.department,
        role: m.role,
      })),
      fromSupabase: false,
    };
  }

  try {
    const pageSize = 1000;
    const raw: CsrMember[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase.from('csr_members').select('*').order('id', { ascending: true }).range(offset, offset + pageSize - 1);
      if (error) return { members: [], raw: [], fromSupabase: false, error: error.message };
      const page = (data ?? []) as CsrMember[];
      raw.push(...page);
      if (page.length < pageSize) break;
    }
    const mapped = raw.map(mapDbMemberToMember);
    return { members: mapped, raw, fromSupabase: true };
  } catch (err: any) {
    console.error('Unexpected error fetching members:', err);
    return { members: [], raw: [], fromSupabase: false, error: err.message };
  }
}

/**
 * Create a new member (Admin only)
 */
export async function createMember(input: CreateMemberInput): Promise<{ data: CsrMember | null; error?: string }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.' };
  }

  const { data, error } = await supabase
    .from('csr_members')
    .insert([{
      name: input.name,
      division_id: input.division_id,
      division: input.division,
      year: input.year,
      department: input.department,
      sec: input.sec || null,
      role: input.role || 'Member',
      email: input.email || null,
      phone: input.phone || null,
      bio: input.bio || null,
      github_url: input.github_url || null,
      linkedin_url: input.linkedin_url || null,
    }])
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as CsrMember };
}

/**
 * Update an existing member (Admin or Profile owner)
 */
export async function updateMember(id: string, input: UpdateMemberInput): Promise<{ data: CsrMember | null; error?: string }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase is not configured yet.' };
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updates.name = input.name;
  if (input.division_id !== undefined) updates.division_id = input.division_id;
  if (input.division !== undefined) updates.division = input.division;
  if (input.year !== undefined) updates.year = input.year;
  if (input.department !== undefined) updates.department = input.department;
  if (input.sec !== undefined) updates.sec = input.sec;
  if (input.role !== undefined) updates.role = input.role;
  if (input.email !== undefined) updates.email = input.email;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.bio !== undefined) updates.bio = input.bio;
  if (input.github_url !== undefined) updates.github_url = input.github_url;
  if (input.linkedin_url !== undefined) updates.linkedin_url = input.linkedin_url;
  if (input.user_id !== undefined) updates.user_id = input.user_id;

  const { data, error } = await supabase
    .from('csr_members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as CsrMember };
}

/**
 * Delete a member (Admin only)
 */
export async function deleteMember(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured yet.' };
  }

  const { error } = await supabase
    .from('csr_members')
    .delete()
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Sync static members list into Supabase (Admin utility)
 */
export async function syncStaticMembersToSupabase(): Promise<{ inserted: number; error?: string }> {
  if (!isSupabaseConfigured) {
    return { inserted: 0, error: 'Supabase is not configured.' };
  }

  const payload = staticMembers.map(m => ({
    id: m.id,
    name: m.name,
    division_id: m.divisionId || '',
    division: m.division || '',
    year: m.year || null,
    department: m.department || null,
    role: m.role || 'Member',
  }));

  const { data, error } = await supabase
    .from('csr_members')
    .upsert(payload, { onConflict: 'id' })
    .select('id');

  if (error) return { inserted: 0, error: error.message };
  return { inserted: data?.length || 0 };
}

/**
 * Fetch member record linked to user_id
 */
export async function getMemberByUserId(userId: string): Promise<CsrMember | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('csr_members')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as CsrMember;
}

/**
 * Fetch all registered user profiles (Admin only)
 */
export async function getAllProfiles(): Promise<{ profiles: CsrProfile[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { profiles: [], error: 'Supabase is not configured.' };
  }

  const { data, error } = await supabase
    .from('csr_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { profiles: [], error: error.message };
  return { profiles: (data || []) as CsrProfile[] };
}

/**
 * Update user role (Admin only)
 */
export async function updateProfileRole(userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const { error } = await supabase
    .from('csr_profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Link a registered user profile to a roster member record
 */
export async function linkUserToMember(userId: string, memberId: string | null): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  // 1. Update profile
  const { error: profileError } = await supabase
    .from('csr_profiles')
    .update({ member_id: memberId, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileError) return { success: false, error: profileError.message };

  // 2. Update member table
  if (memberId) {
    const { error: memberError } = await supabase
      .from('csr_members')
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq('id', memberId);

    if (memberError) console.warn('Could not set user_id on member:', memberError.message);
  }

  return { success: true };
}

/**
 * Submit a join community application (Public)
 */
export async function submitApplication(input: CreateApplicationInput): Promise<{ data: CsrApplication | null; error?: string }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Database service is currently unavailable.' };
  }

  const { data, error } = await supabase
    .from('csr_applications')
    .insert([{
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      reg_no: input.reg_no || null,
      year: input.year,
      department: input.department,
      sec: input.sec || null,
      primary_division: input.primary_division,
      secondary_division: input.secondary_division || null,
      technical_skills: input.technical_skills || null,
      statement_of_purpose: input.statement_of_purpose,
      portfolio_link: input.portfolio_link || null,
      criteria_accepted: input.criteria_accepted,
      status: 'pending',
    }])
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as CsrApplication };
}

/**
 * Fetch all applications (Admin only)
 */
export async function getApplications(): Promise<{ applications: CsrApplication[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { applications: [], error: 'Supabase is not configured.' };
  }

  const { data, error } = await supabase
    .from('csr_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { applications: [], error: error.message };
  return { applications: (data || []) as CsrApplication[] };
}

/**
 * Update application status (Admin only)
 */
export async function updateApplicationStatus(id: string, status: ApplicationStatus): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const { error } = await supabase
    .from('csr_applications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Approve application and add to official roster (Admin only)
 */
export async function approveApplicationAndAddToRoster(app: CsrApplication): Promise<{ success: boolean; member?: CsrMember; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  // Find division short/full name
  const div = memberDivisions.find(d => d.name === app.primary_division || d.id === app.primary_division);
  const divId = div ? div.id : 'software';
  const divName = div ? div.name : app.primary_division;

  // 1. Create member in csr_members
  const { data: newMember, error: memberError } = await supabase
    .from('csr_members')
    .insert([{
      name: app.full_name,
      division_id: divId,
      division: divName,
      year: app.year,
      department: app.department,
      sec: app.sec || null,
      role: 'Member',
      email: app.email,
      phone: app.phone,
      bio: app.statement_of_purpose,
      github_url: app.portfolio_link || null,
    }])
    .select()
    .single();

  if (memberError) {
    return { success: false, error: `Could not create roster member: ${memberError.message}` };
  }

  // 2. Mark application approved
  await supabase
    .from('csr_applications')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', app.id);

  return { success: true, member: newMember as CsrMember };
}

