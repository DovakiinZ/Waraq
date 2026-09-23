/**
 * Keep-alive ping for the Supabase project.
 *
 * Supabase free-tier projects pause after 7 days with no activity, which has
 * already taken this backend down once and broke both the web portal and the
 * Flutter app. A daily cron hit against PostgREST counts as activity.
 *
 * Wired up in vercel.json under "crons". Set CRON_SECRET in the Vercel project
 * to reject anything other than Vercel's own scheduler.
 */
export default async function handler(req: any, res: any) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers?.authorization || req.headers?.Authorization;
        if (auth !== `Bearer ${secret}`) {
            return res.status(401).json({ ok: false, error: 'Unauthorized' });
        }
    }

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        return res.status(500).json({
            ok: false,
            error: 'SUPABASE_URL / SUPABASE_ANON_KEY are not set on this deployment',
        });
    }

    try {
        // Cheapest real query we can make: one row from a small public table.
        const response = await fetch(`${url}/rest/v1/stages?select=id&limit=1`, {
            headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
            },
        });

        if (!response.ok) {
            const body = await response.text();
            return res.status(502).json({
                ok: false,
                status: response.status,
                error: body.slice(0, 300),
            });
        }

        return res.status(200).json({ ok: true, pingedAt: new Date().toISOString() });
    } catch (error: any) {
        return res.status(502).json({ ok: false, error: String(error?.message || error) });
    }
}
