import { KnowledgeEngineService } from '@/services/KnowledgeEngineService';
import { IKnowledgeEngineService } from '@/services/IKnowledgeEngineService';
import { KnowledgeRuleRepository } from '@/repositories/KnowledgeRuleRepository';
import { RuleEvaluatorRegistry } from '@/services/evaluators/RuleEvaluatorRegistry';
import { TaskRuleEvaluator } from '@/services/evaluators/TaskRuleEvaluator';
import { BuildingTypeRuleEvaluator } from '@/services/evaluators/BuildingTypeRuleEvaluator';
import { DisciplineRuleEvaluator } from '@/services/evaluators/DisciplineRuleEvaluator';
import { HistoryRuleEvaluator } from '@/services/evaluators/HistoryRuleEvaluator';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';

/**
 * Composition Root factory for Knowledge Recommendation Engine (KRE) service.
 * Instantiates KnowledgeEngineService using explicit constructor dependency injection.
 * Creates zero global singleton instances.
 */
export function createKnowledgeEngineService(): IKnowledgeEngineService {
  const ruleRepo = new KnowledgeRuleRepository();
  const registry = new RuleEvaluatorRegistry();

  registry.register(new TaskRuleEvaluator());
  registry.register(new BuildingTypeRuleEvaluator());
  registry.register(new DisciplineRuleEvaluator());
  registry.register(new HistoryRuleEvaluator());

  const clock = new SystemClock();

  return new KnowledgeEngineService({
    ruleRepository: ruleRepo,
    evaluatorRegistry: registry,
    clock,
    logger,
  });
}
