import React from 'react';
import { 
  Brain, 
  Target, 
  Layers, 
  Zap, 
  Moon, 
  ShieldCheck, 
  GraduationCap, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Search,
  Layout,
  Clock,
  History,
  Smartphone,
  Quote,
  Feather
} from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onSignup: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignup, onLogin }) => {
  return (
    <div className="bg-bg-main text-text-main font-sans selection:bg-accent/20 transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-bg-main/80 backdrop-blur-md border-b border-border-main py-4 transition-all">
        <div className="max-w-screen-2xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Feather size={24} className="text-accent" />
            <span className="text-xl font-heading font-bold tracking-tight">ushanj <span className="text-accent underline decoration-accent/10">flashcards</span></span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={onLogin}
              className="px-3 sm:px-4 py-2 text-text-main font-bold text-xs sm:text-sm hover:text-accent transition-colors"
            >
              Log in
            </button>
            <button 
              onClick={onSignup}
              className="px-4 sm:px-5 py-2 bg-accent text-white rounded-lg font-bold text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-accent/10"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-20 px-6">
        <div className="max-w-screen-xl mx-auto text-center space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-md text-accent text-[10px] font-bold uppercase tracking-widest"
          >
            <Sparkles size={12} />
            Built for You
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-heading font-bold tracking-tight leading-[1.1] text-text-main"
          >
            Master what you study, <br />
            <span className="text-accent">once and for all.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-text-secondary font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Stop reading the same notes over and over. Ushanj Flashcards helps you convert complex concepts into 
            active memory through structured flashcards and evidence-based revision.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button 
              onClick={onSignup}
              className="w-full sm:w-auto px-10 py-4 bg-accent text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-accent/20 hover:brightness-110 active:scale-95 transition-all"
            >
              Get Started Free
              <ArrowRight size={20} />
            </button>
            <button 
              onClick={onLogin}
              className="w-full sm:w-auto px-10 py-4 border border-border-main text-text-main rounded-xl font-bold text-lg hover:bg-bg-secondary transition-all"
            >
              Log in
            </button>
          </motion.div>
          <div className="pt-4">
            <a 
              href="https://ushan-j-updated.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-accent font-bold text-sm transition-all"
            >
              UshanJ Preparation Tracker →
            </a>
          </div>
        </div>
      </header>

      {/* Problem Section */}
      <section className="py-24 bg-bg-secondary/30 border-y border-border-main px-6">
        <div className="max-w-screen-2xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-6 tracking-tight">The "Revision Gap" is real.</h2>
            <p className="text-lg text-text-secondary font-medium leading-relaxed mb-8">
              Most students fail not because they don't study, but because they can't retain 
              the massive volume of information required for exams like UPSC or NEET.
            </p>
            <div className="space-y-4">
              {[
                "Forgetting 70% of today's study by next week",
                "Revising randomly without knowing your weak spots",
                "Information scattered across bulky books and notes",
                "Losing consistency when the syllabus gets heavy"
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500 text-xs shrink-0 font-bold">×</div>
                  <span className="font-semibold text-text-secondary">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-bg-card p-4 rounded-2xl shadow-xl border border-border-main">
            <div className="aspect-video w-full bg-bg-secondary rounded-xl flex items-center justify-center border border-dashed border-border-main overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 to-transparent"></div>
              <span className="text-text-secondary font-medium italic relative z-10 group-hover:scale-110 transition-transform">Scattered learning path...</span>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 px-6 bg-bg-main">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">Ushanj Flashcards is built for memory, not just storage.</h2>
          <p className="text-lg text-text-secondary font-medium leading-relaxed">
            We don't just store your notes; we build a system that forces your brain to recall 
            information at the right intervals, ensuring long-term mastery.
          </p>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-24 px-6 bg-bg-main overflow-hidden">
        <div className="max-w-screen-2xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={<Brain className="text-accent" />}
              title="Smart Organization"
              desc="Hierarchical Subjects and Decks group your learning for total mental clarity."
            />
            <FeatureCard 
              icon={<Target className="text-accent" />}
              title="Focused Study Mode"
              desc="Distraction-free interface with keyboard shortcuts for rapid, flow-state learning."
            />
            <FeatureCard 
              icon={<Layers className="text-accent" />}
              title="Mastery Tracking"
              desc="Visualize your progress from 'New' to 'Mastered' with intuitive leveling systems."
            />
            <FeatureCard 
              icon={<Zap className="text-accent" />}
              title="Quick Add Console"
              desc="Instantly capture facts and concepts without breaking your study rhythm."
            />
          </div>
        </div>
      </section>

      {/* Spaced Repetition Angle */}
      <section className="py-24 bg-accent/5 border-y border-accent/10 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-accent mx-auto shadow-xl">
            <History size={32} />
          </div>
          <h2 className="text-4xl font-black tracking-tight">Why revision timing matters.</h2>
          <p className="text-lg text-text-secondary font-medium leading-relaxed max-w-3xl mx-auto">
            The Forgetting Curve is your biggest enemy. Ushanj Flashcards uses mastery levels to help you 
            identify which cards need urgent attention. By focusing on what you're about to forget, 
            you cut study time by 50%.
          </p>
          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <div className="bg-bg-card p-6 rounded-2xl shadow-subtle border border-border-main">
              <span className="text-accent font-heading font-bold text-2xl">New</span>
              <p className="text-sm text-text-secondary font-medium mt-2">Information intake stage</p>
            </div>
            <div className="bg-bg-card p-6 rounded-2xl shadow-md border border-accent/20 scale-105 ring-2 ring-accent/10">
              <span className="text-accent font-heading font-bold text-2xl">Learning</span>
              <p className="text-sm text-text-secondary font-medium mt-2">Active recall & repetition</p>
            </div>
            <div className="bg-bg-card p-6 rounded-2xl shadow-subtle border border-border-main">
              <span className="text-green-500 font-heading font-bold text-2xl">Mastered</span>
              <p className="text-sm text-text-secondary font-medium mt-2">Stored in long-term memory</p>
            </div>
          </div>
        </div>
      </section>

      {/* Experience & Personalization */}
      <section className="py-24 px-6 bg-bg-main">
        <div className="max-w-screen-2xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 space-y-8">
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-bg-secondary rounded-xl flex items-center justify-center text-accent shrink-0 shadow-sm"><Moon size={24} /></div>
              <div className="space-y-1">
                <h4 className="font-heading font-bold text-xl">True Dark Mode</h4>
                <p className="text-text-secondary font-medium leading-relaxed">Rest your eyes during late-night study sessions with deep OLED blacks.</p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-bg-secondary rounded-xl flex items-center justify-center text-accent shrink-0 shadow-sm"><Layout size={24} /></div>
              <div className="space-y-1">
                <h4 className="font-heading font-bold text-xl">Custom Accents</h4>
                <p className="text-text-secondary font-medium leading-relaxed">Personalize your workspace with colors that help you stay focused.</p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-bg-secondary rounded-xl flex items-center justify-center text-accent shrink-0 shadow-sm"><Smartphone size={24} /></div>
              <div className="space-y-1">
                <h4 className="font-heading font-bold text-xl">Responsive Design</h4>
                <p className="text-text-secondary font-medium leading-relaxed">A seamless experience across your laptop, tablet, and smartphone.</p>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 tracking-tight leading-tight">Your digital study <br /><span className="text-accent">sanctuary.</span></h2>
            <p className="text-lg text-text-secondary font-medium leading-relaxed">
              Revision is hard enough. Your tools shouldn't make it harder. We've stripped away 
              the clutter to give you a clean space where only you and your cards exist.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Reliability */}
      <section className="py-24 bg-text-main text-white px-6">
        <div className="max-w-screen-2xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-12 text-center lg:text-left">
          <div className="space-y-6 max-w-xl">
            <div className="flex items-center justify-center lg:justify-start gap-3 text-accent font-bold tracking-widest uppercase text-xs">
              <ShieldCheck size={20} />
              Privacy & Security
            </div>
            <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight">Your data, everywhere.</h2>
            <p className="text-text-secondary font-medium text-lg leading-relaxed">
              We use Supabase for rock-solid data syncing. Start studying on your desktop, 
              continue on your phone. Even works offline with automatic cloud sync when you're back.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors group">
              <span className="text-white font-heading font-bold block text-xl group-hover:text-accent transition-colors">Cloud Sync</span>
              <p className="text-white/40 text-xs mt-1">Auto-save every card</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors group">
              <span className="text-white font-heading font-bold block text-xl group-hover:text-accent transition-colors">Offline First</span>
              <p className="text-white/40 text-xs mt-1">Study without internet</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 bg-bg-main px-6">
        <div className="max-w-screen-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-16 tracking-tight">Built for you.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <UseCase 
              title="UPSC Aspirant"
              desc="Mastering static subjects like History and Polity. Categorize by GS papers and track long-term retention."
              tags={["History", "Polity", "Current Affairs"]}
            />
            <UseCase 
              title="NEET / Medical"
              desc="Memorizing complex Biology diagrams and pharmacology facts through high-frequency repetition."
              tags={["Biology", "Anatomy", "Pharma"]}
            />
            <UseCase 
              title="Coding / Tech"
              desc="Internalizing system design patterns and syntax through contextual flashcards."
              tags={["Algorithms", "Design Patterns", "Syntax"]}
            />
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="how-it-works" className="py-24 bg-bg-secondary/30 px-6 overflow-hidden scroll-mt-20">
        <div className="max-w-screen-2xl mx-auto text-center space-y-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">How it works.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <WorkflowStep num={1} title="Group by Subject" desc="Create subjects and decks based on your syllabus." />
            <WorkflowStep num={2} title="Add Flashcards" desc="Input questions and answers using the Quick Add console." />
            <WorkflowStep num={3} title="Study Daily" desc="Run session-based reviews using keyboard shortcuts." />
            <WorkflowStep num={4} title="Master Content" desc="Let the system handle the tracking. Just focus on recall." />
          </div>
        </div>
      </section>

      {/* Last CTA */}
      <section className="py-24 px-6 bg-bg-main">
        <div className="max-w-5xl mx-auto bg-accent text-white p-12 md:p-16 rounded-3xl text-center space-y-8 shadow-2xl shadow-accent/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight leading-tight">Ready to master your syllabus?</h2>
          <p className="text-white/80 text-xl font-medium max-w-xl mx-auto leading-relaxed">
            Join the Ushanj Flashcards family of high-achievers today. Free to use, built for students.
          </p>
          <div className="pt-4">
            <button 
              onClick={onSignup}
              className="px-12 py-5 bg-white text-accent rounded-xl font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              Start Your First Deck
            </button>
          </div>
        </div>
      </section>

      {/* Founder Story */}
      <section className="py-24 px-6 bg-bg-main border-t border-border-main">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl ring-4 ring-bg-secondary">
            <Quote size={24} />
          </div>
          <p className="text-2xl font-bold tracking-tight text-text-main italic leading-relaxed">
            "I built Ushanj Flashcards because I was tired of generic 'productivity' apps that didn't understand the pressure 
            of competitive exams. I wanted a tool that cared as much about my revision as I did. No hype, just 
            effective learning."
          </p>
          <div>
            <h4 className="font-heading font-bold text-xl">Abhi</h4>
            <p className="text-text-secondary font-bold tracking-widest uppercase text-xs mt-1">Founder, Ushanj Flashcards</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border-main px-6 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-white font-heading font-bold text-[10px]">U</div>
            <span className="text-sm font-heading font-bold tracking-tight text-text-main">ushanj flashcards</span>
          </div>
          <p className="text-xs text-text-secondary font-medium">© 2026 Ushanj Flashcards Learning Platforms. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, desc: string }> = ({ icon, title, desc }) => (
  <div className="p-8 rounded-2xl border border-border-main bg-bg-card hover:border-accent/30 hover:shadow-xl transition-all duration-300 group">
    <div className="w-12 h-12 bg-bg-secondary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-accent/10 transition-all">
      {icon}
    </div>
    <h4 className="text-xl font-heading font-bold mb-3 tracking-tight text-text-main group-hover:text-accent transition-colors">{title}</h4>
    <p className="text-text-secondary font-medium leading-relaxed text-sm">{desc}</p>
  </div>
);

const UseCase: React.FC<{ title: string, desc: string, tags: string[] }> = ({ title, desc, tags }) => (
  <div className="p-8 bg-bg-card rounded-2xl border border-border-main space-y-6 hover:shadow-lg transition-all duration-300">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-white shadow-md shadow-accent/20"><GraduationCap size={20} /></div>
      <h4 className="text-xl font-heading font-bold tracking-tight text-text-main">{title}</h4>
    </div>
    <p className="font-medium text-text-secondary leading-relaxed text-sm">{desc}</p>
    <div className="flex flex-wrap gap-2 pt-2">
      {tags.map(t => <span key={t} className="px-3 py-1 bg-bg-secondary border border-border-main rounded-md text-[10px] font-bold uppercase tracking-wider text-text-secondary">{t}</span>)}
    </div>
  </div>
);

const WorkflowStep: React.FC<{ num: number, title: string, desc: string }> = ({ num, title, desc }) => (
  <div className="relative z-10 text-center space-y-4">
    <div className="w-12 h-12 bg-bg-card rounded-xl flex items-center justify-center text-accent font-heading font-bold text-xl mx-auto shadow-md border border-border-main mb-6">
      {num}
    </div>
    <h4 className="font-heading font-bold text-lg text-text-main">{title}</h4>
    <p className="text-sm text-text-secondary font-medium leading-relaxed px-4">{desc}</p>
  </div>
);
