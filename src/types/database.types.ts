export type UserRole = 'admin' | 'member' | 'lead';

export interface CsrProfile {
  id: string; // Matches auth.users id (UUID)
  email: string;
  full_name: string | null;
  role: UserRole;
  member_id: string | null; // Optional link to a member in csr_members
  created_at?: string;
  updated_at?: string;
}

export interface CsrMember {
  id: string;
  name: string;
  division_id: string;
  division: string;
  year?: string;
  department?: string;
  sec?: string;
  role?: string;
  email?: string;
  phone?: string;
  user_id?: string | null;
  bio?: string;
  avatar_url?: string;
  github_url?: string;
  linkedin_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMemberInput {
  name: string;
  division_id: string;
  division: string;
  year?: string;
  department?: string;
  sec?: string;
  role?: string;
  email?: string;
  phone?: string;
  bio?: string;
  github_url?: string;
  linkedin_url?: string;
}

export interface UpdateMemberInput extends Partial<CreateMemberInput> {
  user_id?: string | null;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface CsrApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  reg_no?: string;
  year: string;
  department: string;
  sec?: string;
  primary_division: string;
  secondary_division?: string;
  technical_skills?: string;
  statement_of_purpose: string;
  portfolio_link?: string;
  criteria_accepted: boolean;
  status: ApplicationStatus;
  created_at?: string;
  updated_at?: string;
}

export interface CreateApplicationInput {
  full_name: string;
  email: string;
  phone: string;
  reg_no?: string;
  year: string;
  department: string;
  sec?: string;
  primary_division: string;
  secondary_division?: string;
  technical_skills?: string;
  statement_of_purpose: string;
  portfolio_link?: string;
  criteria_accepted: boolean;
}

