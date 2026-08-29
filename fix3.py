import sys
import glob
import re

def fix_all_new_open_activity_service():
    files = glob.glob('tests/**/*.ts', recursive=True)
    
    for filename in files:
        with open(filename, 'r') as f:
            content = f.read()
            
        modified = False
        
        # Check if IMaterialEngineService is imported
        if 'import { OpenActivityService }' in content and 'IMaterialEngineService' not in content:
            content = content.replace(
                "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';",
                "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';\nimport { IMaterialEngineService } from '@/services/IMaterialEngineService';"
            )
            mock_mre = '''\n  const mockMreNoOp: IMaterialEngineService = {
    resolveMaterialRecommendation: vi.fn(),
  } as unknown as IMaterialEngineService;\n'''
            
            # Find a place to inject mockMreNoOp inside describe block or top level
            if 'const mockWreNoOp' in content:
                content = content.replace('const mockWreNoOp', mock_mre + '\n  const mockWreNoOp')
            elif 'const mockTreNoOp' in content:
                content = content.replace('const mockTreNoOp', mock_mre + '\n  const mockTreNoOp')
            else:
                # Add to top after imports if no mock is found
                import_end = content.rfind("from '@/")
                import_end = content.find("\n", import_end) + 1
                content = content[:import_end] + mock_mre + content[import_end:]
            modified = True

        # Now replace workforceEngine: ... with workforceEngine: ..., materialEngine: mockMreNoOp,
        # using regex to match any workforceEngine mapping.
        if 'new OpenActivityService' in content or 'createService' in content:
            new_content = re.sub(
                r'(workforceEngine:\s*[^,}]+,?)',
                r'\1\n      materialEngine: mockMreNoOp,',
                content
            )
            # Remove duplicates if any
            new_content = re.sub(r'materialEngine:\s*mockMreNoOp,\s*materialEngine:\s*mockMreNoOp,', r'materialEngine: mockMreNoOp,', new_content)
            
            if new_content != content:
                content = new_content
                modified = True
                
        if modified:
            with open(filename, 'w') as f:
                f.write(content)

fix_all_new_open_activity_service()
