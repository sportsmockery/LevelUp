'use client';

import { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { Calendar, Clock, Dumbbell, Brain, Target, CheckCircle2, Circle, ChevronRight, Flame } from 'lucide-react';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const todayPlan = [
  {
    time: '3:30 PM',
    title: 'Pre-Practice Mobility',
    duration: '15 min',
    type: 'warmup',
    icon: Dumbbell,
    completed: true,
    drills: ['Hip circles x20', 'Band pull-aparts x15', 'Sprawl series x10'],
  },
  {
    time: '4:00 PM',
    title: 'Team Practice',
    duration: '90 min',
    type: 'practice',
    icon: Target,
    completed: false,
    drills: ['Focus: Level changes from yesterday\'s analysis', 'Partner drill: Snap-go series'],
  },
  {
    time: '5:30 PM',
    title: 'AI Drill Circuit',
    duration: '20 min',
    type: 'ai-drills',
    icon: Brain,
    completed: false,
    drills: ['10x Chain wrestling shots', '5x30s Sprawl + shot reaction', '3x8 Tight-waist tilts from top'],
  },
  {
    time: '6:00 PM',
    title: 'Film Review',
    duration: '15 min',
    type: 'review',
    icon: Brain,
    completed: false,
    drills: ['Review today\'s live wrestling clips', 'Tag key moments for AI analysis'],
  },
];

const weeklyGoals = [
  { goal: 'Upload 3 match videos', progress: 1, total: 3 },
  { goal: 'Complete all AI drill circuits', progress: 4, total: 6 },
  { goal: 'Hit 85+ average tech score', progress: 82, total: 85, isScore: true },
  { goal: 'Maintain 7-day streak', progress: 7, total: 7 },
];

const upcomingEvents = [
  { name: 'Dual Meet vs Lincoln', date: 'Feb 15', daysAway: 3, type: 'competition' },
  { name: 'State Qualifier', date: 'Feb 22', daysAway: 10, type: 'tournament' },
  { name: 'State Championships', date: 'Mar 1', daysAway: 17, type: 'championship' },
];

export default function PlanPage() {
  const [selectedDay, setSelectedDay] = useState(3); // Thursday
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set([0]));

  const toggleComplete = (index: number) => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-2xl font-heading tracking-tight">Training Plan</h1>
        <p className="text-zinc-400 text-sm mt-1">AI-optimized for your goals</p>
      </div>

      {/* Week Selector */}
      <div className="flex gap-2 px-6 pt-4 overflow-x-auto">
        {weekDays.map((day, i) => (
          <button
            key={day}
            onClick={() => setSelectedDay(i)}
            className={`flex flex-col items-center min-w-[48px] py-2.5 px-3 rounded-2xl transition-colors ${
              selectedDay === i
                ? 'bg-[#2563EB] text-white'
                : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            <span className="text-[10px] font-medium">{day}</span>
            <span className="text-lg font-heading mt-0.5">{10 + i}</span>
          </button>
        ))}
      </div>

      <div className="p-6 space-y-6">
        {/* Today's Schedule */}
        <div>
          <p className="text-sm font-medium text-zinc-400 mb-3">TODAY&apos;S SCHEDULE</p>
          <div className="space-y-3">
            {todayPlan.map((item, i) => {
              const isCompleted = completedItems.has(i);
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className={`bg-zinc-900 rounded-2xl p-4 border transition-colors cursor-pointer ${
                    isCompleted ? 'border-green-500/30 opacity-70' : 'border-zinc-800'
                  }`}
                  onClick={() => toggleComplete(i)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        item.type === 'ai-drills'
                          ? 'bg-[#E91E8C]/20'
                          : item.type === 'practice'
                          ? 'bg-[#2563EB]/20'
                          : 'bg-zinc-800'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          item.type === 'ai-drills'
                            ? 'text-[#E91E8C]'
                            : item.type === 'practice'
                            ? 'text-[#2563EB]'
                            : 'text-zinc-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span className="text-zinc-400 text-xs">{item.time} &bull; {item.duration}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {item.drills.map((drill, j) => (
                            <p key={j} className="text-xs text-zinc-500 flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                              {drill}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2">
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-zinc-600" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Goals */}
        <div>
          <p className="text-sm font-medium text-zinc-400 mb-3">WEEKLY GOALS</p>
          <div className="bg-zinc-900 rounded-3xl p-5 space-y-4">
            {weeklyGoals.map((g, i) => {
              const pct = g.isScore
                ? Math.min((g.progress / g.total) * 100, 100)
                : Math.min((g.progress / g.total) * 100, 100);
              const done = g.progress >= g.total;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className={done ? 'text-green-400' : ''}>{g.goal}</span>
                    <span className="text-zinc-400 text-xs">
                      {g.isScore ? `${g.progress}/${g.total}` : `${g.progress}/${g.total}`}
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        done ? 'bg-green-400' : 'bg-gradient-to-r from-[#2563EB] to-[#E91E8C]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        <div>
          <p className="text-sm font-medium text-zinc-400 mb-3">UPCOMING</p>
          <div className="space-y-3">
            {upcomingEvents.map((event, i) => (
              <div key={i} className="bg-zinc-900 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    event.type === 'championship'
                      ? 'bg-yellow-500/20'
                      : event.type === 'tournament'
                      ? 'bg-[#E91E8C]/20'
                      : 'bg-[#2563EB]/20'
                  }`}>
                    <Calendar className={`w-5 h-5 ${
                      event.type === 'championship'
                        ? 'text-yellow-400'
                        : event.type === 'tournament'
                        ? 'text-[#E91E8C]'
                        : 'text-[#2563EB]'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{event.name}</p>
                    <p className="text-zinc-400 text-xs">{event.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-zinc-800 px-3 py-1 rounded-full">
                    <span className="text-xs font-medium">{event.daysAway}d</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
