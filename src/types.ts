export type MasteryLevel = 'New' | 'Learning' | 'Review' | 'Mastered';
export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';

export interface Subject {
  id: string;
  name: string;
  created_at: string;
  user_id?: string;
}

export interface Deck {
  id: string;
  name: string;
  subject_id: string;
  created_at: string;
  user_id?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  deck_id: string;
  subject_id: string;
  tags?: string[];
  mastery_level: MasteryLevel;
  last_reviewed?: string;
  next_review_date?: string;
  created_at: string;
  user_id?: string;
}

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  created_at: string;
}
