import Dexie, { Table } from 'dexie';
import { MasteryLevel, SyncStatus } from './types';

export interface LocalSubject {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
  sync_status: SyncStatus;
}

export interface LocalDeck {
  id: string;
  name: string;
  subject_id: string;
  created_at: string;
  user_id: string;
  sync_status: SyncStatus;
}

export interface LocalFlashcard {
  id: string;
  front: string;
  back: string;
  deck_id: string;
  subject_id: string;
  tags: string[];
  mastery_level: MasteryLevel;
  last_reviewed?: string;
  next_review_date?: string;
  created_at: string;
  user_id: string;
  sync_status: SyncStatus;
}

export interface LocalProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  location?: string | null;
  preparing_for_exam?: string | null;
  study_sessions: number;
  created_at: string;
  sync_status: SyncStatus;
}

export class StudyTrackerDB extends Dexie {
  subjects!: Table<LocalSubject>;
  decks!: Table<LocalDeck>;
  flashcards!: Table<LocalFlashcard>;
  profiles!: Table<LocalProfile>;

  constructor() {
    super('StudyTrackerDB');
    this.version(1).stores({
      subjects: 'id, user_id, sync_status',
      decks: 'id, subject_id, user_id, sync_status',
      flashcards: 'id, deck_id, subject_id, user_id, sync_status, mastery_level',
      profiles: 'id, sync_status'
    });
  }
}

export const db = new StudyTrackerDB();
