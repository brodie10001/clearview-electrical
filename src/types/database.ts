// Hand-written to match supabase/migrations/*.sql. Regenerate with
// `supabase gen types typescript --linked > src/types/database.ts` once the
// project is linked to a live Supabase instance, then reconcile any drift.

export type ProfileRole = "owner" | "admin" | "technician";

export type PropertyType = "residential" | "commercial" | "industrial";
export type PropertyStatus = "active" | "archived";

export type PhaseType = "single_phase" | "three_phase";

export type PropertyContactRole =
  | "owner"
  | "tenant"
  | "property_manager"
  | "builder"
  | "site_supervisor"
  | "accounts_contact"
  | "emergency_contact";

export type JobStatus =
  | "New"
  | "Quoting"
  | "Awaiting Approval"
  | "Ready to Schedule"
  | "Scheduled"
  | "Travelling"
  | "On Site"
  | "On Hold"
  | "Waiting"
  | "Completed"
  | "Closed";

export type JobOutcome = "cancelled" | "declined";

export type SupplierImportTargetField =
  | "supplier_sku"
  | "material_name"
  | "cost_price"
  | "unit"
  | "brand"
  | "category";

export type VehicleStockMovementType = "Add" | "Remove" | "Adjust" | "Restock";

export type InvoiceStatus =
  | "Not Required"
  | "Draft"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Written Off";

// An individual invoice's own status (adds Void, drops the job-level-only
// "Not Required"). jobs.invoice_status is derived from these automatically
// -- see recompute_job_invoice_status -- and is never manually set.
export type InvoiceRecordStatus =
  | "Draft"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Void"
  | "Written Off";

export type PaymentTerms = "Due on Receipt" | "7 days" | "14 days" | "30 days";

export type InvoiceAmountType = "percentage" | "fixed";

export type VariationStatus = "Draft" | "Approved" | "Rejected";

export type ComplianceDocumentStatus = "Draft" | "Issued" | "Lodged";
export type CertificateStatus = "Not Required" | "Required" | "Pending" | "Issued";
export type NoticeStatus = "Not Required" | "Required" | "Lodged";
export type TestResult = "Pass" | "Fail" | "N/A";

export type ComplianceFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "checkbox"
  | "select";

export interface ComplianceFieldDef {
  key: string;
  label: string;
  type: ComplianceFieldType;
  required: boolean;
  options?: string[];
}

export type DocumentType =
  | "photo"
  | "floor_plan"
  | "certificate"
  | "test_result"
  | "defect_report"
  | "other";

export type PhotoCategory =
  | "Before"
  | "After"
  | "Issue-Defect"
  | "Switchboard"
  | "Testing-Compliance"
  | "General";

export type CompanyFont = "Helvetica" | "Times-Roman" | "Courier";

export type QuoteStatus = "Draft" | "Sent" | "Accepted" | "Rejected";

export type QuoteLineType = "labour" | "material";

export type VisitStatus = "Scheduled" | "In Progress" | "Completed" | "Cancelled" | "Rescheduled";

