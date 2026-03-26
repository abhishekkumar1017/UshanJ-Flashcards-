import React, { useState, useEffect, useMemo } from 'react';
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
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

// --- Types ---
type MasteryLevel = 'New' | 'Learning' | 'Review' | 'Mastered';
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
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

// --- Components ---

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message) {
        try {
          const parsed = JSON.parse(event.error.message);
          if (parsed.error && parsed.operationType) {
            setHasError(true);
            setErrorInfo(JSON.stringify(parsed, null, 2));
          }
        } catch (e) {
          // Not a Firestore error we're looking for
        }
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="notion-card bg-white p-10 max-w-2xl w-full shadow-2xl border-red-100"
        >
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="p-4 bg-red-50 rounded-full text-red-600">
              <XCircle size={48} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#37352f]">Sync Error</h1>
              <p className="text-gray-500 text-sm max-w-md">
                We encountered a problem while communicating with the database. This might be due to a temporary connection issue or permission restrictions.
              </p>
            </div>
            
            <div className="w-full bg-gray-50 rounded-xl p-6 border border-gray-100 text-left">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Technical Details</p>
              <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap break-all leading-relaxed">
                  {errorInfo}
                </pre>
              </div>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="w-full notion-pill bg-[#37352f] text-white font-bold py-4 hover:bg-black transition-all shadow-xl shadow-black/10"
            >
              Reload Application
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  
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
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isAddingDeck, setIsAddingDeck] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [detailCard, setDetailCard] = useState<Flashcard | null>(null);

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Custom alert/confirm states
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

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

  // Fetch profile when user changes
  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleUpdateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, ...updates } : null);
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
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAlertModal({ title: "Check your email", message: "We've sent you a verification link. Please check your inbox." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Fetch Subjects
  useEffect(() => {
    if (!user) {
      setSubjects([]);
      return;
    }

    const fetchSubjects = async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching subjects:', error);
        return;
      }
      
      const list = data.map(item => ({
        id: item.id,
        name: item.name,
        created_at: item.created_at,
        user_id: item.user_id
      } as unknown as Subject));
      
      setSubjects(list);
      if (list.length > 0 && !selectedSubject) {
        setSelectedSubject(list[0]);
      }
    };

    fetchSubjects();

    // Real-time subscription
    const channel = supabase
      .channel('subjects_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects', filter: `user_id=eq.${user.id}` }, () => {
        fetchSubjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch Decks when Subject changes
  useEffect(() => {
    if (!user || !selectedSubject) {
      setDecks([]);
      setSelectedDeck(null);
      return;
    }

    const fetchDecks = async () => {
      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .eq('subject_id', selectedSubject.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching decks:', error);
        return;
      }
      
      const list = data.map(item => ({
        id: item.id,
        name: item.name,
        subject_id: item.subject_id,
        created_at: item.created_at,
        user_id: item.user_id
      } as unknown as Deck));
      
      setDecks(list);
      if (list.length > 0 && !selectedDeck) {
        setSelectedDeck(list[0]);
      } else if (list.length === 0) {
        setSelectedDeck(null);
      }
    };

    fetchDecks();

    const channel = supabase
      .channel('decks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'decks', filter: `user_id=eq.${user.id}` }, () => {
        fetchDecks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSubject, user]);

  // Fetch Flashcards when Deck or Subject changes
  useEffect(() => {
    if (!user || !selectedSubject || !selectedDeck) {
      setFlashcards([]);
      return;
    }

    const fetchFlashcards = async () => {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', selectedDeck.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching flashcards:', error);
        return;
      }
      
      const list = data.map(item => ({
        id: item.id,
        front: item.front,
        back: item.back,
        deck_id: item.deck_id,
        subject_id: item.subject_id,
        tags: item.tags,
        mastery_level: item.mastery_level,
        last_reviewed: item.last_reviewed,
        next_review_date: item.next_review_date,
        created_at: item.created_at,
        user_id: item.user_id
      } as unknown as Flashcard));
      
      setFlashcards(list);
    };

    fetchFlashcards();

    const channel = supabase
      .channel('flashcards_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flashcards', filter: `user_id=eq.${user.id}` }, () => {
        fetchFlashcards();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDeck, selectedSubject, user]);

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
      const { error } = await supabase
        .from('subjects')
        .insert([{
          name: newSubjectName.trim(),
          user_id: user.id
        }]);
      
      if (error) throw error;
      setNewSubjectName('');
      setIsAddingSubject(false);
    } catch (error) {
      console.error('Error creating subject:', error);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim() || !selectedSubject || !user) return;
    try {
      const { data: deckData, error: deckError } = await supabase
        .from('decks')
        .insert([{
          name: newDeckName.trim(),
          subject_id: selectedSubject.id,
          user_id: user.id
        }])
        .select()
        .single();

      if (deckError) throw deckError;

      // Add demo flashcard
      const { error: cardError } = await supabase
        .from('flashcards')
        .insert([{
          front: "what is UshanJ",
          back: "UshanJ is your complete preparation partner — built for every student, for every competitive exam.\n\nCreated by Abhishek Kumar, UshanJ was born from one simple belief: aspirants don’t just need more content — they need better systems. Systems that help them stay organized, track real progress, and revise effectively, all the way to exam day.\n\nToday, UshanJ offers three powerful platforms to support your entire preparation journey:\n\nUshanj.com is a full-featured web app with dedicated tracking tools for every major competitive exam. From structured syllabus coverage to progress dashboards, it gives you everything you need to plan, track, and complete your preparation — all in one place.\n\nUshanj Notion Templates bring the same preparation-first philosophy to Notion — giving you ready-to-use study planners, revision trackers, and exam dashboards that you can customize to your own workflow and schedule.\n\nUshanj Flashcards is a dedicated flashcard platform built specifically for competitive exam revision — helping you retain more in less time through active recall and spaced repetition.\n\nWhether you’re preparing for UPSC, SSC, NEET, JEE, Banking, Defence, or any other exam, UshanJ meets you where you are and gives you the tools to go further.\n\nThree platforms. Every exam. One preparation partner.",
          deck_id: deckData.id,
          subject_id: selectedSubject.id,
          user_id: user.id,
          tags: ["UshanJ", "Demo"],
          mastery_level: 'New'
        }]);

      if (cardError) throw cardError;

      setNewDeckName('');
      setIsAddingDeck(false);
    } catch (error) {
      console.error('Error creating deck:', error);
    }
  };

  const handleCreateCard = async () => {
    if (!newCardFront.trim() || !newCardBack.trim() || !selectedDeck || !selectedSubject || !user || isCreatingCard) return;
    setIsCreatingCard(true);
    try {
      const tags = newCardTags.split(',').map(t => t.trim()).filter(t => t !== '');
      const { error } = await supabase
        .from('flashcards')
        .insert([{
          front: newCardFront.trim(),
          back: newCardBack.trim(),
          deck_id: selectedDeck.id,
          subject_id: selectedSubject.id,
          user_id: user.id,
          tags: tags,
          mastery_level: 'New'
        }]);
      
      if (error) throw error;
      setNewCardFront('');
      setNewCardBack('');
      setNewCardTags('');
      setIsAddingCard(false);
    } catch (error) {
      console.error('Error creating card:', error);
    } finally {
      setIsCreatingCard(false);
    }
  };

  const handleUpdateCard = async (id: string, front: string, back: string, tags: string[]) => {
    try {
      const { error } = await supabase
        .from('flashcards')
        .update({
          front: front.trim(),
          back: back.trim(),
          tags: tags
        })
        .eq('id', id);
      
      if (error) throw error;
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

  const handleStudyRate = async (rating: 'Easy' | 'Medium' | 'Hard') => {
    const currentCard = studyCards[currentStudyIndex];
    let newMastery: MasteryLevel = currentCard.mastery_level;
    if (rating === 'Easy') newMastery = 'Mastered';
    if (rating === 'Medium') newMastery = 'Review';
    if (rating === 'Hard') newMastery = 'Learning';

    try {
      const { error } = await supabase
        .from('flashcards')
        .update({ 
          mastery_level: newMastery, 
          last_reviewed: new Date().toISOString() 
        })
        .eq('id', currentCard.id);

      if (error) throw error;

      if (currentStudyIndex < studyCards.length - 1) {
        setCurrentStudyIndex(prev => prev + 1);
      } else {
        setAlertModal({ title: "Session Complete!", message: "You've reviewed all cards in this session. Great job!" });
        setIsStudyModalOpen(false);
      }
    } catch (error) {
      console.error('Error rating card:', error);
    }
  };

  const startSubjectStudy = async (subject_id: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('subject_id', subject_id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const cards = data.map(item => ({
        id: item.id,
        front: item.front,
        back: item.back,
        deck_id: item.deck_id,
        subject_id: item.subject_id,
        tags: item.tags,
        mastery_level: item.mastery_level,
        last_reviewed: item.last_reviewed,
        next_review_date: item.next_review_date,
        created_at: item.created_at,
        user_id: item.user_id
      } as unknown as Flashcard));
      
      startStudySession(cards);
    } catch (error) {
      console.error('Error starting subject study:', error);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    setConfirmModal({
      title: 'Delete Subject?',
      message: 'This will permanently delete the subject and all its decks and flashcards.',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('subjects')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          if (selectedSubject?.id === id) setSelectedSubject(null);
          setConfirmModal(null);
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
        try {
          const { error } = await supabase
            .from('decks')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          if (selectedDeck?.id === id) setSelectedDeck(null);
          setConfirmModal(null);
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
        try {
          const { error } = await supabase
            .from('flashcards')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          setConfirmModal(null);
        } catch (error) {
          console.error('Error deleting card:', error);
        }
      }
    });
  };

  const handleDeleteStudyCard = async (id: string, permanent: boolean) => {
    if (permanent) {
      try {
        const { error } = await supabase
          .from('flashcards')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting study card:', error);
        return;
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f6f3] gap-6">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="p-6 bg-white rounded-[2.5rem] shadow-2xl shadow-[#ff6b00]/10 border border-[#ff6b00]/5"
        >
          <Brain size={64} className="text-[#ff6b00]" />
        </motion.div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold text-[#37352f] tracking-tight">UshanJ Flashcards</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-[#ff6b00] rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-[#ff6b00] rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-[#ff6b00] rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="notion-card bg-white p-10 max-w-md w-full shadow-2xl shadow-black/5 space-y-8"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-[#fff4eb] rounded-3xl shadow-inner">
              <Brain size={48} className="text-[#ff6b00]" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-3xl font-bold tracking-normal text-[#37352f]">UshanJ Flashcards</h1>
              <p className="text-gray-600 text-sm font-medium">
                {authMode === 'login' ? 'Welcome back! Please sign in.' : 'Join UshanJ to start your journey.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#fcfcfb] border border-gray-200 rounded-xl focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/5 transition-all py-3.5 px-4 text-sm outline-none placeholder:text-gray-400"
                placeholder="Enter your email"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#fcfcfb] border border-gray-200 rounded-xl focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/5 transition-all py-3.5 px-4 text-sm outline-none pr-12 placeholder:text-gray-400"
                  placeholder="Enter your password"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#ff6b00] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {authError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3 text-red-600 text-xs font-medium leading-relaxed"
              >
                <XCircle size={16} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-[#ff6b00] text-white font-bold py-4 rounded-xl text-sm shadow-xl shadow-[#ff6b00]/20 hover:shadow-[#ff6b00]/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
              }}
              className="text-sm font-bold text-[#ff6b00] hover:text-[#e66000] transition-all"
            >
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>

        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-6 sm:p-12 max-w-6xl mx-auto space-y-12">
        {/* Header with Logout */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="w-12 h-12 rounded-full bg-[#f7f6f3] border border-gray-100 flex items-center justify-center overflow-hidden hover:border-[#ff6b00]/20 transition-all group"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={20} className="text-gray-400 group-hover:text-[#ff6b00] transition-colors" />
              )}
            </button>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">
                Welcome back, {profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'Student'}
              </h1>
              <p className="text-gray-400 text-sm">Ready to continue your learning journey?</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="notion-pill text-xs font-bold text-gray-400 hover:text-[#ff6b00] transition-colors flex items-center gap-2"
            >
              <Settings size={14} />
              Profile
            </button>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                setUser(null);
              }}
              className="notion-pill text-xs font-bold text-gray-400 hover:text-red-600 transition-colors flex items-center gap-2"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Subjects Row */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Subjects</h2>
            {selectedSubject && (
              <button 
                onClick={() => startSubjectStudy(selectedSubject.id)}
                className="notion-pill flex items-center gap-2 text-sm font-bold hover:bg-[#ff6b00] hover:text-white transition-colors"
              >
                <Play size={14} /> Study Subject
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {subjects.map(subject => (
              <div key={subject.id} className="relative group shrink-0">
                <button 
                  onClick={() => setSelectedSubject(subject)}
                  className={`notion-pill text-sm font-bold transition-all ${selectedSubject?.id === subject.id ? 'active' : 'bg-white'}`}
                >
                  {subject.name}
                </button>
                <button 
                  onClick={() => handleDeleteSubject(subject.id)}
                  className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Delete Subject"
                >
                  <X size={10} />
                </button>
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
                  className="notion-pill text-sm font-bold w-32 outline-none"
                  placeholder="Subject name..."
                />
                <button onClick={handleCreateSubject} className="p-1 hover:text-[#ff6b00] flex items-center gap-1 text-xs font-bold">
                  <Check size={18} />
                  <span>Save</span>
                </button>
                <button onClick={() => setIsAddingSubject(false)} className="p-1 hover:text-red-600 flex items-center gap-1 text-xs font-bold">
                  <X size={18} />
                  <span>Cancel</span>
                </button>
              </div>
            ) : (
                <button 
                  onClick={() => setIsAddingSubject(true)}
                  className="notion-pill bg-white hover:bg-gray-50 transition-colors shrink-0 flex items-center gap-2"
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
            <h2 className="text-xl font-bold">Decks</h2>
            {selectedDeck && (
              <button 
                onClick={() => startStudySession(flashcards)}
                className="notion-pill flex items-center gap-2 text-sm font-bold hover:bg-[#ff6b00] hover:text-white transition-colors"
              >
                <Play size={14} /> Study Deck
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {decks.map(deck => (
              <div key={deck.id} className="relative group shrink-0">
                <button 
                  onClick={() => setSelectedDeck(deck)}
                  className={`notion-pill text-sm font-bold transition-all ${selectedDeck?.id === deck.id ? 'active' : 'bg-white'}`}
                >
                  {deck.name}
                </button>
                <button 
                  onClick={() => handleDeleteDeck(deck.id)}
                  className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Delete Deck"
                >
                  <X size={10} />
                </button>
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
                    className="notion-pill text-sm font-bold w-32 outline-none"
                    placeholder="Deck name..."
                  />
                  <button onClick={handleCreateDeck} className="p-1 hover:text-[#ff6b00] flex items-center gap-1 text-xs font-bold">
                    <Check size={18} />
                    <span>Save</span>
                  </button>
                  <button onClick={() => setIsAddingDeck(false)} className="p-1 hover:text-red-600 flex items-center gap-1 text-xs font-bold">
                    <X size={18} />
                    <span>Cancel</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingDeck(true)}
                  className="notion-pill bg-white hover:bg-gray-50 transition-colors shrink-0 flex items-center gap-2"
                >
                  <PlusCircle size={18} />
                  <span>Add Deck</span>
                </button>
              )
            )}
            {!selectedSubject && <p className="text-sm text-gray-400 italic">Select a subject first</p>}
          </div>
        </section>

        {/* Main Flashcards Area */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold">Flashcards</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#f7f6f3] border border-transparent rounded-lg px-3 py-2">
                <Filter size={14} className="text-gray-400" />
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortCriteria)}
                  className="bg-transparent text-xs font-bold outline-none cursor-pointer text-gray-600"
                >
                  <option value="created_at">Newest First</option>
                  <option value="alphabetical">Alphabetical (A-Z)</option>
                  <option value="mastery_level">Mastery Level</option>
                </select>
              </div>
              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search cards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#f7f6f3] border border-transparent rounded-lg text-sm outline-none focus:bg-white focus:border-[#ff6b00]/20 transition-all"
                />
              </div>
              {selectedDeck && (
                <button 
                  onClick={() => setIsAddingCard(true)}
                  className="notion-pill bg-white hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-bold"
                >
                  <PlusCircle size={18} /> Add Card
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {allUniqueTags.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-gray-400 mr-2">
                <Filter size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Filter Tags:</span>
              </div>
              {allUniqueTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTagFilter(tag)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all border ${
                    selectedFilterTags.includes(tag) 
                      ? 'bg-[#ff6b00]/10 text-[#ff6b00] border-[#ff6b00]/20' 
                      : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
                  }`}
                >
                  #{tag}
                </button>
              ))}
              {selectedFilterTags.length > 0 && (
                <button 
                  onClick={() => setSelectedFilterTags([])}
                  className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors ml-2"
                >
                  Clear All
                </button>
              )}
            </div>
          )}
          
          <div className="min-h-[350px] p-2">
            {isAddingCard && (
              <div className="mb-10 p-8 bg-[#fcfcfb] border border-[#ff6b00]/10 rounded-2xl space-y-6 shadow-inner">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff6b00]" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Create New Card</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Question</label>
                    <textarea 
                      autoFocus
                      placeholder="Enter your question..."
                      value={newCardFront}
                      onChange={(e) => setNewCardFront(e.target.value)}
                      className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm outline-none min-h-[120px] focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/5 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Answer</label>
                    <textarea 
                      placeholder="Enter the answer..."
                      value={newCardBack}
                      onChange={(e) => setNewCardBack(e.target.value)}
                      className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm outline-none min-h-[120px] focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/5 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tags</label>
                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#ff6b00] focus-within:ring-4 focus-within:ring-[#ff6b00]/5 transition-all">
                    <Tag size={16} className="text-gray-400" />
                    <input 
                      type="text"
                      placeholder="e.g. important, exam, chapter1"
                      value={newCardTags}
                      onChange={(e) => setNewCardTags(e.target.value)}
                      className="bg-transparent outline-none w-full text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setIsAddingCard(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">Cancel</button>
                  <button 
                    onClick={handleCreateCard} 
                    disabled={isCreatingCard}
                    className={`notion-pill bg-[#ff6b00] text-white text-sm font-bold border-[#ff6b00] px-8 py-2.5 shadow-lg shadow-[#ff6b00]/20 transition-all ${isCreatingCard ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                  >
                    {isCreatingCard ? 'Saving...' : 'Save Card'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
              {sortedAndFilteredFlashcards.map(card => (
                <FlashcardItem 
                  key={card.id} 
                  card={card} 
                  onClick={() => setDetailCard(card)}
                />
              ))}
            </div>
            {sortedAndFilteredFlashcards.length === 0 && !isAddingCard && (
                <div className="w-full flex flex-col items-center justify-center py-12 text-gray-400">
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
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

const ProfileModal: React.FC<{ 
  profile: Profile, 
  onClose: () => void, 
  onUpdate: (updates: Partial<Profile>) => Promise<void> 
}> = ({ profile, onClose, onUpdate }) => {
  const [username, setUsername] = useState(profile.username || '');
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate({
      username: username || null,
      full_name: fullName || null,
      bio: bio || null,
      avatar_url: avatarUrl || null
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
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Profile Settings</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-[#f7f6f3] border-2 border-gray-100 flex items-center justify-center overflow-hidden relative group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={40} className="text-gray-300" />
              )}
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">User ID: {profile.id.slice(0, 8)}...</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#fcfcfb] border border-gray-200 rounded-xl focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/5 transition-all py-3 px-4 text-sm outline-none"
                placeholder="Choose a unique username"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">Full Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#fcfcfb] border border-gray-200 rounded-xl focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/5 transition-all py-3 px-4 text-sm outline-none"
                placeholder="Your display name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">Avatar URL</label>
              <input 
                type="text" 
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full bg-[#fcfcfb] border border-gray-200 rounded-xl focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/5 transition-all py-3 px-4 text-sm outline-none"
                placeholder="Link to your profile picture"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">Bio</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full bg-[#fcfcfb] border border-gray-200 rounded-xl focus:border-[#ff6b00] focus:ring-4 focus:ring-[#ff6b00]/5 transition-all py-3 px-4 text-sm outline-none resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-[#37352f] text-white font-bold py-4 rounded-xl text-sm hover:bg-black transition-all shadow-xl shadow-black/10 disabled:opacity-50"
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
      className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center space-y-6"
      onClick={e => e.stopPropagation()}
    >
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
        <Check size={32} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
      <button 
        onClick={onClose}
        className="w-full py-3 bg-[#37352f] text-white rounded-xl text-sm font-bold transition-all"
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
      className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center space-y-6"
      onClick={e => e.stopPropagation()}
    >
      <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
        <Trash2 size={32} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-gray-500 text-sm">{message}</p>
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
          className="w-full py-3 bg-gray-50 text-gray-500 rounded-xl text-sm font-bold transition-all"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  </motion.div>
);

const FlashcardItem: React.FC<{ card: Flashcard, onClick: () => void }> = ({ card, onClick }) => {
  return (
    <div className="shrink-0">
      <div 
        onClick={onClick}
        className="w-64 h-44 p-5 flex flex-col hover:bg-[#f7f6f3] rounded-xl transition-all cursor-pointer group border border-[#ff6b00]/20 hover:border-[#ff6b00]/40 shadow-sm hover:shadow-md"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-wider text-[#ff6b00] font-bold">Question</span>
        </div>
        
        <div className="flex-1 flex items-center justify-center text-center px-2 overflow-y-auto custom-scrollbar">
          <p className="text-sm font-semibold leading-relaxed text-[#37352f] break-words py-2">
            {card.front}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {card.tags?.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[9px] bg-white text-gray-500 px-1.5 py-0.5 rounded-sm font-medium border border-gray-100">
              #{tag}
            </span>
          ))}
          {card.tags && card.tags.length > 3 && (
            <span className="text-[9px] text-gray-400 font-medium">+{card.tags.length - 3}</span>
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
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-8 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Edit Flashcard</h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2"
            title="Close"
          >
            <span className="text-xs font-bold text-gray-400 uppercase">Close</span>
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Question</label>
            <textarea 
              value={front}
              onChange={(e) => setFront(e.target.value)}
              className="w-full p-4 bg-[#fcfcfb] border border-gray-200 rounded-xl text-sm outline-none min-h-[150px] focus:border-[#ff6b00] transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Answer</label>
            <textarea 
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className="w-full p-4 bg-[#fcfcfb] border border-gray-200 rounded-xl text-sm outline-none min-h-[150px] focus:border-[#ff6b00] transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tags</label>
          <div className="flex items-center gap-3 bg-[#fcfcfb] border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#ff6b00] transition-all">
            <Tag size={16} className="text-gray-400" />
            <input 
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500">Cancel</button>
          <button 
            onClick={() => onSave(card.id, front, back, tags.split(',').map(t => t.trim()).filter(t => t !== ''))}
            className="notion-pill bg-[#ff6b00] text-white text-sm font-bold border-[#ff6b00] px-8 py-2.5"
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
}

const DetailCardModal: React.FC<DetailCardModalProps> = ({ card, onClose, onEdit, onDelete }) => {
  const [isFlipped, setIsFlipped] = useState(false);

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
        className="w-full max-w-2xl flex flex-col gap-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="perspective-1000 w-full h-[450px]">
          <motion.div 
            onClick={() => setIsFlipped(!isFlipped)}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
            className="relative w-full h-full preserve-3d cursor-pointer"
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden notion-card p-12 flex flex-col items-center justify-center text-center shadow-2xl border-none bg-white rounded-3xl">
              <div className="mb-8 shrink-0">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#ff6b00] font-black bg-[#ff6b00]/5 px-4 py-1.5 rounded-full border border-[#ff6b00]/10">Question</span>
              </div>
              <div className="w-full max-h-[300px] overflow-y-auto px-4 custom-scrollbar">
                <p className="text-2xl sm:text-3xl font-bold leading-tight text-[#37352f] break-words">{card.front}</p>
              </div>
              <div className="mt-12 shrink-0 flex flex-col items-center gap-2">
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Click to flip</p>
                <div className="w-8 h-1 bg-gray-100 rounded-full" />
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 notion-card bg-[#fcfcfb] p-12 flex flex-col items-center justify-center text-center shadow-2xl border-none rounded-3xl">
              <div className="mb-8 shrink-0">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#ff6b00] font-black bg-[#ff6b00]/5 px-4 py-1.5 rounded-full border border-[#ff6b00]/10">Answer</span>
              </div>
              <div className="w-full max-h-[300px] overflow-y-auto px-4 custom-scrollbar">
                <p className="text-lg sm:text-xl leading-relaxed whitespace-pre-wrap text-[#37352f] font-medium break-words">{card.back}</p>
              </div>
              <div className="mt-12 shrink-0 flex flex-col items-center gap-2">
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Click to flip</p>
                <div className="w-8 h-1 bg-gray-100 rounded-full" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex justify-center gap-4">
          <button 
            onClick={onEdit} 
            className="notion-pill bg-white hover:bg-gray-50 text-xs font-bold flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-all"
          >
            <Edit3 size={16} className="text-[#ff6b00]" /> Edit
          </button>
          <button 
            onClick={onDelete} 
            className="notion-pill bg-white hover:bg-red-50 text-red-600 border-red-100 text-xs font-bold flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-all"
          >
            <Trash2 size={16} /> Delete
          </button>
          <button 
            onClick={onClose} 
            className="notion-pill bg-[#37352f] text-white border-[#37352f] hover:bg-[#2e2c27] text-xs font-bold px-8 py-3 shadow-lg hover:shadow-xl transition-all"
          >
            Close
          </button>
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
      className="fixed inset-0 z-50 bg-white flex flex-col"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2"
            title="Exit Study Session"
          >
            <X size={24} />
            <span className="text-sm font-bold text-gray-400 uppercase">Exit</span>
          </button>
          <div>
            <h3 className="font-bold">Study Session</h3>
            <p className="text-xs text-gray-400">Card {currentIndex + 1} of {cards.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-full transition-colors flex items-center gap-2"
            title="Delete or remove card"
          >
            <Trash2 size={20} />
            <span className="text-xs font-bold uppercase">Remove</span>
          </button>
          <div className="h-6 w-[1px] bg-gray-100 mx-1" />
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 notion-pill transition-all text-xs font-bold ${isEditing ? 'bg-[#ff6b00] text-white border-[#ff6b00]' : 'hover:bg-gray-50'}`}
          >
            <Edit3 size={14} /> {isEditing ? 'Editing...' : 'Edit Card'}
          </button>
          <button 
            onClick={onShuffle}
            className="flex items-center gap-2 notion-pill hover:bg-gray-50 text-xs font-bold"
          >
            <Shuffle size={14} /> Shuffle
          </button>
          <div className="h-6 w-[1px] bg-gray-100 mx-2" />
          <div className="flex items-center gap-2">
            <button 
              disabled={currentIndex === 0}
              onClick={onPrev}
              className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 flex items-center gap-1"
              title="Previous Card"
            >
              <ArrowLeft size={20} />
              <span className="text-xs font-bold uppercase">Prev</span>
            </button>
            <button 
              disabled={currentIndex === cards.length - 1}
              onClick={onNext}
              className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 flex items-center gap-1"
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
              <span key={i} className="notion-pill text-xs bg-gray-50 text-gray-500">#{tag}</span>
            ))}
          </div>

          {/* Card */}
          <div className="perspective-1000 w-full min-h-[400px]">
            {showDeleteConfirm ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="notion-card p-12 bg-white shadow-2xl flex flex-col items-center justify-center text-center space-y-8 border-red-100"
              >
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-2xl font-bold">Remove Card</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">How would you like to remove this card from your study session?</p>
                </div>

                <div className="w-full max-w-md space-y-3">
                  <button 
                    onClick={() => {
                      onDeleteCard(card.id, false);
                      setShowDeleteConfirm(false);
                    }}
                    className="w-full py-4 px-6 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold transition-all border border-gray-100"
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
                    className="w-full py-4 px-6 text-gray-400 hover:text-gray-600 text-sm font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : isEditing ? (
              <div className="notion-card p-8 bg-white shadow-2xl space-y-6 border-[#ff6b00]/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Question</label>
                    <textarea 
                      value={editFront}
                      onChange={(e) => setEditFront(e.target.value)}
                      className="w-full p-4 bg-[#fcfcfb] border border-gray-200 rounded-xl text-sm outline-none min-h-[200px] focus:border-[#ff6b00] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Answer</label>
                    <textarea 
                      value={editBack}
                      onChange={(e) => setEditBack(e.target.value)}
                      className="w-full p-4 bg-[#fcfcfb] border border-gray-200 rounded-xl text-sm outline-none min-h-[200px] focus:border-[#ff6b00] transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tags</label>
                  <div className="flex items-center gap-3 bg-[#fcfcfb] border border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#ff6b00] transition-all">
                    <Tag size={16} className="text-gray-400" />
                    <input 
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="bg-transparent outline-none w-full text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500">Cancel</button>
                  <button onClick={handleSaveEdit} className="notion-pill bg-[#ff6b00] text-white text-sm font-bold border-[#ff6b00] px-8 py-2.5 flex items-center gap-2">
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
                <div className="absolute inset-0 backface-hidden notion-card p-12 flex flex-col items-center justify-center text-center shadow-2xl border-none bg-white">
                  <div className="mb-8 shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#ff6b00] font-black bg-[#ff6b00]/5 px-3 py-1 rounded-full">Question</span>
                  </div>
                  <div className="w-full max-h-[60vh] overflow-y-auto px-4 custom-scrollbar">
                    <p className="text-2xl sm:text-3xl font-semibold leading-snug text-[#37352f] max-w-xl mx-auto break-words">{card.front}</p>
                  </div>
                  <div className="mt-12 flex flex-col items-center gap-2 shrink-0">
                    <p className="text-xs text-gray-300 font-medium uppercase tracking-widest">Click or Space to reveal answer</p>
                    <div className="w-1 h-1 rounded-full bg-[#ff6b00] animate-bounce" />
                  </div>
                </div>

                {/* Back (Answer) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 notion-card bg-[#fcfcfb] p-12 flex flex-col items-center justify-center text-center shadow-2xl border-none">
                  <div className="mb-8">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#ff6b00] font-black bg-[#ff6b00]/5 px-3 py-1 rounded-full">Answer</span>
                  </div>
                  <div className="w-full max-h-[60vh] overflow-y-auto px-4 custom-scrollbar">
                    <p className="text-lg sm:text-2xl leading-relaxed whitespace-pre-wrap text-[#37352f] font-medium break-words">{card.back}</p>
                  </div>
                  <div className="mt-12">
                    <p className="text-xs text-gray-300 font-medium uppercase tracking-widest">Click or Space to see question</p>
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
                  onClick={() => onRate('Hard')}
                  className="px-8 py-3 rounded-xl bg-red-50 text-red-600 border border-red-100 font-bold text-sm hover:bg-red-100 transition-all shadow-sm"
                >
                  Hard
                </button>
                <button 
                  onClick={() => onRate('Medium')}
                  className="px-8 py-3 rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-100 font-bold text-sm hover:bg-yellow-100 transition-all shadow-sm"
                >
                  Medium
                </button>
                <button 
                  onClick={() => onRate('Easy')}
                  className="px-8 py-3 rounded-xl bg-green-50 text-green-600 border border-green-100 font-bold text-sm hover:bg-green-100 transition-all shadow-sm"
                >
                  Easy
                </button>
              </div>

              <div className="flex items-center gap-12">
                <button 
                  disabled={currentIndex === 0}
                  onClick={onPrev}
                  className="group flex flex-col items-center gap-2 disabled:opacity-20 transition-all"
                >
                  <div className="p-4 bg-white border border-gray-100 rounded-full shadow-sm group-hover:shadow-md group-hover:border-[#ff6b00]/20 transition-all">
                    <ArrowLeft size={24} className="text-gray-600 group-hover:text-[#ff6b00]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Previous</span>
                </button>

                <button 
                  onClick={onShuffle}
                  className="group flex flex-col items-center gap-2 transition-all"
                >
                  <div className="p-4 bg-white border border-gray-100 rounded-full shadow-sm group-hover:shadow-md group-hover:border-[#ff6b00]/20 transition-all">
                    <Shuffle size={24} className="text-gray-600 group-hover:text-[#ff6b00]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Shuffle</span>
                </button>

                <button 
                  disabled={currentIndex === cards.length - 1}
                  onClick={onNext}
                  className="group flex flex-col items-center gap-2 disabled:opacity-20 transition-all"
                >
                  <div className="p-4 bg-white border border-gray-100 rounded-full shadow-sm group-hover:shadow-md group-hover:border-[#ff6b00]/20 transition-all">
                    <ArrowRight size={24} className="text-gray-600 group-hover:text-[#ff6b00]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Next</span>
                </button>
              </div>

              {/* Keyboard Hints */}
              <div className="flex justify-center gap-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Space</span> Flip
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">← / →</span> Navigate
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">E</span> Edit
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Esc</span> Exit
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-100 w-full">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          className="h-full bg-[#ff6b00]"
        />
      </div>
    </motion.div>
  );
};
