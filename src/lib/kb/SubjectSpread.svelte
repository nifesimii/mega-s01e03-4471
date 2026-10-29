<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import { groupByCause, uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';

  let { ticket }: { ticket: number } = $props();

  const merged = $derived(uniqueById(reports as Report[]).filter((r) => r.mergedInto === ticket));
  const groups = $derived(groupByCause(merged, tenantOf));
  const repeats = $derived((reports as Report[]).length - uniqueById(reports as Report[]).length);
  // Decision 0001 merges on the subject line. How many subject lines show up under more than one cause?
  const spread = $derived.by(() => {
    const seen = new Map<string, Set<string>>();
    for (const g of groups) for (const r of g.reports) seen.set(r.subject, (seen.get(r.subject) ?? new Set()).add(g.cause));
    return { spanning: [...seen.values()].filter((s) => s.size > 1).length, total: seen.size };
  });
</script>

<p class="note">
  {repeats} rows in the export repeat an id; each report is counted once.
  {spread.spanning} of {spread.total} subject lines appear under more than one cause.
</p>

<style>
  .note { color: var(--muted); font-size: 0.85em; }
</style>
