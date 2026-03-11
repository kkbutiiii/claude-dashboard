import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Message, ContentItem } from '../stores/useStore'
import { Check, Copy, ChevronDown, ChevronUp } from 'lucide-react'

interface MessageRendererProps {
  message: Message
  searchQuery?: string
}

export function MessageRenderer({ message, searchQuery }: MessageRendererProps) {
  const content = message.message?.content

  if (typeof content === 'string') {
    return (
      <div className="message-content text-claude-800">
        <MarkdownContent content={content} searchQuery={searchQuery} />
      </div>
    )
  }

  if (Array.isArray(content)) {
    return (
      <div className="message-content space-y-2">
        {content.map((item, index) => (
          <ContentItemRenderer key={index} item={item} searchQuery={searchQuery} />
        ))}
      </div>
    )
  }

  return null
}

interface MarkdownContentProps {
  content: string
  searchQuery?: string
}

function MarkdownContent({ content, searchQuery }: MarkdownContentProps) {
  // If there's a search query, highlight it
  const processedContent = searchQuery
    ? highlightSearchTerms(content, searchQuery)
    : content

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeBlock,
        p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-claude-300 pl-4 italic text-claude-600 my-4">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border-collapse border border-claude-300">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-claude-100">{children}</thead>,
        th: ({ children }) => (
          <th className="border border-claude-300 px-4 py-2 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-claude-300 px-4 py-2">{children}</td>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        hr: () => <hr className="my-4 border-claude-300" />,
      }}
    >
      {processedContent}
    </ReactMarkdown>
  )
}

// Highlight search terms in content
function highlightSearchTerms(content: string, query: string): string {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0)
  if (terms.length === 0) return content

  // We need to escape special regex characters in the search terms
  const escapedTerms = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi')

  // For markdown content, we need to be careful not to break markdown syntax
  // We'll use a placeholder that won't be interpreted by markdown
  return content.replace(regex, '**$1**')
}

interface CodeBlockProps {
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

function CodeBlock({ inline, className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''

  const code = String(children).replace(/\n$/, '')

  if (inline) {
    return (
      <code className="bg-claude-100 text-claude-800 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    )
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative my-4 group">
      <div className="flex items-center justify-between bg-claude-800 text-claude-200 px-4 py-2 rounded-t-lg text-sm">
        <span className="font-mono">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs hover:text-white transition-colors"
          title="复制代码"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              复制
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 0.5rem 0.5rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
        }}
        showLineNumbers={code.split('\n').length > 5}
        lineNumberStyle={{ minWidth: '2.5rem', paddingRight: '1rem' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

interface ContentItemRendererProps {
  item: ContentItem
  searchQuery?: string
}

function ContentItemRenderer({ item, searchQuery }: ContentItemRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  switch (item.type) {
    case 'text':
      return (
        <div className="text-claude-800">
          <MarkdownContent content={item.text || ''} searchQuery={searchQuery} />
        </div>
      )

    case 'thinking':
      return (
        <div className="text-claude-500 border-l-2 border-claude-300 pl-3 my-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-xs font-medium text-claude-400 uppercase tracking-wider hover:text-claude-600 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            Thinking
          </button>
          {isExpanded && (
            <div className="mt-2 italic">{item.thinking}</div>
          )}
        </div>
      )

    case 'tool_use':
      return (
        <div className="bg-claude-100 rounded-lg p-3 my-2">
          <div className="flex items-center gap-2 text-sm text-claude-600">
            <span className="font-medium">Tool:</span> {item.name}
          </div>
        </div>
      )

    case 'tool_result':
      const content = typeof item.content === 'string' ? item.content : JSON.stringify(item.content, null, 2)
      const lines = content.split('\n')
      const isLong = lines.length > 10

      return (
        <div className="bg-claude-50 border border-claude-200 rounded-lg my-2 overflow-hidden">
          <div className="flex items-center justify-between bg-claude-100 px-3 py-2 border-b border-claude-200">
            <span className="text-sm font-medium text-claude-600">Tool Result</span>
            {isLong && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs text-claude-500 hover:text-claude-700"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    展开 ({lines.length} 行)
                  </>
                )}
              </button>
            )}
          </div>
          <div className="p-3">
            {content.startsWith('{') || content.startsWith('[') ? (
              <pre className="text-sm text-claude-700 whitespace-pre-wrap overflow-x-auto font-mono">
                {isLong && !isExpanded ? content.split('\n').slice(0, 10).join('\n') + '\n...' : content}
              </pre>
            ) : (
              <div className="text-sm text-claude-700 whitespace-pre-wrap">
                {isLong && !isExpanded ? content.split('\n').slice(0, 10).join('\n') + '\n...' : content}
              </div>
            )}
          </div>
        </div>
      )

    default:
      return (
        <div className="text-claude-500 text-sm">
          Unknown content type: {(item as any).type}
        </div>
      )
  }
}
