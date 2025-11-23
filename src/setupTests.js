// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock BackgroundLoader to prevent async operations that continue after tests
// This prevents "window is not defined" errors when timers fire after teardown
vi.mock('./utils/BackgroundLoader', () => ({
  default: () => null,
}));

// Mock src/supabaseClient.js
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => {
      const chainable = {
        select: vi.fn().mockReturnValue(chainable),
        insert: vi.fn().mockReturnValue(chainable),
        update: vi.fn().mockReturnValue(chainable),
        delete: vi.fn().mockReturnValue(chainable),
        eq: vi.fn().mockReturnValue(chainable),
        is: vi.fn().mockReturnValue(chainable),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      };
      return chainable;
    }),
    rpc: vi.fn(),
  },
}));

vi.mock('../supabaseClient.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => {
      const chainable = {
        select: vi.fn().mockReturnValue(chainable),
        insert: vi.fn().mockReturnValue(chainable),
        update: vi.fn().mockReturnValue(chainable),
        delete: vi.fn().mockReturnValue(chainable),
        eq: vi.fn().mockReturnValue(chainable),
        is: vi.fn().mockReturnValue(chainable),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      };
      return chainable;
    }),
    rpc: vi.fn(),
  },
}));

// Mock src/utils/supabaseClient.js
vi.mock('./utils/supabaseClient', () => ({
  getAdminSupabaseClient: vi.fn(() => {
    const chainable = {
      from: vi.fn().mockReturnValue(chainable),
      select: vi.fn().mockReturnValue(chainable),
      insert: vi.fn().mockReturnValue(chainable),
      update: vi.fn().mockReturnValue(chainable),
      delete: vi.fn().mockReturnValue(chainable),
      eq: vi.fn().mockReturnValue(chainable),
      is: vi.fn().mockReturnValue(chainable),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };
    return chainable;
  }),
}));

vi.mock('src/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => {
      const chainable = {
        select: vi.fn().mockReturnValue(chainable),
        insert: vi.fn().mockReturnValue(chainable),
        update: vi.fn().mockReturnValue(chainable),
        delete: vi.fn().mockReturnValue(chainable),
        eq: vi.fn().mockReturnValue(chainable),
        is: vi.fn().mockReturnValue(chainable),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      };
      return chainable;
    }),
    rpc: vi.fn(),
  },
}));

vi.mock('src/supabaseClient.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => {
      const chainable = {
        select: vi.fn().mockReturnValue(chainable),
        insert: vi.fn().mockReturnValue(chainable),
        update: vi.fn().mockReturnValue(chainable),
        delete: vi.fn().mockReturnValue(chainable),
        eq: vi.fn().mockReturnValue(chainable),
        is: vi.fn().mockReturnValue(chainable),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      };
      return chainable;
    }),
    rpc: vi.fn(),
  },
}));
