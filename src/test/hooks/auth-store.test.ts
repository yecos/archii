import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import AuthProvider, { useAuthContext } from '@/contexts/AuthContext';

// Shared mock references for UIContext
const mockShowToast = vi.fn();

// Mock UIContext (dependency of AuthProvider)
vi.mock('@/contexts/UIContext', () => ({
  useUIContext: () => ({
    showToast: mockShowToast,
    forms: {
      loginEmail: '',
      loginPass: '',
      regName: '',
      regEmail: '',
      regPass: '',
    },
  }),
}));

// Mock firebase-service — getFirebase returns a fully mocked Firebase object
const mockAuthOnAuthStateChanged = vi.fn();
const mockAuthSignOut = vi.fn();
const mockAuthSignIn = vi.fn();
const mockAuthCreateUser = vi.fn();
const mockAuthSendReset = vi.fn();
const mockAuthSetPersistence = vi.fn();
const mockAuthGetRedirectResult = vi.fn();

const mockDocGet = vi.fn();
const mockDocSet = vi.fn();
const mockDocUpdate = vi.fn();
const mockCollectionGet = vi.fn();
const mockCollectionOnSnapshot = vi.fn();
const mockUnsubSnapshot = vi.fn();

vi.mock('@/lib/firebase-service', () => ({
  getFirebase: () => ({
    apps: [{ name: 'default' }],
    auth: () => ({
      onAuthStateChanged: mockAuthOnAuthStateChanged,
      signOut: mockAuthSignOut,
      signInWithEmailAndPassword: mockAuthSignIn,
      createUserWithEmailAndPassword: mockAuthCreateUser,
      sendPasswordResetEmail: mockAuthSendReset,
      setPersistence: mockAuthSetPersistence,
      getRedirectResult: mockAuthGetRedirectResult,
      GoogleAuthProvider: vi.fn(() => ({ setCustomParameters: vi.fn() })),
      OAuthProvider: vi.fn(() => ({ addScope: vi.fn(), setCustomParameters: vi.fn() })),
    }),
    firestore: () => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: mockDocGet,
          set: mockDocSet,
          update: mockDocUpdate,
        })),
        get: mockCollectionGet,
        onSnapshot: mockCollectionOnSnapshot,
      })),
      FieldValue: {
        serverTimestamp: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })),
      },
    }),
  }),
  serverTimestamp: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })),
  snapToDocs: vi.fn(() => []),
  QuerySnapshot: {},
}));

// Mock useConfirmDialog
vi.mock('@/hooks/useConfirmDialog', () => ({
  confirm: vi.fn(() => Promise.resolve(true)),
}));

// Mock helpers
vi.mock('@/lib/helpers', () => ({
  getInitials: vi.fn((name: string) => name ? name[0].toUpperCase() : '?'),
}));

function createWrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

