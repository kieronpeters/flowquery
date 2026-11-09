/**
 * Copy text to the clipboard, with a fallback for browsers that do not expose
 * the async Clipboard API. The content is never a secret: it is either the
 * universal onboarding prompt or a ticket URL.
 */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const element = document.createElement('textarea')
  element.value = text
  element.setAttribute('readonly', '')
  element.style.position = 'fixed'
  element.style.opacity = '0'
  document.body.appendChild(element)
  element.select()

  const copied = document.execCommand('copy')
  document.body.removeChild(element)

  if (!copied) throw new Error('Copy failed')
}
