import glob

def fix():
    for f in glob.glob('tests/**/*.ts', recursive=True):
        with open(f, 'r') as file:
            c = file.read()
            
        modified = False
        
        new_c = c.replace(
            "resolveMaterialRecommendation: vi.fn() as any",
            "resolveMaterialRecommendation: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }) as any"
        )
        if new_c != c:
            c = new_c
            modified = True
            
        new_c = c.replace(
            "resolveMaterialRecommendation: vi.fn(),",
            "resolveMaterialRecommendation: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }),"
        )
        if new_c != c:
            c = new_c
            modified = True

        if modified:
            with open(f, 'w') as file:
                file.write(c)

fix()
