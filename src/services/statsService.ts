import { db } from '../db';

export interface GlobalStats {
  mastered: number;
  studySessions: number;
}

export async function getGlobalStats(userId: string | undefined): Promise<GlobalStats> {
  if (!userId) {
    return { mastered: 0, studySessions: 0 };
  }

  try {
    // Count mastered flashcards
    const masteredCount = await db.flashcards
      .where('mastery_level')
      .equals('Mastered')
      .and(card => card.user_id === userId)
      .count();

    // Get study sessions from profile
    const profile = await db.profiles.get(userId);
    const sessionCount = profile?.study_sessions || 0;

    return {
      mastered: masteredCount,
      studySessions: sessionCount
    };
  } catch (err) {
    console.error('Error fetching global stats:', err);
    return { mastered: 0, studySessions: 0 };
  }
}

export async function incrementSessionCount(userId: string | undefined): Promise<void> {
  if (!userId) return;

  try {
    const profile = await db.profiles.get(userId);
    if (profile) {
      await db.profiles.update(userId, {
        study_sessions: (profile.study_sessions || 0) + 1,
        sync_status: 'pending_update'
      });
    }
  } catch (err) {
    console.error('Error incrementing session count:', err);
  }
}
