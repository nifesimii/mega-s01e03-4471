// Splits the reports merged into one ticket by the problem they describe.
// causes.ts says which of `parser` and `hint` a report belongs to. It cannot see a one-day move:
// the desk reads those by hand (desk-notes.json, `oneDayMove`), so that list decides them.
import { causeOf, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'one-day' | 'unplaced';

export function problemOf(r: Pick<Report, 'id' | 'channel'>, t: Tenant | undefined, oneDay: readonly string[]): Problem {
  if (oneDay.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
};

export function splitByProblem(reports: Report[], tenantOf: (r: Report) => Tenant | undefined, oneDay: readonly string[]): ProblemGroup[] {
  const by = new Map<Problem, Report[]>();
  for (const r of reports) {
    const p = problemOf(r, tenantOf(r), oneDay);
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  return [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
        tenants: new Set(rs.map((r) => r.tenant)).size,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}

// A subject line is what decision 0001 merges on. How many subjects show up under more than one problem?
export function subjectSpread(groups: ProblemGroup[]): { spanning: number; total: number } {
  const seen = new Map<string, Set<Problem>>();
  for (const g of groups) for (const r of g.reports) seen.set(r.subject, (seen.get(r.subject) ?? new Set()).add(g.problem));
  return { spanning: [...seen.values()].filter((s) => s.size > 1).length, total: seen.size };
}
