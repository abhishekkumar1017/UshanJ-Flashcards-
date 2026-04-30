import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Trash2, 
  PlusCircle, 
  XCircle,
  X,
  Layers,
  Play,
  Brain,
  ArrowLeft,
  ArrowRight,
  Tag,
  Eye,
  EyeOff,
  Search,
  Filter,
  Shuffle,
  Edit3,
  Check,
  RotateCcw,
  User as UserIcon,
  Settings,
  Sun,
  Moon,
  Youtube
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { useStudyTracker } from './hooks/useStudyTracker';
import { MasteryLevel, Subject, Deck, Flashcard, Profile } from './types';
import { getGlobalStats, incrementMasteredCount, incrementSessionCount, GlobalStats } from './services/statsService';

// --- Types ---
type SortCriteria = 'created_at' | 'mastery_level' | 'alphabetical';

// --- Components ---

const getMasteryDisplay = (level: MasteryLevel) => {
  switch (level) {
    case 'Mastered': return { label: 'Easy', classes: 'text-mastery-easy-text bg-mastery-easy-bg border-mastery-easy-border' };
    case 'Review': return { label: 'Moderate', classes: 'text-mastery-moderate-text bg-mastery-moderate-bg border-mastery-moderate-border' };
    case 'Learning': return { label: 'Hard', classes: 'text-mastery-hard-text bg-mastery-hard-bg border-mastery-hard-border' };
    default: return { label: 'Hard', classes: 'text-mastery-hard-text bg-mastery-hard-bg border-mastery-hard-border' };
  }
};

