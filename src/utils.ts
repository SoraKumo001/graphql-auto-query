/**
 * Convert the first character of a string to lowercase
 * @param str Input string
 * @returns String with first character in lowercase
 */
export const lowercaseFirst = (str: string) =>
  str.charAt(0).toLowerCase() + str.slice(1);

/**
 * Convert the first character of a string to uppercase
 * @param str Input string
 * @returns String with first character in uppercase
 */
export const upperFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Create a string of spaces
 * @param num Number of spaces
 * @returns String of spaces
 */
export const createSpaces = (num: number) => Array(num).fill(" ").join("");
