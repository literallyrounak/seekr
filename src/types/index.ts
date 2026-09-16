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
      events: {
        Row: {
          id: string
          code: string
          name: string
          max_players: number
          questions: Json
          answer_time_seconds: number
          discovery_time_seconds: number
          created_at: string
          started_at: string | null
          ended_at: string | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          max_players?: number
          questions: Json
          answer_time_seconds?: number
          discovery_time_seconds?: number
          created_at?: string
          started_at?: string | null
          ended_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          max_players?: number
          questions?: Json
          answer_time_seconds?: number
          discovery_time_seconds?: number
          created_at?: string
          started_at?: string | null
          ended_at?: string | null
        }
      }
      players: {
        Row: {
          id: string
          event_id: string
          username: string
          joined_at: string
          target_id: string | null
          found_at: string | null
          found_by_id: string | null
          is_host: boolean
        }
        Insert: {
          id?: string
          event_id: string
          username: string
          joined_at?: string
          target_id?: string | null
          found_at?: string | null
          found_by_id?: string | null
          is_host?: boolean
        }
        Update: {
          id?: string
          event_id?: string
          username?: string
          joined_at?: string
          target_id?: string | null
          found_at?: string | null
          found_by_id?: string | null
          is_host?: boolean
        }
      }
      answers: {
        Row: {
          id: string
          event_id: string
          player_id: string
          question_index: number
          answer_text: string
          submitted_at: string
        }
        Insert: {
          id?: string
          event_id: string
          player_id: string
          question_index: number
          answer_text: string
          submitted_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          player_id?: string
          question_index?: number
          answer_text?: string
          submitted_at?: string
        }
      }
      score_events: {
        Row: {
          id: string
          event_id: string
          player_id: string
          points: number
          reason: 'finder' | 'found'
          scored_at: string
        }
        Insert: {
          id?: string
          event_id: string
          player_id: string
          points: number
          reason: 'finder' | 'found'
          scored_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          player_id?: string
          points?: number
          reason?: 'finder' | 'found'
          scored_at?: string
        }
      }
      game_state: {
        Row: {
          event_id: string
          current_phase: 'lobby' | 'answering' | 'discovery' | 'ended'
          phase_started_at: string
          phase_ends_at: string | null
        }
        Insert: {
          event_id: string
          current_phase?: 'lobby' | 'answering' | 'discovery' | 'ended'
          phase_started_at?: string
          phase_ends_at?: string | null
        }
        Update: {
          event_id?: string
          current_phase?: 'lobby' | 'answering' | 'discovery' | 'ended'
          phase_started_at?: string
          phase_ends_at?: string | null
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

export type Event = Database['public']['Tables']['events']['Row']
export type Player = Database['public']['Tables']['players']['Row']
export type Answer = Database['public']['Tables']['answers']['Row']
export type ScoreEvent = Database['public']['Tables']['score_events']['Row']
export type GameState = Database['public']['Tables']['game_state']['Row']

export type Question = {
  text: string
}

export type EventWithPlayers = Event & {
  players: Player[]
}

export type PlayerWithTarget = Player & {
  target: Player | null
}

export type LeaderboardEntry = {
  player_id: string
  username: string
  total_points: number
}
