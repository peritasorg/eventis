export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
            foreignKeyName: "communication_timeline_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_timeline_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      event_responses: {
        Row: {
          calculated_price: number | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          current_page: number | null
          event_id: string | null
          expires_at: string | null
          form_template_id: string | null
          id: string
          responses: Json
          session_token: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          calculated_price?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_page?: number | null
          event_id?: string | null
          expires_at?: string | null
          form_template_id?: string | null
          id?: string
          responses?: Json
          session_token?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          calculated_price?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_page?: number | null
          event_id?: string | null
          expires_at?: string | null
          form_template_id?: string | null
          id?: string
          responses?: Json
          session_token?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_responses_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_responses_tenant_id_fkey"
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
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
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
      events: {
        Row: {
          accessibility_requirements: string | null
          additional_costs: number | null
          av_equipment_required: boolean | null
          balance_cleared: boolean | null
          balance_cleared_date: string | null
          balance_due: number | null
          base_price: number | null
          booking_stage: string | null
          cancellation_fee: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          catering_required: boolean | null
          cleanup_time: string | null
          confirmed_date: string | null
          confirmed_guests: number | null
          contract_signed_date: string | null
          created_at: string | null
          customer_id: string | null
          decoration_required: boolean | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          deposit_paid_date: string | null
          dietary_requirements: string | null
          discount_amount: number | null
          end_time: string
          estimated_guests: number
          ethnicity: string | null
          event_date: string
          event_finalized: boolean | null
          event_finalized_date: string | null
          event_mix_type: string | null
          event_name: string
          event_type: string
          final_payment_due: string | null
          final_payment_paid: boolean | null
          form_responses: Json | null
          form_template_used: string | null
          form_total: number | null
          id: string
          inquiry_date: string | null
          internal_notes: string | null
          ladies_count: number | null
          lead_id: string | null
          men_count: number | null
          parking_required: boolean | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          quote_sent_date: string | null
          room_layout: string | null
          secondary_contact_name: string | null
          secondary_contact_phone: string | null
          secondary_contact_relationship: string | null
          setup_time: string | null
          special_requests: string | null
          start_time: string
          status: string | null
          tax_amount: number | null
          tenant_id: string | null
          total_amount: number | null
          total_guest_price: number | null
          updated_at: string | null
          venue_area: string | null
        }
        Insert: {
          accessibility_requirements?: string | null
          additional_costs?: number | null
          av_equipment_required?: boolean | null
          balance_cleared?: boolean | null
          balance_cleared_date?: string | null
          balance_due?: number | null
          base_price?: number | null
          booking_stage?: string | null
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          catering_required?: boolean | null
          cleanup_time?: string | null
          confirmed_date?: string | null
          confirmed_guests?: number | null
          contract_signed_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          decoration_required?: boolean | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_date?: string | null
          dietary_requirements?: string | null
          discount_amount?: number | null
          end_time: string
          estimated_guests: number
          ethnicity?: string | null
          event_date: string
          event_finalized?: boolean | null
          event_finalized_date?: string | null
          event_mix_type?: string | null
          event_name: string
          event_type: string
          final_payment_due?: string | null
          final_payment_paid?: boolean | null
          form_responses?: Json | null
          form_template_used?: string | null
          form_total?: number | null
          id?: string
          inquiry_date?: string | null
          internal_notes?: string | null
          ladies_count?: number | null
          lead_id?: string | null
          men_count?: number | null
          parking_required?: boolean | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          quote_sent_date?: string | null
          room_layout?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          secondary_contact_relationship?: string | null
          setup_time?: string | null
          special_requests?: string | null
          start_time: string
          status?: string | null
          tax_amount?: number | null
          tenant_id?: string | null
          total_amount?: number | null
          total_guest_price?: number | null
          updated_at?: string | null
          venue_area?: string | null
        }
        Update: {
          accessibility_requirements?: string | null
          additional_costs?: number | null
          av_equipment_required?: boolean | null
          balance_cleared?: boolean | null
          balance_cleared_date?: string | null
          balance_due?: number | null
          base_price?: number | null
          booking_stage?: string | null
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          catering_required?: boolean | null
          cleanup_time?: string | null
          confirmed_date?: string | null
          confirmed_guests?: number | null
          contract_signed_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          decoration_required?: boolean | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_date?: string | null
          dietary_requirements?: string | null
          discount_amount?: number | null
          end_time?: string
          estimated_guests?: number
          ethnicity?: string | null
          event_date?: string
          event_finalized?: boolean | null
          event_finalized_date?: string | null
          event_mix_type?: string | null
          event_name?: string
          event_type?: string
          final_payment_due?: string | null
          final_payment_paid?: boolean | null
          form_responses?: Json | null
          form_template_used?: string | null
          form_total?: number | null
          id?: string
          inquiry_date?: string | null
          internal_notes?: string | null
          ladies_count?: number | null
          lead_id?: string | null
          men_count?: number | null
          parking_required?: boolean | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          quote_sent_date?: string | null
          room_layout?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          secondary_contact_relationship?: string | null
          setup_time?: string | null
          special_requests?: string | null
          start_time?: string
          status?: string | null
          tax_amount?: number | null
          tenant_id?: string | null
          total_amount?: number | null
          total_guest_price?: number | null
          updated_at?: string | null
          venue_area?: string | null
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
            foreignKeyName: "events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      field_library: {
        Row: {
          active: boolean | null
          affects_pricing: boolean | null
          auto_add_notes_field: boolean | null
          auto_add_price_field: boolean | null
          category: string | null
          created_at: string | null
          default_value: string | null
          field_type: string
          help_text: string | null
          id: string
          label: string
          name: string
          options: Json | null
          placeholder: string | null
          price_modifier: number | null
          pricing_type: string | null
          tags: string[] | null
          tenant_id: string | null
          updated_at: string | null
          usage_count: number | null
          validation_rules: Json | null
        }
        Insert: {
          active?: boolean | null
          affects_pricing?: boolean | null
          auto_add_notes_field?: boolean | null
          auto_add_price_field?: boolean | null
          category?: string | null
          created_at?: string | null
          default_value?: string | null
          field_type: string
          help_text?: string | null
          id?: string
          label: string
          name: string
          options?: Json | null
          placeholder?: string | null
          price_modifier?: number | null
          pricing_type?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
          validation_rules?: Json | null
        }
        Update: {
          active?: boolean | null
          affects_pricing?: boolean | null
          auto_add_notes_field?: boolean | null
          auto_add_price_field?: boolean | null
          category?: string | null
          created_at?: string | null
          default_value?: string | null
          field_type?: string
          help_text?: string | null
          id?: string
          label?: string
          name?: string
          options?: Json | null
          placeholder?: string | null
          price_modifier?: number | null
          pricing_type?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "field_library_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "finance_timeline_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_timeline_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      form_field_instances: {
        Row: {
          conditional_logic: Json | null
          created_at: string | null
          field_library_id: string | null
          field_order: number
          field_width: string | null
          form_section_id: string | null
          form_template_id: string | null
          help_text_override: string | null
          id: string
          label_override: string | null
          placeholder_override: string | null
          required_override: boolean | null
          tenant_id: string | null
          validation_rules_override: Json | null
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string | null
          field_library_id?: string | null
          field_order: number
          field_width?: string | null
          form_section_id?: string | null
          form_template_id?: string | null
          help_text_override?: string | null
          id?: string
          label_override?: string | null
          placeholder_override?: string | null
          required_override?: boolean | null
          tenant_id?: string | null
          validation_rules_override?: Json | null
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string | null
          field_library_id?: string | null
          field_order?: number
          field_width?: string | null
          form_section_id?: string | null
          form_template_id?: string | null
          help_text_override?: string | null
          id?: string
          label_override?: string | null
          placeholder_override?: string | null
          required_override?: boolean | null
          tenant_id?: string | null
          validation_rules_override?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_form_field_instances_template"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_field_instances_field_library_id_fkey"
            columns: ["field_library_id"]
            isOneToOne: false
            referencedRelation: "field_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_field_instances_form_section_id_fkey"
            columns: ["form_section_id"]
            isOneToOne: false
            referencedRelation: "form_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_field_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      form_pages: {
        Row: {
          created_at: string | null
          form_template_id: string | null
          id: string
          page_description: string | null
          page_number: number
          page_title: string
          required_to_proceed: boolean | null
          show_progress: boolean | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          form_template_id?: string | null
          id?: string
          page_description?: string | null
          page_number: number
          page_title: string
          required_to_proceed?: boolean | null
          show_progress?: boolean | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          form_template_id?: string | null
          id?: string
          page_description?: string | null
          page_number?: number
          page_title?: string
          required_to_proceed?: boolean | null
          show_progress?: boolean | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_pages_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      form_sections: {
        Row: {
          background_color: string | null
          created_at: string | null
          form_page_id: string | null
          id: string
          layout_type: string | null
          section_description: string | null
          section_order: number
          section_title: string | null
          tenant_id: string | null
        }
        Insert: {
          background_color?: string | null
          created_at?: string | null
          form_page_id?: string | null
          id?: string
          layout_type?: string | null
          section_description?: string | null
          section_order: number
          section_title?: string | null
          tenant_id?: string | null
        }
        Update: {
          background_color?: string | null
          created_at?: string | null
          form_page_id?: string | null
          id?: string
          layout_type?: string | null
          section_description?: string | null
          section_order?: number
          section_title?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_sections_tenant_id_fkey"
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
            foreignKeyName: "payment_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
            foreignKeyName: "quotes_invoices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_invoices_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      event_summary: {
        Row: {
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          end_time: string | null
          event_date: string | null
          event_name: string | null
          event_type: string | null
          id: string | null
          staff_assigned: number | null
          start_time: string | null
          status: string | null
          tenant_id: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      monthly_revenue: {
        Row: {
          avg_event_value: number | null
          events_count: number | null
          revenue_month: string | null
          tenant_id: string | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_event_pricing: {
        Args: { p_tenant_id: string; p_form_responses: Json }
        Returns: number
      }
      calculate_form_total: {
        Args: { event_uuid: string }
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
      email_has_used_trial: {
        Args: { email_address: string }
        Returns: boolean
      }
      get_current_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      health_check_rls: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          status: string
          details: string
        }[]
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      monitor_rls_performance: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          policy_name: string
          avg_execution_time_ms: number
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      user_has_valid_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_registration_email: {
        Args: { email_address: string }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