describe('AuthContext (auth-store equivalent)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // By default: auth state change fires immediately with null user, loading done
    mockAuthOnAuthStateChanged.mockImplementation((cb: (user: any) => void) => {
      cb(null);
      return mockUnsubSnapshot;
    });
    mockAuthGetRedirectResult.mockResolvedValue(null);
    mockCollectionOnSnapshot.mockReturnValue(mockUnsubSnapshot);
    mockDocGet.mockResolvedValue({ exists: false });
  });

  it('provides default initial state: loading=true, authUser=null, ready=false', () => {
    // Use a wrapper that renders inside AuthProvider
    // Keep auth state listener pending so loading stays true
    mockAuthOnAuthStateChanged.mockImplementation(() => mockUnsubSnapshot);

    const { result } = renderHook(() => useAuthContext(), { wrapper: createWrapper });

    // Before the auth state listener fires, initial React state is:
    expect(result.current.authUser).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.ready).toBe(false);
    expect(result.current.teamUsers).toEqual([]);
  });

  it('setAuthUser updates the authUser state', async () => {
    mockAuthOnAuthStateChanged.mockImplementation((cb: (user: any) => void) => {
      // Simulate immediate callback with a user
      const fakeUser = {
        uid: 'user-123',
        email: 'test@test.com',
        displayName: 'Test User',
        photoURL: null,
        providerData: [],
        updateProfile: vi.fn(),
      };
      setTimeout(() => cb(fakeUser), 0);
      return mockUnsubSnapshot;
    });
    mockDocGet.mockResolvedValue({ exists: false });

    const { result } = renderHook(() => useAuthContext(), { wrapper: createWrapper });

    // Wait for the useEffect to fire
    await vi.waitFor(() => {
      expect(result.current.authUser).not.toBeNull();
    });

    expect(result.current.authUser!.uid).toBe('user-123');
    expect(result.current.authUser!.email).toBe('test@test.com');

    // Clear auth user via setter
    act(() => {
      result.current.setAuthUser(null);
    });

    expect(result.current.authUser).toBeNull();
  });

  it('clearAuthUser via setAuthUser(null) clears the user', async () => {
    mockAuthOnAuthStateChanged.mockImplementation((cb: (user: any) => void) => {
      const fakeUser = {
        uid: 'user-456',
        email: 'clear@test.com',
        displayName: 'Clear Me',
        photoURL: null,
        providerData: [],
        updateProfile: vi.fn(),
      };
      setTimeout(() => cb(fakeUser), 0);
      return mockUnsubSnapshot;
    });
    mockDocGet.mockResolvedValue({ exists: false });

    const { result } = renderHook(() => useAuthContext(), { wrapper: createWrapper });

    await vi.waitFor(() => {
      expect(result.current.authUser).not.toBeNull();
    });

    // Clear user (equivalent to clearAuthUser)
    act(() => {
      result.current.setAuthUser(null);
    });

    expect(result.current.authUser).toBeNull();
    // Computed properties should reflect no user
    expect(result.current.userName).toBe('');
    expect(result.current.isAdmin).toBe(false);
  });

  it('computed userName and initials derive from authUser', async () => {
    mockAuthOnAuthStateChanged.mockImplementation((cb: (user: any) => void) => {
      const fakeUser = {
        uid: 'user-789',
        email: 'juan@test.com',
        displayName: 'Juan Perez',
        photoURL: null,
        providerData: [],
        updateProfile: vi.fn(),
      };
      setTimeout(() => cb(fakeUser), 0);
      return mockUnsubSnapshot;
    });
    mockDocGet.mockResolvedValue({ exists: false });

    const { result } = renderHook(() => useAuthContext(), { wrapper: createWrapper });

    await vi.waitFor(() => {
      expect(result.current.authUser).not.toBeNull();
    });

    expect(result.current.userName).toBe('Juan Perez');
    expect(result.current.initials).toBe('J');
  });

  it('getMyRole returns default "Miembro" when no teamUsers match', async () => {
    mockAuthOnAuthStateChanged.mockImplementation((cb: (user: any) => void) => {
      const fakeUser = {
        uid: 'user-abc',
        email: 'role@test.com',
        displayName: 'Role User',
        photoURL: null,
        providerData: [],
        updateProfile: vi.fn(),
      };
      setTimeout(() => cb(fakeUser), 0);
      return mockUnsubSnapshot;
    });
    mockDocGet.mockResolvedValue({ exists: false });

    const { result } = renderHook(() => useAuthContext(), { wrapper: createWrapper });

    await vi.waitFor(() => {
      expect(result.current.authUser).not.toBeNull();
    });

    // No teamUsers loaded, so getMyRole returns default
    expect(result.current.getMyRole()).toBe('Miembro');
    expect(result.current.myRole).toBe('Miembro');
    expect(result.current.isAdmin).toBe(false);
  });

  it('getUserName returns truncated uid for unknown users', async () => {
    mockAuthOnAuthStateChanged.mockImplementation((cb: (user: any) => void) => {
      cb(null);
      return mockUnsubSnapshot;
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper: createWrapper });

    // Unknown uid should return truncated uid
    expect(result.current.getUserName('abcdef123456')).toBe('abcdef12...');
    // Empty uid returns "Sin asignar"
    expect(result.current.getUserName('')).toBe('Sin asignar');
  });

  it('doLogout calls confirm and firebase signOut', async () => {
    mockAuthOnAuthStateChanged.mockImplementation((cb: (user: any) => void) => {
      const fakeUser = {
        uid: 'logout-user',
        email: 'logout@test.com',
        displayName: 'Logout',
        photoURL: null,
        providerData: [],
        updateProfile: vi.fn(),
      };
      setTimeout(() => cb(fakeUser), 0);
      return mockUnsubSnapshot;
    });
    mockDocGet.mockResolvedValue({ exists: false });

    const { result } = renderHook(() => useAuthContext(), { wrapper: createWrapper });

    await vi.waitFor(() => {
      expect(result.current.authUser).not.toBeNull();
    });

    await act(async () => {
      await result.current.doLogout();
    });

    expect(mockAuthSignOut).toHaveBeenCalled();
  });

  it('doLogin shows error for empty fields', async () => {
    mockAuthOnAuthStateChanged.mockImplementation((cb: (user: any) => void) => {
      cb(null);
      return mockUnsubSnapshot;
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper: createWrapper });

    await act(async () => {
      await result.current.doLogin();
    });

    // Should have shown toast about empty fields (no actual firebase call)
    expect(mockShowToast).toHaveBeenCalledWith('Completa todos los campos', 'error');
    expect(mockAuthSignIn).not.toHaveBeenCalled();
  });
});
