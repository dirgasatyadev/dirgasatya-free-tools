export function normalizeImageBaseName(value: string, fallback = 'image', maxLength = 180) {
  const withoutControlCharacters = Array.from(value).filter((character) => character.charCodeAt(0) >= 32).join('')
  return withoutControlCharacters.replace(/[<>:"/\\|?*]/g, '-').replace(/[. ]+$/g, '').trim().slice(0, maxLength) || fallback
}

export function createUniqueFileName(baseName: string, extension: string, usedNames: Set<string>) {
  let fileName = `${baseName}.${extension}`
  let suffix = 2
  while (usedNames.has(fileName.toLocaleLowerCase('en'))) fileName = `${baseName}-${suffix++}.${extension}`
  usedNames.add(fileName.toLocaleLowerCase('en'))
  return fileName
}
