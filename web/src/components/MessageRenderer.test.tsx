import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageRenderer } from './MessageRenderer'
import type { Message } from '../stores/useStore'

describe('MessageRenderer', () => {
  const createMessage = (content: unknown): Message => ({
    uuid: 'test-uuid',
    sessionId: 'test-session',
    timestamp: new Date().toISOString(),
    type: 'assistant',
    message: {
      role: 'assistant',
      content: content as any,
    },
  })

  it('renders plain text content', () => {
    const message = createMessage('Hello world')
    render(<MessageRenderer message={message} />)

    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders text array content', () => {
    const message = createMessage([
      { type: 'text', text: 'First paragraph' },
      { type: 'text', text: 'Second paragraph' },
    ])
    render(<MessageRenderer message={message} />)

    expect(screen.getByText('First paragraph')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph')).toBeInTheDocument()
  })

  it('renders thinking content', () => {
    const message = createMessage([
      { type: 'thinking', thinking: 'This is my thought process' },
    ])
    render(<MessageRenderer message={message} />)

    expect(screen.getByText('This is my thought process')).toBeInTheDocument()
  })

  it('renders tool_use content', () => {
    const message = createMessage([
      { type: 'tool_use', name: 'Bash' },
    ])
    render(<MessageRenderer message={message} />)

    expect(screen.getByText(/Tool:/)).toBeInTheDocument()
    expect(screen.getByText('Bash')).toBeInTheDocument()
  })

  it('renders tool_result content', () => {
    const message = createMessage([
      { type: 'tool_result', content: 'Command output here' },
    ])
    render(<MessageRenderer message={message} />)

    expect(screen.getByText('Command output here')).toBeInTheDocument()
  })

  it('renders mixed content types', () => {
    const message = createMessage([
      { type: 'text', text: 'Some text' },
      { type: 'tool_use', name: 'Read' },
      { type: 'tool_result', content: 'File contents' },
    ])
    render(<MessageRenderer message={message} />)

    expect(screen.getByText('Some text')).toBeInTheDocument()
    expect(screen.getByText('Read')).toBeInTheDocument()
    expect(screen.getByText('File contents')).toBeInTheDocument()
  })
})
