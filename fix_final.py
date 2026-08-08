import glob
import re

def fix():
    for f in glob.glob('tests/**/*.ts', recursive=True):
        with open(f, 'r') as file:
            c = file.read()
            
        modified = False
        
        # 1. Ensure IMaterialEngineService is imported
        if 'import { OpenActivityService }' in c and 'IMaterialEngineService' not in c:
            c = re.sub(
                r"(import \{ IWorkforceEngineService \} from '@/services/IWorkforceEngineService';)",
                r"\1\nimport { IMaterialEngineService } from '@/services/IMaterialEngineService';",
                c
            )
            mock_mre = '''\n  const mockMreNoOp: IMaterialEngineService = {
    resolveMaterialRecommendation: vi.fn(),
  } as unknown as IMaterialEngineService;\n'''
            
            if 'const mockWreNoOp' in c:
                c = c.replace('const mockWreNoOp', mock_mre + '\n  const mockWreNoOp')
            elif 'const mockTreNoOp' in c:
                c = c.replace('const mockTreNoOp', mock_mre + '\n  const mockTreNoOp')
            elif 'const mockWreEngine' in c:
                c = c.replace('const mockWreEngine', mock_mre + '\n  const mockWreEngine')
            modified = True

        # 2. Add materialEngine to constructor injections
        new_c = re.sub(
            r"(workforceEngine:\s*[^,}]+)(,\s*\})",
            r"\1,\n        materialEngine: mockMreNoOp\2",
            c
        )
        if new_c != c:
            c = new_c
            modified = True
            
        new_c = re.sub(
            r"(workforceEngine:\s*[^,}]+)(,\n\s*\})",
            r"\1,\n        materialEngine: mockMreNoOp\2",
            c
        )
        if new_c != c:
            c = new_c
            modified = True
            
        # specifically fix the one with overrides
        new_c = c.replace(
            "workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,",
            "workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,\n        materialEngine: overrides?.materialEngine ?? mockMreNoOp,"
        )
        if new_c != c:
            c = new_c
            modified = True

        if modified:
            with open(f, 'w') as file:
                file.write(c)

fix()
