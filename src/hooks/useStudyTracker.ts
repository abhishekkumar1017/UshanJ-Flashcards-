import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalSubject, LocalDeck, LocalFlashcard, LocalProfile } from '../db';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';
import { MasteryLevel } from '../types';

export function useStudyTracker(user: User | null) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  const userId = user?.id || 'guest-user';
  const isGuest = !user || userId === 'guest-user';

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
    () => db.profiles.get(userId),
    [userId]
  );

  // --- Sync Logic ---

  const pushChanges = useCallback(async () => {
    if (isGuest) return;
    setIsSyncing(true);
    try {
      // 1. Push Subjects
      const pendingSubjects = await db.subjects.where('sync_status').anyOf(['pending_create', 'pending_update', 'pending_delete']).toArray();
      for (const s of pendingSubjects) {
        let success = false;
        if (s.sync_status === 'pending_delete') {
          const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'subjects', action: 'delete', id: s.id, userId })
          });
          if (response.ok) success = true;
          if (success) await db.subjects.delete(s.id);
        } else {
          const { sync_status, ...data } = s;
          const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'subjects', action: 'upsert', data, userId })
          });
          if (response.ok) success = true;
          if (success) await db.subjects.update(s.id, { sync_status: 'synced' });
        }
      }

      // 2. Push Decks
      const pendingDecks = await db.decks.where('sync_status').anyOf(['pending_create', 'pending_update', 'pending_delete']).toArray();
      for (const d of pendingDecks) {
        let success = false;
        if (d.sync_status === 'pending_delete') {
          const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'decks', action: 'delete', id: d.id, userId })
          });
          if (response.ok) success = true;
          if (success) await db.decks.delete(d.id);
        } else {
          const { sync_status, ...data } = d;
          const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'decks', action: 'upsert', data, userId })
          });
          if (response.ok) success = true;
          if (success) await db.decks.update(d.id, { sync_status: 'synced' });
        }
      }

      // 3. Push Flashcards
      const pendingCards = await db.flashcards.where('sync_status').anyOf(['pending_create', 'pending_update', 'pending_delete']).toArray();
      for (const c of pendingCards) {
        let success = false;
        if (c.sync_status === 'pending_delete') {
          const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'flashcards', action: 'delete', id: c.id, userId })
          });
          if (response.ok) success = true;
          if (success) await db.flashcards.delete(c.id);
        } else {
          const { sync_status, ...data } = c;
          const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'flashcards', action: 'upsert', data, userId })
          });
          if (response.ok) success = true;
          if (success) await db.flashcards.update(c.id, { sync_status: 'synced' });
        }
      }

      // 4. Push Profile
      const pendingProfile = await db.profiles.where('sync_status').equals('pending_update').toArray();
      for (const p of pendingProfile) {
        const { sync_status, ...data } = p;
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'profiles', action: 'upsert', data, userId })
        });
        if (response.ok) await db.profiles.update(p.id, { sync_status: 'synced' });
      }

    } catch (err) {
      console.error('Sync push error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user, userId, isGuest]);

  const pullChanges = useCallback(async () => {
    if (isGuest) return;
    setIsSyncing(true);
    try {
      // Pull all data for user via cached API
      const [
        resSubjects,
        resDecks,
        resCards,
        resProfile
      ] = await Promise.all([
        fetch(`/api/subjects?userId=${userId}`).then(r => r.json()),
        fetch(`/api/decks?userId=${userId}`).then(r => r.json()),
        fetch(`/api/flashcards?userId=${userId}`).then(r => r.json()),
        fetch(`/api/profile?userId=${userId}`).then(r => r.json())
      ]);

      const remoteSubjects = resSubjects.data;
      const remoteDecks = resDecks.data;
      const remoteCards = resCards.data;
      const remoteProfile = resProfile.data;

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
    if (!isGuest) {
      pullChanges();
      const interval = setInterval(() => {
        pushChanges();
        pullChanges();
      }, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isGuest, pullChanges, pushChanges]);

  // Listen for online status
  useEffect(() => {
    const handleOnline = () => pushChanges();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [pushChanges]);

  // --- Actions ---

  const addSubject = async (name: string) => {
    const id = crypto.randomUUID();
    const newSubject: LocalSubject = {
      id,
      name,
      created_at: new Date().toISOString(),
      user_id: userId,
      sync_status: isGuest ? 'synced' : 'pending_create'
    };
    await db.subjects.add(newSubject);
    if (!isGuest) pushChanges();
    return newSubject;
  };

  const updateSubject = async (id: string, name: string) => {
    await db.subjects.update(id, { name, sync_status: isGuest ? 'synced' : 'pending_update' });
    if (!isGuest) pushChanges();
  };

  const deleteSubject = async (id: string) => {
    if (isGuest) {
      await db.subjects.delete(id);
    } else {
      await db.subjects.update(id, { sync_status: 'pending_delete' });
      pushChanges();
    }
  };

  const addDeck = async (name: string, subject_id: string) => {
    const id = crypto.randomUUID();
    const newDeck: LocalDeck = {
      id,
      name,
      subject_id,
      created_at: new Date().toISOString(),
      user_id: userId,
      sync_status: isGuest ? 'synced' : 'pending_create'
    };
    await db.decks.add(newDeck);

    // Add demo flashcard
    const demoCardId = crypto.randomUUID();
    const demoCard: LocalFlashcard = {
      id: demoCardId,
      front: "What is UshanJ",
      back: `UshanJ is a complete study ecosystem designed for serious aspirants, helping them plan, track, and master their preparation across multiple platforms.

It brings together:

* UshanJ Webapp – a smart preparation tracker to organize subjects, manage tasks, and follow spaced revision
* UshanJ Flashcards – a focused tool to create and practice flashcards for active recall
* UshanJ Notion Templates – ready-to-use systems to structure study, habits, and productivity

In short, UshanJ helps students stay organized, consistent, and exam-ready in one connected system.

Search UshanJ on youtube to get the youtube channel`,
      deck_id: id,
      subject_id,
      tags: ["demo", "welcome"],
      mastery_level: 'New',
      created_at: new Date().toISOString(),
      user_id: userId,
      sync_status: isGuest ? 'synced' : 'pending_create'
    };
    await db.flashcards.add(demoCard);

    if (!isGuest) pushChanges();
    return newDeck;
  };

  const updateDeck = async (id: string, name: string) => {
    await db.decks.update(id, { name, sync_status: isGuest ? 'synced' : 'pending_update' });
    if (!isGuest) pushChanges();
  };

  const deleteDeck = async (id: string) => {
    if (isGuest) {
      await db.decks.delete(id);
    } else {
      await db.decks.update(id, { sync_status: 'pending_delete' });
      pushChanges();
    }
  };

  const addFlashcard = async (front: string, back: string, deck_id: string, subject_id: string, tags: string[], mastery_level: MasteryLevel = 'New') => {
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
      user_id: userId,
      sync_status: isGuest ? 'synced' : 'pending_create'
    };
    await db.flashcards.add(newCard);
    if (!isGuest) pushChanges();
    return newCard;
  };

  const updateFlashcard = async (id: string, updates: Partial<LocalFlashcard>) => {
    await db.flashcards.update(id, { ...updates, sync_status: isGuest ? 'synced' : 'pending_update' });
    if (!isGuest) pushChanges();
  };

  const deleteFlashcard = async (id: string) => {
    if (isGuest) {
      await db.flashcards.delete(id);
    } else {
      await db.flashcards.update(id, { sync_status: 'pending_delete' });
      pushChanges();
    }
  };

  const updateProfile = async (updates: Partial<LocalProfile>) => {
    const current = await db.profiles.get(userId);
    if (!current) {
      await db.profiles.add({
        id: userId,
        username: updates.username || null,
        full_name: updates.full_name || null,
        study_sessions: updates.study_sessions || 0,
        preparing_for_exam: updates.preparing_for_exam || null,
        location: updates.location || null,
        created_at: new Date().toISOString(),
        sync_status: isGuest ? 'synced' : 'pending_update'
      });
    } else {
      await db.profiles.update(userId, { ...updates, sync_status: isGuest ? 'synced' : 'pending_update' });
    }
    if (!isGuest) pushChanges();
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
