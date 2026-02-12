'use client';

import { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import {
  Users, UserPlus, Trophy, TrendingUp, Video, Mail,
  ChevronRight, Shield, BarChart3, Settings, Search,
  Copy, CheckCircle, Star,
} from 'lucide-react';

type Wrestler = {
  name: string;
  weightClass: string;
  level: number;
  avgScore: number;
  streak: number;
  videosThisWeek: number;
  trend: 'up' | 'down' | 'same';
};

const roster: Wrestler[] = [
  { name: 'Marcus J.', weightClass: '106', level: 8, avgScore: 72, streak: 12, videosThisWeek: 3, trend: 'up' },
  { name: 'Ethan W.', weightClass: '113', level: 15, avgScore: 88, streak: 21, videosThisWeek: 4, trend: 'up' },
  { name: 'Tyler S.', weightClass: '120', level: 6, avgScore: 65, streak: 3, videosThisWeek: 1, trend: 'down' },
  { name: 'Ryan K.', weightClass: '126', level: 12, avgScore: 84, streak: 7, videosThisWeek: 2, trend: 'up' },
  { name: 'Alex P.', weightClass: '132', level: 12, avgScore: 84, streak: 7, videosThisWeek: 3, trend: 'same' },
  { name: 'Sam R.', weightClass: '138', level: 10, avgScore: 78, streak: 5, videosThisWeek: 2, trend: 'up' },
  { name: 'Dylan T.', weightClass: '145', level: 14, avgScore: 86, streak: 15, videosThisWeek: 4, trend: 'up' },
  { name: 'Jake M.', weightClass: '152', level: 9, avgScore: 71, streak: 0, videosThisWeek: 0, trend: 'down' },
];

const announcements = [
  { title: 'Metro Duals Lineup Posted', date: 'Feb 10', type: 'tournament' },
  { title: 'Practice canceled Thursday (snow)', date: 'Feb 9', type: 'schedule' },
  { title: 'State qualifier weigh-in info', date: 'Feb 7', type: 'info' },
];

export default function ClubPage() {
  const [tab, setTab] = useState<'roster' | 'stats' | 'manage'>('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const clubCode = 'TITAN-2026';

  const filteredRoster = roster.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.weightClass.includes(searchQuery)
  );

  const handleCopyCode = () => {
    navigator.clipboard.writeText(clubCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const teamAvgScore = Math.round(roster.reduce((s, w) => s + w.avgScore, 0) / roster.length);
  const totalVideos = roster.reduce((s, w) => s + w.videosThisWeek, 0);
  const activeWrestlers = roster.filter(w => w.streak > 0).length;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#E91E8C] flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-heading">Titan Wrestling</h1>
              <p className="text-zinc-400 text-sm">{roster.length} wrestlers &bull; Est. 2024</p>
            </div>
          </div>
          <button className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Settings className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Club Code */}
        <button
          onClick={handleCopyCode}
          className="mt-4 w-full bg-zinc-900 rounded-2xl p-3 flex items-center justify-between border border-zinc-800"
        >
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-xs">CLUB CODE:</span>
            <span className="font-heading text-sm tracking-widest">{clubCode}</span>
          </div>
          {copied ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        {/* Team Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-zinc-900 rounded-2xl p-3 text-center">
            <div className="text-xl font-heading">{teamAvgScore}</div>
            <div className="text-zinc-500 text-[10px]">TEAM AVG</div>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-3 text-center">
            <div className="text-xl font-heading">{totalVideos}</div>
            <div className="text-zinc-500 text-[10px]">VIDEOS/WK</div>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-3 text-center">
            <div className="text-xl font-heading">{activeWrestlers}/{roster.length}</div>
            <div className="text-zinc-500 text-[10px]">ACTIVE</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 pt-4">
        {(['roster', 'stats', 'manage'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-2xl text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-[#2563EB] text-white' : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Roster Tab */}
        {tab === 'roster' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or weight..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#2563EB] focus:outline-none transition-colors"
              />
            </div>

            {/* Wrestler Cards */}
            <div className="space-y-2">
              {filteredRoster.map((w, i) => (
                <div key={i} className="bg-zinc-900 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2563EB] to-[#E91E8C] flex items-center justify-center">
                        <div className="w-9 h-9 rounded-full bg-[#0A0A0A] flex items-center justify-center text-xs font-heading font-bold">
                          {w.level}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{w.name}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>{w.weightClass} lbs</span>
                        <span>&bull;</span>
                        <span>Score: {w.avgScore}</span>
                        {w.streak > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className="text-orange-400">🔥 {w.streak}d</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Video className="w-3 h-3 text-zinc-500" />
                      <span className="text-xs text-zinc-400">{w.videosThisWeek}</span>
                    </div>
                    {w.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
                    {w.trend === 'down' && <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Wrestler */}
            <button className="w-full bg-zinc-900 rounded-2xl p-4 flex items-center justify-center gap-2 border border-dashed border-zinc-700 text-zinc-400 hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">
              <UserPlus className="w-5 h-5" />
              <span className="text-sm font-medium">Invite Wrestler</span>
            </button>
          </div>
        )}

        {/* Stats Tab */}
        {tab === 'stats' && (
          <div className="space-y-5">
            {/* Leaderboard */}
            <div className="bg-zinc-900 rounded-3xl p-5">
              <p className="text-sm font-medium mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" /> TEAM LEADERBOARD
              </p>
              <div className="space-y-3">
                {[...roster].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5).map((w, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        i === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                        i === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-zinc-800 text-zinc-500'
                      }`}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{w.name}</p>
                        <p className="text-zinc-500 text-xs">{w.weightClass} lbs &bull; Lvl {w.level}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-lg">{w.avgScore}</span>
                      {i < 3 && <Star className="w-4 h-4 text-yellow-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Engagement */}
            <div className="bg-zinc-900 rounded-3xl p-5">
              <p className="text-sm font-medium mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#2563EB]" /> ENGAGEMENT THIS WEEK
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-zinc-400 text-xs mb-1">TOTAL UPLOADS</div>
                  <div className="text-2xl font-heading">{totalVideos}</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-xs mb-1">AVG STREAK</div>
                  <div className="text-2xl font-heading">
                    {Math.round(roster.reduce((s, w) => s + w.streak, 0) / roster.length)}d
                  </div>
                </div>
                <div>
                  <div className="text-zinc-400 text-xs mb-1">MOST IMPROVED</div>
                  <div className="text-lg font-heading text-green-400">Ethan W.</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-xs mb-1">NEEDS ATTENTION</div>
                  <div className="text-lg font-heading text-red-400">Jake M.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manage Tab */}
        {tab === 'manage' && (
          <div className="space-y-5">
            {/* Announcements */}
            <div>
              <p className="text-sm font-medium text-zinc-400 mb-3">ANNOUNCEMENTS</p>
              <div className="space-y-2">
                {announcements.map((a, i) => (
                  <div key={i} className="bg-zinc-900 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        a.type === 'tournament' ? 'bg-[#E91E8C]' :
                        a.type === 'schedule' ? 'bg-yellow-400' : 'bg-[#2563EB]'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-zinc-500 text-xs">{a.date}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </div>
                ))}
              </div>
              <button className="w-full mt-3 bg-zinc-900 rounded-2xl p-4 flex items-center justify-center gap-2 border border-dashed border-zinc-700 text-zinc-400 hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">New Announcement</span>
              </button>
            </div>

            {/* Admin Actions */}
            <div>
              <p className="text-sm font-medium text-zinc-400 mb-3">ADMIN</p>
              <div className="space-y-2">
                {[
                  { label: 'Tournament Hosting', icon: Trophy, desc: 'Create & manage brackets' },
                  { label: 'Parent Communications', icon: Users, desc: 'Send updates to families' },
                  { label: 'Auto Results Sync', icon: BarChart3, desc: 'Import from TrackWrestling' },
                  { label: 'Club Settings', icon: Settings, desc: 'Logo, colors, billing' },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={i}
                      className="w-full bg-zinc-900 rounded-2xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-zinc-500 text-xs">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
