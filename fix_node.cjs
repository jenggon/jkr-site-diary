const fs = require('fs');

const mockMre = `
  const mockMreNoOp: IMaterialEngineService = {
    recommend: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
    resolveMaterialRecommendation: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
  } as unknown as IMaterialEngineService;
`;

const importMre = `import { IMaterialEngineService } from '@/services/IMaterialEngineService';\n`;
const importVi = `import { vi } from 'vitest';\n`;

function fixFile(file) {
    let content = fs.readFileSync(file, 'utf8');

    if (!content.includes('IMaterialEngineService')) {
        content = content.replace("import { IWorkforceEngineService }", importMre + "import { IWorkforceEngineService }");
    }
    if (!content.includes('import { vi }') && !content.includes('import { describe, it, expect, vi }')) {
        content = importVi + content;
    }

    if (!content.includes('mockMreNoOp')) {
        if (content.includes('const mockWreNoOp')) {
            content = content.replace('const mockWreNoOp', mockMre + '\n  const mockWreNoOp');
        } else if (content.includes('const mockWreEngine')) {
            content = content.replace('const mockWreEngine', mockMre + '\n  const mockWreEngine');
        } else if (content.includes('const mockTreEngine')) {
            content = content.replace('const mockTreEngine', mockMre + '\n  const mockTreEngine');
        }
    }

    // Fix createService in unit tests
    if (file.includes('OpenActivityService.test.ts')) {
        content = content.replace('workforceEngine?: IWorkforceEngineService;', 'workforceEngine?: IWorkforceEngineService;\n    materialEngine?: IMaterialEngineService;');
        content = content.replace('workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,', 'workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,\n      materialEngine: overrides?.materialEngine ?? mockMreNoOp,');
    }

    // Fix all other direct instantiations
    // new OpenActivityService({ ... workforceEngine: something, ... })
    const regex = /(workforceEngine:\s*[^,}]+)(,\n\s*\})/g;
    content = content.replace(regex, '$1,\n        materialEngine: mockMreNoOp$2');
    
    // Sometimes it's without trailing comma
    const regex2 = /(workforceEngine:\s*[^,}]+)(\n\s*\})/g;
    content = content.replace(regex2, '$1,\n        materialEngine: mockMreNoOp$2');

    // specifically in openActivityWreIntegration
    if (file.includes('openActivityWreIntegration')) {
        content = content.replace('workforceEngine: mockWre,\n    });', 'workforceEngine: mockWre,\n      materialEngine: mockMreNoOp,\n    });');
        content = content.replace('workforceEngine: mockWreEngine,\n  });', 'workforceEngine: mockWreEngine,\n      materialEngine: mockMreNoOp,\n  });');
    }
    
    // specifically in openActivityService
    if (file.includes('openActivityService.integration')) {
         content = content.replace('workforceEngine: mockWreEngine,\n  });', 'workforceEngine: mockWreEngine,\n      materialEngine: mockMreNoOp,\n  });');
    }
    
    // specifically in openActivityTreIntegration
    if (file.includes('openActivityTreIntegration')) {
         content = content.replace('workforceEngine: mockWreEngine,\n    });', 'workforceEngine: mockWreEngine,\n      materialEngine: mockMreNoOp,\n    });');
    }

    fs.writeFileSync(file, content, 'utf8');
}

fixFile('tests/integration/services/openActivityService.integration.test.ts');
fixFile('tests/integration/services/openActivityTreIntegration.integration.test.ts');
fixFile('tests/integration/services/openActivityWreIntegration.integration.test.ts');
fixFile('tests/unit/services/OpenActivityService.test.ts');
