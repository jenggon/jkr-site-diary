import sys

def patch_file(filepath, imports, mock, di_type, di_impl, extra_di_impl=[]):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'IMaterialEngineService' not in content:
        content = content.replace("import { IWorkforceEngineService }", "import { IMaterialEngineService } from '@/services/IMaterialEngineService';\nimport { IWorkforceEngineService }")

    if 'mockMreNoOp' not in content:
        content = content.replace("const mockWreNoOp", """const mockMreNoOp: IMaterialEngineService = {
    recommend: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
    resolveMaterialRecommendation: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
  } as unknown as IMaterialEngineService;

  const mockWreNoOp""")

    if di_type and 'materialEngine?:' not in content:
        content = content.replace(di_type[0], di_type[1])

    for e in di_impl:
        content = content.replace(e[0], e[1])

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)


# 1. OpenActivityService.test.ts
patch_file(
    'tests/unit/services/OpenActivityService.test.ts',
    [],
    [],
    ['workforceEngine?: IWorkforceEngineService;\n    logger?: Logger;', 'workforceEngine?: IWorkforceEngineService;\n    materialEngine?: IMaterialEngineService;\n    logger?: Logger;'],
    [
        ['workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,\n      });', 'workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,\n        materialEngine: overrides?.materialEngine ?? mockMreNoOp,\n      });'],
        ['workforceEngine: mockWreNoOp,\n      });', 'workforceEngine: mockWreNoOp,\n        materialEngine: mockMreNoOp,\n      });'],
        ['workforceEngine: mockWre,\n      logger,\n    });', 'workforceEngine: mockWre,\n      materialEngine: mockMreNoOp,\n      logger,\n    });']
    ]
)

# 2. openActivityWreIntegration.integration.test.ts
patch_file(
    'tests/integration/services/openActivityWreIntegration.integration.test.ts',
    [],
    [],
    None,
    [
        ['      workforceEngine,\n    });', '      workforceEngine,\n      materialEngine: mockMreNoOp,\n    });']
    ]
)

# 3. openActivityService.integration.test.ts
patch_file(
    'tests/integration/services/openActivityService.integration.test.ts',
    [],
    [],
    None,
    [
        ['      workforceEngine: mockWreNoOp,\n    });', '      workforceEngine: mockWreNoOp,\n      materialEngine: mockMreNoOp,\n    });']
    ]
)

# 4. openActivityTreIntegration.integration.test.ts
patch_file(
    'tests/integration/services/openActivityTreIntegration.integration.test.ts',
    [],
    [],
    None,
    [
        ['      workforceEngine: mockWreNoOp,\n    });', '      workforceEngine: mockWreNoOp,\n      materialEngine: mockMreNoOp,\n    });']
    ]
)

