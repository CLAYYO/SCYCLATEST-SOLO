export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          membership_type: 'full' | 'associate' | 'junior' | 'honorary'
          membership_number: string | null
          phone: string | null
          address: string | null
          emergency_contact: string | null
          sailing_experience: string | null
          boat_ownership: boolean
          profile_image_url: string | null
          is_active: boolean
          joined_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          membership_type: 'full' | 'associate' | 'junior' | 'honorary'
          membership_number?: string | null
          phone?: string | null
          address?: string | null
          emergency_contact?: string | null
          sailing_experience?: string | null
          boat_ownership?: boolean
          profile_image_url?: string | null
          is_active?: boolean
          joined_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          membership_type?: 'full' | 'associate' | 'junior' | 'honorary'
          membership_number?: string | null
          phone?: string | null
          address?: string | null
          emergency_contact?: string | null
          sailing_experience?: string | null
          boat_ownership?: boolean
          profile_image_url?: string | null
          is_active?: boolean
          joined_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      boats: {
        Row: {
          id: string
          owner_id: string
          name: string
          sail_number: string
          boat_class: string
          length: number | null
          beam: number | null
          draft: number | null
          year_built: number | null
          designer: string | null
          builder: string | null
          hull_material: string | null
          engine_type: string | null
          berth_location: string | null
          insurance_expiry: string | null
          safety_certificate_expiry: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          sail_number: string
          boat_class: string
          length?: number | null
          beam?: number | null
          draft?: number | null
          year_built?: number | null
          designer?: string | null
          builder?: string | null
          hull_material?: string | null
          engine_type?: string | null
          berth_location?: string | null
          insurance_expiry?: string | null
          safety_certificate_expiry?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          sail_number?: string
          boat_class?: string
          length?: number | null
          beam?: number | null
          draft?: number | null
          year_built?: number | null
          designer?: string | null
          builder?: string | null
          hull_material?: string | null
          engine_type?: string | null
          berth_location?: string | null
          insurance_expiry?: string | null
          safety_certificate_expiry?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      races: {
        Row: {
          id: string
          series_id: string | null
          name: string
          race_date: string
          start_time: string | null
          boat_class: string
          division: string | null
          venue: string | null
          course_description: string | null
          wind_conditions: string | null
          weather_conditions: string | null
          race_officer: string | null
          results_published: boolean
          results_provisional: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          series_id?: string | null
          name: string
          race_date: string
          start_time?: string | null
          boat_class: string
          division?: string | null
          venue?: string | null
          course_description?: string | null
          wind_conditions?: string | null
          weather_conditions?: string | null
          race_officer?: string | null
          results_published?: boolean
          results_provisional?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          series_id?: string | null
          name?: string
          race_date?: string
          start_time?: string | null
          boat_class?: string
          division?: string | null
          venue?: string | null
          course_description?: string | null
          wind_conditions?: string | null
          weather_conditions?: string | null
          race_officer?: string | null
          results_published?: boolean
          results_provisional?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      race_results: {
        Row: {
          id: string
          race_id: string
          boat_id: string
          sailor_name: string
          sail_number: string
          division: string | null
          age_group: string | null
          finish_position: number | null
          points: number | null
          status: 'finished' | 'dnf' | 'dns' | 'dnc' | 'dsq' | 'ret'
          elapsed_time: string | null
          corrected_time: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          race_id: string
          boat_id: string
          sailor_name: string
          sail_number: string
          division?: string | null
          age_group?: string | null
          finish_position?: number | null
          points?: number | null
          status: 'finished' | 'dnf' | 'dns' | 'dnc' | 'dsq' | 'ret'
          elapsed_time?: string | null
          corrected_time?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          race_id?: string
          boat_id?: string
          sailor_name?: string
          sail_number?: string
          division?: string | null
          age_group?: string | null
          finish_position?: number | null
          points?: number | null
          status?: 'finished' | 'dnf' | 'dns' | 'dnc' | 'dsq' | 'ret'
          elapsed_time?: string | null
          corrected_time?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          event_type: 'racing' | 'social' | 'training' | 'meeting' | 'maintenance'
          start_date: string
          end_date: string | null
          start_time: string | null
          end_time: string | null
          location: string | null
          organizer: string | null
          max_participants: number | null
          current_participants: number
          booking_required: boolean
          booking_deadline: string | null
          cost: number | null
          is_members_only: boolean
          is_published: boolean
          featured_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          event_type: 'racing' | 'social' | 'training' | 'meeting' | 'maintenance'
          start_date: string
          end_date?: string | null
          start_time?: string | null
          end_time?: string | null
          location?: string | null
          organizer?: string | null
          max_participants?: number | null
          current_participants?: number
          booking_required?: boolean
          booking_deadline?: string | null
          cost?: number | null
          is_members_only?: boolean
          is_published?: boolean
          featured_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          event_type?: 'racing' | 'social' | 'training' | 'meeting' | 'maintenance'
          start_date?: string
          end_date?: string | null
          start_time?: string | null
          end_time?: string | null
          location?: string | null
          organizer?: string | null
          max_participants?: number | null
          current_participants?: number
          booking_required?: boolean
          booking_deadline?: string | null
          cost?: number | null
          is_members_only?: boolean
          is_published?: boolean
          featured_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      news: {
        Row: {
          id: string
          title: string
          slug: string
          excerpt: string | null
          content: string
          author_id: string
          category: 'general' | 'racing' | 'social' | 'maintenance' | 'safety'
          featured_image_url: string | null
          is_published: boolean
          is_featured: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          excerpt?: string | null
          content: string
          author_id: string
          category: 'general' | 'racing' | 'social' | 'maintenance' | 'safety'
          featured_image_url?: string | null
          is_published?: boolean
          is_featured?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          excerpt?: string | null
          content?: string
          author_id?: string
          category?: 'general' | 'racing' | 'social' | 'maintenance' | 'safety'
          featured_image_url?: string | null
          is_published?: boolean
          is_featured?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          title: string
          description: string | null
          file_url: string
          file_name: string
          file_size: number
          file_type: string
          category: 'sailing_instructions' | 'notices' | 'forms' | 'minutes' | 'policies' | 'other'
          is_public: boolean
          uploaded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          file_url: string
          file_name: string
          file_size: number
          file_type: string
          category: 'sailing_instructions' | 'notices' | 'forms' | 'minutes' | 'policies' | 'other'
          is_public?: boolean
          uploaded_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          file_url?: string
          file_name?: string
          file_size?: number
          file_type?: string
          category?: 'sailing_instructions' | 'notices' | 'forms' | 'minutes' | 'policies' | 'other'
          is_public?: boolean
          uploaded_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      menus: {
        Row: {
          id: string
          name: string
          description: string | null
          category: 'starter' | 'main' | 'dessert' | 'drink' | 'special'
          price: number
          is_available: boolean
          dietary_info: string | null
          image_url: string | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: 'starter' | 'main' | 'dessert' | 'drink' | 'special'
          price: number
          is_available?: boolean
          dietary_info?: string | null
          image_url?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: 'starter' | 'main' | 'dessert' | 'drink' | 'special'
          price?: number
          is_available?: boolean
          dietary_info?: string | null
          image_url?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}