export type QuoteActivityType = "Sent" | "Viewed" | "Accepted" | "Declined";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          role: ProfileRole;
          active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          billing_address: string | null;
          notes: string | null;
          payment_terms: PaymentTerms | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["customers"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Row"]>;
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          customer_id: string;
          address: string;
          gps_lat: number | null;
          gps_lng: number | null;
          property_type: PropertyType;
          status: PropertyStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["properties"]["Row"]> & {
          customer_id: string;
          address: string;
          property_type: PropertyType;
        };
        Update: Partial<Database["public"]["Tables"]["properties"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "properties_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      property_access: {
        Row: {
          property_id: string;
          gate_code: string | null;
          alarm_instructions: string | null;
          lockbox_location: string | null;
          parking_instructions: string | null;
          pets_notes: string | null;
          hazards_notes: string | null;
          ceiling_access_notes: string | null;
          roof_access_notes: string | null;
          restricted_areas_notes: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["property_access"]["Row"]
        > & { property_id: string };
        Update: Partial<Database["public"]["Tables"]["property_access"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "property_access_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: true;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      property_electrical: {
        Row: {
          property_id: string;
          switchboard_location: string | null;
          switchboard_brand: string | null;
          main_switch_rating: string | null;
          phase_type: PhaseType | null;
          consumer_mains_size: string | null;
          meter_number: string | null;
          solar_installed: boolean;
          battery_installed: boolean;
          generator_installed: boolean;
          surge_protection: boolean;
          ev_charger: boolean;
          existing_rcds: string | null;
          existing_rcbos: string | null;
          main_earth_location: string | null;
          men_location: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["property_electrical"]["Row"]
        > & { property_id: string };
        Update: Partial<
          Database["public"]["Tables"]["property_electrical"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "property_electrical_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: true;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["contacts"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Row"]>;
        Relationships: [];
      };
      property_contacts: {
        Row: {
          id: string;
          property_id: string;
          contact_id: string;
          role: PropertyContactRole;
        };
        Insert: Partial<
          Database["public"]["Tables"]["property_contacts"]["Row"]
        > & { property_id: string; contact_id: string; role: PropertyContactRole };
        Update: Partial<
          Database["public"]["Tables"]["property_contacts"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "property_contacts_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_contacts_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          id: string;
          property_id: string;
          primary_contact_id: string | null;
          job_status: JobStatus;
          outcome: JobOutcome | null;
          invoice_status: InvoiceStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["jobs"]["Row"]> & {
          property_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "jobs_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_primary_contact_id_fkey";
            columns: ["primary_contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      job_visits: {
        Row: {
          id: string;
          job_id: string;
          scheduled_date: string;
          start_time: string | null;
          expected_duration_minutes: number | null;
          assigned_worker: string | null;
          notes: string | null;
          visit_status: VisitStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["job_visits"]["Row"]> & {
          job_id: string;
          scheduled_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["job_visits"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "job_visits_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_visits_assigned_worker_fkey";
            columns: ["assigned_worker"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          property_id: string;
          job_id: string | null;
          type: DocumentType;
          photo_category: PhotoCategory | null;
          file_url: string;
          caption: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["documents"]["Row"]> & {
          property_id: string;
          type: DocumentType;
          file_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "documents_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      personal_note_items: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          is_checked: boolean;
          position: number;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["personal_note_items"]["Row"]
        > & { user_id: string; text: string };
        Update: Partial<Database["public"]["Tables"]["personal_note_items"]["Row"]>;
        Relationships: [];
      };
      business_settings: {
        Row: {
          id: boolean;
          trading_name: string | null;
          abn: string | null;
          license_number: string | null;
          logo_url: string | null;
          logo_light_url: string | null;
          logo_dark_url: string | null;
          primary_color: string;
          secondary_color: string;
          accent_color: string;
          company_font: CompanyFont;
          email_signature: string | null;
          quote_header: string | null;
          invoice_footer: string | null;
          default_material_markup_percent: number;
          gst_registered: boolean;
          default_payment_terms: PaymentTerms;
          quote_terms: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["business_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["business_settings"]["Row"]>;
        Relationships: [];
      };
      labour_rate_types: {
        Row: {
          id: string;
          name: string;
          rate_per_hour: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["labour_rate_types"]["Row"]> & {
          name: string;
          rate_per_hour: number;
        };
        Update: Partial<Database["public"]["Tables"]["labour_rate_types"]["Row"]>;
        Relationships: [];
      };
      quotes: {
        Row: {
          id: string;
          job_id: string;
          quote_number: string;
          status: QuoteStatus;
          expiry_date: string | null;
          notes: string | null;
          subtotal: number;
          gst_amount: number;
          total: number;
          gst_applied: boolean;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["quotes"]["Row"]> & {
          job_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["quotes"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "quotes_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_line_items: {
        Row: {
          id: string;
          quote_id: string;
          line_type: QuoteLineType;
          sort_order: number;
          description: string | null;
          labour_rate_type_id: string | null;
          rate_per_hour: number | null;
          hours: number | null;
          cost: number | null;
          markup_percent: number | null;
          quantity: number | null;
          sell_price: number | null;
          source_catalogue_product_id: string | null;
          line_total: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["quote_line_items"]["Row"]> & {
          quote_id: string;
          line_type: QuoteLineType;
        };
        Update: Partial<Database["public"]["Tables"]["quote_line_items"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "quote_line_items_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_line_items_labour_rate_type_id_fkey";
            columns: ["labour_rate_type_id"];
            isOneToOne: false;
            referencedRelation: "labour_rate_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_line_items_source_catalogue_product_id_fkey";
            columns: ["source_catalogue_product_id"];
            isOneToOne: false;
            referencedRelation: "catalogue_products";
            referencedColumns: ["id"];
          },
        ];
      };
      generic_materials: {
        Row: {
          id: string;
          name: string;
          category: string;
          active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["generic_materials"]["Row"]> & {
          name: string;
          category: string;
        };
        Update: Partial<Database["public"]["Tables"]["generic_materials"]["Row"]>;
        Relationships: [];
      };
      catalogue_products: {
        Row: {
          id: string;
          generic_material_id: string;
          brand: string | null;
          product_name: string | null;
          cost_price: number;
          default_markup_percent: number | null;
          sell_price: number;
          unit: string;
          needs_category_review: boolean;
          is_preferred: boolean;
          is_custom: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["catalogue_products"]["Row"]> & {
          generic_material_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["catalogue_products"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "catalogue_products_generic_material_id_fkey";
            columns: ["generic_material_id"];
            isOneToOne: false;
            referencedRelation: "generic_materials";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["suppliers"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Row"]>;
        Relationships: [];
      };
      supplier_product_prices: {
        Row: {
          id: string;
          catalogue_product_id: string;
          supplier_id: string;
          supplier_sku: string | null;
          cost_price: number;
          needs_supplier_review: boolean;
          last_updated: string;
          is_preferred: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["supplier_product_prices"]["Row"]> & {
          catalogue_product_id: string;
          supplier_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["supplier_product_prices"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "supplier_product_prices_catalogue_product_id_fkey";
            columns: ["catalogue_product_id"];
            isOneToOne: false;
            referencedRelation: "catalogue_products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_product_prices_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_import_mappings: {
        Row: {
          id: string;
          supplier_id: string;
          source_column_name: string;
          target_field: SupplierImportTargetField;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["supplier_import_mappings"]["Row"]> & {
          supplier_id: string;
          source_column_name: string;
          target_field: SupplierImportTargetField;
        };
        Update: Partial<Database["public"]["Tables"]["supplier_import_mappings"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "supplier_import_mappings_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_stock: {
        Row: {
          id: string;
          catalogue_product_id: string;
          quantity_on_hand: number;
          minimum_stock_level: number;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["vehicle_stock"]["Row"]> & {
          catalogue_product_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["vehicle_stock"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "vehicle_stock_catalogue_product_id_fkey";
            columns: ["catalogue_product_id"];
            isOneToOne: true;
            referencedRelation: "catalogue_products";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_stock_movements: {
        Row: {
          id: string;
          catalogue_product_id: string;
          movement_type: VehicleStockMovementType;
          quantity_change: number;
          reason: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["vehicle_stock_movements"]["Row"]> & {
          catalogue_product_id: string;
          movement_type: VehicleStockMovementType;
          quantity_change: number;
        };
        Update: Partial<Database["public"]["Tables"]["vehicle_stock_movements"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "vehicle_stock_movements_catalogue_product_id_fkey";
            columns: ["catalogue_product_id"];
            isOneToOne: false;
            referencedRelation: "catalogue_products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicle_stock_movements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_variations: {
        Row: {
          id: string;
          job_id: string;
          description: string;
          amount: number;
          status: VariationStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["job_variations"]["Row"]> & {
          job_id: string;
          description: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["job_variations"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "job_variations_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_schedule_templates: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payment_schedule_templates"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["payment_schedule_templates"]["Row"]>;
        Relationships: [];
      };
      payment_schedule_template_stages: {
        Row: {
          id: string;
          template_id: string;
          label: string;
          percentage: number;
          sort_order: number;
        };
        Insert: Partial<
          Database["public"]["Tables"]["payment_schedule_template_stages"]["Row"]
        > & { template_id: string; label: string; percentage: number };
        Update: Partial<Database["public"]["Tables"]["payment_schedule_template_stages"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "payment_schedule_template_stages_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "payment_schedule_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          job_id: string;
          invoice_number: string;
          stage_label: string | null;
          amount_type: InvoiceAmountType;
          percentage: number | null;
          amount: number;
          issue_date: string;
          payment_terms: PaymentTerms;
          due_date: string;
          status: InvoiceRecordStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["invoices"]["Row"]> & {
          job_id: string;
          amount_type: InvoiceAmountType;
          amount: number;
          payment_terms: PaymentTerms;
          due_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "invoices_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          invoice_id: string;
          amount: number;
          paid_date: string;
          method: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]> & {
          invoice_id: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_versions: {
        Row: {
          id: string;
          quote_id: string;
          version_number: number;
          snapshot: unknown;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["quote_versions"]["Row"]> & {
          quote_id: string;
          version_number: number;
          snapshot: unknown;
        };
        Update: Partial<Database["public"]["Tables"]["quote_versions"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "quote_versions_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_public_tokens: {
        Row: {
          id: string;
          quote_id: string;
          token: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["quote_public_tokens"]["Row"]> & {
          quote_id: string;
          token: string;
        };
        Update: Partial<Database["public"]["Tables"]["quote_public_tokens"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "quote_public_tokens_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: true;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_activity: {
        Row: {
          id: string;
          quote_id: string;
          event_type: QuoteActivityType;
          note: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["quote_activity"]["Row"]> & {
          quote_id: string;
          event_type: QuoteActivityType;
        };
        Update: Partial<Database["public"]["Tables"]["quote_activity"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "quote_activity_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      compliance_document_templates: {
        Row: {
          id: string;
          name: string;
          category: string;
          field_schema: ComplianceFieldDef[];
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["compliance_document_templates"]["Row"]> & {
          name: string;
          category: string;
        };
        Update: Partial<Database["public"]["Tables"]["compliance_document_templates"]["Row"]>;
        Relationships: [];
      };
      compliance_documents: {
        Row: {
          id: string;
          job_id: string;
          property_id: string;
          template_id: string;
          field_values: Record<string, unknown>;
          status: ComplianceDocumentStatus;
          external_reference: string | null;
          issued_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["compliance_documents"]["Row"]> & {
          job_id: string;
          property_id: string;
          template_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["compliance_documents"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "compliance_documents_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "compliance_documents_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "compliance_documents_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "compliance_document_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      test_types: {
        Row: {
          id: string;
          name: string;
          default_unit: string | null;
          active: boolean;
          is_custom: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["test_types"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["test_types"]["Row"]>;
        Relationships: [];
      };
      test_records: {
        Row: {
          id: string;
          job_id: string;
          circuit_or_equipment: string;
          test_type_id: string;
          custom_test_type_label: string | null;
          measured_value: number | null;
          unit: string | null;
          result: TestResult;
          instrument_used: string | null;
          tested_at: string;
          tested_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["test_records"]["Row"]> & {
          job_id: string;
          circuit_or_equipment: string;
          test_type_id: string;
          result: TestResult;
        };
        Update: Partial<Database["public"]["Tables"]["test_records"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "test_records_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_records_test_type_id_fkey";
            columns: ["test_type_id"];
            isOneToOne: false;
            referencedRelation: "test_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_records_tested_by_fkey";
            columns: ["tested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_compliance_status: {
        Row: {
          job_id: string;
          requires_testing: boolean;
          requires_certificate: boolean;
          certificate_status: CertificateStatus;
          requires_notice: boolean;
          notice_status: NoticeStatus;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["job_compliance_status"]["Row"]> & {
          job_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["job_compliance_status"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "job_compliance_status_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: true;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
