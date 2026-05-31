export const APP_URL = "https://ekonek.app";

export async function shareContent(title: string, text: string, url: string) {
  const fullUrl = APP_URL + url;
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url: fullUrl });
    } catch (e) {
      // User cancelled share — ignore
    }
  } else {
    // Fallback — copy to clipboard
    await navigator.clipboard.writeText(fullUrl);
    return "copied";
  }
  return "shared";
}
