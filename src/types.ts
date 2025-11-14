export type Job = {
  id: string;
  title: string;
  slug: string;
  short_description?: string;
  description?: string;
  overview?: string;
  position_summary?: string;
  responsibilities?: string;
  requirements?: string;
  qualifications?: string;
  benefits?: string;
  location?: string;
  salary?: string;
  job_type_id?: string | null;
  status?: string;
  created_at?: string;
};

export type Application = {
  id: string;
  job_id?: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  location?: string;
  how_heard?: string;
  why_interested?: string;
  experience?: string;
  resume_path?: string;
  resume_url?: string | null;
  cover_letter_path?: string;
  cover_letter_url?: string | null;
  agree_data_sharing?: boolean;
  status?: string;
  created_at?: string;
};