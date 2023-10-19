import { getClosingBracket, replaceBetween, splitArgumentsString } from "../parse"

export function getMixins(joinedItems) {
  let mixins = joinedItems.match(/(?<=@mixin\s)[^\s\(]+/g)
  mixins = [...new Set(mixins)]

  return mixins
}

export function extractAndInsertMixins(joinedItems) {
  const mixins = {}

  // Find stated mixins and save their names and params to an object
  const mixinRegex = /@mixin/g
  let match
  while ((match = mixinRegex.exec(joinedItems)) != null) {
    let closing = getClosingBracket(joinedItems, "{", "}", match.index)
    if (closing < 0) {
      closing = joinedItems.length
    }
    const content = joinedItems.slice(match.index, closing)
    const name = content.match(/(?<=@mixin\s)(\w+)/)?.[0]

    if (!name) throw new Error("Mixin is missing a name")
    if (mixins[name]) throw new Error(`Mixin "${ name }" is already defined`)

    const firstOpenBracket = content.indexOf("{")
    const firstOpenParen = content.indexOf("(")
    const closingParen = getClosingBracket(content, "(", ")", firstOpenParen - 1)
    if (closingParen < 0) {
      continue
    }
    const params = splitArgumentsString(content.slice(firstOpenParen + 1, closingParen).replace(/\s/, ""))
    const paramsDefaults = params
      .map(param => {
        const slicedAt = param.indexOf("=")
        if (slicedAt != -1) return [param.slice(0, param.indexOf("=")), param.slice(param.indexOf("=") + 1)]
        else return [param]
      })
      .map(([key, value]) => ({ key: key.trim(), default: (value || "").trim() }))

    const mixin = content.slice(firstOpenBracket + 1, closing)?.trim()

    mixins[name] = {
      content: mixin,
      full: joinedItems.slice(match.index, closing + 1),
      params: paramsDefaults,
      hasContents: mixin.includes("@contents")
    }
  }

  // Remove mixins from content
  Object.values(mixins).forEach(({ full }) => joinedItems = joinedItems.replace(full, ""))

  // Find stated includes for mixins and replace them with mixins
  while (joinedItems.indexOf("@include") != -1) {
    // Get arguments
    const index = joinedItems.indexOf("@include")
    let closing = getClosingBracket(joinedItems, "(", ")", index + 1)
    if (closing < 0) closing = joinedItems.length
    const full = joinedItems.slice(index, closing + 1)
    const name = full.match(/(?<=@include\s)(\w+)/)?.[0]
    const mixin = mixins[name]

    if (!mixin) throw new Error(`Included a mixin that was not specified: "${ name }"`)

    const argumentsOpeningParen = full.indexOf("(")
    const argumentsClosingParen = getClosingBracket(full, "(", ")", argumentsOpeningParen - 1)
    if (argumentsClosingParen < 0) {
      continue
    }
    const argumentsString = full.slice(argumentsOpeningParen + 1, argumentsClosingParen)
    const splitArguments = splitArgumentsString(argumentsString) || []

    let replaceWith = mixin.content
    if (replaceWith.includes(`@include ${ name }`)) throw new Error("Can not include a mixin in itself")

    // Get content for @contents
    let fullMixin
    let contents
    if (mixin.hasContents) ({ replaceWith, fullMixin, contents } = replaceContents(mixin, joinedItems, index, replaceWith))

    mixin.params
      .map((param, index) => ({ ...param, index }))
      .sort((p1, p2) => p2.key.length - p1.key.length)
      .forEach(param => {
        replaceWith = replaceWith.replaceAll("Mixin." + param.key, splitArguments[param.index]?.trim() || param.default)
      })

    const closingSemicolon = (!mixin.hasContents || !contents) && joinedItems[closing + 1] == ";"

    joinedItems = replaceBetween(joinedItems, replaceWith, index, index + ((contents && fullMixin) || full).length + (closingSemicolon ? 1 : 0))
  }

  return joinedItems
}

/**
 * Replace every contents occurance with their corresponding slot from the mixin include.
 */
function replaceContents(mixin, joinedItems, index, replaceWith) {
  let contents = ""
  let contentsClosing = getClosingBracket(joinedItems, "{", "}", index)
  if (contentsClosing == -1) contentsClosing = joinedItems.length

  const fullMixin = joinedItems.slice(index, contentsClosing + 1)
  const contentsOpening = fullMixin.indexOf("{")

  if (contentsOpening != -1) {
    contents = fullMixin.slice(contentsOpening + 1, fullMixin.length - 1)
    if (contents.includes(`@include\s${ name }`)) throw new Error("Can not include a mixin in itself")
  }

  const slotContents = getSlotContents(contents, mixin)

  const contentsRegex = /@contents(?:\("(.+?)"\))?;?/g
  let match
  while ((match = contentsRegex.exec(replaceWith)) !== null) {
    const slot = match[1] || "default"
    const start = match.index
    const end = match.index + match[0].length

    if (!slot in slotContents) {
      throw new Error(`Slot "${ slot }" not found in mixin "${ mixin.name }"`)
    }

    replaceWith = replaceBetween(replaceWith, slotContents[slot], start, end)
  }

  return { contents, fullMixin, replaceWith }
}

function getSlotContents(contents, mixin) {
  const slotContents = {}
  const defaultSlotContent = []

  const slotsRegex = /@slot\("([^"]+)"\) {/g
  let lastIndex = 0
  let match

  while ((match = slotsRegex.exec(contents)) !== null) {
    const name = match[1] || ""
    const slotClosing = getClosingBracket(contents, "{", "}", match.index)

    defaultSlotContent.push(contents.slice(lastIndex, match.index))
    slotContents[name] = contents.slice(match.index + match[0].length, slotClosing)
    lastIndex = slotClosing + 1
  }

  // Add content after final slot to default slot
  defaultSlotContent.push(contents.slice(lastIndex))

  return { ...slotContents, default: defaultSlotContent.join("") }
}
