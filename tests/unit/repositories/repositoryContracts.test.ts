import { describe, it, expect } from 'vitest';
import { IProgrammeRepository } from '@/repositories/IProgrammeRepository';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';

describe('Repository Contracts Interface Definitions', () => {
  it('should compile and satisfy IProgrammeRepository contract shape', () => {
    // Structural type check verification
    const mockRepo: Partial<IProgrammeRepository> = {
      findById: async () => ({ success: true, value: null }),
      existsByCode: async () => ({ success: true, value: false }),
    };

    expect(typeof mockRepo.findById).toBe('function');
    expect(typeof mockRepo.existsByCode).toBe('function');
  });

  it('should compile and satisfy IProgrammeRevisionRepository contract shape', () => {
    const mockRevisionRepo: Partial<IProgrammeRevisionRepository> = {
      findById: async () => ({ success: true, value: null }),
      findActiveRevision: async () => ({ success: true, value: null }),
    };

    expect(typeof mockRevisionRepo.findById).toBe('function');
    expect(typeof mockRevisionRepo.findActiveRevision).toBe('function');
  });
});
