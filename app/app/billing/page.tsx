import { Empty, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { fmtDate, money, titleCase } from "@/lib/format";

export default async function BillingPage() {
  const user = await requireUser();
  const payments = all<{ id: number; stream: string; amount_cents: number; description: string; created_at: string }>(
    "SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100",
    user.id,
  );
  const ytd = one<{ v: number }>(
    "SELECT COALESCE(SUM(amount_cents),0) AS v FROM payments WHERE user_id = ? AND created_at >= strftime('%Y-01-01','now','localtime')",
    user.id,
  )!.v;

  return (
    <>
      <PageHeader eyebrow="Billing" title="Payment history" description={`${money(ytd)} spent with us this year.`} />
      {payments.length ? (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Description</th><th>Type</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{fmtDate(p.created_at)}</td>
                  <td>{p.description}</td>
                  <td><span className="chip">{titleCase(p.stream)}</span></td>
                  <td className={`text-right font-mono ${p.amount_cents < 0 ? "text-ok" : ""}`}>{money(p.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No payments yet.</Empty>
      )}
      <p className="mt-6 text-xs text-dim">
        Payments are recorded but not charged in this build. Connect a payment provider (e.g. Stripe Billing for memberships,
        Checkout for one-off orders) in <code className="font-mono">app/actions</code> to take real payments.
      </p>
    </>
  );
}
