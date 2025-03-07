/**
 * Converts a string to camelCase.
 *
 * @param input The string to convert to camelCase
 * @returns The camelCased string
 */
export function camelCase(input: string): string {
  // Handle empty strings
  if (!input || input.length === 0) {
    return ''
  }

  // If the string doesn't contain any separators and already has camelCase format,
  // return it as is to preserve the existing casing
  if (!/[^a-zA-Z0-9]/.test(input) && /^[a-z][a-zA-Z0-9]*$/.test(input)) {
    return input
  }

  // Split the input string by non-alphanumeric characters
  const words: string[] = input.split(/[^a-zA-Z0-9]+/).filter(Boolean)

  if (words.length === 0) {
    return ''
  }

  // Convert the first word to lowercase
  let result: string = words[0].toLowerCase()

  // Convert the rest of the words to title case and append them
  for (let i = 1; i < words.length; i++) {
    const word: string = words[i]
    if (word.length > 0) {
      result += word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    }
  }

  return result
}

export default camelCase
