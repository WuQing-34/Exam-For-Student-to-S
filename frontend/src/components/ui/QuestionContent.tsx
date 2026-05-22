import { Typography, Box } from '@mui/material'

interface QuestionContentProps {
  content: string
  component?: 'body1' | 'body2' | 'subtitle1'
  sx?: any
}

/**
 * 题目内容渲染组件
 * 支持在文本中嵌入图片：![描述](/uploads/xxx.png)
 * 也支持纯文本
 */
export function QuestionContent({ content, component = 'body1', sx }: QuestionContentProps) {
  // 按 ![alt](url) 模式拆分
  const parts = content.split(/(!\[[^\]]*\]\([^)]+\))/g)

  return (
    <Typography variant={component} sx={{ mt: 0.5, lineHeight: 1.8, ...sx }}>
      {parts.map((part, i) => {
        const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
        if (imgMatch) {
          const alt = imgMatch[1] || '题目图片'
          const src = imgMatch[2]
          return (
            <Box
              key={i}
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
        return <span key={i}>{part}</span>
      })}
    </Typography>
  )
}
