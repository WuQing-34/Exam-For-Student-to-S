import { Typography, Box, Tooltip, IconButton } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'

interface QuestionContentProps {
  content: string
  component?: 'body1' | 'body2' | 'subtitle1'
  sx?: any
  // 内联填空（嵌入横线位置）
  blankCount?: number
  blankValues?: string[]
  onBlankChange?: (blankIdx: number, value: string) => void
}

/**
 * 表格样式（注入到 dangerouslySetInnerHTML 中）
 */
const TABLE_CSS = `
<style>
.q-content-table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 14px; }
.q-content-table th, .q-content-table td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
.q-content-table th { background: #f5f5f5; font-weight: 600; }
.q-content-table td { background: #fff; }
</style>
`

// 圆圈序号字符集（①-⑳ + ㉑-㉕）
const CIRCLE_CHARS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕'

function getCircleIndex(circle: string): number {
  return CIRCLE_CHARS.indexOf(circle)
}

interface TextPart {
  type: 'html' | 'blank'
  content?: string
  label?: string  // 填空标签（圆圈序号或字母）
}

/** 将文本拆分为普通文本和填空位置
 *  以连续下划线 ____ 为检测标准，支持多种格式：
 *  - ①________  圆圈序号+下划线
 *  - |文本|________|  表格单元格下划线
 *  - (________)  括号内下划线
 *  - 风、________、颂  文本间下划线
 *  排除：HTML <u>标签内的下划线
 */
function splitTextWithBlanks(text: string): TextPart[] {
  // 匹配连续下划线（至少3个），但不在 <u>...</u> 标签内
  // 策略：先移除 <u>...</u> 做检测，但用原始文本做拆分
  const withoutUTags = text.replace(/<u>[^<]*<\/u>/gi, '')
  const re = /_{3,}/g
  const result: TextPart[] = []
  let lastIndex = 0
  let blankIndex = 0

  while (re.exec(withoutUTags) !== null) {
    // 将 withoutUTags 中的索引映射回原始文本
    // 由于 <u>...</u> 被移除，索引可能偏移，这里简化处理：
    // 在原始文本中从 lastIndex 开始找下一个匹配
    const searchStart = lastIndex
    const originalMatch = text.slice(searchStart).match(/_{3,}/)
    if (!originalMatch) break

    const originalIndex = searchStart + (originalMatch.index || 0)
    const originalLen = originalMatch[0].length

    if (originalIndex > lastIndex) {
      result.push({ type: 'html', content: textToHtml(text.slice(lastIndex, originalIndex)) })
    }

    // 检查这个下划线前面是否有圆圈序号
    const prefix = text.slice(Math.max(0, originalIndex - 5), originalIndex)
    const circleMatch = prefix.match(/([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕])$/)
    if (circleMatch) {
      // 圆圈序号+下划线：标签用圆圈序号
      result.push({ type: 'blank', label: circleMatch[1] })
    } else {
      // 普通下划线：用 ①②③… 作为标签
      result.push({ type: 'blank', label: String.fromCodePoint(0x2460 + blankIndex) })
      blankIndex++
    }

    lastIndex = originalIndex + originalLen
  }

  if (lastIndex < text.length) {
    result.push({ type: 'html', content: textToHtml(text.slice(lastIndex)) })
  }

  if (result.length === 0) {
    result.push({ type: 'html', content: textToHtml(text) })
  }

  return result
}

/**
 * 将纯文本转为 HTML：转义 + 换行 + 保留安全标签
 */
function textToHtml(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 恢复信任的标签（内联 + 表格）
    .replace(/&lt;(\/?)(u|b|i|strong|em|br|table|thead|tbody|tr|td|th)\s*&gt;/g, '<$1$2>')
    // 恢复带属性的标签（colspan 等）
    .replace(/&lt;(td|th)\s+([^&]*?)&gt;/g, '<$1 $2>')
    .replace(/\n/g, '<br/>')

  // 给 table 添加 class 方便样式控制
  html = html.replace(/<table>/g, '<table class="q-content-table">')

  // 如果包含表格，注入样式
  if (html.includes('<table')) {
    html = TABLE_CSS + html
  }

  // 圆圈序号 + 下划线空白 高亮：①________ → <span style="color:#1976d2;font-weight:600">①</span><span>________</span>
  html = html.replace(
    /([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕])(_{2,}|_{2,})/g,
    '<span style="color:#1976d2;font-weight:700">$1</span><span style="letter-spacing:2px">$2</span>'
  )

  return html
}

/**
 * 题目内容渲染组件
 * 支持：
 * - 内嵌图片：![描述](/uploads/xxx.png)
 * - 纵向公式块：$$line1\nline2$$
 * - HTML 标签：<u>下划线</u>、<b>加粗</b>、<i>斜体</i>
 * - HTML 表格：<table>/<tr>/<td>/<th>
 * - 换行符自动转为 <br/>
 */
