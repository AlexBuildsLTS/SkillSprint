export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string | null;
          description: string;
          icon_url: string;
          id: string;
          name: string;
          xp_bonus: number | null;
        };
        Insert: {
          created_at?: string | null;
          description: string;
          icon_url: string;
          id: string;
          name: string;
          xp_bonus?: number | null;
        };
        Update: {
          created_at?: string | null;
          description?: string;
          icon_url?: string;
          id?: string;
          name?: string;
          xp_bonus?: number | null;
        };
        Relationships: [];
      };
      chat_history: {
        Row: {
          content: string;
          created_at: string | null;
          id: string;
          role: string | null;
          user_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id?: string;
          role?: string | null;
          user_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: string;
          role?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      daily_sprints: {
        Row: {
          content: Json;
          created_at: string | null;
          date: string;
          id: string;
          is_completed: boolean | null;
          user_id: string;
          xp_earned: number | null;
        };
        Insert: {
          content: Json;
          created_at?: string | null;
          date?: string;
          id?: string;
          is_completed?: boolean | null;
          user_id: string;
          xp_earned?: number | null;
        };
        Update: {
          content?: Json;
          created_at?: string | null;
          date?: string;
          id?: string;
          is_completed?: boolean | null;
          user_id?: string;
          xp_earned?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_sprints_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      lessons: {
        Row: {
          content: Json;
          created_at: string | null;
          id: string;
          order: number;
          title: string;
          track_id: string;
          xp_reward: number | null;
        };
        Insert: {
          content: Json;
          created_at?: string | null;
          id?: string;
          order: number;
          title: string;
          track_id: string;
          xp_reward?: number | null;
        };
        Update: {
          content?: Json;
          created_at?: string | null;
          id?: string;
          order?: number;
          title?: string;
          track_id?: string;
          xp_reward?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lessons_track_id_fkey';
            columns: ['track_id'];
            isOneToOne: false;
            referencedRelation: 'tracks';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          role: Database['public']['Enums']['user_role'];
          status: string | null;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          role?: Database['public']['Enums']['user_role'];
          status?: string | null;
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          role?: Database['public']['Enums']['user_role'];
          status?: string | null;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          answer: Json;
          created_at: string | null;
          explanation: string | null;
          id: string;
          lesson_id: string;
          options: Json | null;
          question: string;
          type: Database['public']['Enums']['question_type'];
        };
        Insert: {
          answer: Json;
          created_at?: string | null;
          explanation?: string | null;
          id?: string;
          lesson_id: string;
          options?: Json | null;
          question: string;
          type: Database['public']['Enums']['question_type'];
        };
        Update: {
          answer?: Json;
          created_at?: string | null;
          explanation?: string | null;
          id?: string;
          lesson_id?: string;
          options?: Json | null;
          question?: string;
          type?: Database['public']['Enums']['question_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'questions_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      sprint_tasks: {
        Row: {
          created_at: string | null;
          difficulty: string;
          id: string;
          is_completed: boolean | null;
          language: string;
          task_content: Json;
          task_hash: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          difficulty: string;
          id?: string;
          is_completed?: boolean | null;
          language: string;
          task_content: Json;
          task_hash: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          difficulty?: string;
          id?: string;
          is_completed?: boolean | null;
          language?: string;
          task_content?: Json;
          task_hash?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sprint_tasks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_messages: {
        Row: {
          created_at: string | null;
          id: string;
          is_internal: boolean | null;
          message: string;
          ticket_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_internal?: boolean | null;
          message: string;
          ticket_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_internal?: boolean | null;
          message?: string;
          ticket_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_messages_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      tickets: {
        Row: {
          category: string;
          created_at: string | null;
          id: string;
          priority: string | null;
          status: string | null;
          subject: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          category?: string;
          created_at?: string | null;
          id?: string;
          priority?: string | null;
          status?: string | null;
          subject: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          id?: string;
          priority?: string | null;
          status?: string | null;
          subject?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tickets_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      tracks: {
        Row: {
          category: string | null;
          color_gradient: string | null;
          created_at: string | null;
          description: string | null;
          difficulty: Database['public']['Enums']['difficulty_level'] | null;
          icon: string | null;
          id: string;
          is_premium: boolean | null;
          is_published: boolean | null;
          slug: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          category?: string | null;
          color_gradient?: string | null;
          created_at?: string | null;
          description?: string | null;
          difficulty?: Database['public']['Enums']['difficulty_level'] | null;
          icon?: string | null;
          id?: string;
          is_premium?: boolean | null;
          is_published?: boolean | null;
          slug?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          category?: string | null;
          color_gradient?: string | null;
          created_at?: string | null;
          description?: string | null;
          difficulty?: Database['public']['Enums']['difficulty_level'] | null;
          icon?: string | null;
          id?: string;
          is_premium?: boolean | null;
          is_published?: boolean | null;
          slug?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          awarded_at: string | null;
          badge_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          awarded_at?: string | null;
          badge_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          awarded_at?: string | null;
          badge_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_badges_badge_id_fkey';
            columns: ['badge_id'];
            isOneToOne: false;
            referencedRelation: 'badges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_badges_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_progress: {
        Row: {
          completed_at: string | null;
          id: string;
          is_completed: boolean | null;
          lesson_id: string;
          score: number | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          id?: string;
          is_completed?: boolean | null;
          lesson_id: string;
          score?: number | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          id?: string;
          is_completed?: boolean | null;
          lesson_id?: string;
          score?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_progress_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_stats: {
        Row: {
          last_active_date: string | null;
          level: number;
          streak_days: number;
          total_sprints_completed: number | null;
          updated_at: string;
          user_id: string;
          xp: number;
        };
        Insert: {
          last_active_date?: string | null;
          level?: number;
          streak_days?: number;
          total_sprints_completed?: number | null;
          updated_at?: string;
          user_id: string;
          xp?: number;
        };
        Update: {
          last_active_date?: string | null;
          level?: number;
          streak_days?: number;
          total_sprints_completed?: number | null;
          updated_at?: string;
          user_id?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'user_stats_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_xp: {
        Args: { amount: number; target_user_id: string };
        Returns: undefined;
      };
      admin_update_user_role: {
        Args: {
          new_role: Database['public']['Enums']['user_role'];
          target_user_id: string;
        };
        Returns: undefined;
      };
      admin_update_user_status: {
        Args: { new_status: string; target_user_id: string };
        Returns: undefined;
      };
      calculate_level: { Args: { xp_input: number }; Returns: number };
      calculate_level_from_xp: { Args: { xp_input: number }; Returns: number };
      get_full_lesson_details: {
        Args: { target_lesson_id: string };
        Returns: Json;
      };
      get_lesson_details: { Args: { p_lesson_id: string }; Returns: Json };
      get_user_track_xp: {
        Args: { target_user_id: string };
        Returns: {
          lessons_completed: number;
          total_xp: number;
          track_title: string;
        }[];
      };
      get_weekly_activity: {
        Args: { target_user_id: string };
        Returns: {
          day_label: string;
          sprint_count: number;
        }[];
      };
      internal_add_xp_and_streak: {
        Args: { target_user_id: string; xp_amount: number };
        Returns: Json;
      };
      internal_distribute_reward: {
        Args: { p_user_id: string; p_xp_reward: number };
        Returns: Json;
      };
    };
    Enums: {
      difficulty_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
      question_type: 'mcq' | 'true_false' | 'input' | 'info';
      user_role: 'MEMBER' | 'PREMIUM' | 'MODERATOR' | 'ADMIN';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      difficulty_level: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      question_type: ['mcq', 'true_false', 'input', 'info'],
      user_role: ['MEMBER', 'PREMIUM', 'MODERATOR', 'ADMIN'],
    },
  },
} as const;
