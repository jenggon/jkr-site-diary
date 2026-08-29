import { IMspWorkforceRepository, MspWorkforceResourceRecord } from './IMspWorkforceRepository';

export class MspWorkforceRepository implements IMspWorkforceRepository {
  public async findWorkforceByMspTask(
    _programmeId: string,
    _mspTaskId: string
  ): Promise<readonly MspWorkforceResourceRecord[] | null> {
    // DEV-027 placeholder implementation.
    // In a real application, this would query the MSP integration database tables.
    // We return null to simulate a miss so it falls through to lower priorities.
    return null;
  }
}
