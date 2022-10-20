import path from 'path'
import fs from 'fs'
import container from 'markdown-it-container'
// import { docRoot } from '@cnos-frontend/build'
import MarkdownIt from 'markdown-it'
import type { RenderRule } from 'markdown-it/lib/renderer'
import type Token from 'markdown-it/lib/token'
import type Renderer from 'markdown-it/lib/renderer'
import { highlight } from './highlight'

const localMd = MarkdownIt()

interface ContainerOpts {
  marker?: string | undefined
  validate?(params: string): boolean
  render?(
    tokens: Token[],
    index: number,
    options: any,
    env: any,
    self: Renderer
  ): string
}
/** fork form https://github.com/vuejs/vitepress/blob/main/src/node/markdown/plugins/containers.ts */
export const containerPlugin = (md: MarkdownIt) => {
  md.use(...createContainer('tip', 'TIP', md))
    .use(...createContainer('info', 'INFO', md))
    .use(...createContainer('warning', 'WARNING', md))
    .use(...createContainer('danger', 'DANGER', md))
    .use(...createContainer('details', 'Details', md))
    // explicitly escape Vue syntax
    .use(container, 'v-pre', {
      render: (tokens: Token[], idx: number) =>
        tokens[idx].nesting === 1 ? '<div v-pre>\n' : '</div>\n',
    })
    .use(container, 'raw', {
      render: (tokens: Token[], idx: number) =>
        tokens[idx].nesting === 1 ? '<div class="vp-raw">\n' : '</div>\n',
    })
    .use(container, 'demo', {
      validate(params) {
        return !!params.trim().match(/^demo\s*(.*)$/)
      },
      render(tokens, idx) {
        const m = tokens[idx].info.trim().match(/^demo\s*(.*)$/)
        if (tokens[idx].nesting === 1) {
          const description = m && m.length > 1 ? m[1] : ''
          const sourceFileToken = tokens[idx + 2]
          let source = ''
          const sourceFile = sourceFileToken.children?.[0].content ?? ''

          if (sourceFileToken.type === 'inline') {
            source = fs.readFileSync(
              path.resolve(__dirname, '../../../docs/', `${sourceFile}.vue`),
              'utf-8',
            )
          }
          if (!source)
            throw new Error(`Incorrect source file: ${sourceFile}`)

          return `<Demo :demos="demos" source="${encodeURIComponent(
            highlight(source, 'vue'),
          )}" path="${sourceFile}" raw-source="${encodeURIComponent(
            source,
          )}" description="${encodeURIComponent(
            localMd.render(description),
          )}">`
        }
        else {
          return '</Demo>'
        }
      },
    } as ContainerOpts)
}

type ContainerArgs = [typeof container, string, { render: RenderRule }]

function createContainer(
  klass: string,
  defaultTitle: string,
  md: MarkdownIt,
): ContainerArgs {
  return [
    container,
    klass,
    {
      render(tokens, idx) {
        const token = tokens[idx]
        const info = token.info.trim().slice(klass.length).trim()
        if (token.nesting === 1) {
          const title = md.renderInline(info || defaultTitle)
          if (klass === 'details')
            return `<details class="${klass} custom-block"><summary>${title}</summary>\n`

          return `<div class="${klass} custom-block"><p class="custom-block-title">${title}</p>\n`
        }
        else {
          return klass === 'details' ? '</details>\n' : '</div>\n'
        }
      },
    },
  ]
}
