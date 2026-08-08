import sys
import re

def fix_all():
    files = [
        'tests/integration/services/openActivityWreIntegration.integration.test.ts',
        'tests/integration/services/openActivityService.integration.test.ts',
        'tests/integration/services/openActivityTreIntegration.integration.test.ts'
    ]
    for f in files:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        
        if 'const mockMreNoOp' not in content:
            content = content.replace("describe(", """const mockMreNoOp: IMaterialEngineService = {
  recommend: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
  resolveMaterialRecommendation: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
} as unknown as IMaterialEngineService;

describe(""", 1)
        
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)

fix_all()
