export interface EmailTemplate {
  id?: string;
  template_name: string;
  template_type: string;
  description?: string;
  subject: string;
  main_message: string;
  visibility: "public" | "private" | "custom";
  allowed_user_ids?: string[];
  is_default?: boolean;
  role?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    deleted: boolean;
  };
}
