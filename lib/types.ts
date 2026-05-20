export type ProviderProfile = {
  id: string;
  email: string | null;
  business_name: string | null;
  logo_url: string | null;
  brand_color: string | null;
  created_at: string;
};

export type ClientPortal = {
  id: string;
  provider_id: string;
  name: string;
  email: string | null;
  company: string | null;
  project_name: string;
  project_status: string;
  slug: string;
  access_code: string | null;
  created_at: string;
};

export type PortalFile = {
  id: string;
  provider_id: string;
  client_id: string;
  title: string;
  file_path: string;
  file_type: "deliverable" | "client_upload";
  uploaded_by: "provider" | "client";
  created_at: string;
};

export type Milestone = {
  id: string;
  provider_id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "complete";
  due_date: string | null;
  created_at: string;
};

export type Approval = {
  id: string;
  provider_id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: "pending" | "approved" | "changes_requested";
  response_note: string | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  provider_id: string;
  client_id: string;
  title: string;
  amount: number;
  status: "unpaid" | "paid";
  payment_url: string;
  created_at: string;
};

export type Update = {
  id: string;
  provider_id: string;
  client_id: string;
  title: string;
  body: string;
  created_at: string;
};

export type PortalBundle = {
  provider: ProviderProfile | null;
  client: ClientPortal | null;
  files: PortalFile[];
  milestones: Milestone[];
  approvals: Approval[];
  invoices: Invoice[];
  updates: Update[];
};
