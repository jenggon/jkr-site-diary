import glob
import re

def fix():
    for f in glob.glob('tests/**/*.ts', recursive=True):
        with open(f, 'r') as file:
            c = file.read()
            
        modified = False
        
        # Matches workforceEngine: [anything], 
        # and adds materialEngine: mockMreNoOp, right after
        new_c = re.sub(
            r"(workforceEngine:\s*[^,}]+)(,\n\s*\})",
            r"\1,\n        materialEngine: mockMreNoOp\2",
            c
        )
        if new_c != c:
            c = new_c
            modified = True
            
        # Catch the overrides case
        if 'workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,' in c and 'materialEngine' not in c:
            c = c.replace(
                "workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,",
                "workforceEngine: overrides?.workforceEngine ?? mockWreNoOp,\n        materialEngine: overrides?.materialEngine ?? mockMreNoOp,"
            )
            modified = True

        if modified:
            with open(f, 'w') as file:
                file.write(c)

fix()
