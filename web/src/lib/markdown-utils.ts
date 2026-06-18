/**
 * Markdown Utilities
 * 
 * Functions to clean and process D2L-style markdown artifacts
 */

/**
 * Cleans D2L-specific artifacts from markdown text
 * 
 * Removes:
 * - {.python .input} and similar class annotations
 * - :label:xxx and :eqlabel:xxx references
 * - :cite:`xxx` citations
 * - :numref:`xxx` cross-references
 * - :width:`xxx` width specifications
 * - {#fig_xxx} anchor definitions
 * - :begin_tab: and :end_tab: tab markers
 * - MyST directive syntax
 */
export function cleanD2LMarkdown(text: string): string {
  if (!text) return ''
  
  return text
    // Remove class annotations like {.python .input}, {.output}, {.input}, etc.
    // This pattern matches {.anything} with any combination of classes
    .replace(/\{\.[\w\s.-]+\}/g, '')
    
    // Remove MyST directive syntax like ```{.python .input}
    .replace(/```\{[^}]+\}/g, '```python')
    
    // Remove label definitions :label:`xxx`
    .replace(/:label:`[^`]*`/g, '')
    
    // Remove equation labels :eqlabel:`xxx`
    .replace(/:eqlabel:`[^`]*`/g, '')
    
    // Remove citations :cite:`xxx`
    .replace(/:cite:`[^`]*`/g, '')
    
    // Remove cross-references :numref:`xxx` → replace with placeholder
    .replace(/:numref:`[^`]*`/g, '[参见相关图表]')
    
    // Remove width specifications :width:`xxx`
    .replace(/:width:`[^`]*`/g, '')
    
    // Remove height specifications :height:`xxx`
    .replace(/:height:`[^`]*`/g, '')
    
    // Remove anchor definitions {#fig_xxx}, {#eq_xxx}
    .replace(/\{#[\w_-]+\}/g, '')
    
    // Remove tab markers
    .replace(/:begin_tab:`[^`]*`/g, '')
    .replace(/:end_tab:`[^`]*`/g, '')
    .replace(/:begin_tab:/g, '')
    .replace(/:end_tab:/g, '')
    
    // Remove standalone :label:xxx (without backticks)
    .replace(/:label:\S+/g, '')
    
    // Remove :eqlabel:xxx (without backticks)
    .replace(/:eqlabel:\S+/g, '')
    
    // Remove any remaining :xxx:`yyy` patterns
    .replace(/:\w+:`[^`]*`/g, '')
    
    // Clean up multiple consecutive newlines (max 2)
    .replace(/\n{3,}/g, '\n\n')
    
    // Trim whitespace
    .trim()
}

/**
 * Extracts code language from code block fence
 * e.g., "```python" → "python"
 * e.g., "```{.python .input}" → "python"
 */
export function extractCodeLanguage(text: string): string {
  // Match standard markdown fence
  let match = text.match(/^```(\w+)/)
  if (match) return match[1]
  
  // Match MyST style fence with classes
  match = text.match(/^```\{\.(\w+)/)
  if (match) return match[1]
  
  return 'text'
}

/**
 * Extracts code content from a code block (removes ``` markers and D2L artifacts)
 */
export function extractCodeContent(text: string): string {
  const lines = text.split('\n')
  
  // Remove first line if it starts with ```
  if (lines[0]?.match(/^```/)) {
    lines.shift()
  }
  
  // Remove last line if it's just ```
  if (lines[lines.length - 1]?.trim() === '```') {
    lines.pop()
  }
  
  // Clean D2L artifacts from each line
  return lines
    .map(line => line.replace(/\{\.[\w\s.-]+\}/g, ''))
    .join('\n')
}

/**
 * Checks if content is a code block
 */
export function isCodeBlock(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.startsWith('```') && trimmed.endsWith('```')
}
