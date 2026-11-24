import en from './en.json'
import hi from './hi.json'

export type Language = 'en' | 'hi'
export type Messages = typeof en

export function getMessages(language: Language): Messages {
  return language === 'hi' ? hi : en
}
