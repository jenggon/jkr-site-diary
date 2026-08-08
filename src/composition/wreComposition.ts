import { MspWorkforceRepository } from '@/repositories/MspWorkforceRepository';
import { TradeWorkforceLibraryRepository } from '@/repositories/TradeWorkforceLibraryRepository';
import { WorkforceRuleRepository } from '@/repositories/WorkforceRuleRepository';
import { WorkforceEvaluatorRegistry } from '@/services/evaluators/WorkforceEvaluatorRegistry';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';
import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';
import { WorkforceEngineService } from '@/services/WorkforceEngineService';
import { SafetyWorkforceEvaluator } from '@/services/evaluators/disciplines/SafetyWorkforceEvaluator';
import { MechanicalWorkforceEvaluator } from '@/services/evaluators/disciplines/MechanicalWorkforceEvaluator';
import { ElectricalWorkforceEvaluator } from '@/services/evaluators/disciplines/ElectricalWorkforceEvaluator';
import { CivilWorkforceEvaluator } from '@/services/evaluators/disciplines/CivilWorkforceEvaluator';
import { StructuralWorkforceEvaluator } from '@/services/evaluators/disciplines/StructuralWorkforceEvaluator';
import { RoadWorkforceEvaluator } from '@/services/evaluators/disciplines/RoadWorkforceEvaluator';
import { BridgeWorkforceEvaluator } from '@/services/evaluators/disciplines/BridgeWorkforceEvaluator';
import { TunnelWorkforceEvaluator } from '@/services/evaluators/disciplines/TunnelWorkforceEvaluator';
import { MarineWorkforceEvaluator } from '@/services/evaluators/disciplines/MarineWorkforceEvaluator';

export function createWorkforceEvaluatorRegistry(ruleRepo: WorkforceRuleRepository): WorkforceEvaluatorRegistry {
  const registry = new WorkforceEvaluatorRegistry();
  
  registry.register(new SafetyWorkforceEvaluator(ruleRepo));
  registry.register(new MechanicalWorkforceEvaluator(ruleRepo));
  registry.register(new ElectricalWorkforceEvaluator(ruleRepo));
  registry.register(new CivilWorkforceEvaluator(ruleRepo));
  registry.register(new StructuralWorkforceEvaluator(ruleRepo));
  registry.register(new RoadWorkforceEvaluator(ruleRepo));
  registry.register(new BridgeWorkforceEvaluator(ruleRepo));
  registry.register(new TunnelWorkforceEvaluator(ruleRepo));
  registry.register(new MarineWorkforceEvaluator(ruleRepo));

  return registry;
}

export function createWorkforceEngineService(): IWorkforceEngineService {
  const mspRepo = new MspWorkforceRepository();
  const tradeLibRepo = new TradeWorkforceLibraryRepository();
  const ruleRepo = new WorkforceRuleRepository();
  const registry = createWorkforceEvaluatorRegistry(ruleRepo);
  const clock = new SystemClock();

  return new WorkforceEngineService({
    mspWorkforceRepository: mspRepo,
    tradeWorkforceLibraryRepository: tradeLibRepo,
    workforceRuleRepository: ruleRepo,
    evaluatorRegistry: registry,
    clock,
    logger,
  });
}
