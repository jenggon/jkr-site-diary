const fs = require('fs');

let file = 'tests/unit/services/OpenActivityService.test.ts';
let c = fs.readFileSync(file, 'utf8');

const importMre = `import { IMaterialEngineService } from '@/services/IMaterialEngineService';\n`;

const mockMre = `
  const mockMreNoOp: IMaterialEngineService = {
    recommend: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
    resolveMaterialRecommendation: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,
  } as unknown as IMaterialEngineService;
`;

if (!c.includes('IMaterialEngineService')) {
    c = c.replace("import { IWorkforceEngineService }", importMre + "import { IWorkforceEngineService }");
}

if (!c.includes('mockMreNoOp')) {
    c = c.replace('const mockWreNoOp', mockMre.trim() + '\n\n  const mockWreNoOp');
}

c = c.replace(
    'workforceEngine?: IWorkforceEngineService;',
    'workforceEngine?: IWorkforceEngineService;\n      materialEngine?: IMaterialEngineService;'
);

c = c.replace(
    'workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,\n    });',
    'workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,\n      materialEngine: overrides?.materialEngine ?? mockMreNoOp,\n    });'
);

c = c.replace(
    'workforceEngine: mockWreNoOp,\n    });',
    'workforceEngine: mockWreNoOp,\n      materialEngine: mockMreNoOp,\n    });'
);
c = c.replace(
    'workforceEngine: mockWreNoOp,\n    });',
    'workforceEngine: mockWreNoOp,\n      materialEngine: mockMreNoOp,\n    });'
);
c = c.replace(
    'workforceEngine: mockWreNoOp,\n    });',
    'workforceEngine: mockWreNoOp,\n      materialEngine: mockMreNoOp,\n    });'
);

// wait we just need a global replace for that block
c = c.replace(/workforceEngine: mockWreNoOp,\n    \}\);/g, 'workforceEngine: mockWreNoOp,\n      materialEngine: mockMreNoOp,\n    });');

fs.writeFileSync(file, c, 'utf8');
