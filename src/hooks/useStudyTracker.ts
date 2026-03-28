import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalSubject, LocalDeck, LocalFlashcard, LocalProfile, SyncStatus } from '../db';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';

export type MasteryLevel = 'New' | 'Learning' | 'Review' | 'Mastered';

export function useStudyTracker(user: User | null) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  // --- Live Queries ---
  const subjects = useLiveQuery(
    () => db.subjects.where('sync_status').notEqual('pending_delete').toArray(),
    []
  ) || [];

  const decks = useLiveQuery(
    () => db.decks.where('sync_status').notEqual('pending_delete').toArray(),
    []
  ) || [];

  const flashcards = useLiveQuery(
    () => db.flashcards.where('sync_status').notEqual('pending_delete').toArray(),
    []
  ) || [];

  const profile = useLiveQuery(
    () => user ? db.profiles.get(user.id) : undefined,
    [user]
  );

  // --- Sync Logic ---

  const pushChanges = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // 1. Push Subjects
      const pendingSubjects = await db.subjects.where('sync_status').anyOf(['pending_create', 'pending_update', 'pending_delete']).toArray();
      for (const s of pendingSubjects) {
        if (s.sync_status === 'pending_delete') {
          await supabase.from('subjects').delete().eq('id', s.id);
          await db.subjects.delete(s.id);
        } else {
          const { sync_status, ...data } = s;
          const { error } = await supabase.from('subjects').upsert(data);
          if (!error) await db.subjects.update(s.id, { sync_status: 'synced' });
        }
      }

      // 2. Push Decks
      const pendingDecks = await db.decks.where('sync_status').anyOf(['pending_create', 'pending_update', 'pending_delete']).toArray();
      for (const d of pendingDecks) {
        if (d.sync_status === 'pending_delete') {
          await supabase.from('decks').delete().eq('id', d.id);
          await db.decks.delete(d.id);
        } else {
          const { sync_status, ...data } = d;
          const { error } = await supabase.from('decks').upsert(data);
          if (!error) await db.decks.update(d.id, { sync_status: 'synced' });
        }
      }

      // 3. Push Flashcards
      const pendingCards = await db.flashcards.where('sync_status').anyOf(['pending_create', 'pending_update', 'pending_delete']).toArray();
      for (const c of pendingCards) {
        if (c.sync_status === 'pending_delete') {
          await supabase.from('flashcards').delete().eq('id', c.id);
          await db.flashcards.delete(c.id);
        } else {
          const { sync_status, ...data } = c;
          const { error } = await supabase.from('flashcards').upsert(data);
          if (!error) await db.flashcards.update(c.id, { sync_status: 'synced' });
        }
      }

      // 4. Push Profile
      const pendingProfile = await db.profiles.where('sync_status').equals('pending_update').toArray();
      for (const p of pendingProfile) {
        const { sync_status, ...data } = p;
        const { error } = await supabase.from('profiles').upsert(data);
        if (!error) await db.profiles.update(p.id, { sync_status: 'synced' });
      }

    } catch (err) {
      console.error('Sync push error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  const pullChanges = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // Pull all data for user
      const [
        { data: remoteSubjects },
        { data: remoteDecks },
        { data: remoteCards },
        { data: remoteProfile }
      ] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', user.id),
        supabase.from('decks').select('*').eq('user_id', user.id),
        supabase.from('flashcards').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('id', user.id).single()
      ]);

      // Update local DB (only if not pending local changes)
      if (remoteSubjects) {
        for (const s of remoteSubjects) {
          const local = await db.subjects.get(s.id);
          if (!local || local.sync_status === 'synced') {
            await db.subjects.put({ ...s, sync_status: 'synced' });
          }
        }
      }

      if (remoteDecks) {
        for (const d of remoteDecks) {
          const local = await db.decks.get(d.id);
          if (!local || local.sync_status === 'synced') {
            await db.decks.put({ ...d, sync_status: 'synced' });
          }
        }
      }

      if (remoteCards) {
        for (const c of remoteCards) {
          const local = await db.flashcards.get(c.id);
          if (!local || local.sync_status === 'synced') {
            await db.flashcards.put({ ...c, sync_status: 'synced' });
          }
        }
      }

      if (remoteProfile) {
        const local = await db.profiles.get(remoteProfile.id);
        if (!local || local.sync_status === 'synced') {
          await db.profiles.put({ ...remoteProfile, sync_status: 'synced' });
        }
      }

      setLastSyncTime(Date.now());
    } catch (err) {
      console.error('Sync pull error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  // Initial pull and periodic sync
  useEffect(() => {
    if (user) {
      pullChanges();
      const interval = setInterval(() => {
        pushChanges();
        pullChanges();
      }, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user, pullChanges, pushChanges]);

  // Listen for online status
  useEffect(() => {
    const handleOnline = () => pushChanges();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [pushChanges]);

  // --- Actions ---

  const addSubject = async (name: string) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const newSubject: LocalSubject = {
      id,
      name,
      created_at: new Date().toISOString(),
      user_id: user.id,
      sync_status: 'pending_create'
    };
    await db.subjects.add(newSubject);
    pushChanges();
  };

  const updateSubject = async (id: string, name: string) => {
    await db.subjects.update(id, { name, sync_status: 'pending_update' });
    pushChanges();
  };

  const deleteSubject = async (id: string) => {
    await db.subjects.update(id, { sync_status: 'pending_delete' });
    pushChanges();
  };

  const addDeck = async (name: string, subject_id: string) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const newDeck: LocalDeck = {
      id,
      name,
      subject_id,
      created_at: new Date().toISOString(),
      user_id: user.id,
      sync_status: 'pending_create'
    };
    await db.decks.add(newDeck);

    // Add demo flashcard
    const demoCardId = crypto.randomUUID();
    const demoCard: LocalFlashcard = {
      id: demoCardId,
      front: "What is Ushanj?",
      back: `UshanJ is your complete preparation partner — built for every student, for every competitive exam.
Created by Abhishek Kumar, UshanJ was born from one simple belief: aspirants don’t just need more content — they need better systems. Systems that help them stay organized, track real progress, and revise effectively, all the way to exam day.
Today, UshanJ offers three powerful platforms to support your entire preparation journey:
Ushanj.com is a full-featured web app with dedicated tracking tools for every major competitive exam. From structured syllabus coverage to progress dashboards, it gives you everything you need to plan, track, and complete your preparation — all in one place.
Ushanj Notion Templates bring the same preparation-first philosophy to Notion — giving you ready-to-use study planners, revision trackers, and exam dashboards that you can customize to your own workflow and schedule.
Ushanj Flashcards is a dedicated flashcard platform built specifically for competitive exam revision — helping you retain more in less time through active recall and spaced repetition.
Whether you’re preparing for UPSC, SSC, NEET, JEE, Banking, Defence, or any other exam, UshanJ meets you where you are and gives you the tools to go further.
Three platforms. Every exam. One preparation partner.

Check out our YouTube channel for more tips and guidance!`,
      deck_id: id,
      subject_id,
      tags: ["demo", "welcome"],
      mastery_level: 'New',
      created_at: new Date().toISOString(),
      user_id: user.id,
      sync_status: 'pending_create'
    };
    await db.flashcards.add(demoCard);

    pushChanges();
  };

  const updateDeck = async (id: string, name: string) => {
    await db.decks.update(id, { name, sync_status: 'pending_update' });
    pushChanges();
  };

  const deleteDeck = async (id: string) => {
    await db.decks.update(id, { sync_status: 'pending_delete' });
    pushChanges();
  };

  const addFlashcard = async (front: string, back: string, deck_id: string, subject_id: string, tags: string[], mastery_level: MasteryLevel = 'New') => {
    if (!user) return;
    const id = crypto.randomUUID();
    const newCard: LocalFlashcard = {
      id,
      front,
      back,
      deck_id,
      subject_id,
      tags,
      mastery_level,
      created_at: new Date().toISOString(),
      user_id: user.id,
      sync_status: 'pending_create'
    };
    await db.flashcards.add(newCard);
    pushChanges();
  };

  const updateFlashcard = async (id: string, updates: Partial<LocalFlashcard>) => {
    await db.flashcards.update(id, { ...updates, sync_status: 'pending_update' });
    pushChanges();
  };

  const deleteFlashcard = async (id: string) => {
    await db.flashcards.update(id, { sync_status: 'pending_delete' });
    pushChanges();
  };

  const updateProfile = async (updates: Partial<LocalProfile>) => {
    if (!user) return;
    await db.profiles.update(user.id, { ...updates, sync_status: 'pending_update' });
    pushChanges();
  };

  return {
    subjects,
    decks,
    flashcards,
    profile,
    isSyncing,
    lastSyncTime,
    addSubject,
    updateSubject,
    deleteSubject,
    addDeck,
    updateDeck,
    deleteDeck,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    updateProfile,
    sync: pushChanges
  };
}
