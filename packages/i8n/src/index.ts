const dictionaries = {
  "en-US": () => import('./en-US.json').then((module) => module.default),
  "es-AR": () => import('./es-AR.json').then((module) => module.default),
}

export type Dictionary = Awaited<ReturnType<typeof dictionaries[Lang]>>
export type Lang = keyof typeof dictionaries
export const Locales = Object.keys(dictionaries) as Lang[]

const cache = new Map<Lang, Promise<Dictionary>>()
export const getDictionary = async (locale: Lang): Promise<Dictionary> => {
  if (!cache.has(locale)) {
    cache.set(locale, dictionaries[locale]())
  }
  return cache.get(locale)!
}

export const preloadDictionary = (locales: Lang) => {
  void getDictionary(locales)
}
