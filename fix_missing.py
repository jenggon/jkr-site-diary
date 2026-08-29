import sys

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # in integration tests, they do: workforceEngine: workforceEngine (or mockWreNoOp)
    content = content.replace(
        "workforceEngine,\n    });",
        "workforceEngine,\n      materialEngine: mockMreNoOp,\n    });"
    )
    content = content.replace(
        "workforceEngine: mockWreNoOp,\n    });",
        "workforceEngine: mockWreNoOp,\n      materialEngine: mockMreNoOp,\n    });"
    )
    content = content.replace(
        "workforceEngine: mockWreNoOp,\n      });",
        "workforceEngine: mockWreNoOp,\n        materialEngine: mockMreNoOp,\n      });"
    )
    
    # unit test direct calls inside tests
    content = content.replace(
        "workforceEngine: mockWreNoOp,\n      });",
        "workforceEngine: mockWreNoOp,\n        materialEngine: mockMreNoOp,\n      });"
    )
    # in unit test createService missing mockMreNoOp:
    content = content.replace(
        "workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,\n      });",
        "workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,\n        materialEngine: overrides?.materialEngine ?? mockMreNoOp,\n      });"
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

patch_file('tests/unit/services/OpenActivityService.test.ts')
patch_file('tests/integration/services/openActivityWreIntegration.integration.test.ts')
patch_file('tests/integration/services/openActivityService.integration.test.ts')
patch_file('tests/integration/services/openActivityTreIntegration.integration.test.ts')
