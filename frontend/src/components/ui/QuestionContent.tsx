import { Typography, Box } from '@mui/material'

interface QuestionContentProps {
  content: string
  component?: 'body1' | 'body2' | 'subtitle1'
  sx?: any
}

/**
 * 题目内容渲染组件
 * 支持在文本中嵌入图片：![描述](/uploads/xxx.png)
 * 支持纵向公式块：$$line1\nline2$$
 * 也支持纯文本
 */
export function QuestionContent({ content, component = 'body1', sx }: QuestionContentProps) {
  // 先拆图片标记，再拆公式块
  const parts = content.split(/(!\[[^\]]*\]\([^)]+\)|\$\$[\s\S]*?\$\$)/g)

  return (
    <Box sx={{ mt: 0.5, lineHeight: 1.8, ...sx }}>
      {parts.map((part, i) => {
        // 图片
        const imgMatch = part?.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
        if (imgMatch) {
          const alt = imgMatch[1] || '题目图片'
          const src = imgMatch[2]
          return (
            <Box
              key={`img-${i}`}
              component="img"
              src={src}
              alt={alt}
              sx={{
                maxWidth: '100%',
                maxHeight: 300,
                borderRadius: 1,
                my: 1,
                display: 'block',
                mx: 'auto',
              }}
            />
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
        // 普通文本
        return (
          <Typography key={`text-${i}`} variant={component} component="span">
            {part}
          </Typography>
        )
      })}
    </Box>
  )
}
