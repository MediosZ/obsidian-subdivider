import { fromMarkdown, Options as FromMdOptions } from 'mdast-util-from-markdown'
import { toMarkdown, Options as ToMdOptions } from 'mdast-util-to-markdown'

import { frontmatter } from 'micromark-extension-frontmatter'
import { frontmatterFromMarkdown, frontmatterToMarkdown } from 'mdast-util-frontmatter'
import { gfm } from 'micromark-extension-gfm'
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm'


const FromMarkdownOptions: FromMdOptions = {
    extensions: [frontmatter(['yaml', 'toml']), gfm()],
    mdastExtensions: [frontmatterFromMarkdown(['yaml', 'toml']), gfmFromMarkdown()]
}

/* eslint-disable  @typescript-eslint/no-explicit-any */
function textHandler(node: any, _: any, context: any) {
    const exit = context.enter('text')
    exit()
    return node.value
}

/* eslint-disable  @typescript-eslint/no-explicit-any */
function customJoin(left: any, right: any, parent: any, state: any) {
    return 0
}

const ToMarkdownOptions: ToMdOptions = {
    extensions: [frontmatterToMarkdown(['yaml', 'toml']), gfmToMarkdown()],
    handlers: {
        text: textHandler
    }
}

function fromMd(input: string) {
    return fromMarkdown(input, FromMarkdownOptions)
}

function toMd(input: any, compact: boolean = false) {
    if (compact) {
        ToMarkdownOptions.join = [customJoin]
    }
    else {
        delete ToMarkdownOptions.join
    }
    return toMarkdown(input, ToMarkdownOptions)
}

export { FromMarkdownOptions, ToMarkdownOptions, fromMd, toMd };