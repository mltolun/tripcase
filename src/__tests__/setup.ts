import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import React from 'react'

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef((props: any, ref) => {
      const { layout, initial, animate, exit, transition, ...rest } = props
      return React.createElement('div', { ...rest, ref })
    }),
  },
  AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, {}, children),
}))

vi.mock('lucide-react', () => ({
  PlaneTakeoff: () => React.createElement('span', { 'data-testid': 'icon-plane-takeoff' }),
  PlaneLanding: () => React.createElement('span', { 'data-testid': 'icon-plane-landing' }),
  Clock: () => React.createElement('span', { 'data-testid': 'icon-clock' }),
  AlertTriangle: () => React.createElement('span', { 'data-testid': 'icon-alert-triangle' }),
  Pencil: () => React.createElement('span', { 'data-testid': 'icon-pencil' }),
  Trash2: () => React.createElement('span', { 'data-testid': 'icon-trash' }),
  Plus: () => React.createElement('span', { 'data-testid': 'icon-plus' }),
  X: () => React.createElement('span', { 'data-testid': 'icon-x' }),
  Calendar: () => React.createElement('span', { 'data-testid': 'icon-calendar' }),
}))

vi.mock('react-day-picker', () => ({
  DayPicker: () => React.createElement('div', { 'data-testid': 'day-picker' }),
}))

vi.mock('react-day-picker/style.css', () => ({}))

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>()
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  }
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

HTMLCanvasElement.prototype.getContext = vi.fn() as any