export function QuestionContent({ content, component = 'body1', sx, blankCount, blankValues, onBlankChange }: QuestionContentProps) {
  // 先拆图片标记，再拆公式块
  const parts = content.split(/(!\[[^\]]*\]\([^)]+\)|\$\$[\s\S]*?\$\$)/g)
  const enableInlineBlanks = blankCount && blankCount > 1 && onBlankChange

  const handleDownloadImage = (src: string, alt: string) => {
    const a = document.createElement('a')
    a.href = src
    a.download = alt || 'image'
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <Box sx={{ mt: 0.5, lineHeight: 1.8, ...sx }}>
      {parts.map((part, i) => {
        // 图片
        const imgMatch = part?.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
        if (imgMatch) {
          const alt = imgMatch[1] || '题目图片'
          const src = imgMatch[2]
          return (
            <Box key={`img-${i}`} sx={{ position: 'relative', display: 'inline-block', my: 1 }}>
              <Box
                component="img"
                src={src}
                alt={alt}
                sx={{
                  maxWidth: '100%',
                  maxHeight: 300,
                  borderRadius: 1,
                  display: 'block',
                  mx: 'auto',
                }}
              />
              <Tooltip title="下载图片">
                <IconButton
                  size="small"
                  onClick={() => handleDownloadImage(src, alt)}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'rgba(0,0,0,0.45)',
                    color: '#fff',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                    p: 0.5,
                  }}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )
        }
        // 纵向公式块 $$...$$
        const mathMatch = part?.match(/^\$\$([\s\S]*?)\$\$$/)
        if (mathMatch) {
          const lines = mathMatch[1].trim().split('\n').filter(Boolean)
          return (
            <Box
              key={`math-${i}`}
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                verticalAlign: 'middle',
                mx: 0.5,
              }}
            >
              {/* 左花括号 */}
              <Typography component="span" variant={component} sx={{ fontSize: '1.4em', lineHeight: 1, mr: 0.5 }}>
                {'{'}
              </Typography>
              {/* 方程组内容 */}
              <Box component="span" sx={{ display: 'inline-block', textAlign: 'left' }}>
                {lines.map((line, li) => (
                  <Typography
                    key={li}
                    component="div"
                    variant={component}
                    sx={{
                      fontFamily: '"Times New Roman", Cambria Math, serif',
                      fontStyle: 'italic',
                      lineHeight: 1.5,
                    }}
                  >
                    {line.trim()}
                  </Typography>
                ))}
              </Box>
            </Box>
          )
        }
        // 普通文本 → 转 HTML 渲染（支持换行、<u>/<b>/<i>、表格）
        if (enableInlineBlanks) {
          const textParts = splitTextWithBlanks(part)
          return textParts.map((tp, tpi) => {
            if (tp.type === 'html') {
              const innerHtml = tp.content || ''
              const tpHasTable = innerHtml.includes('<table')
              return (
                <Typography
                  key={`text-${i}-${tpi}`}
                  variant={component}
                  component={tpHasTable ? 'div' : 'span'}
                  dangerouslySetInnerHTML={{ __html: innerHtml }}
                />
              )
            }
            // 内联填空输入框
            const blankIdx = tp.label ? getCircleIndex(tp.label) : -1
            const fallbackIdx = blankIdx >= 0 ? blankIdx : tpi
            const value = blankValues?.[fallbackIdx] ?? ''
            return (
              <Box
                key={`blank-${i}-${tpi}`}
                component="input"
                value={value}
                onChange={e => onBlankChange?.(fallbackIdx, e.target.value)}
                placeholder={tp.label || ''}
                sx={{
                  border: 'none',
                  borderBottom: '1.5px solid #90caf9',
                  outline: 'none',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  width: '5.5em',
                  minWidth: '3em',
                  textAlign: 'center',
                  bgcolor: 'rgba(25, 118, 210, 0.05)',
                  color: 'text.primary',
                  mx: 0.3,
                  py: 0.2,
                  borderRadius: '2px 2px 0 0',
                  transition: 'all 0.2s',
                  verticalAlign: 'middle',
                  '&:focus': {
                    borderBottom: '2.5px solid #1976d2',
                    bgcolor: 'rgba(25, 118, 210, 0.1)',
                  },
                  '&::placeholder': {
                    color: '#1976d2',
                    opacity: 0.4,
                    fontWeight: 500,
                  },
                }}
              />
            )
          })
        }

        const html = textToHtml(part)
        const hasTable = html.includes('<table')
        return (
          <Typography
            key={`text-${i}`}
            variant={component}
            component={hasTable ? 'div' : 'span'}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      })}
    </Box>
  )
}
