import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'

import { frontmatter } from 'micromark-extension-frontmatter'
import { frontmatterFromMarkdown, frontmatterToMarkdown } from 'mdast-util-frontmatter'
import { gfm } from 'micromark-extension-gfm'
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm'


const FromMarkdownExt = {
    extensions: [frontmatter(['yaml', 'toml']), gfm()],
    mdastExtensions: [frontmatterFromMarkdown(['yaml', 'toml']), gfmFromMarkdown()]
}

/* eslint-disable  @typescript-eslint/no-explicit-any */
function textHandler(node: any, _: any, context: any) {
    const exit = context.enter('text')
    exit()
    return node.value
}


const ToMarkdownExt = {
    extensions: [frontmatterToMarkdown(['yaml', 'toml']), gfmToMarkdown()],
    handlers: {
        text: textHandler
    }
}

function fromMd(input: string) {
    return fromMarkdown(input, FromMarkdownExt)
}

function toMd(input: any) {
    return toMarkdown(input, ToMarkdownExt)
}

export { FromMarkdownExt, ToMarkdownExt, fromMd, toMd };