export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      checklist_answers: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          id: string
          phase_id: string
          question_id: string
          question_text: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          phase_id: string
          question_id: string
          question_text: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          phase_id?: string
          question_id?: string
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_answers_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "checklist_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_phases: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          phase: string
          surgery_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          phase: string
          surgery_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          phase?: string
          surgery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_phases_surgery_id_fkey"
            columns: ["surgery_id"]
            isOneToOne: false
            referencedRelation: "surgeries"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_signatures: {
        Row: {
          accepted: boolean
          created_at: string
          end_time: string
          id: string
          signer_name: string
          signer_role: string
          start_time: string
          surgery_id: string
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          end_time: string
          id?: string
          signer_name: string
          signer_role: string
          start_time: string
          surgery_id: string
        }
        Update: {
          accepted?: boolean
          created_at?: string
          end_time?: string
          id?: string
          signer_name?: string
          signer_role?: string
          start_time?: string
          surgery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_signatures_surgery_id_fkey"
            columns: ["surgery_id"]
            isOneToOne: true
            referencedRelation: "surgeries"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string
          created_at: string
          id: string
          name: string
          nit: string
          num_operating_rooms: number
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          name: string
          nit: string
          num_operating_rooms?: number
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          name?: string
          nit?: string
          num_operating_rooms?: number
        }
        Relationships: []
      }
      instruments: {
        Row: {
          created_at: string
          final_count: number | null
          id: string
          initial_count: number
          name: string
          surgery_id: string
        }
        Insert: {
          created_at?: string
          final_count?: number | null
          id?: string
          initial_count?: number
          name: string
          surgery_id: string
        }
        Update: {
          created_at?: string
          final_count?: number | null
          id?: string
          initial_count?: number
          name?: string
          surgery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instruments_surgery_id_fkey"
            columns: ["surgery_id"]
            isOneToOne: false
            referencedRelation: "surgeries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clinic_id: string | null
          created_at: string
          email: string
          id: string
          is_super_admin: boolean
          name: string
          specialty: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          email: string
          id: string
          is_super_admin?: boolean
          name: string
          specialty?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_super_admin?: boolean
          name?: string
          specialty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      surgeries: {
        Row: {
          anesthesiologist: string
          checklist_owner: string
          clinic_id: string | null
          created_at: string
          created_by: string | null
          date: string
          id: string
          patient: string
          patient_id: string | null
          procedure_name: string
          room: string
          status: Database["public"]["Enums"]["surgery_status"]
          surgeon: string
          time: string
          updated_at: string
        }
        Insert: {
          anesthesiologist: string
          checklist_owner: string
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          patient: string
          patient_id?: string | null
          procedure_name: string
          room: string
          status?: Database["public"]["Enums"]["surgery_status"]
          surgeon: string
          time: string
          updated_at?: string
        }
        Update: {
          anesthesiologist?: string
          checklist_owner?: string
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          patient?: string
          patient_id?: string | null
          procedure_name?: string
          room?: string
          status?: Database["public"]["Enums"]["surgery_status"]
          surgeon?: string
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surgeries_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "coordinador" | "encargado" | "consulta" | "supervisor"
      surgery_status:
        | "programada"
        | "sign-in"
        | "time-out"
        | "sign-out"
        | "completada"
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
    Enums: {
      app_role: ["coordinador", "encargado", "consulta", "supervisor"],
      surgery_status: [
        "programada",
        "sign-in",
        "time-out",
        "sign-out",
        "completada",
      ],
    },
  },
} as const
