import sys
import glob

def replace_in_file(filename, search, replace):
    with open(filename, 'r') as f:
        content = f.read()
    if search in content:
        content = content.replace(search, replace)
        with open(filename, 'w') as f:
            f.write(content)

# Fix openActivityService.integration.test.ts
f = 'tests/integration/services/openActivityService.integration.test.ts'
replace_in_file(f, "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';", "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';\nimport { IMaterialEngineService } from '@/services/IMaterialEngineService';")
replace_in_file(f, "  const mockWreEngine = {", "  const mockMreNoOp: IMaterialEngineService = { resolveMaterialRecommendation: vi.fn() as any };\n\n  const mockWreEngine = {")
replace_in_file(f, "workforceEngine: mockWreEngine,\n  });", "workforceEngine: mockWreEngine,\n    materialEngine: mockMreNoOp,\n  });")

# Fix openActivityTreIntegration.integration.test.ts
f = 'tests/integration/services/openActivityTreIntegration.integration.test.ts'
replace_in_file(f, "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';", "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';\nimport { IMaterialEngineService } from '@/services/IMaterialEngineService';")
replace_in_file(f, "  const mockWreEngine = {", "  const mockMreNoOp: IMaterialEngineService = { resolveMaterialRecommendation: vi.fn() as any };\n\n  const mockWreEngine = {")
replace_in_file(f, "workforceEngine: mockWreEngine,\n    });", "workforceEngine: mockWreEngine,\n      materialEngine: mockMreNoOp,\n    });")

# Fix openActivityWreIntegration.integration.test.ts
f = 'tests/integration/services/openActivityWreIntegration.integration.test.ts'
replace_in_file(f, "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';", "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';\nimport { IMaterialEngineService } from '@/services/IMaterialEngineService';")
replace_in_file(f, "  const mockTreEngine = {", "  const mockMreNoOp: IMaterialEngineService = { resolveMaterialRecommendation: vi.fn() as any };\n\n  const mockTreEngine = {")
replace_in_file(f, "workforceEngine: mockWre,\n    });", "workforceEngine: mockWre,\n      materialEngine: mockMreNoOp,\n    });")

# Fix OpenActivityService.test.ts
f = 'tests/unit/services/OpenActivityService.test.ts'
replace_in_file(f, "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';", "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';\nimport { IMaterialEngineService } from '@/services/IMaterialEngineService';")
replace_in_file(f, "  const mockTreNoOp: ITreEngineService = {", "  const mockMreNoOp: IMaterialEngineService = { resolveMaterialRecommendation: vi.fn() as any };\n\n  const mockTreNoOp: ITreEngineService = {")
replace_in_file(f, "workforceEngine?: IWorkforceEngineService", "workforceEngine?: IWorkforceEngineService, materialEngine?: IMaterialEngineService")
replace_in_file(f, "workforceEngine: overrides.workforceEngine ?? mockWreNoOp,\n    })", "workforceEngine: overrides.workforceEngine ?? mockWreNoOp,\n      materialEngine: overrides.materialEngine ?? mockMreNoOp,\n    })")
replace_in_file(f, "treEngine: mockTreNoOp,\n      workforceEngine: mockWreNoOp,", "treEngine: mockTreNoOp,\n      workforceEngine: mockWreNoOp,\n      materialEngine: mockMreNoOp,")

