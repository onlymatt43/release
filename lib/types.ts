export interface Shoot {
  id: string;
  title: string;
  shoot_date: string;
  photographer: string;
  location: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
  contract_count?: number;
}

export interface Contact {
  id: string;
  legal_name: string;
  stage_name: string;
  main_url: string | null;
  birth_date: string;
  email: string;
  phone: string | null;
  address: string;
  doc_type: string | null;
  recto_id_key: string | null;
  verso_id_key: string | null;
  selfie_key: string | null;
  created_at: string;
  updated_at: string;
  participation_count?: number;
}

export interface Participation {
  id: string;
  contact_id: string;
  shoot_id: string;
  category: string | null;
  consent_recording: number;
  consent_publication: number;
  consent_adult: number;
  ip_address: string | null;
  signed_at: string;
  // joined fields
  legal_name?: string;
  stage_name?: string;
  email?: string;
}

/** @deprecated use Contact + Participation */
export type Contract = Contact;
