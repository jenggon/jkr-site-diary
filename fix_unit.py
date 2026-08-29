import re

filename = 'tests/unit/services/OpenActivityService.test.ts'
with open(filename, 'r') as f:
    content = f.read()

content = re.sub(
    r"(import \{ IWorkforceEngineService \} from '@/services/IWorkforceEngineService';)",
    r"\1\nimport { IMaterialEngineService } from '@/services/IMaterialEngineService';",
    content
)

mock_mre = '''  const mockMreNoOp: IMaterialEngineService = {
    resolveMaterialRecommendation: vi.fn(),
  } as unknown as IMaterialEngineService;
'''

content = re.sub(
    r"(const mockWreNoOp.*?\})",
    r"\1\n\n" + mock_mre,
    content,
    flags=re.DOTALL,
    count=1
)

content = re.sub(
    r"(workforceEngine:.*?)(,?\s*\})",
    r"\1,\n      materialEngine: mockMreNoOp\2",
    content
)

content = content.replace(
    "workforceEngine?: IWorkforceEngineService",
    "workforceEngine?: IWorkforceEngineService, materialEngine?: IMaterialEngineService"
)

content = content.replace(
    "materialEngine: mockMreNoOp,\n      materialEngine: mockMreNoOp",
    "materialEngine: overrides.materialEngine ?? mockMreNoOp"
)
content = content.replace(
    "workforceEngine: overrides.workforceEngine ?? mockWreNoOp,\n      materialEngine: mockMreNoOp",
    "workforceEngine: overrides.workforceEngine ?? mockWreNoOp,\n      materialEngine: overrides.materialEngine ?? mockMreNoOp"
)

with open(filename, 'w') as f:
    f.write(content)
