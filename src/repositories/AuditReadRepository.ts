import type { SupabaseClient } from '@supabase/supabase-js';
import type { Audit, AuditEventType } from '@/types/audit';

export class AuditReadRepository {
  public constructor(private readonly client: SupabaseClient) {}

  public async getById(auditId: string): Promise<Audit | null> {
    const { data, error } = await this.client
      .from('audit')
      .select('*')
      .eq('audit_id', auditId)
      .maybeSingle();

    if (error) throw new Error(`Failed to get audit log by ID: ${error.message}`);
    return data as Audit | null;
  }

  public async getByProgramme(programmeId: string): Promise<Audit[]> {
    const { data, error } = await this.client
      .from('audit')
      .select('*')
      .eq('programme_id', programmeId)
      .order('event_timestamp', { ascending: false });

    if (error) throw new Error(`Failed to get audit logs by programme: ${error.message}`);
    return (data ?? []) as Audit[];
  }

  public async getByEntity(entityName: string, entityId: string): Promise<Audit[]> {
    const { data, error } = await this.client
      .from('audit')
      .select('*')
      .eq('entity_name', entityName)
      .eq('entity_id', entityId)
      .order('event_timestamp', { ascending: false });

    if (error) throw new Error(`Failed to get audit logs by entity: ${error.message}`);
    return (data ?? []) as Audit[];
  }

  public async getByUser(userId: string): Promise<Audit[]> {
    const { data, error } = await this.client
      .from('audit')
      .select('*')
      .eq('performed_by', userId)
      .order('event_timestamp', { ascending: false });

    if (error) throw new Error(`Failed to get audit logs by user: ${error.message}`);
    return (data ?? []) as Audit[];
  }

  public async getByEventType(eventType: AuditEventType): Promise<Audit[]> {
    const { data, error } = await this.client
      .from('audit')
      .select('*')
      .eq('event_type', eventType)
      .order('event_timestamp', { ascending: false });

    if (error) throw new Error(`Failed to get audit logs by event type: ${error.message}`);
    return (data ?? []) as Audit[];
  }
}
