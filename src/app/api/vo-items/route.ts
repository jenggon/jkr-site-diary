import { NextResponse } from 'next/server';
import { z } from 'zod';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { getSupabaseAuthenticatedClient } from '@/lib/supabase';
import { generateUuid } from '@/lib/uuid';

const createVoItemSchema = z.object({
  programmeId: z.string().uuid(),
  revisionId: z.string().uuid(),
  voReference: z.string().trim().min(1),
  lineItem: z.string().trim().min(1),
  description: z.string().trim().optional(),
  isOmission: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  const identity = await extractVerifiedIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const programmeId = url.searchParams.get('programmeId');
  const revisionId = url.searchParams.get('revisionId');
  if (!programmeId || !revisionId) {
    return NextResponse.json({ error: 'programmeId and revisionId are required' }, { status: 400 });
  }

  const client = getSupabaseAuthenticatedClient(identity.accessToken);
  const { data, error } = await client
    .from('vo_item')
    .select('vo_item_id,programme_id,revision_id,vo_reference,line_item,description,is_omission,created_by,created_at')
    .eq('programme_id', programmeId)
    .eq('revision_id', revisionId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const identity = await extractVerifiedIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createVoItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors.map(e => e.message).join(', ') }, { status: 400 });
  }

  const client = getSupabaseAuthenticatedClient(identity.accessToken);
  const { data, error } = await client.rpc('f1_create_vo_item_atomic', {
    p_programme_id: parsed.data.programmeId,
    p_revision_id: parsed.data.revisionId,
    p_vo_reference: parsed.data.voReference,
    p_line_item: parsed.data.lineItem,
    p_description: parsed.data.description ?? '',
    p_is_omission: parsed.data.isOmission,
    p_actor_id: identity.actorId,
    p_vo_item_id: generateUuid(),
  });

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
