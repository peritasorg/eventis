export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          request_path: string | null
          risk_level: string | null
          security_event: boolean | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          request_path?: string | null
          risk_level?: string | null
          security_event?: boolean | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          request_path?: string | null
          risk_level?: string | null
          security_event?: boolean | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          endpoint: string
          id: string
          method: string
          rate_limit_remaining: number | null
          rate_limit_reset: string | null
          request_size_bytes: number | null
          response_size_bytes: number | null
          response_time_ms: number | null
          status_code: number | null
          tenant_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          method: string
          rate_limit_remaining?: number | null
          rate_limit_reset?: string | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          tenant_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          method?: string
          rate_limit_remaining?: number | null
          rate_limit_reset?: string | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          amount: number
          billing_type: string
          created_at: string | null
          due_date: string
          grace_period_ends: string | null
          id: string
          last_attempt_at: string | null
          paid_at: string | null
          payment_attempts: number | null
          payment_method: string | null
          status: string | null
          stripe_invoice_id: string | null
          suspended_at: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          billing_type: string
          created_at?: string | null
          due_date: string
          grace_period_ends?: string | null
          id?: string
          last_attempt_at?: string | null
          paid_at?: string | null
          payment_attempts?: number | null
          payment_method?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          suspended_at?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          billing_type?: string
          created_at?: string | null
          due_date?: string
          grace_period_ends?: string | null
          id?: string
          last_attempt_at?: string | null
          paid_at?: string | null
          payment_attempts?: number | null
          payment_method?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          suspended_at?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_field_mappings: {
        Row: {
          calendar_field: string
          created_at: string
          event_field: string
          id: string
          integration_id: string
          is_active: boolean
          mapping_type: string
          template_format: string | null
          tenant_id: string
        }
        Insert: {
          calendar_field: string
          created_at?: string
          event_field: string
          id?: string
          integration_id: string
          is_active?: boolean
          mapping_type?: string
          template_format?: string | null
          tenant_id: string
        }
        Update: {
          calendar_field?: string
          created_at?: string
          event_field?: string
          id?: string
          integration_id?: string
          is_active?: boolean
          mapping_type?: string
          template_format?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_field_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          access_token: string
          calendar_id: string
          calendar_name: string | null
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          provider: string
          refresh_token: string | null
          sync_direction: string
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id: string
          calendar_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          provider: string
          refresh_token?: string | null
          sync_direction?: string
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string
          calendar_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          provider?: string
          refresh_token?: string | null
          sync_direction?: string
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_sync_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string | null
          external_event_id: string | null
          id: string
          integration_id: string
          operation: string
          status: string
          sync_data: Json | null
          sync_direction: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          external_event_id?: string | null
          id?: string
          integration_id: string
          operation: string
          status: string
          sync_data?: Json | null
          sync_direction: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          external_event_id?: string | null
          id?: string
          integration_id?: string
          operation?: string
          status?: string
          sync_data?: Json | null
          sync_direction?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_preferences: {
        Row: {
          auto_sync: boolean
          created_at: string
          description_template: string | null
          id: string
          include_form_data: boolean
          integration_id: string
          sync_event_statuses: string[] | null
          sync_event_types: string[] | null
          sync_frequency: number
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync?: boolean
          created_at?: string
          description_template?: string | null
          id?: string
          include_form_data?: boolean
          integration_id: string
          sync_event_statuses?: string[] | null
          sync_event_types?: string[] | null
          sync_frequency?: number
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync?: boolean
          created_at?: string
          description_template?: string | null
          id?: string
          include_form_data?: boolean
          integration_id?: string
          sync_event_statuses?: string[] | null
          sync_event_types?: string[] | null
          sync_frequency?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_preferences_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_timeline: {
        Row: {
          communication_type: string
          created_at: string | null
          created_by: string | null
          event_id: string
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          summary: string
          tenant_id: string
        }
        Insert: {
          communication_type: string
          created_at?: string | null
          created_by?: string | null
          event_id: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          summary: string
          tenant_id: string
        }
        Update: {
          communication_type?: string
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          summary?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_timeline_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_timeline_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          accessibility_requirements: string | null
          active: boolean | null
          address_line1: string | null
          address_line2: string | null
          average_event_value: number | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          customer_since: string | null
          customer_type: string | null
          dietary_requirements: string | null
          email: string | null
          id: string
          last_event_date: string | null
          lead_id: string | null
          marketing_consent: boolean | null
          mobile: string | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          preferred_contact_method: string | null
          special_requests: string | null
          tenant_id: string | null
          total_events: number | null
          total_spent: number | null
          updated_at: string | null
          vip_status: boolean | null
        }
        Insert: {
          accessibility_requirements?: string | null
          active?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          average_event_value?: number | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          customer_since?: string | null
          customer_type?: string | null
          dietary_requirements?: string | null
          email?: string | null
          id?: string
          last_event_date?: string | null
          lead_id?: string | null
          marketing_consent?: boolean | null
          mobile?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_contact_method?: string | null
          special_requests?: string | null
          tenant_id?: string | null
          total_events?: number | null
          total_spent?: number | null
          updated_at?: string | null
          vip_status?: boolean | null
        }
        Update: {
          accessibility_requirements?: string | null
          active?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          average_event_value?: number | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          customer_since?: string | null
          customer_type?: string | null
          dietary_requirements?: string | null
          email?: string | null
          id?: string
          last_event_date?: string | null
          lead_id?: string | null
          marketing_consent?: boolean | null
          mobile?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_contact_method?: string | null
          special_requests?: string | null
          tenant_id?: string | null
          total_events?: number | null
          total_spent?: number | null
          updated_at?: string | null
          vip_status?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_communications: {
        Row: {
          communication_date: string | null
          communication_type: string | null
          created_at: string | null
          event_id: string
          id: string
          note: string
          tenant_id: string
        }
        Insert: {
          communication_date?: string | null
          communication_type?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          note: string
          tenant_id: string
        }
        Update: {
          communication_date?: string | null
          communication_type?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          note?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_communications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_communications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ethnicity_options: {
        Row: {
          created_at: string | null
          ethnicity_name: string
          id: string
          is_active: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ethnicity_name: string
          id?: string
          is_active?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ethnicity_name?: string
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_ethnicity_options_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_payments: {
        Row: {
          amount_gbp: number
          created_at: string | null
          event_id: string
          id: string
          payment_date: string | null
          payment_note: string | null
          tenant_id: string
        }
        Insert: {
          amount_gbp: number
          created_at?: string | null
          event_id: string
          id?: string
          payment_date?: string | null
          payment_note?: string | null
          tenant_id: string
        }
        Update: {
          amount_gbp?: number
          created_at?: string | null
          event_id?: string
          id?: string
          payment_date?: string | null
          payment_note?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff_assignments: {
        Row: {
          checked_in_at: string | null
          checked_out_at: string | null
          confirmed_at: string | null
          created_at: string | null
          end_time: string
          event_id: string | null
          hourly_rate: number | null
          id: string
          notes: string | null
          performance_rating: number | null
          role: string
          staff_id: string | null
          start_time: string
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          checked_in_at?: string | null
          checked_out_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          end_time: string
          event_id?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          performance_rating?: number | null
          role: string
          staff_id?: string | null
          start_time: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          checked_in_at?: string | null
          checked_out_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          end_time?: string
          event_id?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          performance_rating?: number | null
          role?: string
          staff_id?: string | null
          start_time?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_time_ranges: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean | null
          name: string
          start_time: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          name: string
          start_time: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_time?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_time_ranges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_time_slots: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          start_time: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          start_time: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          start_time?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_type_configs: {
        Row: {
          allow_splitting: boolean | null
          color: string
          created_at: string
          default_sessions: Json | null
          display_name: string
          event_type: string
          id: string
          is_active: boolean
          is_all_day: boolean | null
          sort_order: number
          split_naming_pattern: string | null
          tenant_id: string
          text_color: string
          updated_at: string
        }
        Insert: {
          allow_splitting?: boolean | null
          color?: string
          created_at?: string
          default_sessions?: Json | null
          display_name: string
          event_type: string
          id?: string
          is_active?: boolean
          is_all_day?: boolean | null
          sort_order?: number
          split_naming_pattern?: string | null
          tenant_id: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          allow_splitting?: boolean | null
          color?: string
          created_at?: string
          default_sessions?: Json | null
          display_name?: string
          event_type?: string
          id?: string
          is_active?: boolean
          is_all_day?: boolean | null
          sort_order?: number
          split_naming_pattern?: string | null
          tenant_id?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_type_form_mappings: {
        Row: {
          auto_assign: boolean
          created_at: string
          default_label: string
          event_type_config_id: string
          form_template_id: string
          id: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_assign?: boolean
          created_at?: string
          default_label?: string
          event_type_config_id: string
          form_template_id: string
          id?: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_assign?: boolean
          created_at?: string
          default_label?: string
          event_type_config_id?: string
          form_template_id?: string
          id?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_event_type_form_mappings_event_type_config_id"
            columns: ["event_type_config_id"]
            isOneToOne: false
            referencedRelation: "event_type_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_event_type_form_mappings_form_template_id"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          customer_id: string | null
          deposit_amount_gbp: number | null
          end_time: string | null
          ethnicity: string | null
          event_date: string | null
          event_end_date: string | null
          form_total_gbp: number | null
          id: string
          ladies_count: number | null
          men_count: number | null
          primary_contact_name: string | null
          primary_contact_number: string | null
          secondary_contact_name: string | null
          secondary_contact_number: string | null
          start_time: string | null
          tenant_id: string
          title: string
          total_guest_price_gbp: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          deposit_amount_gbp?: number | null
          end_time?: string | null
          ethnicity?: string | null
          event_date?: string | null
          event_end_date?: string | null
          form_total_gbp?: number | null
          id?: string
          ladies_count?: number | null
          men_count?: number | null
          primary_contact_name?: string | null
          primary_contact_number?: string | null
          secondary_contact_name?: string | null
          secondary_contact_number?: string | null
          start_time?: string | null
          tenant_id: string
          title: string
          total_guest_price_gbp?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          deposit_amount_gbp?: number | null
          end_time?: string | null
          ethnicity?: string | null
          event_date?: string | null
          event_end_date?: string | null
          form_total_gbp?: number | null
          id?: string
          ladies_count?: number | null
          men_count?: number | null
          primary_contact_name?: string | null
          primary_contact_number?: string | null
          secondary_contact_name?: string | null
          secondary_contact_number?: string | null
          start_time?: string | null
          tenant_id?: string
          title?: string
          total_guest_price_gbp?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      field_categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      field_types: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          default_config: Json | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          name: string
          supports_notes: boolean | null
          supports_pricing: boolean | null
          supports_quantity: boolean | null
        }
        Insert: {
          active?: boolean | null
          category: string
          created_at?: string | null
          default_config?: Json | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          name: string
          supports_notes?: boolean | null
          supports_pricing?: boolean | null
          supports_quantity?: boolean | null
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          default_config?: Json | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          name?: string
          supports_notes?: boolean | null
          supports_pricing?: boolean | null
          supports_quantity?: boolean | null
        }
        Relationships: []
      }
      finance_timeline: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          event_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_type: string
          reference_number: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          event_id: string
          id?: string
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          payment_type: string
          reference_number?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
          reference_number?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_timeline_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_timeline_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          active: boolean | null
          allow_save_and_resume: boolean | null
          created_at: string | null
          description: string | null
          event_types: string[] | null
          id: string
          is_default: boolean | null
          is_public: boolean | null
          last_used_at: string | null
          name: string
          require_all_pages: boolean | null
          show_progress_bar: boolean | null
          tenant_id: string | null
          updated_at: string | null
          usage_count: number | null
          version: number | null
        }
        Insert: {
          active?: boolean | null
          allow_save_and_resume?: boolean | null
          created_at?: string | null
          description?: string | null
          event_types?: string[] | null
          id?: string
          is_default?: boolean | null
          is_public?: boolean | null
          last_used_at?: string | null
          name: string
          require_all_pages?: boolean | null
          show_progress_bar?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
          version?: number | null
        }
        Update: {
          active?: boolean | null
          allow_save_and_resume?: boolean | null
          created_at?: string | null
          description?: string | null
          event_types?: string[] | null
          id?: string
          is_default?: boolean | null
          is_public?: boolean | null
          last_used_at?: string | null
          name?: string
          require_all_pages?: boolean | null
          show_progress_bar?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          conversion_date: string | null
          created_at: string | null
          email: string | null
          estimated_budget: number | null
          estimated_guests: number | null
          event_date: string | null
          event_type: string | null
          id: string
          last_contacted_at: string | null
          lead_score: number | null
          lost_reason: string | null
          name: string
          notes: string | null
          phone: string | null
          priority: string | null
          source: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          conversion_date?: string | null
          created_at?: string | null
          email?: string | null
          estimated_budget?: number | null
          estimated_guests?: number | null
          event_date?: string | null
          event_type?: string | null
          id?: string
          last_contacted_at?: string | null
          lead_score?: number | null
          lost_reason?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          priority?: string | null
          source?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          conversion_date?: string | null
          created_at?: string | null
          email?: string | null
          estimated_budget?: number | null
          estimated_guests?: number | null
          event_date?: string | null
          event_type?: string | null
          id?: string
          last_contacted_at?: string | null
          lead_score?: number | null
          lost_reason?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          priority?: string | null
          source?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      new_customers: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          postcode: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "new_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      new_events: {
        Row: {
          created_at: string | null
          customer_id: string | null
          description: string | null
          end_time: string | null
          event_date: string
          form_id: string | null
          id: string
          start_time: string | null
          status: string | null
          tenant_id: string
          title: string
          total_amount_gbp: number | null
          updated_at: string | null
          venue_location: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          form_id?: string | null
          id?: string
          start_time?: string | null
          status?: string | null
          tenant_id: string
          title: string
          total_amount_gbp?: number | null
          updated_at?: string | null
          venue_location?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          form_id?: string | null
          id?: string
          start_time?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          total_amount_gbp?: number | null
          updated_at?: string | null
          venue_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "new_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "new_events_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "new_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "new_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "new_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      new_form_fields: {
        Row: {
          created_at: string | null
          default_price_gbp: number | null
          field_type: string
          has_notes: boolean | null
          has_pricing: boolean | null
          id: string
          is_active: boolean | null
          name: string
          placeholder_text: string | null
          pricing_type: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_price_gbp?: number | null
          field_type: string
          has_notes?: boolean | null
          has_pricing?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          placeholder_text?: string | null
          pricing_type?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_price_gbp?: number | null
          field_type?: string
          has_notes?: boolean | null
          has_pricing?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          placeholder_text?: string | null
          pricing_type?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_form_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "new_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      new_form_responses: {
        Row: {
          event_id: string
          field_id: string
          field_name: string
          field_type: string
          id: string
          notes: string | null
          quantity: number | null
          total_amount_gbp: number | null
          unit_price_gbp: number | null
          updated_at: string | null
          value: string | null
        }
        Insert: {
          event_id: string
          field_id: string
          field_name: string
          field_type: string
          id?: string
          notes?: string | null
          quantity?: number | null
          total_amount_gbp?: number | null
          unit_price_gbp?: number | null
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          event_id?: string
          field_id?: string
          field_name?: string
          field_type?: string
          id?: string
          notes?: string | null
          quantity?: number | null
          total_amount_gbp?: number | null
          unit_price_gbp?: number | null
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_form_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "new_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "new_form_responses_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "new_form_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      new_forms: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sections: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sections?: Json | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sections?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "new_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      new_tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings: Json | null
          status: string | null
          subdomain: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          status?: string | null
          subdomain: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          status?: string | null
          subdomain?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      new_users: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          role: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          role?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          role?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "new_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "new_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          customer_id: string | null
          event_id: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_method: string | null
          payment_processor: string | null
          payment_type: string
          processed_at: string | null
          reference_number: string | null
          status: string | null
          tenant_id: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          event_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_processor?: string | null
          payment_type: string
          processed_at?: string | null
          reference_number?: string | null
          status?: string | null
          tenant_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          event_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_processor?: string | null
          payment_type?: string
          processed_at?: string | null
          reference_number?: string | null
          status?: string | null
          tenant_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "quotes_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes_invoices: {
        Row: {
          created_at: string | null
          customer_id: string | null
          discount_amount: number | null
          document_number: string
          document_type: string
          due_date: string | null
          event_id: string | null
          id: string
          issued_date: string | null
          line_items: Json
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          payment_method: string | null
          payment_status: string | null
          pdf_url: string | null
          sent_at: string | null
          status: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number | null
          template_used: string | null
          tenant_id: string | null
          terms_and_conditions: string | null
          title: string | null
          total_amount: number
          updated_at: string | null
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          document_number: string
          document_type: string
          due_date?: string | null
          event_id?: string | null
          id?: string
          issued_date?: string | null
          line_items?: Json
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal: number
          tax_amount: number
          tax_rate?: number | null
          template_used?: string | null
          tenant_id?: string | null
          terms_and_conditions?: string | null
          title?: string | null
          total_amount: number
          updated_at?: string | null
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          document_number?: string
          document_type?: string
          due_date?: string | null
          event_id?: string | null
          id?: string
          issued_date?: string | null
          line_items?: Json
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          template_used?: string | null
          tenant_id?: string | null
          terms_and_conditions?: string | null
          title?: string | null
          total_amount?: number
          updated_at?: string | null
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean | null
          can_work_evenings: boolean | null
          can_work_weekends: boolean | null
          certifications: string[] | null
          created_at: string | null
          default_availability: Json | null
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_id: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          languages: string[] | null
          max_hours_per_week: number | null
          name: string
          overtime_rate: number | null
          phone: string | null
          position: string
          skills: string[] | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          can_work_evenings?: boolean | null
          can_work_weekends?: boolean | null
          certifications?: string[] | null
          created_at?: string | null
          default_availability?: Json | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          languages?: string[] | null
          max_hours_per_week?: number | null
          name: string
          overtime_rate?: number | null
          phone?: string | null
          position: string
          skills?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          can_work_evenings?: boolean | null
          can_work_weekends?: boolean | null
          certifications?: string[] | null
          created_at?: string | null
          default_availability?: Json | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          languages?: string[] | null
          max_hours_per_week?: number | null
          name?: string
          overtime_rate?: number | null
          phone?: string | null
          position?: string
          skills?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean | null
          advanced_analytics: boolean | null
          api_access: boolean | null
          created_at: string | null
          custom_branding: boolean | null
          features: Json | null
          id: string
          max_events_per_month: number | null
          max_form_fields: number | null
          max_staff: number | null
          name: string
          price_monthly: number
          price_yearly: number | null
          priority_support: boolean | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          advanced_analytics?: boolean | null
          api_access?: boolean | null
          created_at?: string | null
          custom_branding?: boolean | null
          features?: Json | null
          id?: string
          max_events_per_month?: number | null
          max_form_fields?: number | null
          max_staff?: number | null
          name: string
          price_monthly: number
          price_yearly?: number | null
          priority_support?: boolean | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          advanced_analytics?: boolean | null
          api_access?: boolean | null
          created_at?: string | null
          custom_branding?: boolean | null
          features?: Json | null
          id?: string
          max_events_per_month?: number | null
          max_form_fields?: number | null
          max_staff?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          priority_support?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tenant_settings: {
        Row: {
          allow_online_booking: boolean | null
          auto_send_quotes: boolean | null
          business_hours: Json | null
          created_at: string | null
          default_event_duration: number | null
          deposit_percentage: number | null
          email_notifications: boolean | null
          id: string
          late_fee_percentage: number | null
          maximum_advance_days: number | null
          minimum_notice_hours: number | null
          payment_terms_days: number | null
          require_customer_approval: boolean | null
          require_deposit: boolean | null
          slack_webhook_url: string | null
          sms_notifications: boolean | null
          tenant_id: string | null
          updated_at: string | null
          urgent_days_threshold: number | null
          warning_days_threshold: number | null
        }
        Insert: {
          allow_online_booking?: boolean | null
          auto_send_quotes?: boolean | null
          business_hours?: Json | null
          created_at?: string | null
          default_event_duration?: number | null
          deposit_percentage?: number | null
          email_notifications?: boolean | null
          id?: string
          late_fee_percentage?: number | null
          maximum_advance_days?: number | null
          minimum_notice_hours?: number | null
          payment_terms_days?: number | null
          require_customer_approval?: boolean | null
          require_deposit?: boolean | null
          slack_webhook_url?: string | null
          sms_notifications?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          urgent_days_threshold?: number | null
          warning_days_threshold?: number | null
        }
        Update: {
          allow_online_booking?: boolean | null
          auto_send_quotes?: boolean | null
          business_hours?: Json | null
          created_at?: string | null
          default_event_duration?: number | null
          deposit_percentage?: number | null
          email_notifications?: boolean | null
          id?: string
          late_fee_percentage?: number | null
          maximum_advance_days?: number | null
          minimum_notice_hours?: number | null
          payment_terms_days?: number | null
          require_customer_approval?: boolean | null
          require_deposit?: boolean | null
          slack_webhook_url?: string | null
          sms_notifications?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          urgent_days_threshold?: number | null
          warning_days_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_usage: {
        Row: {
          advanced_reports_generated: number | null
          api_calls: number | null
          calculated_at: string | null
          created_at: string | null
          custom_forms_created: number | null
          events_created: number | null
          form_fields_used: number | null
          id: string
          integrations_used: number | null
          is_final: boolean | null
          leads_created: number | null
          staff_members: number | null
          storage_used_mb: number | null
          tenant_id: string | null
          usage_month: string
        }
        Insert: {
          advanced_reports_generated?: number | null
          api_calls?: number | null
          calculated_at?: string | null
          created_at?: string | null
          custom_forms_created?: number | null
          events_created?: number | null
          form_fields_used?: number | null
          id?: string
          integrations_used?: number | null
          is_final?: boolean | null
          leads_created?: number | null
          staff_members?: number | null
          storage_used_mb?: number | null
          tenant_id?: string | null
          usage_month: string
        }
        Update: {
          advanced_reports_generated?: number | null
          api_calls?: number | null
          calculated_at?: string | null
          created_at?: string | null
          custom_forms_created?: number | null
          events_created?: number | null
          form_fields_used?: number | null
          id?: string
          integrations_used?: number | null
          is_final?: boolean | null
          leads_created?: number | null
          staff_members?: number | null
          storage_used_mb?: number | null
          tenant_id?: string | null
          usage_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          active: boolean | null
          address_line1: string | null
          address_line2: string | null
          business_name: string
          business_type: string | null
          city: string | null
          contact_email: string
          contact_phone: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          id: string
          language: string | null
          logo_url: string | null
          next_payment_due: string | null
          postal_code: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          subscription_plan_id: string | null
          subscription_starts_at: string | null
          subscription_status: string | null
          timezone: string | null
          trial_ends_at: string | null
          trial_starts_at: string | null
          trial_used: boolean | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          business_name: string
          business_type?: string | null
          city?: string | null
          contact_email: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          next_payment_due?: string | null
          postal_code?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          subscription_plan_id?: string | null
          subscription_starts_at?: string | null
          subscription_status?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          trial_used?: boolean | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          business_name?: string
          business_type?: string | null
          city?: string | null
          contact_email?: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          next_payment_due?: string | null
          postal_code?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          subscription_plan_id?: string | null
          subscription_starts_at?: string | null
          subscription_status?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          trial_used?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean | null
          avatar_url: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          first_name: string | null
          full_name: string
          id: string
          last_login_at: string | null
          last_name: string | null
          notification_preferences: Json | null
          permissions: Json | null
          phone: string | null
          role: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          first_name?: string | null
          full_name: string
          id: string
          last_login_at?: string | null
          last_name?: string | null
          notification_preferences?: Json | null
          permissions?: Json | null
          phone?: string | null
          role: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          first_name?: string | null
          full_name?: string
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          notification_preferences?: Json | null
          permissions?: Json | null
          phone?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      lead_pipeline: {
        Row: {
          avg_budget: number | null
          lead_count: number | null
          status: string | null
          tenant_id: string | null
          total_potential: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      audit_security_event: {
        Args: {
          p_event_type: string
          p_description: string
          p_metadata?: Json
          p_risk_level?: string
        }
        Returns: undefined
      }
      calculate_event_form_total: {
        Args: { p_event_form_id: string }
        Returns: number
      }
      calculate_event_pricing: {
        Args: { p_tenant_id: string; p_form_responses: Json }
        Returns: number
      }
      calculate_form_total: {
        Args: { event_uuid: string }
        Returns: number
      }
      calculate_total_paid: {
        Args: { p_event_id: string }
        Returns: number
      }
      check_subscription_access: {
        Args: { tenant_uuid: string; feature_name?: string }
        Returns: boolean
      }
      check_subscription_limit: {
        Args: { p_tenant_id: string; p_limit_type: string }
        Returns: boolean
      }
      check_trial_status: {
        Args: { tenant_uuid: string }
        Returns: string
      }
      check_usage_limits: {
        Args: { tenant_uuid: string; limit_type: string }
        Returns: boolean
      }
      create_default_guest_section: {
        Args: { p_form_template_id: string; p_tenant_id: string }
        Returns: string
      }
      email_has_used_trial: {
        Args: { email_address: string }
        Returns: boolean
      }
      get_current_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_decrypted_token: {
        Args: { encrypted_token: string }
        Returns: string
      }
      get_event_with_sessions: {
        Args: { p_event_id: string }
        Returns: {
          event_id: string
          event_name: string
          is_parent: boolean
          is_session: boolean
          session_type: string
          session_order: number
          parent_id: string
        }[]
      }
      get_new_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_tab_order: {
        Args: { p_event_id: string; p_tenant_id: string }
        Returns: number
      }
      get_tenant_dashboard_stats: {
        Args: { p_tenant_id: string }
        Returns: {
          total_leads: number
          new_leads_this_month: number
          total_customers: number
          active_events: number
          this_month_revenue: number
          upcoming_events: number
        }[]
      }
      get_trial_days_remaining: {
        Args: { tenant_uuid: string }
        Returns: number
      }
      health_check_rls: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          status: string
          details: string
        }[]
      }
      is_current_user: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_tenant_id: string
          p_event_type: string
          p_description: string
          p_metadata?: Json
          p_risk_level?: string
        }
        Returns: undefined
      }
      migrate_existing_single_forms: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      monitor_rls_performance: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          policy_name: string
          avg_execution_time_ms: number
        }[]
      }
      user_has_valid_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_form_input: {
        Args: { input_text: string }
        Returns: string
      }
      validate_registration_email: {
        Args: { email_address: string }
        Returns: Json
      }
      validate_trial_status: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
