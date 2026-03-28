import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  LogOut,
  Sun,
  Moon,
  Mail,
  Youtube
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { useStudyTracker, MasteryLevel } from './hooks/useStudyTracker';

// --- Types ---
type SortCriteria = 'created_at' | 'mastery_level' | 'alphabetical';

interface Subject {
  id: string;
  name: string;
  created_at: string;
}

interface Deck {
  id: string;
  name: string;
  subject_id: string;
  created_at: string;
}

interface Flashcard {
  id: string;
  front: string; // Question
  back: string;  // Answer
  deck_id: string;
  subject_id: string;
  tags?: string[];
  mastery_level: MasteryLevel;
  last_reviewed?: string;
  next_review_date?: string;
  created_at: string;
}

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  created_at: string;
}

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
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

  // Set default selections
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0]);
    }
  }, [subjects, selectedSubject]);

  useEffect(() => {
    if (decks.length > 0 && !selectedDeck) {
      setSelectedDeck(decks[0]);
    } else if (decks.length === 0) {
      setSelectedDeck(null);
    }
  }, [decks, selectedDeck]);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdateProfile = async (updates: Partial<Profile>) => {
    try {
      await updateProfile(updates);
      setAlertModal({ title: "Success", message: "Profile updated successfully!" });
    } catch (error: any) {
      setAlertModal({ title: "Error", message: error.message });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthenticating(true);
    try {
      if (authMode === 'signup') {
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // If Supabase automatically signs the user in (e.g. email confirmation disabled),
        // we sign them out to force the "confirm email" flow the user requested.
        if (data.session) {
          await supabase.auth.signOut();
        }
        
        setVerificationSent(true);
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // If Supabase allows login without verification, we might want to check here
        // but usually it's handled by Supabase settings.
      }
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Auto-select first subject/deck if none selected
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0]);
    }
  }, [subjects, selectedSubject]);

  useEffect(() => {
    if (decks.length > 0 && !selectedDeck) {
      setSelectedDeck(decks[0]);
    } else if (decks.length === 0) {
      setSelectedDeck(null);
    }
  }, [decks, selectedDeck]);

  // Auth listener

  // Fetch Flashcards when Deck or Subject changes

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
    if (!newSubjectName.trim() || !user) return;
    try {
      await addSubject(newSubjectName.trim());
      setNewSubjectName('');
      setIsAddingSubject(false);
    } catch (error) {
      console.error('Error creating subject:', error);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim() || !selectedSubject || !user) return;
    try {
      await addDeck(newDeckName.trim(), selectedSubject.id);
      setNewDeckName('');
      setIsAddingDeck(false);
    } catch (error) {
      console.error('Error creating deck:', error);
    }
  };

  const handleCreateCard = async (keepOpen = false) => {
    if (!newCardFront.trim() || !newCardBack.trim() || !selectedDeck || !selectedSubject || !user || isCreatingCard) return;
    setIsCreatingCard(true);
    try {
      const tags = newCardTags.split(',').map(t => t.trim()).filter(t => t !== '');
      await addFlashcard(newCardFront.trim(), newCardBack.trim(), selectedDeck.id, selectedSubject.id, tags, newCardMastery);
      
      setNewCardFront('');
      setNewCardBack('');
      setNewCardTags('');
      setNewCardMastery('New');
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
    if (!user) return;
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-main gap-6">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="p-6 bg-bg-secondary rounded-[2.5rem] shadow-2xl shadow-accent/10 border border-accent/5"
        >
          <Brain size={64} className="text-accent" />
        </motion.div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold text-text-main tracking-tight">Ushanj Flashcards</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (verificationSent) {
      return (
        <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="notion-card bg-bg-secondary p-10 max-w-md w-full shadow-2xl shadow-black/5 space-y-8 text-center"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="p-6 bg-mastery-easy-bg rounded-full shadow-inner text-mastery-easy-text">
                <Mail size={64} />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-normal text-text-main">Verify your email</h1>
                <p className="text-text-secondary text-sm font-medium leading-relaxed">
                  We've sent a verification link to <span className="text-accent font-bold">{email}</span>. 
                  Please check your inbox and click the link to confirm your account.
                </p>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <p className="text-xs text-text-secondary">
                Once confirmed, you can return here to sign in.
              </p>
              <button 
                onClick={() => {
                  setVerificationSent(false);
                  setAuthMode('login');
                  setAuthError(null);
                }}
                className="w-full bg-accent text-accent-foreground font-bold py-4 rounded-xl text-sm shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                Back to Login
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="notion-card bg-bg-secondary p-10 max-w-md w-full shadow-2xl shadow-black/5 space-y-8"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-accent/10 rounded-3xl shadow-inner">
              <Brain size={48} className="text-accent" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-3xl font-bold tracking-normal text-text-main">Ushanj Flashcards</h1>
              <p className="text-text-secondary text-sm font-medium">
                {authMode === 'login' ? 'Welcome back! Please sign in.' : 'Join Ushanj to start your journey.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-text-secondary ml-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-bg-main border border-border-main rounded-xl focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all py-3.5 px-4 text-sm outline-none placeholder:text-text-secondary/50"
                placeholder="Enter your email"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-text-secondary ml-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-bg-main border border-border-main rounded-xl focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all py-3.5 px-4 text-sm outline-none pr-12 placeholder:text-text-secondary/50"
                  placeholder="Enter your password"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-accent transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {authError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-mastery-hard-bg border border-mastery-hard-border p-4 rounded-xl flex items-start gap-3 text-mastery-hard-text text-xs font-medium leading-relaxed"
              >
                <XCircle size={16} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-accent text-accent-foreground font-bold py-4 rounded-xl text-sm shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                authMode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="text-center pt-4">
            <button 
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setAuthError(null);
                setVerificationSent(false);
              }}
              className="text-sm font-bold text-accent hover:opacity-80 transition-all"
            >
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>

        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-12 max-w-6xl mx-auto space-y-12 bg-bg-main transition-colors duration-300">
        {/* Header with Logout */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="w-12 h-12 rounded-full bg-bg-secondary border border-border-main flex items-center justify-center overflow-hidden hover:border-accent/20 transition-all group"
            >
              <UserIcon size={20} className="text-text-secondary group-hover:text-accent transition-colors" />
            </button>
            <div className="space-y-1">
              <h1 
                onClick={() => setIsProfileModalOpen(true)}
                className="text-2xl font-bold text-text-main cursor-pointer hover:text-accent transition-colors"
                title="Open Account & Settings"
              >
                Welcome back, {profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'Student'}
              </h1>
              <p className="text-text-secondary text-sm">Ready to continue your learning journey?</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isSyncing && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/5 border border-accent/10 animate-pulse">
                <div className="w-2 h-2 bg-accent rounded-full animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-widest text-accent">Syncing</span>
              </div>
            )}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="notion-pill text-xs font-bold text-text-secondary hover:text-accent transition-colors flex items-center gap-2 border-border-main"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
              {darkMode ? "Light" : "Dark"}
            </button>
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="notion-pill text-xs font-bold text-text-secondary hover:text-accent transition-colors flex items-center gap-2 border-border-main"
            >
              <Settings size={14} />
              Settings
            </button>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                setUser(null);
              }}
              className="notion-pill text-xs font-bold text-text-secondary hover:text-red-600 transition-colors flex items-center gap-2 border-border-main"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Subjects Row */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-main">Subjects</h2>
            {selectedSubject && (
              <button 
                onClick={() => startSubjectStudy(selectedSubject.id)}
                className="notion-pill flex items-center gap-2 text-sm font-bold hover:bg-accent hover:text-accent-foreground transition-colors text-text-secondary"
              >
                <Play size={14} /> Study Subject
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {subjects.map(subject => (
              <div key={subject.id} className="relative group shrink-0">
                {editingSubject?.id === subject.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <input 
                      autoFocus
                      type="text" 
                      value={editSubjectName}
                      onChange={(e) => setEditSubjectName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateSubject()}
                      className="notion-pill text-sm font-bold w-32 outline-none bg-bg-main text-text-main border-border-main"
                    />
                    <button onClick={handleUpdateSubject} className="p-1 hover:text-accent flex items-center gap-1 text-xs font-bold text-text-secondary">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setEditingSubject(null)} className="p-1 hover:text-red-600 flex items-center gap-1 text-xs font-bold text-text-secondary">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => setSelectedSubject(subject)}
                      className={`notion-pill text-sm font-bold transition-all ${selectedSubject?.id === subject.id ? 'active' : 'bg-bg-main text-text-secondary border-border-main'}`}
                    >
                      {subject.name}
                    </button>
                    <div className="absolute -top-2 -right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingSubject(subject);
                          setEditSubjectName(subject.name);
                        }}
                        className="bg-bg-main border border-border-main rounded-full p-0.5 shadow-sm hover:text-accent"
                        title="Edit Subject"
                      >
                        <Edit3 size={10} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSubject(subject.id)}
                        className="bg-bg-main border border-border-main rounded-full p-0.5 shadow-sm hover:text-red-600"
                        title="Delete Subject"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {isAddingSubject ? (
              <div className="flex items-center gap-2 shrink-0">
                <input 
                  autoFocus
                  type="text" 
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSubject()}
                  className="notion-pill text-sm font-bold w-32 outline-none bg-bg-main text-text-main border-border-main"
                  placeholder="Subject name..."
                />
                <button onClick={handleCreateSubject} className="p-1 hover:text-accent flex items-center gap-1 text-xs font-bold text-text-secondary">
                  <Check size={18} />
                  <span>Save</span>
                </button>
                <button onClick={() => setIsAddingSubject(false)} className="p-1 hover:text-red-600 flex items-center gap-1 text-xs font-bold text-text-secondary">
                  <X size={18} />
                  <span>Cancel</span>
                </button>
              </div>
            ) : (
                <button 
                  onClick={() => setIsAddingSubject(true)}
                  className="notion-pill bg-bg-main hover:bg-bg-secondary transition-colors shrink-0 flex items-center gap-2 text-text-secondary border-border-main"
                >
                  <PlusCircle size={18} />
                  <span>Add Subject</span>
                </button>
            )}
          </div>
        </section>

        {/* Decks Row */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-main">Decks</h2>
            {selectedDeck && (
              <button 
                onClick={() => startStudySession(flashcards)}
                className="notion-pill flex items-center gap-2 text-sm font-bold hover:bg-accent hover:text-accent-foreground transition-colors text-text-secondary border-border-main"
              >
                <Play size={14} /> Study Deck
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {decks.map(deck => (
              <div key={deck.id} className="relative group shrink-0">
                {editingDeck?.id === deck.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <input 
                      autoFocus
                      type="text" 
                      value={editDeckName}
                      onChange={(e) => setEditDeckName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateDeck()}
                      className="notion-pill text-sm font-bold w-32 outline-none bg-bg-main text-text-main border-border-main"
                    />
                    <button onClick={handleUpdateDeck} className="p-1 hover:text-accent flex items-center gap-1 text-xs font-bold text-text-secondary">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setEditingDeck(null)} className="p-1 hover:text-red-600 flex items-center gap-1 text-xs font-bold text-text-secondary">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => setSelectedDeck(deck)}
                      className={`notion-pill text-sm font-bold transition-all ${selectedDeck?.id === deck.id ? 'active' : 'bg-bg-main text-text-secondary border-border-main'}`}
                    >
                      {deck.name}
                    </button>
                    <div className="absolute -top-2 -right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingDeck(deck);
                          setEditDeckName(deck.name);
                        }}
                        className="bg-bg-main border border-border-main rounded-full p-0.5 shadow-sm hover:text-accent"
                        title="Edit Deck"
                      >
                        <Edit3 size={10} />
                      </button>
                      <button 
                        onClick={() => handleDeleteDeck(deck.id)}
                        className="bg-bg-main border border-border-main rounded-full p-0.5 shadow-sm hover:text-red-600"
                        title="Delete Deck"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {selectedSubject && (
              isAddingDeck ? (
                <div className="flex items-center gap-2 shrink-0">
                  <input 
                    autoFocus
                    type="text" 
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateDeck()}
                    className="notion-pill text-sm font-bold w-32 outline-none bg-bg-main text-text-main border-border-main"
                    placeholder="Deck name..."
                  />
                  <button onClick={handleCreateDeck} className="p-1 hover:text-accent flex items-center gap-1 text-xs font-bold text-text-secondary">
                    <Check size={18} />
                    <span>Save</span>
                  </button>
                  <button onClick={() => setIsAddingDeck(false)} className="p-1 hover:text-red-600 flex items-center gap-1 text-xs font-bold text-text-secondary">
                    <X size={18} />
                    <span>Cancel</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingDeck(true)}
                  className="notion-pill bg-bg-main hover:bg-bg-secondary transition-colors shrink-0 flex items-center gap-2 text-text-secondary border-border-main"
                >
                  <PlusCircle size={18} />
                  <span>Add Deck</span>
                </button>
              )
            )}
            {!selectedSubject && <p className="text-sm text-text-secondary italic opacity-50">Select a subject first</p>}
          </div>
        </section>

        {/* Main Flashcards Area */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-text-main">Flashcards</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-bg-secondary border border-border-main rounded-lg px-3 py-2">
                <Filter size={14} className="text-text-secondary" />
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortCriteria)}
                  className="bg-transparent text-xs font-bold outline-none cursor-pointer text-text-secondary"
                >
                  <option value="created_at">Newest First</option>
                  <option value="alphabetical">Alphabetical (A-Z)</option>
                  <option value="mastery_level">Mastery Level</option>
                </select>
              </div>
              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input 
                  type="text"
                  placeholder="Search cards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border-main rounded-lg text-sm outline-none focus:bg-bg-main focus:border-accent/20 transition-all text-text-main"
                />
              </div>
              {selectedDeck && (
                <button 
                  onClick={() => setIsAddingCard(true)}
                  className="notion-pill bg-bg-secondary hover:bg-bg-main transition-colors flex items-center gap-2 text-sm font-bold text-text-secondary border-border-main"
                >
                  <PlusCircle size={18} /> Add Card
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {allUniqueTags.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-text-secondary mr-2">
                <Filter size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Filter Tags:</span>
              </div>
              {allUniqueTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTagFilter(tag)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all border ${
                    selectedFilterTags.includes(tag) 
                      ? 'bg-accent/10 text-accent border-accent/20' 
                      : 'bg-bg-secondary text-text-secondary border-border-main hover:border-text-secondary/30'
                  }`}
                >
                  #{tag}
                </button>
              ))}
              {selectedFilterTags.length > 0 && (
                <button 
                  onClick={() => setSelectedFilterTags([])}
                  className="text-[10px] font-bold text-text-secondary hover:text-red-500 transition-colors ml-2"
                >
                  Clear All
                </button>
              )}
            </div>
          )}
          
          <div className="min-h-[350px] p-2">
            {isAddingCard && (
              <div className="mb-10 p-8 bg-bg-secondary border border-accent/10 rounded-2xl space-y-6 shadow-inner">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Create New Card</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Question</label>
                    <textarea 
                      autoFocus
                      placeholder="Enter your question..."
                      value={newCardFront}
                      onChange={(e) => setNewCardFront(e.target.value)}
                      className="w-full p-4 bg-bg-main border border-border-main rounded-xl text-sm outline-none min-h-[120px] focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all text-text-main"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Answer</label>
                    <textarea 
                      placeholder="Enter the answer..."
                      value={newCardBack}
                      onChange={(e) => setNewCardBack(e.target.value)}
                      className="w-full p-4 bg-bg-main border border-border-main rounded-xl text-sm outline-none min-h-[120px] focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all text-text-main"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Tags</label>
                    <div className="flex items-center gap-3 bg-bg-main border border-border-main rounded-xl px-4 py-3 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/5 transition-all">
                      <Tag size={16} className="text-text-secondary" />
                      <input 
                        type="text"
                        placeholder="e.g. important, exam, chapter1"
                        value={newCardTags}
                        onChange={(e) => setNewCardTags(e.target.value)}
                        className="bg-transparent outline-none w-full text-sm text-text-main"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Initial Mastery</label>
                    <div className="flex gap-2">
                      {(['Learning', 'Review', 'Mastered'] as MasteryLevel[]).map((level) => {
                        const display = getMasteryDisplay(level);
                        return (
                          <button
                            key={level}
                            onClick={() => setNewCardMastery(level)}
                            className={`flex-1 py-2.5 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all ${
                              newCardMastery === level 
                                ? `${display.classes} ring-2 ring-accent/20` 
                                : 'bg-bg-main border-border-main text-text-secondary hover:border-accent/30'
                            }`}
                          >
                            {display.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setIsAddingCard(false)} className="px-6 py-2.5 text-sm font-bold text-text-secondary hover:text-text-main transition-colors">Cancel</button>
                  <button 
                    onClick={() => handleCreateCard(true)} 
                    disabled={isCreatingCard}
                    className={`notion-pill bg-bg-main text-accent text-sm font-bold border-accent px-6 py-2.5 transition-all ${isCreatingCard ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent/5 active:scale-[0.98]'}`}
                  >
                    Save & Add Another
                  </button>
                  <button 
                    onClick={() => handleCreateCard(false)} 
                    disabled={isCreatingCard}
                    className={`notion-pill bg-accent text-accent-foreground text-sm font-bold border-accent px-8 py-2.5 shadow-lg shadow-accent/20 transition-all ${isCreatingCard ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                  >
                    {isCreatingCard ? 'Saving...' : 'Save & Close'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-4">
              {sortedAndFilteredFlashcards.map(card => (
                <FlashcardItem 
                  key={card.id} 
                  card={card} 
                  onClick={() => setDetailCard(card)}
                />
              ))}
            </div>
            {sortedAndFilteredFlashcards.length === 0 && !isAddingCard && (
                <div className="w-full flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
                  <Layers size={48} className="mb-4 opacity-20" />
                  <p className="italic">
                    {searchTerm || selectedFilterTags.length > 0 
                      ? 'No cards match your filters' 
                      : (selectedDeck ? 'No cards in this deck yet' : 'Select a deck to view flashcards')}
                  </p>
                  {(searchTerm || selectedFilterTags.length > 0) && (
                    <button 
                      onClick={() => { setSearchTerm(''); setSelectedFilterTags([]); }}
                      className="mt-4 text-sm font-bold text-[#ff6b00] hover:underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

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
                setAlertModal({ title: "Card Rated!", message: `Mastery level updated to ${rating === 'Easy' ? 'Mastered' : rating === 'Medium' ? 'Moderate' : 'Learning'}.` });
              }}
            />
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
        className="bg-bg-secondary w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-text-main">Account & Settings</h3>
            <button onClick={onClose} className="text-text-secondary hover:text-text-main">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-bg-main border-2 border-border-main flex items-center justify-center overflow-hidden relative group">
              <UserIcon size={40} className="text-text-secondary opacity-30" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">User ID: {profile.id.slice(0, 8)}...</p>
              <div className="flex items-center justify-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-accent animate-pulse' : 'bg-green-500'}`} />
                <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">
                  {isSyncing ? 'Syncing...' : lastSyncTime > 0 ? `Synced ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Not synced yet'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-text-secondary ml-1">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-bg-main border border-border-main rounded-xl focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all py-3 px-4 text-sm outline-none text-text-main"
                placeholder="Choose a unique username"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-text-secondary ml-1">Full Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-bg-main border border-border-main rounded-xl focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all py-3 px-4 text-sm outline-none text-text-main"
                placeholder="Your display name"
              />
            </div>

            <div className="pt-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-text-secondary ml-1 mb-2 block">Appearance</label>
              <div className="flex items-center justify-between bg-bg-main border border-border-main rounded-xl p-4">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon size={18} className="text-accent" /> : <Sun size={18} className="text-accent" />}
                  <span className="text-sm font-medium text-text-main">{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? 'bg-accent' : 'bg-border-main'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-text-main text-bg-main font-bold py-4 rounded-xl text-sm hover:opacity-90 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
          >
            {isSaving ? 'Saving Changes...' : 'Save Profile'}
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
    <div className="w-full">
      <div 
        onClick={onClick}
        className="w-full h-44 p-5 flex flex-col hover:bg-bg-secondary rounded-xl transition-all cursor-pointer group border border-accent/20 hover:border-accent/40 shadow-sm hover:shadow-md relative"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-wider text-accent font-bold">Question</span>
          <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${mastery.classes}`}>
            {mastery.label}
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center text-center px-2 overflow-y-auto custom-scrollbar">
          <p className="text-sm font-semibold leading-relaxed text-text-main break-words py-2">
            {card.front}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {card.tags?.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[9px] bg-bg-main text-text-secondary px-1.5 py-0.5 rounded-sm font-medium border border-border-main">
              #{tag}
            </span>
          ))}
          {card.tags && card.tags.length > 3 && (
            <span className="text-[9px] text-text-secondary font-medium">+{card.tags.length - 3}</span>
          )}
        </div>
      </div>
    </div>
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

        <div className="perspective-1000 w-full h-[450px]">
          <motion.div 
            onClick={() => setIsFlipped(!isFlipped)}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
            className="relative w-full h-full preserve-3d cursor-pointer"
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden notion-card p-12 flex flex-col items-center justify-center text-center shadow-2xl border-none bg-bg-secondary rounded-3xl">
              {/* Mastery Badge */}
              <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[10px] font-bold border ${mastery.classes}`}>
                {mastery.label}
              </div>
              
              <div className="mb-8 shrink-0">
                <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-black bg-accent/5 px-4 py-1.5 rounded-full border border-accent/10">Question</span>
              </div>
              <div className="w-full max-h-[300px] overflow-y-auto px-4 custom-scrollbar">
                <p className="text-2xl sm:text-3xl font-bold leading-tight text-text-main break-words">{card.front}</p>
              </div>
              <div className="mt-12 shrink-0 flex flex-col items-center gap-2">
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Click to flip</p>
                <div className="w-8 h-1 bg-border-main rounded-full" />
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 notion-card bg-bg-secondary p-12 flex flex-col items-center justify-center text-center shadow-2xl border-none rounded-3xl">
              {/* Mastery Badge */}
              <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[10px] font-bold border ${mastery.classes}`}>
                {mastery.label}
              </div>

              <div className="mb-8 shrink-0">
                <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-black bg-accent/5 px-4 py-1.5 rounded-full border border-accent/10">Answer</span>
              </div>
              <div className="w-full max-h-[300px] overflow-y-auto px-4 custom-scrollbar">
                <p className="text-lg sm:text-xl leading-relaxed whitespace-pre-wrap text-text-main font-medium break-words">{card.back}</p>
                {card.tags?.includes('demo') && card.front.includes('Ushanj') && (
                  <div className="mt-8 flex justify-center">
                    <a 
                      href="https://youtube.com/@ushanj.com_yt?si=o6IeQX50CVkBkqrb" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 bg-[#FF0000] text-white px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-red-500/20"
                    >
                      <Youtube size={20} />
                      Subscribe on YouTube
                    </a>
                  </div>
                )}
              </div>
              <div className="mt-12 shrink-0 flex flex-col items-center gap-2">
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Click to flip</p>
                <div className="w-8 h-1 bg-border-main rounded-full" />
              </div>
            </div>
          </motion.div>
        </div>

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
                className="notion-card p-12 bg-bg-secondary shadow-2xl flex flex-col items-center justify-center text-center space-y-8 border-red-100"
              >
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-mastery-hard-bg text-mastery-hard-text rounded-full flex items-center justify-center mx-auto">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-text-main">Remove Card</h3>
                  <p className="text-text-secondary max-w-sm mx-auto">How would you like to remove this card from your study session?</p>
                </div>

                <div className="w-full max-w-md space-y-3">
                  <button 
                    onClick={() => {
                      onDeleteCard(card.id, false);
                      setShowDeleteConfirm(false);
                    }}
                    className="w-full py-4 px-6 bg-bg-main hover:bg-bg-secondary text-text-main rounded-2xl text-sm font-bold transition-all border border-border-main"
                  >
                    Remove from this session only
                  </button>
                  <button 
                    onClick={() => {
                      onDeleteCard(card.id, true);
                      setShowDeleteConfirm(false);
                    }}
                    className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-red-600/20"
                  >
                    Delete permanently from deck
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full py-4 px-6 text-text-secondary hover:text-text-main text-sm font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : isEditing ? (
              <div className="notion-card p-8 bg-bg-main shadow-2xl space-y-6 border-accent/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Question</label>
                    <textarea 
                      value={editFront}
                      onChange={(e) => setEditFront(e.target.value)}
                      className="w-full p-4 bg-bg-secondary border border-border-main rounded-xl text-sm outline-none min-h-[200px] focus:border-accent transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Answer</label>
                    <textarea 
                      value={editBack}
                      onChange={(e) => setEditBack(e.target.value)}
                      className="w-full p-4 bg-bg-secondary border border-border-main rounded-xl text-sm outline-none min-h-[200px] focus:border-accent transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase ml-1">Tags</label>
                  <div className="flex items-center gap-3 bg-bg-secondary border border-border-main rounded-xl px-4 py-3 focus-within:border-accent transition-all">
                    <Tag size={16} className="text-text-secondary" />
                    <input 
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="bg-transparent outline-none w-full text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 text-sm font-bold text-text-secondary">Cancel</button>
                  <button onClick={handleSaveEdit} className="notion-pill bg-accent text-accent-foreground text-sm font-bold border-accent px-8 py-2.5 flex items-center gap-2">
                    <Check size={16} /> Save Changes
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
                <div className="absolute inset-0 backface-hidden notion-card p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-2xl border-none bg-bg-secondary rounded-3xl">
                  <div className="mb-6 shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-black bg-accent/5 px-4 py-1.5 rounded-full border border-accent/10">Question</span>
                  </div>
                  <div className="w-full max-h-[250px] sm:max-h-[300px] overflow-y-auto px-4 custom-scrollbar">
                    <p className="text-2xl sm:text-4xl font-bold leading-tight text-text-main max-w-xl mx-auto break-words">{card.front}</p>
                  </div>
                  <div className="mt-10 flex flex-col items-center gap-2 shrink-0">
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest opacity-50">Click or Space to reveal answer</p>
                    <div className="w-8 h-1 bg-border-main rounded-full" />
                  </div>
                </div>

                {/* Back (Answer) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 notion-card bg-bg-secondary p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-2xl border-none rounded-3xl">
                  <div className="mb-6 shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-black bg-accent/5 px-4 py-1.5 rounded-full border border-accent/10">Answer</span>
                  </div>
                  <div className="w-full max-h-[250px] sm:max-h-[300px] overflow-y-auto px-4 custom-scrollbar">
                    <p className="text-lg sm:text-2xl leading-relaxed whitespace-pre-wrap text-text-main font-medium max-w-xl mx-auto break-words">{card.back}</p>
                    {card.tags?.includes('demo') && card.front.includes('Ushanj') && (
                      <div className="mt-8 flex justify-center">
                        <a 
                          href="https://youtube.com/@ushanj.com_yt?si=o6IeQX50CVkBkqrb" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 bg-[#FF0000] text-white px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-red-500/20"
                        >
                          <Youtube size={20} />
                          Subscribe on YouTube
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="mt-10 flex flex-col items-center gap-2 shrink-0">
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest opacity-50">Click or Space to see question</p>
                    <div className="w-8 h-1 bg-border-main rounded-full" />
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
// Trigger rebuild
