import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Marketplace Queries and Permissions', () => {
  it('should allow public access to active listings', async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'ACTIVE')
      .limit(1);

    expect(error).toBeNull();
    // Even if empty, it shouldn't error
    expect(Array.isArray(data)).toBe(true);
  });

  it('should include seller information in listings', async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*, seller:seller_id(*)')
      .eq('status', 'ACTIVE')
      .limit(1);

    expect(error).toBeNull();
    if (data && data.length > 0) {
      const listing = data[0] as any;
      expect(listing.seller).toBeDefined();
    }
  });

  it('should allow public access to approved seller profiles', async () => {
    const { data, error } = await supabase
      .from('seller_profiles')
      .select('*')
      .eq('status', 'APPROVED')
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
