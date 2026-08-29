import glob

def fix():
    for f in glob.glob('tests/**/*.ts', recursive=True):
        with open(f, 'r') as file:
            c = file.read()
            
        modified = False
        
        # 1. Add recommend: vi.fn(),
        new_c = c.replace(
            "resolveMaterialRecommendation: vi.fn() as any",
            "recommend: vi.fn() as any,\n    resolveMaterialRecommendation: vi.fn() as any"
        )
        if new_c != c:
            c = new_c
            modified = True
            
        new_c = c.replace(
            "resolveMaterialRecommendation: vi.fn(),",
            "recommend: vi.fn(),\n    resolveMaterialRecommendation: vi.fn(),"
        )
        if new_c != c:
            c = new_c
            modified = True
            
        # 2. Add vi import if not exists
        if "import { vi }" not in c and "import { describe, it, expect, vi }" not in c:
            c = "import { vi } from 'vitest';\n" + c
            modified = True
            
        # 3. Add materialEngine to openActivityWreIntegration
        if 'workforceEngine: mockWreEngine,' in c and 'materialEngine' not in c:
            c = c.replace("workforceEngine: mockWreEngine,", "workforceEngine: mockWreEngine,\n      materialEngine: mockMreNoOp,")
            modified = True

        # 4. Remove duplicate materialEngine in unit tests
        if 'materialEngine: overrides?.materialEngine ?? mockMreNoOp,\n        materialEngine: overrides?.materialEngine ?? mockMreNoOp,' in c:
            c = c.replace(
                "materialEngine: overrides?.materialEngine ?? mockMreNoOp,\n        materialEngine: overrides?.materialEngine ?? mockMreNoOp,",
                "materialEngine: overrides?.materialEngine ?? mockMreNoOp,"
            )
            modified = True
            
        if 'mockMreNoOp' in c and 'workforceEngine: mockWre,' in c:
             c = c.replace("workforceEngine: mockWre,", "workforceEngine: mockWre,\n      materialEngine: mockMreNoOp,")
             modified = True
             
        if 'mockMreNoOp' in c and 'workforceEngine: mockWreNoOp,' in c and 'materialEngine' not in c[c.find('workforceEngine: mockWreNoOp,'):c.find('workforceEngine: mockWreNoOp,')+200]:
             c = c.replace("workforceEngine: mockWreNoOp,\n    });", "workforceEngine: mockWreNoOp,\n      materialEngine: mockMreNoOp,\n    });")
             modified = True


        if modified:
            with open(f, 'w') as file:
                file.write(c)

fix()
