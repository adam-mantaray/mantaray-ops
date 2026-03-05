'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Agent config ────────────────────────────────────────────────────────────

const AGENTS = [
  { name: 'Tarek',  codename: 'Forge',     emoji: '🔨' },
  { name: 'Layla',  codename: 'Canvas',    emoji: '🎨' },
  { name: 'Anvil',  codename: 'Anvil',     emoji: '⚒️' },
  { name: 'Blueprint', codename: 'Blueprint', emoji: '📐' },
  { name: 'Quill',  codename: 'Quill',     emoji: '✍️' },
  { name: 'Spark',  codename: 'Spark',     emoji: '⚡' },
  { name: 'Nadia',  codename: 'Radar',     emoji: '📡' },
  { name: 'Rami',   codename: 'Abacus',    emoji: '🧮' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function priorityBadge(p: number) {
  if (p === 1) return { bg: 'bg-red-500/20',    text: 'text-red-400',    dot: 'bg-red-500',    label: 'Urgent' };
  if (p === 2) return { bg: 'bg-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-500', label: 'High' };
  if (p === 3) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-500', label: 'Medium' };
  if (p === 4) return { bg: 'bg-blue-500/20',   text: 'text-blue-400',   dot: 'bg-blue-400',   label: 'Low' };
  return         { bg: 'bg-gray-700/40',         text: 'text-gray-500',   dot: 'bg-gray-600',   label: '' };
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-4 rounded-full bg-[#2563EB]" />
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
        {children}
      </h2>
    </div>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: string;
}) {
  return (
    <div
      className="
        relative overflow-hidden
        bg-[#0a0f1e] border border-gray-800/60 rounded-2xl p-5
        hover:border-gray-700 transition-all duration-300
        hover:translate-y-[-2px] hover:shadow-lg hover:shadow-black/30
        animate-fade-in-up
      "
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-px ${accent}`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
            {label}
          </p>
          <p className={`text-4xl font-bold tabular-nums ${accent.replace('bg-', 'text-').replace('/60', '').replace('/20', '')}`}>
            {value}
          </p>
        </div>
        <span className="text-2xl opacity-40">{icon}</span>
      </div>
    </div>
  );
}

// ─── Task card ───────────────────────────────────────────────────────────────

function TaskCard({ issue }: { issue: Issue }) {
  const pri = priorityBadge(issue.priority);
  return (
    <div
      className="
        group bg-[#0a0f1e]/80 border border-gray-800/50 rounded-xl p-3
        hover:border-[rgba(37,99,235,0.35)] hover:bg-[#0a0f1e]
        transition-all duration-200 cursor-default
      "
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${pri.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-gray-200 font-medium leading-snug group-hover:text-white transition-colors">
            {issue.title}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {issue.assignee && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#2563EB]/20 border border-[rgba(37,99,235,0.3)] text-[10px] font-bold text-blue-300">
                {initials(issue.assignee.name)}
              </span>
            )}
            {issue.project && (
              <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700/50">
                {issue.project.name}
              </span>
            )}
            <span className="text-[10px] text-gray-600 ml-auto">
              {timeAgo(issue.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Board column ────────────────────────────────────────────────────────────

function BoardColumn({
  title,
  issues,
  accentClass,
}: {
  title: string;
  issues: Issue[];
  accentClass: string;
}) {
  return (
    <div className="flex-1 min-w-[200px] animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-800/60">
        <span className={`w-2.5 h-2.5 rounded-full ${accentClass}`} />
        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
          {title}
        </h3>
        <span className="ml-auto text-[11px] font-semibold bg-gray-800/80 text-gray-500 px-2 py-0.5 rounded-full border border-gray-700/50">
          {issues.length}
        </span>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-0.5">
        {issues.length === 0 ? (
          <p className="text-gray-700 text-sm text-center py-10">—</p>
        ) : (
          issues.map((issue) => (
            <TaskCard key={issue.identifier} issue={issue} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Agent card ──────────────────────────────────────────────────────────────

type AgentStatus = 'active' | 'idle' | 'blocked';

function AgentCard({
  agent,
  issues,
}: {
  agent: typeof AGENTS[number];
  issues: Issue[];
}) {
  const activeTask = issues.find(
    (i) =>
      i.assignee?.name.toLowerCase() === agent.name.toLowerCase() &&
      i.state.type === 'started',
  );
  const blockedTask = issues.find(
    (i) =>
      i.assignee?.name.toLowerCase() === agent.name.toLowerCase() &&
      i.priority === 1 &&
      i.state.type !== 'completed',
  );

  const status: AgentStatus = activeTask ? 'active' : blockedTask ? 'blocked' : 'idle';

  const statusConfig = {
    active:  { dot: 'bg-green-500',  label: 'Active',  text: 'text-green-400',  pulse: true },
    idle:    { dot: 'bg-gray-600',   label: 'Idle',    text: 'text-gray-500',   pulse: false },
    blocked: { dot: 'bg-red-500',    label: 'Blocked', text: 'text-red-400',    pulse: false },
  }[status];

  const currentTask = activeTask || blockedTask;

  return (
    <div
      className={`
        relative bg-[#0a0f1e] border rounded-2xl p-4
        transition-all duration-300
        hover:translate-y-[-2px] hover:shadow-lg hover:shadow-black/30
        animate-fade-in-up
        ${status === 'active'
          ? 'border-[rgba(37,99,235,0.3)] hover:border-[rgba(37,99,235,0.5)]'
          : status === 'blocked'
          ? 'border-red-900/40 hover:border-red-800/60'
          : 'border-gray-800/60 hover:border-gray-700'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl border border-gray-700/50">
            {agent.emoji}
          </div>
          {/* Status dot */}
          <span className="absolute -bottom-0.5 -right-0.5">
            <span className={`status-dot ${status === 'active' ? 'active' : ''}`}>
              <span className={`block w-3 h-3 rounded-full border-2 border-[#0a0f1e] ${statusConfig.dot}`} />
            </span>
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[14px] font-semibold text-gray-100">{agent.codename}</p>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>
          {currentTask ? (
            <>
              <p className="text-[12px] text-gray-400 mt-1 leading-snug line-clamp-2">
                {currentTask.title}
              </p>
              <p className="text-[11px] text-gray-600 mt-1">{timeAgo(currentTask.updatedAt)}</p>
            </>
          ) : (
            <p className="text-[12px] text-gray-600 mt-1">No active task</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Commit row ──────────────────────────────────────────────────────────────

function CommitRow({ commit }: { commit: Commit }) {
  return (
    <div className="group flex items-center gap-3 py-3 border-b border-gray-800/40 last:border-0">
      <code className="text-[11px] text-[#3B82F6] font-mono bg-[rgba(37,99,235,0.1)] border border-[rgba(37,99,235,0.2)] px-2 py-0.5 rounded-lg shrink-0 group-hover:bg-[rgba(37,99,235,0.18)] transition-colors">
        {commit.sha}
      </code>
      <p className="text-[13px] text-gray-400 flex-1 truncate group-hover:text-gray-300 transition-colors">
        {commit.message}
      </p>
      <span className="text-[11px] text-gray-600 shrink-0 hidden sm:inline font-medium">
        {commit.author}
      </span>
      <span className="text-gray-700 shrink-0 hidden sm:inline">·</span>
      <span className="text-[11px] text-gray-600 shrink-0 whitespace-nowrap">
        {timeAgo(commit.date)}
      </span>
    </div>
  );
}

// ─── Blocker card ────────────────────────────────────────────────────────────

function BlockerCard({ issue }: { issue: Issue }) {
  return (
    <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 hover:border-red-800/60 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-red-900/40 border border-red-800/40 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-red-400 text-sm">⚠</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-red-300 font-semibold leading-snug">{issue.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {issue.assignee && (
              <span className="text-[11px] text-red-400/60 font-medium">{issue.assignee.name}</span>
            )}
            {issue.project && (
              <span className="text-[10px] bg-red-900/30 border border-red-800/30 text-red-400/60 px-2 py-0.5 rounded-full">
                {issue.project.name}
              </span>
            )}
            <span className="text-[11px] text-red-500/40 ml-auto">{timeAgo(issue.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────

function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPI skeletons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      {/* Board skeleton */}
      <div>
        <SkeletonCard className="h-4 w-24 mb-4 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
      {/* Agent skeletons */}
      <div>
        <SkeletonCard className="h-4 w-28 mb-4 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard page ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [linear, setLinear] = useState<LinearData | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('ops_authed') !== 'true') {
      router.replace('/');
    }
  }, [router]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData]);

  const allIssues = linear
    ? [...linear.board.backlog, ...linear.board.inProgress, ...linear.board.review, ...linear.board.done]
    : [];

  const blockedCount = linear?.kpis.blocked ?? 0;

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-[#030712]/90 backdrop-blur-xl border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-base shadow-lg shadow-blue-900/40">
              🐟
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[13px] font-bold text-white tracking-tight">Mantaray</span>
              <span className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Ops</span>
            </div>
          </div>

          {/* Center — refresh indicator */}
          <div className="flex-1 flex justify-center">
            {refreshing && (
              <div className="flex items-center gap-2 text-[11px] text-gray-500 animate-fade-in">
                <div className="w-3 h-3 border border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                Refreshing…
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {lastRefresh && (
              <span className="text-[11px] text-gray-600 hidden md:inline">
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => setAutoRefresh((a) => !a)}
              className={`
                text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200
                ${autoRefresh
                  ? 'bg-[rgba(37,99,235,0.15)] text-blue-400 border-[rgba(37,99,235,0.35)] hover:bg-[rgba(37,99,235,0.22)]'
                  : 'bg-gray-900 text-gray-500 border-gray-800 hover:border-gray-700'
                }
              `}
            >
              Auto {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => fetchData(true)}
              className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-all duration-200 flex items-center justify-center text-sm"
            >
              ↻
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* KPIs */}
            <section className="animate-fade-in-up section-delay-0">
              <SectionHeader>Sprint Overview</SectionHeader>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
                <KpiCard label="Active"        value={linear?.kpis.active ?? 0}       accent="bg-[#2563EB]/60" icon="⚡" />
                <KpiCard label="In Review"     value={linear?.kpis.review ?? 0}       accent="bg-yellow-500/60" icon="👁" />
                <KpiCard label="Done This Week" value={linear?.kpis.doneThisWeek ?? 0} accent="bg-green-500/60"  icon="✓" />
                <KpiCard
                  label="Blockers"
                  value={blockedCount}
                  accent={blockedCount > 0 ? 'bg-red-500/60' : 'bg-gray-700/60'}
                  icon="⚠"
                />
              </div>
            </section>

            {/* Task Board */}
            <section className="animate-fade-in-up section-delay-1">
              <SectionHeader>Task Board</SectionHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 stagger">
                <BoardColumn title="Backlog"     issues={linear?.board.backlog ?? []}     accentClass="bg-gray-600" />
                <BoardColumn title="In Progress" issues={linear?.board.inProgress ?? []}  accentClass="bg-[#2563EB]" />
                <BoardColumn title="Review"      issues={linear?.board.review ?? []}      accentClass="bg-yellow-500" />
                <BoardColumn title="Done"        issues={linear?.board.done ?? []}        accentClass="bg-green-500" />
              </div>
            </section>

            {/* Agent Status */}
            <section className="animate-fade-in-up section-delay-2">
              <SectionHeader>Agent Status</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger">
                {AGENTS.map((agent) => (
                  <AgentCard key={agent.codename} agent={agent} issues={allIssues} />
                ))}
              </div>
            </section>

            {/* Recent Commits */}
            <section className="animate-fade-in-up section-delay-3">
              <SectionHeader>Recent Commits</SectionHeader>
              <div className="bg-[#0a0f1e] border border-gray-800/60 rounded-2xl px-5 py-1">
                {commits.length > 0 ? (
                  commits.map((c, i) => <CommitRow key={`${c.sha}-${i}`} commit={c} />)
                ) : (
                  <p className="text-gray-700 text-sm text-center py-8">No recent commits</p>
                )}
              </div>
            </section>

            {/* Blockers */}
            <section className="animate-fade-in-up section-delay-4">
              <SectionHeader>Blockers</SectionHeader>
              {blockedCount > 0 ? (
                <div className="space-y-2">
                  {linear!.blockers.map((issue) => (
                    <BlockerCard key={issue.identifier} issue={issue} />
                  ))}
                </div>
              ) : (
                <div className="bg-[#0a0f1e] border border-gray-800/60 rounded-2xl p-6 flex items-center justify-center gap-2">
                  <span className="text-green-400 text-lg">✓</span>
                  <p className="text-gray-500 text-sm font-medium">No blockers — clear to ship</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
