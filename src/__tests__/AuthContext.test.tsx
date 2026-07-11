import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import React from 'react'

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
    },
  },
}))

const mockUser = { id: 'user-1', email: 'test@test.com', aud: 'authenticated' }
const mockSession = { user: mockUser, access_token: 'token', refresh_token: 'refresh' }

function renderProvider() {
  return render(
    <AuthProvider>
      <div data-testid="child">child</div>
    </AuthProvider>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
  })

  it('renders children', () => {
    renderProvider()
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('initializes with null session', async () => {
    renderProvider()
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => React.createElement(AuthProvider, null, children),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
  })

  it('restores session on mount', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => React.createElement(AuthProvider, null, children),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.session).toEqual(mockSession)
  })

  it('subscribes to auth state changes', async () => {
    renderProvider()

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled()
    })
  })

  it('updates user on auth state change', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => React.createElement(AuthProvider, null, children),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    const newUser = { id: 'user-2', email: 'user2@test.com' }
    const callback = mockOnAuthStateChange.mock.calls[0][0]

    act(() => {
      callback('SIGNED_IN', { user: newUser })
    })

    expect(result.current.user).toEqual(newUser)
  })

  it('clears user on sign out event', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => React.createElement(AuthProvider, null, children),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    const callback = mockOnAuthStateChange.mock.calls[0][0]

    act(() => {
      callback('SIGNED_OUT', null)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
  })

  it('calls signInWithPassword on signIn', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => React.createElement(AuthProvider, null, children),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signIn('test@test.com', 'password')
    })

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password',
    })
  })

  it('calls signUp on signUp', async () => {
    mockSignUp.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => React.createElement(AuthProvider, null, children),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signUp('new@test.com', 'password')
    })

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@test.com',
      password: 'password',
    })
  })

  it('calls signOut on signOut', async () => {
    mockSignOut.mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => React.createElement(AuthProvider, null, children),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSignOut).toHaveBeenCalled()
  })
})

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within AuthProvider'
    )
  })

  it('returns context when used inside AuthProvider', () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => React.createElement(AuthProvider, null, children),
    })

    expect(result.current).toHaveProperty('user')
    expect(result.current).toHaveProperty('session')
    expect(result.current).toHaveProperty('loading')
    expect(result.current).toHaveProperty('signIn')
    expect(result.current).toHaveProperty('signUp')
    expect(result.current).toHaveProperty('signOut')
  })
})
