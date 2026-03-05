import { NextResponse } from 'next/server';

const LINEAR_API_KEY = process.env.LINEAR_API_KEY!;
const LINEAR_TEAM_ID = process.env.LINEAR_TEAM_ID!;

async function linearQuery(query: string) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: LINEAR_API_KEY,
    },
    body: JSON.stringify({ query }),
    next: { revalidate: 30 },
  });
  return res.json();
}

export async function GET() {
  try {
    const data = await linearQuery(`{
      team(id: "${LINEAR_TEAM_ID}") {
        issues(first: 100, filter: { state: { type: { nin: ["canceled"] } } }) {
          nodes {
            identifier
            title
            state { name type }
            assignee { name }
            project { name }
            priority
            labels { nodes { name color } }
            createdAt
            updatedAt
            completedAt
          }
        }
      }
    }`);

    const issues = data?.data?.team?.issues?.nodes || [];

    const backlog = issues.filter((i: any) => i.state.type === 'unstarted');
    const inProgress = issues.filter(
      (i: any) =>
        i.state.type === 'started' &&
        !i.state.name.toLowerCase().includes('review')
    );
    const review = issues.filter(
      (i: any) =>
        i.state.name.toLowerCase().includes('review') ||
        (i.state.type === 'started' && i.labels?.nodes?.some((l: any) => l.name.toLowerCase().includes('review')))
    );
    const done = issues.filter((i: any) => i.state.type === 'completed');

    // KPIs
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const doneThisWeek = done.filter(
      (i: any) => new Date(i.completedAt) > weekAgo
    ).length;
    const blocked = issues.filter(
      (i: any) =>
        i.labels?.nodes?.some((l: any) => l.name.toLowerCase().includes('block')) ||
        (i.priority === 1 && i.state.type !== 'completed')
    );

    return NextResponse.json({
      issues,
      kpis: {
        active: inProgress.length,
        review: review.length,
        doneThisWeek,
        blocked: blocked.length,
      },
      board: {
        backlog,
        inProgress,
        review,
        done: done.slice(0, 20),
      },
      blockers: blocked,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Linear data' }, { status: 500 });
  }
}
