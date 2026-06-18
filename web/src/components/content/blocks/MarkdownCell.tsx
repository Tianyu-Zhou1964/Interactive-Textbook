'use client'

import { useMemo, Fragment } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cleanD2LMarkdown } from '@/lib/markdown-utils'

// =====================================================
// MARKDOWN CELL with Image Path Rewrite
// =====================================================
export function MarkdownCell({ content }: { content: string }) {
  const cleanedContent = useMemo(() => cleanD2LMarkdown(content), [content])

  return (
    <div className="markdown-cell my-4">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match && !className

            if (isInline) {
              return (
                <code
                  className="bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200 dark:border-gray-700"
                  {...props}
                >
                  {children}
                </code>
              )
            }

            return (
              <SyntaxHighlighter
                language={match ? match[1] : 'text'}
                style={vscDarkPlus}
                customStyle={{
                  margin: '1rem 0',
                  padding: '1rem',
                  fontSize: '0.875rem',
                  borderRadius: '0.5rem',
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            )
          },
          pre: ({ children }) => <Fragment>{children}</Fragment>,
          // Custom Image Renderer for Path Rewriting
          img: ({ node, src, alt, ...props }) => {
            // Robust path rewriting for local images
            let fixedSrc = typeof src === 'string' ? src : '';

            if (typeof src === 'string' && src) {
              // Skip absolute URLs and data URLs
              if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
                fixedSrc = src
              }
              // Handle various relative path formats
              else if (src.includes('/img/')) {
                // Extract the filename and path after 'img/'
                // Handles: ../img/foo.svg, ../../img/foo.svg, ./img/foo.svg, img/foo.svg
                const imgIndex = src.lastIndexOf('/img/')
                fixedSrc = src.substring(imgIndex) // Gets '/img/...'
              }
              else if (src.startsWith('img/')) {
                fixedSrc = '/' + src
              }
              // Fallback: just use as-is
            }

            return (
              <span className="block my-6 text-center">
                <img
                  src={fixedSrc}
                  alt={alt || "教材插图"}
                  className="mx-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700 max-w-full"
                  onError={(e) => {
                    // Fallback or styling for broken images
                    e.currentTarget.style.opacity = '0.5'
                    e.currentTarget.style.border = '1px dashed red'
                  }}
                  {...props}
                />
                {alt && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 block italic">{alt}</span>
                )}
              </span>
            )
          },
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-10 mb-6 pb-3 border-b-2 border-blue-100 dark:border-blue-900">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-8 mb-4 flex items-center gap-3">
              <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mt-6 mb-3">{children}</h3>
          ),
          p: ({ children }) => (
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{children}</div>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4 text-gray-700 dark:text-gray-300">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 ml-4 text-gray-700 dark:text-gray-300">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-400 dark:border-blue-600 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/30 rounded-r-lg italic text-gray-600 dark:text-gray-300">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400">{children}</td>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
          em: ({ children }) => <em className="italic text-gray-700 dark:text-gray-300">{children}</em>,
        }}
      >
        {cleanedContent}
      </ReactMarkdown>
    </div>
  )
}
