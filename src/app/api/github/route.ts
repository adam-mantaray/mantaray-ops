import { NextResponse } from 'next/server';

const REPOS = [
  'adam-mantaray/budgetly',
  'adam-mantaray/pulse',
  'adam-mantaray/mantaray-hub',
];

async function getCommits(repo: string) {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const res = await fetch(
      `https://api.github.com/repos/${repo}/commits?per_page=20`,
      { headers, next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const commits = await res.json();
    return commits.map((c: any) => ({
      sha: c.sha?.slice(0, 7),
      message: c.commit?.message?.split('\n')[0]?.slice(0, 80),
      author: c.commit?.author?.name,
      date: c.commit?.author?.date,
      repo: repo.split('/')[1],
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const allCommits = await Promise.all(REPOS.map(getCommits));
    const commits = allCommits
      .flat()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    return NextResponse.json({ commits });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch GitHub data' }, { status: 500 });
  }
}
