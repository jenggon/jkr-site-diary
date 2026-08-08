import sys

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
        
        content = content.replace("}) as any,", "}),")
        
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)

fix_all()
