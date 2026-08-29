import sys
import glob

def fix_integration():
    files = [
        'tests/integration/services/openActivityService.integration.test.ts',
        'tests/integration/services/openActivityTreIntegration.integration.test.ts',
        'tests/integration/services/openActivityWreIntegration.integration.test.ts',
        'tests/unit/services/OpenActivityService.test.ts'
    ]
    
    for filename in files:
        with open(filename, 'r') as f:
            content = f.read()

        if 'mockMreNoOp' not in content:
            # Need to define mockMreNoOp and import it
            content = content.replace(
                "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';",
                "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';\nimport { IMaterialEngineService } from '@/services/IMaterialEngineService';"
            )
            mock_mre = '''\n  const mockMreNoOp: IMaterialEngineService = {
    resolveMaterialRecommendation: vi.fn(),
  } as unknown as IMaterialEngineService;\n'''
            
            # Find a good place to inject mockMreNoOp
            if 'const mockWreNoOp' in content:
                content = content.replace('const mockWreNoOp', mock_mre + '\n  const mockWreNoOp')

        # Fix constructor injection
        content = content.replace(
            "workforceEngine: mockWreNoOp,\n    });",
            "workforceEngine: mockWreNoOp,\n      materialEngine: mockMreNoOp,\n    });"
        )
        content = content.replace(
            "workforceEngine: mockWreNoOp,\n      });",
            "workforceEngine: mockWreNoOp,\n        materialEngine: mockMreNoOp,\n      });"
        )
        content = content.replace(
            "workforceEngine: mockWreNoOp,\n        });",
            "workforceEngine: mockWreNoOp,\n          materialEngine: mockMreNoOp,\n        });"
        )
        content = content.replace(
            "workforceEngine: mockWre,\n    });",
            "workforceEngine: mockWre,\n      materialEngine: mockMreNoOp,\n    });"
        )

        with open(filename, 'w') as f:
            f.write(content)

fix_integration()
