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
  Maximize2,
  Search,
  Filter,
  Shuffle,
  Edit3,
  Check,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  db, 
  auth,
  OperationType, 
  handleFirestoreError 
} from './firebase';
import { 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  updateDoc
} from 'firebase/firestore';

// --- Types ---
type MasteryLevel = 'New' | 'Learning' | 'Review' | 'Mastered';

interface Subject {
  id: string;
  name: string;
  createdAt: any;
}

interface Deck {
  id: string;
  name: string;
  subjectId: string;
  createdAt: any;
}

interface Flashcard {
  id: string;
  front: string; // Question
  back: string;  // Answer
  deckId: string;
  subjectId: string;
  tags?: string[];
  masteryLevel: MasteryLevel;
  lastReviewed?: any;
  nextReviewDate?: any;
  createdAt: any;
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
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="notion-card bg-white p-8 max-w-2xl w-full">
          <div className="flex items-center gap-3 text-black mb-4">
            <XCircle size={32} />
            <h1 className="text-2xl font-bold">Something went wrong</h1>
          </div>
          <p className="text-gray-600 mb-6">
            A database error occurred. This is likely due to missing permissions or an invalid operation.
          </p>
          <pre className="bg-[#f7f6f3] p-4 rounded-lg overflow-auto max-h-64 text-sm font-mono border border-gray-200">
            {errorInfo}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 w-full notion-pill font-bold hover:bg-[#ff6b00] hover:text-white transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);

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
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [detailCard, setDetailCard] = useState<Flashcard | null>(null);

  // Custom alert/confirm states
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch Subjects
  useEffect(() => {
    const q = query(collection(db, 'subjects'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
      setSubjects(list);
      if (list.length > 0 && !selectedSubject) {
        setSelectedSubject(list[0]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'subjects');
    });
    return unsubscribe;
  }, []);

  // Fetch Decks when Subject changes
  useEffect(() => {
    if (!selectedSubject) {
      setDecks([]);
      setSelectedDeck(null);
      return;
    }
    const q = query(
      collection(db, 'decks'), 
      where('subjectId', '==', selectedSubject.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deck));
      // Sort in memory
      list.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setDecks(list);
      if (list.length > 0) {
        setSelectedDeck(list[0]);
      } else {
        setSelectedDeck(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'decks');
    });
    return unsubscribe;
  }, [selectedSubject]);

  // Fetch Flashcards when Deck or Subject changes
  useEffect(() => {
    if (!selectedSubject || !selectedDeck) {
      setFlashcards([]);
      return;
    }

    const q = query(
      collection(db, 'flashcards'), 
      where('deckId', '==', selectedDeck.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flashcard));
      // Sort in memory
      list.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setFlashcards(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'flashcards');
    });
    return unsubscribe;
  }, [selectedDeck, selectedSubject]);

  const filteredFlashcards = useMemo(() => {
    return flashcards.filter(card => {
      const matchesSearch = searchTerm === '' || 
        card.front.toLowerCase().includes(searchTerm.toLowerCase()) || 
        card.back.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesTags = selectedFilterTags.length === 0 || 
        selectedFilterTags.every(tag => card.tags?.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [flashcards, searchTerm, selectedFilterTags]);

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
      await addDoc(collection(db, 'subjects'), {
        name: newSubjectName.trim(),
        createdAt: serverTimestamp()
      });
      setNewSubjectName('');
      setIsAddingSubject(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'subjects');
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim() || !selectedSubject) return;
    try {
      await addDoc(collection(db, 'decks'), {
        name: newDeckName.trim(),
        subjectId: selectedSubject.id,
        createdAt: serverTimestamp()
      });
      setNewDeckName('');
      setIsAddingDeck(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'decks');
    }
  };

  const handleCreateCard = async () => {
    if (!newCardFront.trim() || !newCardBack.trim() || !selectedDeck || !selectedSubject || isCreatingCard) return;
    setIsCreatingCard(true);
    try {
      const tags = newCardTags.split(',').map(t => t.trim()).filter(t => t !== '');
      await addDoc(collection(db, 'flashcards'), {
        front: newCardFront.trim(),
        back: newCardBack.trim(),
        deckId: selectedDeck.id,
        subjectId: selectedSubject.id,
        tags: tags,
        masteryLevel: 'New',
        createdAt: serverTimestamp()
      });
      setNewCardFront('');
      setNewCardBack('');
      setNewCardTags('');
      setIsAddingCard(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'flashcards');
    } finally {
      setIsCreatingCard(false);
    }
  };

  const handleUpdateCard = async (id: string, front: string, back: string, tags: string[]) => {
    try {
      await updateDoc(doc(db, 'flashcards', id), {
        front: front.trim(),
        back: back.trim(),
        tags: tags
      });
      setEditingCard(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'flashcards');
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
    let newMastery: MasteryLevel = currentCard.masteryLevel;
    if (rating === 'Easy') newMastery = 'Mastered';
    if (rating === 'Medium') newMastery = 'Review';
    if (rating === 'Hard') newMastery = 'Learning';

    try {
      await updateDoc(doc(db, 'flashcards', currentCard.id), { 
        masteryLevel: newMastery, 
        lastReviewed: serverTimestamp() 
      });

      if (currentStudyIndex < studyCards.length - 1) {
        setCurrentStudyIndex(prev => prev + 1);
      } else {
        setAlertModal({ title: "Session Complete!", message: "You've reviewed all cards in this session. Great job!" });
        setIsStudyModalOpen(false);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'flashcards');
    }
  };

  const startSubjectStudy = async (subjectId: string) => {
    try {
      const q = query(collection(db, 'flashcards'), where('subjectId', '==', subjectId));
      const snapshot = await getDocs(q);
      const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flashcard));
      startStudySession(cards);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'flashcards');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    setConfirmModal({
      title: 'Delete Subject?',
      message: 'This will permanently delete the subject and all its decks and flashcards.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'subjects', id));
          if (selectedSubject?.id === id) setSelectedSubject(null);
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `subjects/${id}`);
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
          await deleteDoc(doc(db, 'decks', id));
          if (selectedDeck?.id === id) setSelectedDeck(null);
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `decks/${id}`);
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
          await deleteDoc(doc(db, 'flashcards', id));
          setConfirmModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `flashcards/${id}`);
        }
      }
    });
  };

  const handleDeleteStudyCard = async (id: string, permanent: boolean) => {
    if (permanent) {
      try {
        await deleteDoc(doc(db, 'flashcards', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `flashcards/${id}`);
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#ff6b00]"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-6 sm:p-12 max-w-6xl mx-auto space-y-12">
        {/* Greeting Section */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'Student'}</h1>
          <p className="text-gray-400 text-sm">Ready to continue your learning journey?</p>
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
              {filteredFlashcards.map(card => (
                <FlashcardItem 
                  key={card.id} 
                  card={card} 
                  onDelete={() => handleDeleteCard(card.id)} 
                  onClick={() => setDetailCard(card)}
                  onEdit={() => setEditingCard(card)}
                />
              ))}
            </div>
            {filteredFlashcards.length === 0 && !isAddingCard && (
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
      </div>
    </ErrorBoundary>
  );
}

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

const FlashcardItem: React.FC<{ card: Flashcard, onDelete: () => void, onClick: () => void, onEdit: () => void }> = ({ card, onDelete, onClick, onEdit }) => {
  return (
    <div className="shrink-0">
      <div 
        onClick={onClick}
        className="w-64 h-44 p-5 flex flex-col hover:bg-[#f7f6f3] rounded-xl transition-all cursor-pointer group border border-[#ff6b00]/20 hover:border-[#ff6b00]/40"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Question</span>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 hover:bg-white rounded text-gray-400 hover:text-[#ff6b00] transition-colors flex items-center gap-1"
              title="Edit Card"
            >
              <Edit3 size={12} />
              <span className="text-[9px] font-bold uppercase">Edit</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 hover:bg-white rounded text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1"
              title="Delete Card"
            >
              <Trash2 size={12} />
              <span className="text-[9px] font-bold uppercase">Delete</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center text-center px-2">
          <p className="text-sm font-semibold leading-relaxed text-[#37352f] line-clamp-4">
            {card.front}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {card.tags?.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[9px] bg-white text-gray-500 px-1.5 py-0.5 rounded-sm font-medium border border-gray-100">
              {tag}
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
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="perspective-1000 w-full min-h-[400px] mb-6">
          <motion.div 
            onClick={() => setIsFlipped(!isFlipped)}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
            className="relative w-full h-full preserve-3d cursor-pointer"
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden notion-card p-12 flex flex-col items-center justify-center text-center shadow-2xl border-none bg-white">
              <div className="mb-8 shrink-0">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#ff6b00] font-black bg-[#ff6b00]/5 px-3 py-1 rounded-full">Question</span>
              </div>
              <div className="w-full max-h-[60vh] overflow-y-auto scrollbar-hide px-4">
                <p className="text-2xl sm:text-3xl font-semibold leading-tight text-[#37352f]">{card.front}</p>
              </div>
              <div className="mt-8 shrink-0">
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Click to flip</p>
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 notion-card bg-[#fcfcfb] p-12 flex flex-col items-center justify-center text-center shadow-2xl border-none">
              <div className="mb-8 shrink-0">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#ff6b00] font-black bg-[#ff6b00]/5 px-3 py-1 rounded-full">Answer</span>
              </div>
              <div className="w-full max-h-[60vh] overflow-y-auto scrollbar-hide px-4">
                <p className="text-xl sm:text-2xl leading-relaxed whitespace-pre-wrap text-[#37352f] font-medium">{card.back}</p>
              </div>
              <div className="mt-8 shrink-0">
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Click to flip</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex justify-center gap-4">
          <button onClick={onEdit} className="notion-pill bg-white hover:bg-gray-50 text-xs font-bold flex items-center gap-2">
            <Edit3 size={14} /> Edit
          </button>
          <button onClick={onDelete} className="notion-pill bg-white hover:bg-red-50 text-red-600 border-red-100 text-xs font-bold flex items-center gap-2">
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={onClose} className="notion-pill bg-[#37352f] text-white border-[#37352f] text-xs font-bold">
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
                  <div className="w-full max-h-[60vh] overflow-y-auto scrollbar-hide px-4">
                    <p className="text-2xl sm:text-4xl font-semibold leading-tight text-[#37352f] max-w-xl mx-auto">{card.front}</p>
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
                  <div className="w-full max-h-[60vh] overflow-y-auto scrollbar-hide px-4">
                    <p className="text-xl sm:text-3xl leading-relaxed whitespace-pre-wrap text-[#37352f] font-medium">{card.back}</p>
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
