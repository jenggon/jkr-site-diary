import sys
import glob
import re

def process_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # Add IMaterialEngineService import
    content = re.sub(
        r"(import \{ IWorkforceEngineService \} from '@/services/IWorkforceEngineService';)",
        r"\1\nimport { IMaterialEngineService } from '@/services/IMaterialEngineService';",
        content
    )

    mock_mre = '''  const mockMreNoOp: IMaterialEngineService = {
    resolveMaterialRecommendation: vi.fn(),
  } as unknown as IMaterialEngineService;
'''

    if 'const mockWre' in content:
        content = re.sub(
            r"(const mockWre.*?)(as unknown as IWorkforceEngineService;)",
            r"\1\2\n\n" + mock_mre,
            content,
            flags=re.DOTALL
        )
    elif 'const mockTre' in content:
        content = re.sub(
            r"(const mockTre.*?\})",
            r"\1\n\n" + mock_mre,
            content,
            flags=re.DOTALL,
            count=1
        )

    # Now add materialEngine mapping to ALL new OpenActivityService instantiations
    content = re.sub(
        r"(workforceEngine:.*?)(,?\s*\})",
        r"\1,\n      materialEngine: mockMreNoOp\2",
        content
    )
    
    # Fix unit test function signature
    content = content.replace(
        "workforceEngine?: IWorkforceEngineService",
        "workforceEngine?: IWorkforceEngineService, materialEngine?: IMaterialEngineService"
    )
    
    # Fix unit test overrides
    content = content.replace(
        "materialEngine: mockMreNoOp",
        "materialEngine: mockMreNoOp"
    )

    with open(filename, 'w') as f:
        f.write(content)

for fn in [
    'tests/integration/services/openActivityService.integration.test.ts',
    'tests/integration/services/openActivityTreIntegration.integration.test.ts',
    'tests/integration/services/openActivityWreIntegration.integration.test.ts',
]:
    process_file(fn)
