'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────

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
  kpis: { active: number; review: number; doneThisWeek: number; blocked: number };
  board: { backlog: Issue[]; inProgress: Issue[]; review: Issue[]; done: Issue[] };
  blockers: Issue[];
}

// ─── Agent config ────────────────────────────────────────

const AGENTS = [
  { name: 'Tarek',     codename: 'Forge',     emoji: '🔨' },
  { name: 'Layla',     codename: 'Canvas',    emoji: '🎨' },
  { name: 'Anvil',     codename: 'Anvil',     emoji: '⚒️' },
  { name: 'Blueprint', codename: 'Blueprint', emoji: '📐' },
  { name: 'Quill',     codename: 'Quill',     emoji: '✍️' },
  { name: 'Spark',     codename: 'Spark',     emoji: '⚡' },
  { name: 'Nadia',     codename: 'Radar',     emoji: '📡' },
  { name: 'Rami',      codename: 'Abacus',    emoji: '🧮' },
];

// ─── Helpers ─────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function priorityColor(p: number) {
  if (p === 1) return 'bg-red-500';
  if (p === 2) return 'bg-orange-500';
  if (p === 3) return 'bg-yellow-500';
  if (p === 4) return 'bg-blue-500';
  return 'bg-gray-600';
}

// ─── Components ──────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function TaskCard({ issue }: { issue: Issue }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:border-gray-600 transition-colors">
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${priorityColor(issue.priority)}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-100 font-medium leading-snug">{issue.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {issue.assignee && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-700 text-[10px] font-bold text-gray-300">
                {initials(issue.assignee.name)}
              </span>
            )}
            {issue.project && (
              <span className="text-[11px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                {issue.project.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardColumn({ title, issues, color }: { title: string; issues: Issue[]; color: string }) {
  return (
    <div className="flex-1 min-w-[220px]">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-3 h-3 rounded-full ${color}`} />
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</h3>
        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full ml-auto">
          {issues.length}
        </span>
      </div>
      <div className="space-y-2 max-h-[420px] overflow-y-auto">
        {issues.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">No tasks</p>
        )}
        {issues.map((issue) => (
          <TaskCard key={issue.identifier} issue={issue} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ agent, issues }: { agent: typeof AGENTS[number]; issues: Issue[] }) {
  const task = issues.find(
    (i) =>
      i.assignee?.name.toLowerCase() === agent.name.toLowerCase() &&
      i.state.type === 'started'
  );
  const hasTask = !!task;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{agent.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-gray-100 font-semibold">{agent.codename}</p>
            <span className={`w-2 h-2 rounded-full ${hasTask ? 'bg-green-500' : 'bg-gray-600'}`} />
          </div>
          {task ? (
            <>
              <p className="text-gray-400 text-xs mt-1 truncate">{task.title}</p>
              <p className="text-gray-600 text-[11px] mt-0.5">{timeAgo(task.updatedAt)}</p>
            </>
          ) : (
            <p className="text-gray-600 text-xs mt-1">Idle</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CommitRow({ commit }: { commit: Commit }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-800/50 last:border-0 text-sm">
      <code className="text-xs text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded shrink-0">
        {commit.sha}
      </code>
      <p className="text-gray-300 flex-1 truncate">{commit.message}</p>
      <span className="text-gray-600 text-xs shrink-0 hidden sm:inline">
        {commit.author}
      </span>
      <span className="text-gray-500 text-xs shrink-0 hidden sm:inline">&middot;</span>
      <span className="text-gray-500 text-xs shrink-0">{timeAgo(commit.date)}</span>
    </div>
  );
}

function BlockerCard({ issue }: { issue: Issue }) {
  return (
    <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <span className="mt-1 w-2 h-2 rounded-full bg-red-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-300 font-medium">{issue.title}</p>
          <div className="flex items-center gap-2 mt-1">
            {issue.assignee && (
              <span className="text-xs text-red-400/70">{issue.assignee.name}</span>
            )}
            {issue.project && (
              <span className="text-[11px] bg-red-900/30 text-red-400/70 px-1.5 py-0.5 rounded">
                {issue.project.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [linear, setLinear] = useState<LinearData | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('ops_authed') !== 'true') {
      router.replace('/');
    }
  }, [router]);

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
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const allIssues = linear
    ? [
        ...linear.board.backlog,
        ...linear.board.inProgress,
        ...linear.board.review,
        ...linear.board.done,
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐟</span>
            <h1 className="text-xl font-bold">Mantaray Ops</h1>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-gray-500 hidden sm:inline">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-green-900/30 text-green-400 border border-green-800/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={fetchData}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 transition-colors"
            >
              ↻
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <section>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Active Tasks" value={linear?.kpis.active ?? 0} color="text-blue-400" />
                <KpiCard label="In Review" value={linear?.kpis.review ?? 0} color="text-yellow-400" />
                <KpiCard label="Done This Week" value={linear?.kpis.doneThisWeek ?? 0} color="text-green-400" />
                <KpiCard
                  label="Blockers"
                  value={linear?.kpis.blocked ?? 0}
                  color={(linear?.kpis.blocked ?? 0) > 0 ? 'text-red-400' : 'text-gray-600'}
                />
              </div>
            </section>

            {/* Task Board */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Task Board
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <BoardColumn title="Backlog" issues={linear?.board.backlog ?? []} color="bg-gray-600" />
                <BoardColumn title="In Progress" issues={linear?.board.inProgress ?? []} color="bg-blue-500" />
                <BoardColumn title="Review" issues={linear?.board.review ?? []} color="bg-yellow-500" />
                <BoardColumn title="Done" issues={linear?.board.done ?? []} color="bg-green-500" />
              </div>
            </section>

            {/* Agent Status Grid */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Agent Status
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {AGENTS.map((agent) => (
                  <AgentCard key={agent.codename} agent={agent} issues={allIssues} />
                ))}
              </div>
            </section>

            {/* Recent Commits */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Recent Commits
              </h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                {commits.length > 0 ? (
                  commits.map((c, i) => <CommitRow key={`${c.sha}-${i}`} commit={c} />)
                ) : (
                  <p className="text-gray-600 text-sm text-center py-6">No recent commits</p>
                )}
              </div>
            </section>

            {/* Blockers */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Blockers
              </h2>
              {(linear?.blockers?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  {linear!.blockers.map((issue) => (
                    <BlockerCard key={issue.identifier} issue={issue} />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
                  <p className="text-gray-400">✅ No blockers</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
