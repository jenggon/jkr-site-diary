import sys

def fix_all():
    f = 'tests/integration/services/openActivityTreIntegration.integration.test.ts'
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if 'const mockMreNoOp' not in content:
        content = content.replace("import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';", """import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';

const mockMreNoOp: IMaterialEngineService = {
  recommend: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
  resolveMaterialRecommendation: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
} as unknown as IMaterialEngineService;
""")
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

fix_all()
