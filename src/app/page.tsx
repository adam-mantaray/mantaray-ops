'use client';

import { useState, useEffect, useCallback } from 'react';

// Types
interface Issue {
  identifier: string;
  title: string;
  state: { name: string; type: string };
  assignee: { name: string } | null;
  project: { name: string } | null;
  priority: number;
  labels: { nodes: { name: string; color: string }[] };
  updatedAt: string;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  repo: string;
}

interface LinearData {
  kpis: { active: number; backlog: number; done: number; doneThisWeek: number; blocked: number };
  board: { backlog: Issue[]; inProgress: Issue[]; done: Issue[]; blocked: Issue[] };
}

interface Agent {
  codename: string;
  role: string;
  emoji: string;
  status: 'active' | 'idle' | 'errored';
}

const AGENTS: Agent[] = [
  { codename: 'Forge', role: 'Full-Stack Builder', emoji: '🏗️', status: 'active' },
  { codename: 'Canvas', role: 'Builder / Design', emoji: '🎨', status: 'active' },
  { codename: 'Anvil', role: 'Full-Stack Builder', emoji: '🔨', status: 'idle' },
  { codename: 'Blueprint', role: 'Product Architect', emoji: '📐', status: 'errored' },
  { codename: 'Quill', role: 'Content Strategist', emoji: '📱', status: 'idle' },
  { codename: 'Spark', role: 'Ideas Manager', emoji: '💡', status: 'idle' },
  { codename: 'Radar', role: 'QA Engineer', emoji: '🔍', status: 'active' },
  { codename: 'Abacus', role: 'Financial Analyst', emoji: '📊', status: 'idle' },
];

// PIN Auth
function PinScreen({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      localStorage.setItem('ops_auth', 'true');
      onAuth();
    } else {
      setError('Wrong PIN');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-2xl border border-gray-800 w-80">
        <h1 className="text-2xl font-bold text-white mb-1 text-center">🐙 Mantaray Ops</h1>
        <p className="text-gray-500 text-sm text-center mb-6">Enter PIN to continue</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full bg-gray-800 text-white text-center text-2xl tracking-[0.5em] p-3 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
        <button type="submit" className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold transition-colors">
          Unlock
        </button>
      </form>
    </div>
  );
}

// Priority badge
function PriorityDot({ priority }: { priority: number }) {
  const colors: Record<number, string> = {
    0: 'bg-gray-600', 1: 'bg-red-500', 2: 'bg-orange-500', 3: 'bg-yellow-500', 4: 'bg-blue-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[priority] || 'bg-gray-600'}`} />;
}

// KPI Card
function KpiCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

// Task Card
function TaskCard({ issue }: { issue: Issue }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:border-gray-600 transition-colors">
      <div className="flex items-start gap-2">
        <PriorityDot priority={issue.priority} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">{issue.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{issue.identifier}</span>
            {issue.project && (
              <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{issue.project.name}</span>
            )}
          </div>
          {issue.assignee && (
            <p className="text-xs text-gray-400 mt-1">→ {issue.assignee.name}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Board Column
function BoardColumn({ title, issues, color }: { title: string; issues: Issue[]; color: string }) {
  return (
    <div className="flex-1 min-w-[250px]">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-3 h-3 rounded-full ${color}`} />
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</h3>
        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{issues.length}</span>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {issues.map((issue) => (
          <TaskCard key={issue.identifier} issue={issue} />
        ))}
        {issues.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-4">No tasks</p>
        )}
      </div>
    </div>
  );
}

// Agent Card
function AgentCard({ agent }: { agent: Agent }) {
  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-gray-500',
    errored: 'bg-red-500',
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{agent.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold">{agent.codename}</p>
            <span className={`w-2 h-2 rounded-full ${statusColors[agent.status]} animate-pulse`} />
          </div>
          <p className="text-gray-400 text-xs">{agent.role}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          agent.status === 'active' ? 'bg-green-500/10 text-green-400' :
          agent.status === 'errored' ? 'bg-red-500/10 text-red-400' :
          'bg-gray-500/10 text-gray-400'
        }`}>
          {agent.status}
        </span>
      </div>
    </div>
  );
}

// Commit Row
function CommitRow({ commit }: { commit: Commit }) {
  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800/50 last:border-0">
      <code className="text-xs text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded">{commit.sha}</code>
      <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{commit.repo}</span>
      <p className="text-sm text-gray-300 flex-1 truncate">{commit.message}</p>
      <span className="text-xs text-gray-500 whitespace-nowrap">{timeAgo(commit.date)}</span>
    </div>
  );
}

// Main Dashboard
export default function Dashboard() {
  const [authed, setAuthed] = useState(false);
  const [linear, setLinear] = useState<LinearData | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [linearRes, githubRes] = await Promise.all([
        fetch('/api/linear'),
        fetch('/api/github'),
      ]);
      const linearData = await linearRes.json();
      const githubData = await githubRes.json();
      setLinear(linearData);
      setCommits(githubData.commits || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('ops_auth') === 'true') setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [authed, fetchData]);

  if (!authed) return <PinScreen onAuth={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐙</span>
            <h1 className="text-xl font-bold">Mantaray Ops</h1>
          </div>
          <div className="flex items-center gap-4">
            {lastRefresh && (
              <span className="text-xs text-gray-500">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchData}
              className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="In Progress" value={linear?.kpis.active || 0} color="text-blue-400" />
                <KpiCard label="Backlog" value={linear?.kpis.backlog || 0} color="text-gray-300" />
                <KpiCard label="Done This Week" value={linear?.kpis.doneThisWeek || 0} color="text-green-400" />
                <KpiCard label="Blockers" value={linear?.kpis.blocked || 0} color={linear?.kpis.blocked ? 'text-red-400' : 'text-gray-600'} />
              </div>
            </section>

            {/* Task Board */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Task Board</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                <BoardColumn title="Backlog" issues={linear?.board.backlog || []} color="bg-gray-500" />
                <BoardColumn title="In Progress" issues={linear?.board.inProgress || []} color="bg-blue-500" />
                <BoardColumn title="Done" issues={linear?.board.done || []} color="bg-green-500" />
              </div>
            </section>

            {/* Agents */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Agents</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {AGENTS.map((agent) => (
                  <AgentCard key={agent.codename} agent={agent} />
                ))}
              </div>
            </section>

            {/* Recent Commits */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Commits</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                {commits.length > 0 ? (
                  commits.map((commit, i) => <CommitRow key={`${commit.sha}-${i}`} commit={commit} />)
                ) : (
                  <p className="text-gray-600 text-sm text-center py-4">No recent commits</p>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
