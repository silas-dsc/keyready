/** Trigger a Knock workflow for one recipient, identifying them inline (no prior user sync needed). */
export async function triggerKnock(
  workflow: string,
  recipient: { id: string; email: string; name: string },
  data: Record<string, unknown>,
  cancellationKey?: string,
): Promise<string> {
  const key = Deno.env.get('KNOCK_SECRET_API_KEY');
  if (!key) throw new Error('KNOCK_SECRET_API_KEY not set');
  const res = await fetch(`https://api.knock.app/v1/workflows/${workflow}/trigger`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipients: [recipient], data, cancellation_key: cancellationKey }),
  });
  if (!res.ok) throw new Error(`Knock ${workflow}: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { workflow_run_id: string }).workflow_run_id;
}
