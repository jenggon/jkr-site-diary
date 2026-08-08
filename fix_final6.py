import glob

def fix():
    for f in glob.glob('tests/**/*.ts', recursive=True):
        with open(f, 'r') as file:
            c = file.read()
            
        modified = False
        
        # 1. Add mockMreNoOp if not exists
        mock_mre = """
  const mockMreNoOp: IMaterialEngineService = {
    recommend: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
    resolveMaterialRecommendation: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
  } as unknown as IMaterialEngineService;
"""
        if 'import { OpenActivityService }' in c and 'IMaterialEngineService' not in c:
            c = c.replace("import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';", "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';\nimport { IMaterialEngineService } from '@/services/IMaterialEngineService';")
            if "import { vi }" not in c and "import { describe, it, expect, vi }" not in c:
                c = "import { vi } from 'vitest';\n" + c
                
            if 'const mockWreNoOp' in c:
                c = c.replace('const mockWreNoOp', mock_mre.strip() + '\n  const mockWreNoOp')
            elif 'const mockWreEngine' in c:
                c = c.replace('const mockWreEngine', mock_mre.strip() + '\n  const mockWreEngine')
            elif 'const mockTreEngine' in c:
                c = c.replace('const mockTreEngine', mock_mre.strip() + '\n  const mockTreEngine')
            modified = True

        # 2. Add materialEngine to all new OpenActivityService calls
        import re
        # Find all occurrences of new OpenActivityService({ ... })
        # We will use regex to find `new OpenActivityService({` and then find the closing `})`
        
        def replacer(match):
            inner = match.group(1)
            if 'materialEngine:' not in inner:
                return 'new OpenActivityService({' + inner + 'materialEngine: mockMreNoOp,\n'
            return match.group(0)

        # Non-greedy match until `});` or `})`
        # We need to be careful about nested objects, so we just add it after workforceEngine
        
        new_c = re.sub(r'(workforceEngine:\s*[^,}]+,?)(?!\s*materialEngine)', r'\1\n      materialEngine: mockMreNoOp,', c)
        # Fix the override one properly
        new_c = new_c.replace(
            "workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,\n      materialEngine: mockMreNoOp,",
            "workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,\n      materialEngine: overrides?.materialEngine ?? mockMreNoOp,"
        )
        
        if new_c != c:
            c = new_c
            modified = True
            
        # Fix signature of createService
        if 'workforceEngine?: IWorkforceEngineService' in c and 'materialEngine?: IMaterialEngineService' not in c:
            c = c.replace('workforceEngine?: IWorkforceEngineService', 'workforceEngine?: IWorkforceEngineService,\n      materialEngine?: IMaterialEngineService')
            modified = True

        if modified:
            with open(f, 'w') as file:
                file.write(c)

fix()