export default function App() {
  console.log('App component is executing');
  const [user, setUser] = useState<User | null>({ id: 'guest-user' } as any);
  const [loading, setLoading] = useState(false);
  
  // Use the new study tracker hook
  const {
    subjects: allSubjects,
    decks: allDecks,
    flashcards: allFlashcards,
    profile: dbProfile,
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
    sync
  } = useStudyTracker(user);

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortCriteria>('created_at');

  // Study session state
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [currentStudyIndex, setCurrentStudyIndex] = useState(0);

  // Form states
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [newCardTags, setNewCardTags] = useState('');
  const [newCardMastery, setNewCardMastery] = useState<MasteryLevel>('New');
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isAddingDeck, setIsAddingDeck] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editDeckName, setEditDeckName] = useState('');
  const [detailCard, setDetailCard] = useState<Flashcard | null>(null);

  // Long press state
  const [longPressItem, setLongPressItem] = useState<{
    type: 'subject' | 'deck';
    id: string;
    name: string;
  } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);

  const handleLongPressStart = (item: any, type: 'subject' | 'deck') => {
    isLongPressActive.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressActive.current = true;
      setLongPressItem({ type, id: item.id, name: item.name });
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // UI States
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ushanj_theme');
      if (saved !== null) return saved === 'dark';
      return false; // Default to light
    }
    return false;
  });
  const [alertModal, setAlertModal] = useState<{ title: string, message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const [toasts, setToasts] = useState<{ id: string, message: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'subjects' | 'study' | 'progress' | 'deck-detail'>('dashboard');
  const [viewingDeck, setViewingDeck] = useState<Deck | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [globalStats, setGlobalStats] = useState<GlobalStats>({ mastered: 0, studySessions: 0 });

  useEffect(() => {
    const fetchGlobalStats = async () => {
      const stats = await getGlobalStats();
      setGlobalStats(stats);
    };
    fetchGlobalStats();
    // Refresh every minute
    const interval = setInterval(fetchGlobalStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const addToast = (message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'c' && !isStudyModalOpen && !isAddingCard && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setIsAddingCard(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudyModalOpen, isAddingCard]);

  // Derived data based on selections
  const subjects = useMemo(() => allSubjects as unknown as Subject[], [allSubjects]);
  
  const decks = useMemo(() => {
    if (!selectedSubject) return [];
    return (allDecks as unknown as Deck[]).filter(d => d.subject_id === selectedSubject.id);
  }, [allDecks, selectedSubject]);

  const flashcards = useMemo(() => {
    if (!selectedDeck) return [];
    return (allFlashcards as unknown as Flashcard[]).filter(f => f.deck_id === selectedDeck.id);
  }, [allFlashcards, selectedDeck]);

  const profile = useMemo(() => dbProfile as unknown as Profile | null, [dbProfile]);

  // Theme effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ushanj_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ushanj_theme', 'light');
    }
  }, [darkMode]);

  // Set default selections and handle hierarchy
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0]);
    }
  }, [subjects, selectedSubject]);

  useEffect(() => {
    if (decks.length > 0) {
      const isCurrentDeckValid = decks.some(d => d.id === selectedDeck?.id);
      if (!isCurrentDeckValid) {
        setSelectedDeck(decks[0]);
      }
    } else {
      setSelectedDeck(null);
    }
  }, [decks, selectedDeck]);

  const handleUpdateProfile = async (updates: Partial<Profile>) => {
    try {
      await updateProfile(updates);
      setAlertModal({ title: "Success", message: "Profile updated successfully!" });
    } catch (error: any) {
      setAlertModal({ title: "Error", message: error.message });
    }
  };

  const sortedAndFilteredFlashcards = useMemo(() => {
    let result = flashcards.filter(card => {
      const matchesSearch = searchTerm === '' || 
        card.front.toLowerCase().includes(searchTerm.toLowerCase()) || 
        card.back.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesTags = selectedFilterTags.length === 0 || 
        selectedFilterTags.every(tag => card.tags?.includes(tag));

      return matchesSearch && matchesTags;
    });

    // Sorting logic
    result.sort((a, b) => {
      if (sortBy === 'created_at') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      }
      if (sortBy === 'alphabetical') {
        return a.front.localeCompare(b.front);
      }
      if (sortBy === 'mastery_level') {
        const levels: Record<MasteryLevel, number> = {
          'New': 0,
          'Learning': 1,
          'Review': 2,
          'Mastered': 3
        };
        return levels[a.mastery_level] - levels[b.mastery_level];
      }
      return 0;
    });

    return result;
  }, [flashcards, searchTerm, selectedFilterTags, sortBy]);

  const allUniqueTags = useMemo(() => {
    const tags = new Set<string>();
    flashcards.forEach(card => card.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [flashcards]);

  const toggleTagFilter = (tag: string) => {
    setSelectedFilterTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      await addSubject(newSubjectName.trim());
      setNewSubjectName('');
      setIsAddingSubject(false);
    } catch (error) {
      console.error('Error creating subject:', error);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim() || !selectedSubject) return;
    try {
      await addDeck(newDeckName.trim(), selectedSubject.id);
      setNewDeckName('');
      setIsAddingDeck(false);
    } catch (error) {
      console.error('Error creating deck:', error);
    }
  };

  const handleCreateCard = async (keepOpen = false) => {
    if (!newCardFront.trim() || !newCardBack.trim() || !selectedDeck || !selectedSubject || isCreatingCard) return;
    setIsCreatingCard(true);
    try {
      const tags = newCardTags.split(',').map(t => t.trim()).filter(t => t !== '');
      await addFlashcard(newCardFront.trim(), newCardBack.trim(), selectedDeck.id, selectedSubject.id, tags, newCardMastery);
      
      setNewCardFront('');
      setNewCardBack('');
      setNewCardTags('');
      setNewCardMastery('New');
      addToast("Card saved ✓");
      if (!keepOpen) {
        setIsAddingCard(false);
      }
    } catch (error) {
      console.error('Error creating card:', error);
    } finally {
      setIsCreatingCard(false);
    }
  };

  const handleUpdateCard = async (id: string, front: string, back: string, tags: string[]) => {
    try {
      await updateFlashcard(id, {
        front: front.trim(),
        back: back.trim(),
        tags: tags
      });
      setEditingCard(null);
    } catch (error) {
      console.error('Error updating card:', error);
    }
  };

  const startStudySession = (cards: Flashcard[]) => {
    if (cards.length === 0) return;
    setStudyCards([...cards]);
    setCurrentStudyIndex(0);
    setIsStudyModalOpen(true);
    incrementSessionCount();
  };

  const shuffleStudySession = () => {
    setStudyCards(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setCurrentStudyIndex(0);
  };

  const handleRateCardById = async (id: string, currentMastery: MasteryLevel, rating: 'Easy' | 'Medium' | 'Hard') => {
    let newMastery: MasteryLevel = currentMastery;
    if (rating === 'Easy') newMastery = 'Mastered';
    if (rating === 'Medium') newMastery = 'Review';
    if (rating === 'Hard') newMastery = 'Learning';

    try {
      await updateFlashcard(id, { 
        mastery_level: newMastery, 
        last_reviewed: new Date().toISOString() 
      });
      if (rating === 'Easy') {
        incrementMasteredCount();
      }
    } catch (error) {
      console.error('Error rating card:', error);
      throw error;
    }
  };

  const handleStudyRate = async (rating: 'Easy' | 'Medium' | 'Hard') => {
    const currentCard = studyCards[currentStudyIndex];
    
    try {
      await handleRateCardById(currentCard.id, currentCard.mastery_level, rating);

      if (currentStudyIndex < studyCards.length - 1) {
        setCurrentStudyIndex(prev => prev + 1);
      } else {
        setAlertModal({ title: "Session Complete!", message: "You've reviewed all cards in this session. Great job!" });
        setIsStudyModalOpen(false);
      }
    } catch (error) {
      // Error already logged in handleRateCardById
    }
  };

  const startSubjectStudy = async (subject_id: string) => {
    try {
      const subjectCards = (allFlashcards as unknown as Flashcard[]).filter(f => f.subject_id === subject_id);
      startStudySession(subjectCards);
    } catch (error) {
      console.error('Error starting subject study:', error);
    }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !editSubjectName.trim()) return;
    try {
      await updateSubject(editingSubject.id, editSubjectName.trim());
      setEditingSubject(null);
      setEditSubjectName('');
    } catch (error) {
      console.error('Error updating subject:', error);
    }
  };

  const handleUpdateDeck = async () => {
    if (!editingDeck || !editDeckName.trim()) return;
    try {
      await updateDeck(editingDeck.id, editDeckName.trim());
      setEditingDeck(null);
      setEditDeckName('');
    } catch (error) {
      console.error('Error updating deck:', error);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    setConfirmModal({
      title: 'Delete Subject?',
      message: 'This will permanently delete the subject and all its decks and flashcards.',
      onConfirm: async () => {
        if (selectedSubject?.id === id) setSelectedSubject(null);
        setConfirmModal(null);
        try {
          await deleteSubject(id);
        } catch (error) {
          console.error('Error deleting subject:', error);
        }
      }
    });
  };

  const handleDeleteDeck = async (id: string) => {
    setConfirmModal({
      title: 'Delete Deck?',
      message: 'This will permanently delete the deck and all its flashcards.',
      onConfirm: async () => {
        if (selectedDeck?.id === id) setSelectedDeck(null);
        setConfirmModal(null);
        try {
          await deleteDeck(id);
        } catch (error) {
          console.error('Error deleting deck:', error);
        }
      }
    });
  };

  const handleDeleteCard = async (id: string) => {
    setConfirmModal({
      title: 'Delete Card?',
      message: 'Are you sure you want to delete this flashcard?',
      onConfirm: async () => {
        setDetailCard(null);
        setConfirmModal(null);
        try {
          await deleteFlashcard(id);
          addToast("Card deleted");
        } catch (error) {
          console.error('Error deleting card:', error);
        }
      }
    });
  };

  const handleDeleteStudyCard = async (id: string, permanent: boolean) => {
    if (permanent) {
      try {
        await deleteFlashcard(id);
      } catch (error) {
        console.error('Error deleting study card:', error);
      }
    }

    // Remove from current study session
    const newCards = studyCards.filter(c => c.id !== id);
    if (newCards.length === 0) {
      setIsStudyModalOpen(false);
      setStudyCards([]);
    } else {
      setStudyCards(newCards);
      // Adjust index if we deleted the last card
      if (currentStudyIndex >= newCards.length) {
        setCurrentStudyIndex(newCards.length - 1);
      }
    }
  };

  return (
    <div className="min-h-screen bg-bg-main transition-color duration-300">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-t-[3px] border-accent shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Brain size={24} className="text-accent" />
              <h1 className="text-2xl font-black tracking-tighter text-text-main">
                Flash<span className="text-accent">Cards</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: 'dashboard', label: 'Dashboard', path: '#' },
                { id: 'subjects', label: 'My Subjects', path: '#' },
                { id: 'study', label: 'Study Mode', path: '#' },
                { id: 'progress', label: 'Progress', path: '#' },
                { id: 'account', label: 'Account', path: 'account.html' },
                { id: 'settings', label: 'Settings', path: 'settings.html' }
              ].map(tab => (
                tab.path === '#' ? (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setViewingDeck(null);
                      setActiveTab(tab.id as any);
                    }}
                    className={`px-4 py-2 text-sm font-bold transition-all relative ${
                      activeTab === tab.id ? 'text-accent' : 'text-text-secondary hover:text-text-main'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div 
                        layoutId="navUnderline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                      />
                    )}
                  </button>
                ) : (
                  <a
                    key={tab.id}
                    href={tab.path}
                    className="px-4 py-2 text-sm font-bold text-text-secondary hover:text-text-main transition-all"
                  >
                    {tab.label}
                  </a>
                )
              ))}
            </nav>

            <div className="h-6 w-px bg-border-main" />

            <button 
              onClick={() => setIsAddingCard(true)}
              className="bg-accent text-white px-6 py-3 rounded-2xl text-sm font-black shadow-xl shadow-accent/20 hover:-translate-y-0.5 transition-all"
            >
              Create Card
            </button>

            <button 
              onClick={() => window.location.href = 'account.html'}
              className="w-10 h-10 rounded-2xl bg-bg-secondary border border-border-main flex items-center justify-center group"
            >
              <UserIcon size={20} className="text-text-secondary group-hover:text-accent" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12">
        {activeTab === 'dashboard' && (
          <>
            {/* Hero Section */}
            <section className="bg-bg-secondary rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1 space-y-6">
                <span className="inline-block px-4 py-1.5 bg-white text-accent text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-sm">
                  Learning Portal
                </span>
                <h2 className="text-5xl font-black text-text-main leading-tight tracking-tight">
                  Hello, {profile?.full_name?.split(' ')[0] || 'Learner'}!
                </h2>
                <p className="text-text-secondary text-lg font-medium">
                  You've mastered <span className="text-accent font-black">{(allFlashcards.filter(f => f.mastery_level === 'Mastered').length)}</span> cards out of {allFlashcards.length}.
                </p>
                <div className="flex gap-4 pt-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Community Streak</span>
                    <span className="text-xl font-black text-accent">{globalStats.studySessions.toLocaleString()} sessions</span>
                  </div>
                  <div className="w-px h-8 bg-border-main self-center" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Global Mastery</span>
                    <span className="text-xl font-black text-accent">{globalStats.mastered.toLocaleString()} mastered</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full space-y-8">
                <div className="grid grid-cols-3 gap-4">
                  <StatCard label="Total Cards" value={allFlashcards.length} isAccent />
                  <StatCard label="Subjects" value={allSubjects.length} />
                  <StatCard label="Decks" value={allDecks.length} />
                </div>
                <div className="relative">
                  <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input 
                    type="text"
                    placeholder="Search your collection..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-white rounded-2xl text-text-main font-bold outline-none shadow-sm focus:shadow-xl transition-all"
                  />
                </div>
              </div>
            </section>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <ActionButton 
                icon={<PlusCircle className="text-accent" />} 
                label="Create Card" 
                onClick={() => setIsAddingCard(true)} 
              />
              <ActionButton 
                icon={<Layers className="text-text-main" />} 
                label="Add Subject" 
                onClick={() => setIsAddingSubject(true)} 
              />
              <ActionButton 
                icon={<Tag className="text-text-main" />} 
                label="New Deck" 
                onClick={() => setIsAddingDeck(true)} 
              />
              <ActionButton 
                icon={<Brain className="text-accent" />} 
                label="Study Now" 
                onClick={() => startStudySession(allFlashcards)}
                isStudyMode
              />
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12 items-start">
              
              {/* Left Column */}
              <div className="space-y-16">
                
                {/* Subjects */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-text-main tracking-tight">Your Subjects</h3>
                    <button 
                      onClick={() => setIsAddingSubject(true)}
                      className="text-xs font-black text-accent uppercase tracking-widest px-4 py-2 border-2 border-accent rounded-full hover:bg-accent hover:text-white transition-all"
                    >
                      Add Subject
                    </button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {subjects.map((subject, idx) => (
                      <SubjectChip 
                        key={subject.id}
                        subject={subject}
                        active={selectedSubject?.id === subject.id}
                        count={allDecks.filter(d => d.subject_id === subject.id).length}
                        onClick={() => setSelectedSubject(subject)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setLongPressItem({ type: 'subject', id: subject.id, name: subject.name });
                        }}
                        index={idx}
                      />
                    ))}
                  </div>
                </section>

                {/* Decks Grid */}
                {selectedSubject && (
                  <section className="space-y-6">
                    <h3 className="text-xl font-black text-text-main">Decks in {selectedSubject.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {decks.map(deck => (
                        <DeckCard 
                          key={deck.id}
                          deck={deck}
                          active={selectedDeck?.id === deck.id}
                          count={allFlashcards.filter(f => f.deck_id === deck.id).length}
                          onClick={() => {
                            setViewingDeck(deck);
                            setActiveTab('deck-detail');
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setLongPressItem({ type: 'deck', id: deck.id, name: deck.name });
                          }}
                          onStudy={() => startStudySession(allFlashcards.filter(f => f.deck_id === deck.id))}
                        />
                      ))}
                      <button 
                        onClick={() => setIsAddingDeck(true)}
                        className="flex flex-col items-center justify-center gap-4 h-40 bg-bg-secondary/30 border-2 border-dashed border-border-main rounded-2xl hover:border-accent hover:bg-white transition-all group"
                      >
                        <PlusCircle size={32} className="text-text-secondary group-hover:text-accent" />
                        <span className="text-sm font-black text-text-secondary">Add New Deck</span>
                      </button>
                    </div>
                  </section>
                )}

                {/* Flashcards Grid */}
                {selectedDeck && (
                  <section className="space-y-8">
                    <div className="flex items-center justify-between border-b border-border-main pb-4">
                      <h3 className="text-xl font-black text-text-main">Flashcards</h3>
                      <div className="flex items-center gap-4">
                        <select 
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="text-xs font-black uppercase tracking-widest text-text-secondary bg-transparent outline-none cursor-pointer"
                        >
                          <option value="created_at">Newest First</option>
                          <option value="mastery_level">Mastery</option>
                          <option value="alphabetical">A-Z</option>
                        </select>
                        <div className="flex items-center gap-2 bg-bg-secondary p-1 rounded-xl">
                          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-accent' : 'text-text-secondary'}`}><Layers size={14} /></button>
                          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-accent' : 'text-text-secondary'}`}><Filter size={14} /></button>
                        </div>
                      </div>
                    </div>

                    {sortedAndFilteredFlashcards.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 bg-bg-secondary/20 rounded-[2.5rem] border-2 border-dashed border-border-main">
                        <div className="text-6xl mb-6">📚</div>
                        <p className="text-xl font-black text-text-secondary mb-8">No cards found in this deck</p>
                        <button 
                          onClick={() => setIsAddingCard(true)}
                          className="px-8 py-4 bg-accent text-white rounded-2xl font-black shadow-lg shadow-accent/20"
                        >
                          Create Your First Card
                        </button>
                      </div>
                    ) : (
                      <div className={viewMode === 'grid' 
                        ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" 
                        : "space-y-4"
                      }>
                        {sortedAndFilteredFlashcards.map(card => (
                          <DashboardFlashcard 
                            key={card.id}
                            card={card}
                            onEdit={() => setEditingCard(card)}
                            onDelete={() => handleDeleteCard(card.id)}
                            onClick={() => setDetailCard(card)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

              </div>

              {/* Right Column (Sidebar) */}
              <aside className="space-y-8 sticky top-32">
                <DailyStatsWidget cards={allFlashcards} />
                
                <QuickAddWidget 
                  subjects={subjects}
                  onSave={async (f, b, sid) => {
                    let deckId = allDecks.find(d => d.subject_id === sid)?.id;
                    if (!deckId) {
                      // Create a default deck if none exists
                      const newDeck = await addDeck("General", sid);
                      deckId = newDeck.id;
                    }
                    await addFlashcard(f, b, deckId, sid, [], 'New');
                    addToast("Card saved ✓");
                  }}
                />

                <RecentActivityWidget cards={allFlashcards} />
              </aside>
            </div>
          </>
        )}

        {activeTab === 'subjects' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-black text-text-main tracking-tight">Your Subjects</h2>
              <button 
                onClick={() => setIsAddingSubject(true)}
                className="bg-accent text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-accent/20 transition-all hover:scale-105"
              >
                Create New Subject
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {subjects.map((subject, idx) => (
                <motion.div 
                  key={subject.id}
                  layoutId={`subject-${subject.id}`}
                  className="bg-white p-8 rounded-[2.5rem] shadow-subtle border border-border-main hover:border-accent group transition-all cursor-pointer relative"
                  onClick={() => {
                    setSelectedSubject(subject);
                    setActiveTab('dashboard');
                  }}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-bg-secondary rounded-2xl group-hover:bg-accent/10 transition-colors">
                      <Layers size={24} className="text-text-secondary group-hover:text-accent" />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={(e) => { e.stopPropagation(); setEditingSubject(subject); setEditSubjectName(subject.name); }} className="p-2 hover:text-accent"><Edit3 size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }} className="p-2 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <h4 className="text-2xl font-black text-text-main mb-2 tracking-tight">{subject.name}</h4>
                  <p className="text-sm font-bold text-text-secondary uppercase tracking-widest">
                    {allDecks.filter(d => d.subject_id === subject.id).length} Decks • {allFlashcards.filter(f => f.subject_id === subject.id).length} Cards
                  </p>
                  <div className="absolute bottom-6 right-8 text-accent opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
                    <ArrowRight size={24} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'study' && (
          <div className="max-w-4xl mx-auto space-y-12 text-center py-12">
            <div className="space-y-4">
              <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <Brain size={48} className="text-accent" />
              </div>
              <h2 className="text-4xl font-black text-text-main tracking-tight">Ready to focus?</h2>
              <p className="text-text-secondary text-lg font-medium">Choose what you want to study today and sharpen your knowledge.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <button 
                onClick={() => startStudySession(allFlashcards)}
                className="bg-white p-10 rounded-[2.5rem] border-2 border-border-main hover:border-accent transition-all group shadow-subtle text-left space-y-6"
              >
                <div className="flex justify-between items-center">
                  <span className="p-4 bg-accent text-white rounded-2xl shadow-lg shadow-accent/20"><Shuffle size={24} /></span>
                  <span className="text-6xl opacity-10">All</span>
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-text-main">Study All Cards</h4>
                  <p className="text-text-secondary font-medium">Review everything you've created so far.</p>
                </div>
              </button>

              <button 
                onClick={() => {
                  const urgentCards = allFlashcards.filter(f => f.mastery_level !== 'Mastered');
                  startStudySession(urgentCards);
                }}
                className="bg-white p-10 rounded-[2.5rem] border-2 border-border-main hover:border-accent transition-all group shadow-subtle text-left space-y-6"
              >
                <div className="flex justify-between items-center">
                  <span className="p-4 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-500/20"><RotateCcw size={24} /></span>
                  <span className="text-6xl opacity-10">!</span>
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-text-main">Practice Weaknesses</h4>
                  <p className="text-text-secondary font-medium">Focus on cards you haven't mastered yet.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-12">
            <h2 className="text-4xl font-black text-text-main tracking-tight">Your Progress</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-subtle border border-border-main space-y-8">
                <h4 className="text-xl font-black text-text-main">Mastery Distribution</h4>
                <div className="space-y-6">
                  {(['Mastered', 'Review', 'Learning', 'New'] as MasteryLevel[]).map(level => {
                    const count = allFlashcards.filter(f => f.mastery_level === level).length;
                    const percentage = allFlashcards.length > 0 ? (count / allFlashcards.length) * 100 : 0;
                    const display = getMasteryDisplay(level);
                    return (
                      <div key={level} className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${display.classes.split(' ')[0]}`}>{display.label} ({level})</span>
                          <span className="text-sm font-black text-text-secondary">{count} Cards</span>
                        </div>
                        <div className="h-3 bg-bg-secondary rounded-full overflow-hidden border border-border-main">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={`h-full ${
                              level === 'Mastered' ? 'bg-green-500' :
                              level === 'Review' ? 'bg-blue-500' :
                              level === 'Learning' ? 'bg-orange-500' : 'bg-gray-400'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="bg-white p-10 rounded-[2.5rem] shadow-subtle border border-border-main flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-32 h-32 rounded-full border-8 border-accent border-t-transparent animate-spin-slow flex items-center justify-center">
                   <span className="text-3xl font-black text-accent">{Math.round((allFlashcards.filter(f => f.mastery_level === 'Mastered').length / (allFlashcards.length || 1)) * 100)}%</span>
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-text-main tracking-tight">Overall Mastery</h4>
                  <p className="text-text-secondary font-medium">You are making incredible progress! Keep studying to reach 100%.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deck Detail View */}
        {activeTab === 'deck-detail' && viewingDeck && (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    setViewingDeck(null);
                    setActiveTab('dashboard');
                  }}
                  className="flex items-center gap-2 text-xs font-black text-text-secondary uppercase tracking-widest hover:text-accent transition-colors"
                >
                  <ArrowLeft size={14} /> Back to Dashboard
                </button>
                <div className="flex items-center gap-4">
                  <h2 className="text-4xl font-black text-text-main tracking-tight">{viewingDeck.name}</h2>
                  <span className="px-4 py-1.5 bg-accent/10 text-accent text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                    {allFlashcards.filter(f => f.deck_id === viewingDeck.id).length} Cards
                  </span>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => startStudySession(allFlashcards.filter(f => f.deck_id === viewingDeck.id))}
                  className="bg-accent text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-accent/20 flex items-center gap-3 transition-all hover:scale-105"
                >
                  <Play size={18} fill="currentColor" /> Study Deck
                </button>
                <button 
                  onClick={() => {
                    setSelectedDeck(viewingDeck);
                    setSelectedSubject(subjects.find(s => s.id === viewingDeck.subject_id) || null);
                    setIsAddingCard(true);
                  }}
                  className="bg-white text-text-main border-2 border-border-main px-8 py-4 rounded-2xl font-black hover:border-accent transition-all flex items-center gap-2"
                >
                  <PlusCircle size={18} /> Add Card
                </button>
              </div>
            </div>

            <section className="space-y-8">
              <div className="relative">
                <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input 
                  type="text"
                  placeholder="Search in this deck..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 bg-bg-secondary rounded-[1.5rem] text-text-main font-bold outline-none focus:bg-white focus:shadow-xl transition-all border-2 border-transparent focus:border-accent"
                />
              </div>

              {allFlashcards.filter(f => f.deck_id === viewingDeck.id).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-bg-secondary/20 rounded-[2.5rem] border-2 border-dashed border-border-main">
                  <div className="text-6xl mb-6">📚</div>
                  <p className="text-xl font-black text-text-secondary mb-8">This deck is empty</p>
                  <button 
                    onClick={() => {
                      setSelectedDeck(viewingDeck);
                      setSelectedSubject(subjects.find(s => s.id === viewingDeck.subject_id) || null);
                      setIsAddingCard(true);
                    }}
                    className="px-8 py-4 bg-accent text-white rounded-2xl font-black shadow-lg shadow-accent/20"
                  >
                    Add Your First Card
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {allFlashcards
                    .filter(f => f.deck_id === viewingDeck.id)
                    .filter(f => searchTerm === '' || f.front.toLowerCase().includes(searchTerm.toLowerCase()) || f.back.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(card => (
                      <DashboardFlashcard 
                        key={card.id}
                        card={card}
                        onEdit={() => setEditingCard(card)}
                        onDelete={() => handleDeleteCard(card.id)}
                        onClick={() => setDetailCard(card)}
                      />
                    ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} />

        {/* Study Modal */}
        <AnimatePresence>
          {isStudyModalOpen && (
            <StudyModal 
              cards={studyCards} 
              currentIndex={currentStudyIndex}
              onClose={() => setIsStudyModalOpen(false)}
              onNext={() => setCurrentStudyIndex(prev => Math.min(prev + 1, studyCards.length - 1))}
              onPrev={() => setCurrentStudyIndex(prev => Math.max(prev - 1, 0))}
              onShuffle={shuffleStudySession}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteStudyCard}
              onRate={handleStudyRate}
            />
          )}
        </AnimatePresence>

        {/* Detail Card Modal */}
        <AnimatePresence>
          {detailCard && (
            <DetailCardModal 
              card={detailCard} 
              onClose={() => setDetailCard(null)} 
              onEdit={() => {
                setEditingCard(detailCard);
                setDetailCard(null);
              }}
              onDelete={() => {
                handleDeleteCard(detailCard.id);
                setDetailCard(null);
              }}
              onRate={(rating) => {
                handleRateCardById(detailCard.id, detailCard.mastery_level, rating);
                setDetailCard(null);
                setAlertModal({ title: "Card Rated!", message: "Mastery level updated." });
              }}
            />
          )}
        </AnimatePresence>

        {/* Create Card Modal */}
        <AnimatePresence>
          {isAddingCard && (
            <CreateCardModal 
              onClose={() => setIsAddingCard(false)}
              newCardFront={newCardFront}
              setNewCardFront={setNewCardFront}
              newCardBack={newCardBack}
              setNewCardBack={setNewCardBack}
              newCardTags={newCardTags}
              setNewCardTags={setNewCardTags}
              newCardMastery={newCardMastery}
              setNewCardMastery={setNewCardMastery}
              handleCreateCard={handleCreateCard}
              isCreatingCard={isCreatingCard}
            />
          )}
        </AnimatePresence>

        {/* Add/Edit Subject Modal */}
        <AnimatePresence>
          {(isAddingSubject || editingSubject) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => { setIsAddingSubject(false); setEditingSubject(null); }}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white w-full max-w-md rounded-[2rem] p-10 shadow-2xl space-y-6"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-2xl font-black text-text-main tracking-tight">
                  {editingSubject ? 'Edit Subject' : 'Add Subject'}
                </h3>
                <input 
                  autoFocus
                  placeholder="Subject name (e.g. Biology, Spanish)"
                  value={editingSubject ? editSubjectName : newSubjectName}
                  onChange={e => editingSubject ? setEditSubjectName(e.target.value) : setNewSubjectName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') editingSubject ? handleUpdateSubject() : handleCreateSubject();
                  }}
                  className="w-full p-6 bg-bg-secondary border-2 border-transparent rounded-2xl text-base font-bold outline-none focus:bg-white focus:border-accent transition-all"
                />
                <div className="flex gap-4">
                  <button onClick={() => { setIsAddingSubject(false); setEditingSubject(null); }} className="flex-1 py-4 text-sm font-black text-text-secondary">Cancel</button>
                  <button 
                    onClick={editingSubject ? handleUpdateSubject : handleCreateSubject} 
                    className="flex-1 py-4 bg-accent text-white rounded-2xl text-sm font-black shadow-lg shadow-accent/20"
                  >
                    {editingSubject ? 'Save Changes' : 'Create Subject'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add/Edit Deck Modal */}
        <AnimatePresence>
          {(isAddingDeck || editingDeck) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => { setIsAddingDeck(false); setEditingDeck(null); }}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white w-full max-w-md rounded-[2rem] p-10 shadow-2xl space-y-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-text-main tracking-tight">
                    {editingDeck ? 'Edit Deck' : 'Add Deck'}
                  </h3>
                  {!editingDeck && selectedSubject && (
                    <p className="text-[10px] text-accent font-black uppercase tracking-widest">Adding to {selectedSubject.name}</p>
                  )}
                </div>
                <input 
                  autoFocus
                  placeholder="Deck name (e.g. Chapter 1, Vocabulary)"
                  value={editingDeck ? editDeckName : newDeckName}
                  onChange={e => editingDeck ? setEditDeckName(e.target.value) : setNewDeckName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') editingDeck ? handleUpdateDeck() : handleCreateDeck();
                  }}
                  className="w-full p-6 bg-bg-secondary border-2 border-transparent rounded-2xl text-base font-bold outline-none focus:bg-white focus:border-accent transition-all"
                />
                <div className="flex gap-4">
                  <button onClick={() => { setIsAddingDeck(false); setEditingDeck(null); }} className="flex-1 py-4 text-sm font-black text-text-secondary">Cancel</button>
                  <button 
                    onClick={editingDeck ? handleUpdateDeck : handleCreateDeck} 
                    className="flex-1 py-4 bg-accent text-white rounded-2xl text-sm font-black shadow-lg shadow-accent/20"
                  >
                    {editingDeck ? 'Save Changes' : 'Create Deck'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Card Modal (Main View) */}
        <AnimatePresence>
          {editingCard && (
            <EditCardModal 
              card={editingCard} 
              onClose={() => setEditingCard(null)} 
              onSave={handleUpdateCard} 
            />
          )}
        </AnimatePresence>

        {/* Custom Alert Modal */}
        <AnimatePresence>
          {alertModal && (
            <AlertModal 
              title={alertModal.title}
              message={alertModal.message}
              onClose={() => setAlertModal(null)}
            />
          )}
        </AnimatePresence>

        {/* Custom Confirm Modal */}
        <AnimatePresence>
          {confirmModal && (
            <ConfirmModal 
              title={confirmModal.title}
              message={confirmModal.message}
              onConfirm={confirmModal.onConfirm}
              onCancel={() => setConfirmModal(null)}
            />
          )}
        </AnimatePresence>

        {/* Profile Modal */}
        <AnimatePresence>
          {isProfileModalOpen && profile && (
            <ProfileModal 
              profile={profile}
              onClose={() => setIsProfileModalOpen(false)}
              onUpdate={handleUpdateProfile}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              lastSyncTime={lastSyncTime}
              isSyncing={isSyncing}
            />
          )}
        </AnimatePresence>

        {/* Long Press Menu */}
        <AnimatePresence>
          {longPressItem && (
            <LongPressMenu 
              item={longPressItem}
              onClose={() => setLongPressItem(null)}
              onEdit={() => {
                if (longPressItem.type === 'subject') {
                  const subject = subjects.find(s => s.id === longPressItem.id);
                  if (subject) {
                    setEditingSubject(subject);
                    setEditSubjectName(subject.name);
                  }
                } else {
                  const deck = decks.find(d => d.id === longPressItem.id);
                  if (deck) {
                    setEditingDeck(deck);
                    setEditDeckName(deck.name);
                  }
                }
              }}
              onDelete={() => {
                if (longPressItem.type === 'subject') {
                  handleDeleteSubject(longPressItem.id);
                } else {
                  handleDeleteDeck(longPressItem.id);
                }
              }}
            />
          )}
        </AnimatePresence>

        <footer className="mt-20 py-12 border-t border-border-main text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Brain size={18} className="text-accent" />
            <span className="text-sm font-black tracking-tighter text-text-main">FlashCards</span>
          </div>
          <p className="text-xs text-text-secondary font-medium">© 2024 FlashCards. All rights reserved.</p>
        </footer>
      </div>
    );
  }

const ProfileModal: React.FC<{ 
  profile: Profile, 
  onClose: () => void, 
  onUpdate: (updates: Partial<Profile>) => Promise<void>,
  darkMode: boolean,
  setDarkMode: (dark: boolean) => void,
  lastSyncTime: number,
  isSyncing: boolean
}> = ({ profile, onClose, onUpdate, darkMode, setDarkMode, lastSyncTime, isSyncing }) => {
  const [username, setUsername] = useState(profile.username || '');
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate({
      username: username || null,
      full_name: fullName || null
    });
    setIsSaving(false);
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-border-main"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-10 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-text-main tracking-tight">Settings</h3>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-text-secondary hover:text-red-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-[2rem] bg-accent/10 border-2 border-accent/20 flex items-center justify-center overflow-hidden relative group">
              <UserIcon size={40} className="text-accent" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">{profile.id.slice(0, 8)}</p>
              <div className="flex items-center justify-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-accent animate-pulse' : 'bg-green-500'}`} />
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  {isSyncing ? 'Syncing...' : lastSyncTime > 0 ? `Synced ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Ready'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-bg-secondary border-2 border-transparent rounded-2xl focus:bg-white focus:border-accent transition-all py-4 px-6 text-sm outline-none text-text-main font-bold"
                placeholder="Choose a unique username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">Full Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-bg-secondary border-2 border-transparent rounded-2xl focus:bg-white focus:border-accent transition-all py-4 px-6 text-sm outline-none text-text-main font-bold"
                placeholder="Your display name"
              />
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1 mb-4 block text-center">Appearance</label>
              <div className="flex items-center justify-between p-2 h-14 bg-bg-secondary rounded-2xl">
                <button 
                  onClick={() => setDarkMode(false)}
                  className={`flex-1 flex items-center justify-center gap-2 h-full rounded-xl transition-all font-bold text-xs ${!darkMode ? 'bg-white shadow-sm text-accent' : 'text-text-secondary'}`}
                >
                  <Sun size={14} /> Light
                </button>
                <button 
                  onClick={() => setDarkMode(true)}
                  className={`flex-1 flex items-center justify-center gap-2 h-full rounded-xl transition-all font-bold text-xs ${darkMode ? 'bg-white shadow-sm text-accent' : 'text-text-secondary'}`}
                >
                  <Moon size={14} /> Dark
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-accent text-white font-black py-4 rounded-2xl text-sm hover:shadow-xl hover:shadow-accent/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Update Account'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AlertModal: React.FC<{ title: string, message: string, onClose: () => void }> = ({ title, message, onClose }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-bg-secondary w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center space-y-6"
      onClick={e => e.stopPropagation()}
    >
      <div className="w-16 h-16 bg-mastery-easy-bg text-mastery-easy-text rounded-full flex items-center justify-center mx-auto">
        <Check size={32} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-text-main">Alert</h3>
        <p className="text-text-secondary text-sm">{message}</p>
      </div>
      <button 
        onClick={onClose}
        className="w-full py-3 bg-text-main text-bg-main rounded-xl text-sm font-bold transition-all"
      >
        Got it
      </button>
    </motion.div>
  </motion.div>
);

const ConfirmModal: React.FC<{ title: string, message: string, onConfirm: () => void, onCancel: () => void }> = ({ title, message, onConfirm, onCancel }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onCancel}
  >
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-bg-secondary w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center space-y-6"
      onClick={e => e.stopPropagation()}
    >
      <div className="w-16 h-16 bg-mastery-hard-bg text-mastery-hard-text rounded-full flex items-center justify-center mx-auto">
        <Trash2 size={32} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-text-main">{title}</h3>
        <p className="text-text-secondary text-sm">{message}</p>
      </div>
      <div className="space-y-3">
        <button 
          onClick={onConfirm}
          className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-600/20"
        >
          Yes, Delete
        </button>
        <button 
          onClick={onCancel}
          className="w-full py-3 bg-bg-main text-text-secondary rounded-xl text-sm font-bold transition-all"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  </motion.div>
);

const FlashcardItem: React.FC<{ card: Flashcard, onClick: () => void }> = ({ card, onClick }) => {
  const mastery = getMasteryDisplay(card.mastery_level);

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      <div 
        onClick={onClick}
        className="w-full h-56 p-6 flex flex-col bg-white rounded-[20px] border border-border-main shadow-sm hover:shadow-xl hover:border-accent transition-all cursor-pointer group relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
            <Eye size={16} />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] uppercase tracking-[0.15em] text-accent font-black">Question</span>
          <div className="h-[1px] flex-1 bg-border-main" />
          <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${mastery.classes}`}>
            {mastery.label}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-center px-2">
          <p className="text-lg font-black leading-tight text-text-main line-clamp-3 group-hover:text-accent transition-colors">
            {card.front}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {card.tags?.slice(0, 2).map((tag, i) => (
            <span key={i} className="text-[9px] bg-bg-secondary text-text-secondary px-2.5 py-1.5 rounded-lg font-bold border border-border-main/50">
              #{tag}
            </span>
          ))}
          {card.tags && card.tags.length > 2 && (
            <span className="text-[9px] text-text-secondary font-bold flex items-center">+{card.tags.length - 2} more</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const EditCardModal: React.FC<{ card: Flashcard, onClose: () => void, onSave: (id: string, front: string, back: string, tags: string[]) => void }> = ({ card, onClose, onSave }) => {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [tags, setTags] = useState(card.tags?.join(', ') || '');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-bg-secondary w-full max-w-2xl rounded-2xl shadow-2xl p-8 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-main">Edit Flashcard</h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-bg-main rounded-full transition-colors flex items-center gap-2"
            title="Close"
          >
            <span className="text-xs font-bold text-text-secondary uppercase">Close</span>
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Question</label>
            <textarea 
              value={front}
              onChange={(e) => setFront(e.target.value)}
              className="w-full p-4 bg-bg-main border border-border-main rounded-xl text-sm outline-none min-h-[150px] focus:border-accent transition-all text-text-main"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Answer</label>
            <textarea 
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className="w-full p-4 bg-bg-main border border-border-main rounded-xl text-sm outline-none min-h-[150px] focus:border-accent transition-all text-text-main"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Tags</label>
          <div className="flex items-center gap-3 bg-bg-main border border-border-main rounded-xl px-4 py-3 focus-within:border-accent transition-all">
            <Tag size={16} className="text-text-secondary" />
            <input 
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="bg-transparent outline-none w-full text-sm text-text-main"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-text-secondary">Cancel</button>
          <button 
            onClick={() => onSave(card.id, front, back, tags.split(',').map(t => t.trim()).filter(t => t !== ''))}
            className="notion-pill bg-accent text-accent-foreground text-sm font-bold border-accent px-8 py-2.5"
          >
            Update Card
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface DetailCardModalProps {
  card: Flashcard;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRate: (rating: 'Easy' | 'Medium' | 'Hard') => void;
}

const DetailCardModal: React.FC<DetailCardModalProps> = ({ card, onClose, onEdit, onDelete, onRate }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const mastery = getMasteryDisplay(card.mastery_level);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-2xl flex flex-col gap-8 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Right Close Button */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white hover:text-gray-200 transition-colors flex items-center gap-2 group"
        >
          <span className="text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Close</span>
          <X size={24} />
        </button>

            <motion.div 
              onClick={() => setIsFlipped(!isFlipped)}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
              className="relative w-full h-full preserve-3d cursor-pointer"
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden bg-white rounded-[2.5rem] border-2 border-border-main p-12 flex flex-col items-center justify-center text-center shadow-xl">
                <div className={`absolute top-8 right-8 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${mastery.classes}`}>
                  {mastery.label}
                </div>
                
                <div className="mb-10 shrink-0">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-black bg-accent/10 px-5 py-2 rounded-full">Question</span>
                </div>
                <div className="w-full max-h-[300px] overflow-y-auto px-4 custom-scrollbar">
                  <p className="text-3xl sm:text-4xl font-black leading-tight text-text-main tracking-tight">{card.front}</p>
                </div>
                <div className="mt-12 shrink-0 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white shadow-lg shadow-accent/20 animate-bounce">
                    <RotateCcw size={20} />
                  </div>
                  <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest opacity-50">Click to reveal answer</p>
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-accent/5 rounded-[2.5rem] border-2 border-accent/20 p-12 flex flex-col items-center justify-center text-center shadow-xl">
                <div className={`absolute top-8 right-8 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${mastery.classes}`}>
                  {mastery.label}
                </div>

                <div className="mb-10 shrink-0">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-black bg-white px-5 py-2 rounded-full border border-accent/20">Answer</span>
                </div>
                <div className="w-full max-h-[300px] overflow-y-auto px-4 custom-scrollbar">
                  <p className="text-xl sm:text-2xl leading-relaxed whitespace-pre-wrap text-text-main font-bold tracking-tight">{card.back}</p>
                </div>
                <div className="mt-12 shrink-0 flex flex-col items-center gap-3">
                  <p className="text-[10px] text-accent font-black uppercase tracking-widest">Mastered this card?</p>
                  <div className="w-8 h-1 bg-accent/30 rounded-full" />
                </div>
              </div>
            </motion.div>

        <div className="flex flex-col gap-6">
          <div className="flex justify-center gap-4">
            <button 
              onClick={onEdit} 
              className="notion-pill bg-bg-secondary hover:bg-bg-main text-xs font-bold flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-all text-text-main"
            >
              <Edit3 size={16} className="text-accent" /> Edit
            </button>
            <button 
              onClick={onDelete} 
              className="notion-pill bg-bg-secondary hover:bg-mastery-hard-bg text-mastery-hard-text border-mastery-hard-border text-xs font-bold flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-all"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Rating</p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => onRate('Easy')}
                className="notion-pill bg-mastery-easy-bg text-mastery-easy-text border-mastery-easy-border text-xs font-bold px-6 py-2.5 shadow-md hover:shadow-lg transition-all"
              >
                Easy
              </button>
              <button 
                onClick={() => onRate('Medium')}
                className="notion-pill bg-mastery-moderate-bg text-mastery-moderate-text border-mastery-moderate-border text-xs font-bold px-6 py-2.5 shadow-md hover:shadow-lg transition-all"
              >
                Moderate
              </button>
              <button 
                onClick={() => onRate('Hard')}
                className="notion-pill bg-mastery-hard-bg text-mastery-hard-text border-mastery-hard-border text-xs font-bold px-6 py-2.5 shadow-md hover:shadow-lg transition-all"
              >
                Hard
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={onClose} 
              className="notion-pill bg-text-main text-bg-main border-text-main text-xs font-bold px-12 py-3 shadow-lg hover:shadow-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface StudyModalProps {
  cards: Flashcard[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onShuffle: () => void;
  onUpdateCard: (id: string, front: string, back: string, tags: string[]) => void;
  onDeleteCard: (id: string, permanent: boolean) => void;
  onRate: (rating: 'Easy' | 'Medium' | 'Hard') => void;
}

const StudyModal: React.FC<StudyModalProps> = ({ cards, currentIndex, onClose, onNext, onPrev, onShuffle, onUpdateCard, onDeleteCard, onRate }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const card = cards[currentIndex];

  // Edit states
  const [editFront, setEditFront] = useState(card.front);
  const [editBack, setEditBack] = useState(card.back);
  const [editTags, setEditTags] = useState(card.tags?.join(', ') || '');

  useEffect(() => {
    setIsFlipped(false);
    setIsEditing(false);
    setEditFront(card.front);
    setEditBack(card.back);
    setEditTags(card.tags?.join(', ') || '');
  }, [currentIndex, card]);

  // Keyboard shortcuts
  useEffect(() => {
    if (isEditing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        onNext();
      } else if (e.code === 'ArrowLeft') {
        onPrev();
      } else if (e.code === 'Escape') {
        onClose();
      } else if (e.code === 'KeyE') {
        setIsEditing(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onClose, isEditing]);

  const handleSaveEdit = () => {
    onUpdateCard(card.id, editFront, editBack, editTags.split(',').map(t => t.trim()).filter(t => t !== ''));
    setIsEditing(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-bg-main flex flex-col"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-border-main">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-bg-secondary rounded-full transition-colors flex items-center gap-2"
            title="Exit Study Session"
          >
            <X size={24} className="text-text-main" />
            <span className="text-sm font-bold text-text-secondary uppercase">Exit</span>
          </button>
          <div>
            <h3 className="font-bold text-text-main">Study Session</h3>
            <p className="text-xs text-text-secondary">Card {currentIndex + 1} of {cards.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 hover:bg-mastery-hard-bg text-text-secondary hover:text-mastery-hard-text rounded-full transition-colors flex items-center gap-2"
            title="Delete or remove card"
          >
            <Trash2 size={20} />
            <span className="text-xs font-bold uppercase">Remove</span>
          </button>
          <div className="h-6 w-[1px] bg-border-main mx-1" />
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 notion-pill transition-all text-xs font-bold ${isEditing ? 'bg-accent text-accent-foreground border-accent' : 'hover:bg-bg-secondary text-text-main'}`}
          >
            <Edit3 size={14} /> {isEditing ? 'Editing...' : 'Edit Card'}
          </button>
          <button 
            onClick={onShuffle}
            className="flex items-center gap-2 notion-pill hover:bg-bg-secondary text-xs font-bold text-text-main"
          >
            <Shuffle size={14} /> Shuffle
          </button>
          <div className="h-6 w-[1px] bg-border-main mx-2" />
          <div className="flex items-center gap-2">
            <button 
              disabled={currentIndex === 0}
              onClick={onPrev}
              className="p-2 hover:bg-bg-secondary rounded-full disabled:opacity-30 flex items-center gap-1 text-text-main"
              title="Previous Card"
            >
              <ArrowLeft size={20} />
              <span className="text-xs font-bold uppercase">Prev</span>
            </button>
            <button 
              disabled={currentIndex === cards.length - 1}
              onClick={onNext}
              className="p-2 hover:bg-bg-secondary rounded-full disabled:opacity-30 flex items-center gap-1 text-text-main"
              title="Next Card"
            >
              <span className="text-xs font-bold uppercase">Next</span>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl space-y-8">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 justify-center">
            {card.tags?.map((tag, i) => (
              <span key={i} className="notion-pill text-xs bg-bg-secondary text-text-secondary border-border-main">#{tag}</span>
            ))}
          </div>

          {/* Card */}
          <div className="perspective-1000 w-full h-[450px] sm:h-[500px]">
            {showDeleteConfirm ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white border-2 border-red-100 p-12 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center text-center space-y-8"
              >
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <Trash2 size={40} />
                  </div>
                  <h3 className="text-3xl font-black text-text-main tracking-tight">Remove Card</h3>
                  <p className="text-text-secondary font-medium max-w-sm mx-autoSelection">How would you like to remove this card from your session?</p>
                </div>

                <div className="w-full max-w-md space-y-4">
                  <button 
                    onClick={() => {
                      onDeleteCard(card.id, false);
                      setShowDeleteConfirm(false);
                    }}
                    className="w-full py-5 bg-bg-secondary hover:bg-white border-2 border-transparent hover:border-border-main text-text-main rounded-2xl text-sm font-black transition-all"
                  >
                    Remove from session only
                  </button>
                  <button 
                    onClick={() => {
                      onDeleteCard(card.id, true);
                      setShowDeleteConfirm(false);
                    }}
                    className="w-full py-5 bg-red-600 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-red-600/20"
                  >
                    Delete permanently
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full py-4 text-text-secondary font-black text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : isEditing ? (
              <div className="bg-white border-2 border-accent/20 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">Question</label>
                    <textarea 
                      value={editFront}
                      onChange={(e) => setEditFront(e.target.value)}
                      className="w-full p-6 bg-bg-secondary border-2 border-transparent rounded-2xl text-base outline-none min-h-[220px] focus:bg-white focus:border-accent transition-all text-text-main"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">Answer</label>
                    <textarea 
                      value={editBack}
                      onChange={(e) => setEditBack(e.target.value)}
                      className="w-full p-6 bg-bg-secondary border-2 border-transparent rounded-2xl text-base outline-none min-h-[220px] focus:bg-white focus:border-accent transition-all text-text-main"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-4">
                  <button onClick={() => setIsEditing(false)} className="px-6 py-4 text-sm font-black text-text-secondary">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-10 py-4 bg-accent text-white rounded-2xl text-sm font-black shadow-lg shadow-accent/20 flex items-center gap-2">
                    <Check size={18} /> Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <motion.div 
                onClick={() => setIsFlipped(!isFlipped)}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                className="relative w-full h-full preserve-3d cursor-pointer"
              >
                {/* Front (Question) */}
                <div className="absolute inset-0 backface-hidden bg-white border-2 border-border-main p-12 flex flex-col items-center justify-center text-center shadow-2xl rounded-[2.5rem]">
                  <div className="mb-10 shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-black bg-accent/10 px-5 py-2 rounded-full">Question</span>
                  </div>
                  <div className="w-full max-h-[300px] overflow-y-auto px-4 custom-scrollbar">
                    <p className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-text-main mx-auto">{card.front}</p>
                  </div>
                  <div className="mt-12 flex flex-col items-center gap-4 shrink-0">
                    <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white shadow-lg shadow-accent/20 animate-bounce">
                      <RotateCcw size={20} />
                    </div>
                    <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest opacity-50">Reveal Answer</p>
                  </div>
                </div>

                {/* Back (Answer) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-accent/5 border-2 border-accent/20 p-12 flex flex-col items-center justify-center text-center shadow-2xl rounded-[2.5rem]">
                  <div className="mb-10 shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-black bg-white px-5 py-2 rounded-full border border-accent/20">Answer</span>
                  </div>
                  <div className="w-full max-h-[300px] overflow-y-auto px-4 custom-scrollbar">
                    <p className="text-xl sm:text-2xl leading-relaxed whitespace-pre-wrap text-text-main font-bold tracking-tight">{card.back}</p>
                  </div>
                  <div className="mt-12 flex flex-col items-center gap-4 shrink-0">
                    <p className="text-[10px] text-accent font-black uppercase tracking-widest opacity-50">Mastered?</p>
                    <div className="w-10 h-1 bg-accent/30 rounded-full" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Study Controls */}
          {!isEditing && (
            <div className="flex flex-col items-center gap-8">
              {/* Rating Buttons */}
              <div className="flex gap-4">
                <button 
                  onClick={() => onRate('Easy')}
                  className="px-8 py-3 rounded-xl bg-mastery-easy-bg text-mastery-easy-text border border-mastery-easy-border font-bold text-sm hover:opacity-80 transition-all shadow-sm"
                >
                  Easy
                </button>
                <button 
                  onClick={() => onRate('Medium')}
                  className="px-8 py-3 rounded-xl bg-mastery-moderate-bg text-mastery-moderate-text border border-mastery-moderate-border font-bold text-sm hover:opacity-80 transition-all shadow-sm"
                >
                  Moderate
                </button>
                <button 
                  onClick={() => onRate('Hard')}
                  className="px-8 py-3 rounded-xl bg-mastery-hard-bg text-mastery-hard-text border border-mastery-hard-border font-bold text-sm hover:opacity-80 transition-all shadow-sm"
                >
                  Hard
                </button>
              </div>

              <div className="flex items-center gap-12">
                <button 
                  disabled={currentIndex === 0}
                  onClick={onPrev}
                  className="group flex flex-col items-center gap-2 disabled:opacity-20 transition-all"
                >
                  <div className="p-4 bg-bg-secondary border border-border-main rounded-full shadow-sm group-hover:shadow-md group-hover:border-accent/20 transition-all">
                    <ArrowLeft size={24} className="text-text-secondary group-hover:text-accent" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Previous</span>
                </button>

                <button 
                  onClick={onShuffle}
                  className="group flex flex-col items-center gap-2 transition-all"
                >
                  <div className="p-4 bg-bg-secondary border border-border-main rounded-full shadow-sm group-hover:shadow-md group-hover:border-accent/20 transition-all">
                    <Shuffle size={24} className="text-text-secondary group-hover:text-accent" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Shuffle</span>
                </button>

                <button 
                  disabled={currentIndex === cards.length - 1}
                  onClick={onNext}
                  className="group flex flex-col items-center gap-2 disabled:opacity-20 transition-all"
                >
                  <div className="p-4 bg-bg-secondary border border-border-main rounded-full shadow-sm group-hover:shadow-md group-hover:border-accent/20 transition-all">
                    <ArrowRight size={24} className="text-text-secondary group-hover:text-accent" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Next</span>
                </button>
              </div>

              {/* Keyboard Hints */}
              <div className="flex justify-center gap-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-50">
                <div className="flex items-center gap-2">
                  <span className="bg-bg-secondary px-1.5 py-0.5 rounded text-text-main">Space</span> Flip
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-bg-secondary px-1.5 py-0.5 rounded text-text-main">← / →</span> Navigate
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-bg-secondary px-1.5 py-0.5 rounded text-text-main">E</span> Edit
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-bg-secondary px-1.5 py-0.5 rounded text-text-main">Esc</span> Exit
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-border-main w-full">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          className="h-full bg-accent"
        />
      </div>
    </motion.div>
  );
};
const LongPressMenu: React.FC<{
  item: { type: 'subject' | 'deck', id: string, name: string };
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ item, onClose, onEdit, onDelete }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="w-full max-w-sm bg-bg-secondary rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl space-y-6 border border-border-main"
      onClick={e => e.stopPropagation()}
    >
      <div className="text-center space-y-2 mb-4">
        <div className="w-12 h-1.5 bg-border-main rounded-full mx-auto mb-6 sm:hidden" />
        <h3 className="text-2xl font-black text-text-main tracking-tight">{item.name}</h3>
        <p className="text-[10px] text-accent font-black uppercase tracking-[0.2em]">{item.type} Options</p>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={() => { onEdit(); onClose(); }}
          className="w-full py-5 bg-bg-main border-2 border-border-main rounded-2xl flex items-center justify-center gap-4 text-sm font-black text-text-main hover:border-accent hover:bg-bg-secondary transition-all active:scale-95 group"
        >
          <Edit3 size={22} className="text-accent group-hover:rotate-12 transition-transform" />
          Edit {item.type}
        </button>
        <button 
          onClick={() => { onDelete(); onClose(); }}
          className="w-full py-5 bg-bg-main border-2 border-border-main rounded-2xl flex items-center justify-center gap-4 text-sm font-black text-red-500 hover:border-red-500 hover:bg-red-50/10 transition-all active:scale-95 group"
        >
          <Trash2 size={22} className="group-hover:shake transition-transform" />
          Delete {item.type}
        </button>
        <button 
          onClick={onClose}
          className="w-full py-4 text-sm font-black text-text-secondary hover:text-text-main transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  </motion.div>
);

const CreateCardModal: React.FC<{
  onClose: () => void;
  newCardFront: string;
  setNewCardFront: (val: string) => void;
  newCardBack: string;
  setNewCardBack: (val: string) => void;
  newCardTags: string;
  setNewCardTags: (val: string) => void;
  newCardMastery: MasteryLevel;
  setNewCardMastery: (val: MasteryLevel) => void;
  handleCreateCard: (keepOpen: boolean) => Promise<void>;
  isCreatingCard: boolean;
}> = ({ 
  onClose, newCardFront, setNewCardFront, newCardBack, setNewCardBack, 
  newCardTags, setNewCardTags, newCardMastery, setNewCardMastery, 
  handleCreateCard, isCreatingCard 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-border-main"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 sm:p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-text-main tracking-tight">Create Card</h3>
              <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">New Knowledge Piece</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-text-secondary hover:text-red-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">Question</label>
              <textarea 
                autoFocus
                placeholder="What do you want to learn?"
                value={newCardFront}
                onChange={(e) => setNewCardFront(e.target.value)}
                className="w-full p-6 bg-bg-secondary border-2 border-transparent rounded-[1.5rem] text-base outline-none min-h-[180px] focus:bg-white focus:border-accent transition-all text-text-main shadow-inner"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">Answer</label>
              <textarea 
                placeholder="The secret to the universe..."
                value={newCardBack}
                onChange={(e) => setNewCardBack(e.target.value)}
                className="w-full p-6 bg-bg-secondary border-2 border-transparent rounded-[1.5rem] text-base outline-none min-h-[180px] focus:bg-white focus:border-accent transition-all text-text-main shadow-inner"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 items-end">
            <div className="flex-1 space-y-3 w-full">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1 text-center sm:text-left block">Tags & Mastery</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex items-center gap-3 bg-bg-secondary rounded-xl px-5 py-3 border border-transparent focus-within:bg-white focus-within:border-accent transition-all">
                  <Tag size={18} className="text-accent" />
                  <input 
                    type="text"
                    placeholder="tag1, tag2..."
                    value={newCardTags}
                    onChange={(e) => setNewCardTags(e.target.value)}
                    className="bg-transparent outline-none w-full text-sm font-bold text-text-main"
                  />
                </div>
                <div className="flex gap-2">
                  {(['Learning', 'Review', 'Mastered'] as MasteryLevel[]).map((level) => {
                    const display = getMasteryDisplay(level);
                    return (
                      <button
                        key={level}
                        onClick={() => setNewCardMastery(level)}
                        className={`px-4 py-3 rounded-xl text-[10px] font-black border transition-all ${
                          newCardMastery === level 
                            ? `${display.classes} ring-2 ring-accent/20` 
                            : 'bg-bg-secondary border-transparent text-text-secondary hover:border-accent/30'
                        }`}
                      >
                        {display.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <button onClick={onClose} className="text-sm font-black text-text-secondary hover:text-text-main transition-colors">Cancel</button>
            <div className="flex gap-4">
              <button 
                onClick={() => handleCreateCard(true)} 
                disabled={isCreatingCard}
                className="px-6 py-4 rounded-2xl text-sm font-black text-accent bg-accent/5 hover:bg-accent/10 transition-all active:scale-95 disabled:opacity-50"
              >
                Save & Another
              </button>
              <button 
                onClick={() => handleCreateCard(false)} 
                disabled={isCreatingCard}
                className="px-10 py-4 rounded-2xl text-sm font-black text-white bg-accent shadow-xl shadow-accent/20 hover:shadow-accent/40 active:scale-95 transition-all disabled:opacity-50"
              >
                {isCreatingCard ? 'Saving...' : 'Save Card'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const StatCard: React.FC<{ label: string, value: number, isAccent?: boolean }> = ({ label, value, isAccent }) => (
  <div className={`p-6 rounded-[1.5rem] bg-white shadow-subtle flex flex-col items-center gap-1 transition-all hover:scale-105 ${isAccent ? 'ring-2 ring-accent/20' : ''}`}>
    <span className={`text-3xl font-black ${isAccent ? 'text-accent' : 'text-text-main'}`}>{value}</span>
    <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{label}</span>
  </div>
);

const ActionButton: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, isStudyMode?: boolean }> = ({ icon, label, onClick, isStudyMode }) => (
  <button 
    onClick={onClick}
    className={`notion-card p-6 flex flex-col items-center gap-4 group transition-all h-full ${isStudyMode ? 'border-accent bg-accent/5' : 'hover:bg-bg-secondary'}`}
  >
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${isStudyMode ? 'bg-accent text-white' : 'bg-bg-secondary'}`}>
      {icon}
    </div>
    <span className="text-sm font-black text-text-main tracking-tight">{label}</span>
  </button>
);

const SubjectChip: React.FC<{ 
  subject: Subject, 
  active: boolean, 
  count: number, 
  onClick: () => void, 
  onContextMenu: (e: React.MouseEvent) => void,
  index: number 
}> = ({ subject, active, count, onClick, onContextMenu, index }) => {
  const colors = [
    'hover:border-orange-500 hover:text-orange-600',
    'hover:border-orange-400 hover:text-orange-500',
    'hover:border-gray-400 hover:text-gray-500',
    'hover:border-gray-500 hover:text-gray-600',
    'hover:border-orange-600 hover:text-orange-700'
  ];
  return (
    <button 
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`shrink-0 px-6 py-3 rounded-full flex items-center gap-3 border-2 transition-all font-black text-sm h-12 ${
        active 
          ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' 
          : `bg-white border-border-main text-text-main ${colors[index % colors.length]}`
      }`}
    >
      {subject.name}
      <span className={`px-2 py-0.5 rounded-full text-[9px] ${active ? 'bg-white text-accent' : 'bg-accent/10 text-accent'}`}>
        {count}
      </span>
    </button>
  );
};

const DeckCard: React.FC<{ 
  deck: Deck, 
  active: boolean, 
  count: number, 
  onClick: () => void, 
  onContextMenu: (e: React.MouseEvent) => void,
  onStudy: () => void 
}> = ({ deck, active, count, onClick, onContextMenu, onStudy }) => (
  <div 
    onClick={onClick}
    onContextMenu={onContextMenu}
    className={`p-6 rounded-2xl bg-white border border-border-main shadow-subtle hover:shadow-xl transition-all cursor-pointer relative overflow-hidden group ${active ? 'ring-2 ring-accent' : ''}`}
  >
    <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
    <div className="flex flex-col h-full justify-between gap-4">
      <div className="space-y-1">
        <h4 className="text-lg font-black text-text-main tracking-tight group-hover:text-accent transition-colors">{deck.name}</h4>
        <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">{count} Cards</p>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onStudy(); }}
        className="self-end text-xs font-black text-accent uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
      >
        Study <ArrowRight size={14} />
      </button>
    </div>
  </div>
);

const DashboardFlashcard: React.FC<{ card: Flashcard, onClick: () => void, onEdit: () => void, onDelete: () => void }> = ({ card, onClick, onEdit, onDelete }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-white border border-border-main rounded-xl p-6 shadow-subtle hover:shadow-xl hover:border-accent group relative transition-all cursor-pointer"
    onClick={onClick}
  >
    <div className="absolute top-4 left-4">
      <span className="w-6 h-6 bg-accent/10 text-accent rounded-lg flex items-center justify-center font-black text-[10px]">Q</span>
    </div>
    <div className="py-6 min-h-[120px] flex items-center justify-center text-center">
      <p className="text-base font-black text-text-main leading-tight tracking-tight line-clamp-3 group-hover:text-accent transition-colors">{card.front}</p>
    </div>
    <div className="pt-4 border-t border-border-main flex items-center justify-between">
      <div className="flex gap-1 overflow-hidden">
        {card.tags?.slice(0, 2).map((t, idx) => (
          <span key={idx} className="text-[8px] font-black uppercase tracking-widest text-text-secondary whitespace-nowrap">#{t}</span>
        ))}
      </div>
      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-text-secondary hover:text-accent p-1"><Edit3 size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-text-secondary hover:text-red-500 p-1"><Trash2 size={14} /></button>
      </div>
    </div>
  </motion.div>
);

const DailyStatsWidget: React.FC<{ cards: Flashcard[] }> = ({ cards }) => {
  const masteredCount = cards.filter(c => c.mastery_level === 'Mastered').length;
  const progress = cards.length > 0 ? (masteredCount / cards.length) * 100 : 0;
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-subtle border border-border-main space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-black text-text-main tracking-tight">Daily Stats</h4>
        <div className="p-2 bg-bg-secondary rounded-xl"><Brain size={16} className="text-accent" /></div>
      </div>
      <div className="text-center space-y-2">
        <span className="text-5xl font-black text-accent">{masteredCount}</span>
        <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Cards Mastered</p>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-bg-secondary rounded-full overflow-hidden border border-border-main">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-accent"
          />
        </div>
        <p className="text-xs text-text-secondary font-medium text-center">Keep going! You're making progress.</p>
      </div>
    </div>
  );
};

const QuickAddWidget: React.FC<{ subjects: Subject[], onSave: (f: string, b: string, sid: string) => Promise<void> }> = ({ subjects, onSave }) => {
  const [f, setF] = useState('');
  const [b, setB] = useState('');
  const [sid, setSid] = useState('');

  const handleSave = async () => {
    if (!f.trim() || !b.trim() || !sid) return;
    await onSave(f, b, sid);
    setF('');
    setB('');
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-subtle border border-border-main space-y-6">
      <h4 className="text-lg font-black text-text-main tracking-tight">Quick Add Card</h4>
      <div className="space-y-4">
        <textarea 
          placeholder="Question..." 
          value={f}
          onChange={e => setF(e.target.value)}
          className="w-full p-4 bg-bg-secondary rounded-xl text-sm font-bold border-2 border-transparent focus:bg-white focus:border-accent transition-all outline-none min-h-[100px]"
        />
        <textarea 
          placeholder="Answer..." 
          value={b}
          onChange={e => setB(e.target.value)}
          className="w-full p-4 bg-bg-secondary rounded-xl text-sm font-bold border-2 border-transparent focus:bg-white focus:border-accent transition-all outline-none min-h-[100px]"
        />
        <select 
          value={sid}
          onChange={e => setSid(e.target.value)}
          className="w-full p-4 bg-bg-secondary rounded-xl text-sm font-bold outline-none border-2 border-transparent focus:bg-white focus:border-accent transition-all"
        >
          <option value="">Select Subject</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button 
          onClick={handleSave}
          className="w-full py-4 bg-accent text-white rounded-xl text-sm font-black shadow-lg shadow-accent/10 hover:shadow-accent/30 transition-all active:scale-[0.98]"
        >
          Save Card
        </button>
      </div>
    </div>
  );
};

const RecentActivityWidget: React.FC<{ cards: Flashcard[] }> = ({ cards }) => {
  const recent = [...cards].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-subtle border border-border-main space-y-6">
      <h4 className="text-lg font-black text-text-main tracking-tight">Recent Activity</h4>
      {recent.length === 0 ? (
        <p className="text-sm text-text-secondary italic font-medium">No activity yet</p>
      ) : (
        <div className="space-y-4">
          {recent.map(card => (
            <div key={card.id} className="flex gap-4 items-start">
              <div className="w-1.5 h-1.5 mt-2 rounded-full bg-accent" />
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-text-main line-clamp-1">Added card: {card.front}</p>
                <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">{new Date(card.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ToastContainer: React.FC<{ toasts: { id: string, message: string }[] }> = ({ toasts }) => (
  <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3">
    <AnimatePresence>
      {toasts.map(toast => (
        <motion.div 
          key={toast.id}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 50, opacity: 0 }}
          className="bg-accent text-white px-6 py-4 rounded-2xl font-black text-sm shadow-2xl flex items-center gap-3 border border-white/20"
        >
          <Check size={16} />
          {toast.message}
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);
