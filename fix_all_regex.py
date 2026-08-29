import re

def fix_all():
    files = [
        'tests/unit/services/OpenActivityService.test.ts',
        'tests/integration/services/openActivityWreIntegration.integration.test.ts',
        'tests/integration/services/openActivityService.integration.test.ts',
        'tests/integration/services/openActivityTreIntegration.integration.test.ts'
    ]
    for f in files:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Add import if missing
        if 'IMaterialEngineService' not in content:
            content = content.replace("import { IWorkforceEngineService }", "import { IMaterialEngineService } from '@/services/IMaterialEngineService';\nimport { IWorkforceEngineService }")

        # Add mock if missing
        if 'mockMreNoOp' not in content:
            content = content.replace("const mockWreNoOp", """const mockMreNoOp: IMaterialEngineService = {
  recommend: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
  resolveMaterialRecommendation: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
} as unknown as IMaterialEngineService;

const mockWreNoOp""")
        
        # Add vi to vitest import
        if 'import { vi ' not in content and 'import { describe, it, expect, vi' not in content:
            content = content.replace("import { describe, it, expect } from 'vitest';", "import { describe, it, expect, vi } from 'vitest';")
            content = content.replace("import { describe, it, expect, beforeEach } from 'vitest';", "import { describe, it, expect, beforeEach, vi } from 'vitest';")
        
        # Fix all places where workforceEngine is a property in an object literal, optionally followed by logger or something else, but right before the closing brace or a logger line
        content = re.sub(
            r'workforceEngine:([^\n]+),\n',
            r'workforceEngine:\1,\n      materialEngine: mockMreNoOp,\n',
            content
        )
        content = re.sub(
            r'workforceEngine,\n',
            r'workforceEngine,\n      materialEngine: mockMreNoOp,\n',
            content
        )
        # Note: This regex might duplicate materialEngine if it runs multiple times, so let's clean it up first:
        content = re.sub(r'materialEngine: mockMreNoOp,\n\s*materialEngine: mockMreNoOp,\n', r'materialEngine: mockMreNoOp,\n', content)
        content = re.sub(r'materialEngine: mockMreNoOp,\n\s*materialEngine: mockMreNoOp,\n', r'materialEngine: mockMreNoOp,\n', content)
        content = re.sub(r'materialEngine: mockMreNoOp,\n\s*materialEngine: mockMreNoOp,\n', r'materialEngine: mockMreNoOp,\n', content)
        
        # Also fix the createService type definition in OpenActivityService.test.ts
        content = re.sub(
            r'workforceEngine\?: IWorkforceEngineService;\n',
            r'workforceEngine?: IWorkforceEngineService;\n      materialEngine?: IMaterialEngineService;\n',
            content
        )
        # deduplicate type
        content = re.sub(r'materialEngine\?: IMaterialEngineService;\n\s*materialEngine\?: IMaterialEngineService;\n', r'materialEngine?: IMaterialEngineService;\n', content)
        
        # Fix the createService overrides inside OpenActivityService.test.ts
        content = re.sub(
            r'materialEngine: mockMreNoOp,\n\s*logger: overrides\?\.logger \?\? mockLogger,',
            r'materialEngine: overrides?.materialEngine ?? mockMreNoOp,\n      logger: overrides?.logger ?? mockLogger,',
            content
        )
        
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)

fix_all()
