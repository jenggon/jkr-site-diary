const fs = require('fs');

function patch(file) {
    let content = fs.readFileSync(file, 'utf8');

    if (!content.includes('IMaterialEngineService')) {
        content = content.replace(
            "import { IWorkforceEngineService }",
            "import { IMaterialEngineService } from '@/services/IMaterialEngineService';\nimport { IWorkforceEngineService }"
        );
    }

    if (!content.includes('mockMreNoOp')) {
        content = content.replace(
            "const mockWreNoOp",
            "const mockMreNoOp: IMaterialEngineService = {\n" +
            "  recommend: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,\n" +
            "  resolveMaterialRecommendation: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any,\n" +
            "} as unknown as IMaterialEngineService;\n\n" +
            "const mockWreNoOp"
        );
    }

    // signature for createService
    content = content.replace(
        "workforceEngine?: IWorkforceEngineService;\n    logger?: Logger;",
        "workforceEngine?: IWorkforceEngineService;\n    materialEngine?: IMaterialEngineService;\n    logger?: Logger;"
    );

    // in createService
    content = content.replace(
        "workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,\n    });",
        "workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,\n      materialEngine: overrides?.materialEngine ?? mockMreNoOp,\n    });"
    );

    // everywhere else where mockWreNoOp is used
    content = content.replace(/workforceEngine: mockWreNoOp,/g, "workforceEngine: mockWreNoOp,\n      materialEngine: mockMreNoOp,");

    // everywhere else where workforceEngine is passed directly
    content = content.replace(/workforceEngine,\n    \}\);/g, "workforceEngine,\n      materialEngine: mockMreNoOp,\n    });");
    content = content.replace(/workforceEngine: mockWre,\n      logger,\n    \}\);/g, "workforceEngine: mockWre,\n      materialEngine: mockMreNoOp,\n      logger,\n    });");

    fs.writeFileSync(file, content, 'utf8');
}

patch('tests/unit/services/OpenActivityService.test.ts');
patch('tests/integration/services/openActivityWreIntegration.integration.test.ts');
patch('tests/integration/services/openActivityService.integration.test.ts');
patch('tests/integration/services/openActivityTreIntegration.integration.test.ts');

