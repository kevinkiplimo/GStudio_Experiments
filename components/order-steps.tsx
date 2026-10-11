import { titleCase } from "@/lib/format";
import { ORDER_STATUSES } from "@/lib/studio";

export function OrderSteps({ status }: { status: string }) {
  const idx = ORDER_STATUSES.indexOf(status as (typeof ORDER_STATUSES)[number]);
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Status: ${titleCase(status)}`}>
      {ORDER_STATUSES.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col gap-1.5">
          <span className={`h-1 rounded-full ${i <= idx ? (idx === 3 ? "bg-ok" : "bg-coral") : "bg-raised"}`} />
          <span className={`font-mono text-[9px] uppercase tracking-widest ${i === idx ? "text-ink" : "text-dim"}`}>
            {titleCase(s)}
          </span>
        </li>
      ))}
    </ol>
  );
}
