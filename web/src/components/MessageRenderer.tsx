import type { Message, ContentItem } from '../stores/useStore'

interface MessageRendererProps {
  message: Message
}

export function MessageRenderer({ message }: MessageRendererProps) {
  const content = message.message?.content

  if (typeof content === 'string') {
    return (
      <div className="message-content whitespace-pre-wrap text-claude-800">
        {content}
      </div>
    )
  }

  if (Array.isArray(content)) {
    return (
      <div className="message-content space-y-2">
        {content.map((item, index) => (
          <ContentItemRenderer key={index} item={item} />
        ))}
      </div>
    )
  }

  return null
}

function ContentItemRenderer({ item }: { item: ContentItem }) {
  switch (item.type) {
    case 'text':
      return (
        <div className="whitespace-pre-wrap text-claude-800">
          {item.text}
        </div>
      )

    case 'thinking':
      return (
        <div className="text-claude-500 italic border-l-2 border-claude-300 pl-3 my-2">
          <span className="text-xs font-medium text-claude-400 uppercase tracking-wider">
            Thinking
          </span>
          <div className="mt-1">{item.thinking}</div>
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
      return (
        <div className="bg-claude-50 border border-claude-200 rounded-lg p-3 my-2">
          <pre className="text-sm text-claude-700 whitespace-pre-wrap overflow-x-auto">
            {typeof item.content === 'string' ? item.content : JSON.stringify(item.content, null, 2)}
          </pre>
        </div>
      )

    default:
      return (
        <div className="text-claude-500 text-sm">
          Unknown content type: {item.type}
        </div>
      )
  }
}
