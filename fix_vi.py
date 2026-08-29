import sys

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "import { vi" not in content and "vi.fn(" in content:
        content = "import { describe, it, expect, vi, beforeEach } from 'vitest';\n" + content.replace("import { describe, it, expect, beforeEach } from 'vitest';", "")
        content = content.replace("import { describe, it, expect } from 'vitest';", "import { describe, it, expect, vi } from 'vitest';")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

patch_file('tests/unit/services/OpenActivityService.test.ts')
patch_file('tests/integration/services/openActivityWreIntegration.integration.test.ts')
patch_file('tests/integration/services/openActivityService.integration.test.ts')
patch_file('tests/integration/services/openActivityTreIntegration.integration.test.ts')
