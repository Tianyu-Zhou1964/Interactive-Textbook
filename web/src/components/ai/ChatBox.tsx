'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, User, Trash2, Square, Eye, EyeOff } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import html2canvas from 'html2canvas'

// API URL from environment variable（本地开发可在 .env.local 中设 NEXT_PUBLIC_API_URL=http://localhost:8000）
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')

type Message = {
  id: string
  role: 'user' | 'ai'
  content: string
  isError?: boolean
  references?: string[]
}

interface ChatBoxProps {
  visionSync?: boolean
  lang?: 'zh' | 'en'
}

export function ChatBox({ visionSync = false, lang = 'zh' }: ChatBoxProps) {
  const initialGreeting: Message = {
    id: 'greeting',
    role: 'ai',
    content: lang === 'en'
      ? "Hi! I'm PIE, the AI teaching assistant created by the author \"阡陌交通_\". Ask me anything about the \"Handmaking LLM\" tutorial series!"
      : '你好！我叫派派，我是教材作者阡陌交通_创造的助教。关于《手撕 AI 大模型》这套教程的任何问题，我都能帮你解答，咱们开始吧！'
  }

  const [messages, setMessages] = useState<Message[]>([initialGreeting])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  // 视觉功能开关：开启后每次提问会截取当前页面发给模型。默认关闭，由用户在对话框内切换。
  const [visionEnabled, setVisionEnabled] = useState(visionSync)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  // 标记是否为用户主动停止，避免把停止当成错误处理
  const stoppedRef = useRef(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const stopGenerating = () => {
    stoppedRef.current = true
    // 已在读流：用 cancel() 优雅结束，reader.read() 会正常返回 done，不抛 AbortError
    if (readerRef.current) {
      readerRef.current.cancel().catch(() => {})
    }
    // 流还没开始（fetch 仍 pending）：只能 abort 请求本身
    else if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setLoading(false)
  }

  // Capture the CURRENT VIEWPORT (what the user sees)
  // Modified to capture document.body with specific window coordinates
  const captureScreen = async (): Promise<string | null> => {
    console.log('[ChatBox] 📸 Starting viewport capture...')
    
    // Use document.body to capture the whole render context, then crop with options below
    const element = document.body 
    
    try {
      const canvas = await html2canvas(element, {
        useCORS: true,       // Allow cross-origin images (important for Pyodide plots)
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        
        // === CORE FIX: Viewport Capture Logic ===
        // Define the capture origin based on current scroll position
        x: window.scrollX,
        y: window.scrollY,
        // Define the capture size based on the window size
        width: window.innerWidth,
        height: window.innerHeight,
        
        // Since we are only capturing the viewport (smaller area), 
        // we can afford a decent scale for readability.
        scale: 1, 
        
        // Ignore specific UI elements to keep the screenshot clean
        ignoreElements: (node) => {
          // Ignore the chatbox itself
          if (node.classList?.contains('chat-box-ignore')) return true
          // Ignore the sidebar
          if (node.tagName === 'ASIDE') return true
          // Ignore floating buttons (like the AI toggle when sidebar is closed)
          if (node.classList?.contains('fixed') && node.classList?.contains('bottom-6')) return true
          return false
        },
      })
      
      // Convert to Base64 (JPEG with 0.6 quality is usually a good balance)
      let finalBase64 = canvas.toDataURL('image/jpeg', 0.6)
      
      // Safety Check: 2MB limit (aligned with backend)
      // If too large, try reducing quality
      if (finalBase64.length > 2 * 1024 * 1024) {
          console.warn('[ChatBox] ⚠️ Image large (>2MB), reducing quality to 0.3...')
          finalBase64 = canvas.toDataURL('image/jpeg', 0.3)
      }

      const sizeKB = Math.round(finalBase64.length / 1024)
      console.log(`[ChatBox] ✅ Viewport Screenshot Captured: ${canvas.width}x${canvas.height}px, ${sizeKB} KB`)
      
      return finalBase64
    } catch (e) {
      console.error('[ChatBox] ❌ Screenshot capture failed:', e)
      return null
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userText = input
    setInput('')
    setLoading(true)
    stoppedRef.current = false

    // Add user message
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: userText }])

    // Vision Sync Logic
    let imageData: string | null = null
    
    if (visionEnabled) {
      // 视觉开启：每次提问都重新截取当前页面
      imageData = await captureScreen()

      if (!imageData) {
        console.warn('[ChatBox] ⚠️ Screenshot capture returned null, sending text only.')
      }
    }

    // Add empty AI message for streaming placeholder
    const aiMsgId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', content: '' }])

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const chatStreamUrl = `${API_URL}/chat_stream`
      console.log('[ChatBox] 📤 Sending request to backend...', { 
        url: chatStreamUrl,
        query: userText.substring(0, 50),
        visionEnabled: visionEnabled,
        hasImage: !!imageData,
        imageSizeKB: imageData ? Math.round(imageData.length / 1024) : 0
      })
      
      // Prepare conversation history (exclude current empty AI message and the system greeting)
      const history = messages
        .filter(m => m.id !== 'greeting')
        .map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user', // Backend expects 'assistant' for AI role
          content: m.content
        }))

      const response = await fetch(chatStreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: userText,
          image: imageData, // Send the captured viewport image
          history: history,
          lang: lang
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      if (!response.body) throw new Error('ReadableStream not supported')

      const reader = response.body.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        // 用户点了停止：reader 已被 cancel，标记 [Stopped] 后退出循环
        if (stoppedRef.current) {
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, content: m.content + ' [Stopped]' } : m
          ))
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' 

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.type === 'delta') {
              setMessages(prev => prev.map(m => 
                m.id === aiMsgId ? { ...m, content: m.content + data.content } : m
              ))
            } else if (data.type === 'done') {
              setMessages(prev => prev.map(m => 
                m.id === aiMsgId ? { ...m, references: data.references } : m
              ))
            } else if (data.type === 'error') {
              throw new Error(data.content)
            }
          } catch (e: any) {
            if (e instanceof Error && (e.message.includes('HTTP') || e.message.includes('error'))) {
              throw e
            }
            // Ignore minor JSON parse errors during stream
          }
        }
      }
    } catch (e: any) {
      // 用户主动点「停止生成」会抛 AbortError，这是预期行为，不算错误：
      // 静默处理、不打 console.error，否则会触发 Next.js dev 错误覆盖层。
      if (e?.name === 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, content: m.content + ' [Stopped]' } : m
        ))
      } else {
        console.error('[ChatBox] Request failed:', e)
        const isNetworkError = e?.message === 'Failed to fetch' || e?.name === 'TypeError' || e?.code === 'ECONNRESET'
        const friendlyMsg = isNetworkError
          ? `无法连接后端 (${API_URL})。请确认：1) 后端服务已启动 2) .env.local 中 NEXT_PUBLIC_API_URL 是否正确（本地开发可用 http://localhost:8000）`
          : ('Error: ' + (e?.message || String(e)))
        setMessages(prev => prev.map(m => 
          m.id === aiMsgId ? { ...m, content: friendlyMsg, isError: true } : m
        ))
      }
    } finally {
      setLoading(false)
      abortControllerRef.current = null
      readerRef.current = null
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 w-full overflow-hidden text-gray-900 dark:text-gray-100 chat-box-ignore">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <img src="/paipai.jpeg" alt="派派" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">派派</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{loading ? (lang === 'en' ? 'Thinking...' : '思考中...') : (lang === 'en' ? 'Online' : '在线')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* 视觉开关：开启后提问会把当前页面截图一并发给模型 */}
          <button
            onClick={() => setVisionEnabled(v => !v)}
            className={`p-2 rounded-full transition-colors ${
              visionEnabled
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            title={
              visionEnabled
                ? (lang === 'en' ? 'Vision ON: I can see your current page' : '视觉已开启：我能看到你当前的页面')
                : (lang === 'en' ? 'Vision OFF: click to let me see your page' : '视觉已关闭：点击让我看你的页面')
            }
            aria-pressed={visionEnabled}
          >
            {visionEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          <button
            onClick={() => setMessages([initialGreeting])}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
            title={lang === 'en' ? 'Clear conversation' : '清空对话'}
          >
            <Trash2 size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-950">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'ai' ? (
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 border-blue-200 dark:border-blue-700">
                <img src="/paipai.jpeg" alt="派派" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 bg-gray-800 border-gray-800 text-white">
                <User size={20} />
              </div>
            )}
            <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm max-w-[85%] overflow-hidden ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : msg.isError 
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-none'
            }`}>
              {msg.role === 'ai' && !msg.isError ? (
                <div className="prose prose-sm max-w-none text-gray-900 dark:text-gray-100">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      pre: ({ node, ...props }: any) => (
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm my-3" {...props} />
                      ),
                      code: ({ node, className, children, ...props }: any) => {
                        const isInline = !className || !className.includes('language-')
                        return isInline ? (
                          <code className="text-pink-700 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30 px-1 py-0.5 rounded text-xs" {...props}>{children}</code>
                        ) : (
                          <code className={className || ''} {...props}>{children}</code>
                        )
                      },
                      h1: ({ node, ...props }: any) => <h1 className="text-gray-900 dark:text-gray-100 font-bold" {...props} />,
                      h2: ({ node, ...props }: any) => <h2 className="text-gray-900 dark:text-gray-100 font-bold" {...props} />,
                      h3: ({ node, ...props }: any) => <h3 className="text-gray-900 dark:text-gray-100 font-semibold" {...props} />,
                      p: ({ node, ...props }: any) => <p className="text-gray-800 dark:text-gray-200" {...props} />,
                      li: ({ node, ...props }: any) => <li className="text-gray-800 dark:text-gray-200" {...props} />,
                    }}
                  >
                    {msg.content || (loading ? '...' : '')}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
              
              {msg.references && msg.references.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
                  参考来源: {msg.references.join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="relative flex items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={loading ? (lang === 'en' ? 'Generating...' : '生成中...') : (lang === 'en' ? 'Ask a question...' : '输入问题...')}
            disabled={loading}
            className="w-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 pr-14 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all disabled:bg-gray-50 dark:disabled:bg-gray-800"
          />
          <button
            onClick={loading ? stopGenerating : handleSend}
            disabled={!loading && !input.trim()}
            className={`absolute right-2 p-2 rounded-lg transition-all ${
              loading 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 dark:disabled:bg-gray-600'
            }`}
          >
            {loading ? <Square size={18} fill="currentColor" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}