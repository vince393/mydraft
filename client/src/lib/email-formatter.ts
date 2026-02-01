/**
 * Fast client-side email formatter - instant, safe HTML cleanup
 * Only does minimal, non-destructive cleanup that won't break content
 */

export function formatEmailBody(html: string): string {
  if (!html) return '';
  
  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Remove tracking pixels (1x1 images, hidden images) - safe operation
  const images = temp.querySelectorAll('img');
  images.forEach(img => {
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    const style = img.getAttribute('style') || '';
    
    // Only remove clearly invisible/tracking images
    if (
      (width === '1' && height === '1') ||
      (width === '0' || height === '0') ||
      style.includes('display:none') ||
      style.includes('display: none') ||
      style.includes('visibility:hidden')
    ) {
      img.remove();
    }
  });
  
  // Remove script and style tags - safe operation
  temp.querySelectorAll('script, style, meta, link').forEach(el => el.remove());
  
  // Get content
  let content = temp.innerHTML;
  
  // Clean up excessive whitespace only - safe operations
  content = content.replace(/(<br\s*\/?>\s*){4,}/gi, '<br><br><br>');
  content = content.replace(/(&nbsp;){3,}/gi, '&nbsp;&nbsp;');
  
  // Remove empty paragraphs only
  content = content.replace(/<p>\s*<\/p>/gi, '');
  content = content.replace(/<p>&nbsp;<\/p>/gi, '');
  
  return content.trim() || html;
}
