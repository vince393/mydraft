/**
 * Professional email formatter - Gmail/Apple Mail style rendering
 * Handles HTML email cleanup, normalization, and accessibility
 */

export function formatEmailBody(html: string): string {
  if (!html) return '';
  
  // Parse HTML into a detached document using DOMParser (safer than innerHTML on div)
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const temp = parsed.body;
  
  // Remove tracking pixels (1x1 images, hidden images)
  const images = temp.querySelectorAll('img');
  images.forEach(img => {
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    const style = img.getAttribute('style') || '';
    const src = img.getAttribute('src') || '';
    
    // Remove clearly invisible/tracking images
    const isTrackingPixel = 
      (width === '1' && height === '1') ||
      (width === '0' || height === '0') ||
      style.includes('display:none') ||
      style.includes('display: none') ||
      style.includes('visibility:hidden') ||
      style.includes('visibility: hidden') ||
      style.includes('width:0') ||
      style.includes('width: 0') ||
      style.includes('height:0') ||
      style.includes('height: 0') ||
      src.includes('track') ||
      src.includes('beacon') ||
      src.includes('pixel') ||
      src.includes('open.gif');
    
    if (isTrackingPixel) {
      img.remove();
    }
  });
  
  // Remove script, style, and other unsafe elements
  temp.querySelectorAll('script, style, meta, link, head, title, base, object, embed, applet, iframe, form').forEach(el => el.remove());
  
  // Dangerous URL schemes to remove
  const dangerousSchemes = ['javascript:', 'vbscript:', 'data:text/html', 'data:application'];
  
  // Sanitize all elements - remove event handlers and dangerous URLs
  temp.querySelectorAll('*').forEach(el => {
    const attrs = Array.from(el.attributes);
    attrs.forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase().trim();
      
      // Remove all event handlers (onclick, onerror, onload, etc.)
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        return;
      }
      
      // Sanitize href, src, action, formaction, data attributes
      if (['href', 'src', 'action', 'formaction', 'data', 'poster', 'background'].includes(name)) {
        const isDangerous = dangerousSchemes.some(scheme => value.startsWith(scheme));
        if (isDangerous) {
          el.removeAttribute(attr.name);
          // For links with javascript:, replace with safe placeholder
          if (el.tagName.toLowerCase() === 'a' && name === 'href') {
            el.setAttribute('href', '#');
            el.setAttribute('data-blocked', 'true');
          }
        }
      }
      
      // Remove style attributes that could execute code
      if (name === 'style' && (value.includes('expression(') || value.includes('url(javascript:'))) {
        el.removeAttribute('style');
      }
    });
  });
  
  // Remove any remaining javascript: in href after attribute processing
  temp.querySelectorAll('a[href^="javascript:"], a[href^="Javascript:"], a[href^="JAVASCRIPT:"]').forEach(a => {
    a.setAttribute('href', '#');
  });
  
  // Clean up excessive consecutive line breaks
  let content = temp.innerHTML;
  
  // Replace 4+ consecutive br tags with just 2
  content = content.replace(/(<br\s*\/?>\s*){4,}/gi, '<br><br>');
  
  // Replace 4+ consecutive nbsp with 2
  content = content.replace(/(&nbsp;){4,}/gi, '&nbsp;&nbsp;');
  
  // Remove completely empty paragraphs (no content, no children)
  content = content.replace(/<p>\s*<\/p>/gi, '');
  content = content.replace(/<p>&nbsp;<\/p>/gi, '');
  
  // Fix MS Office generated content - remove excessive empty MsoNormal paragraphs
  content = content.replace(/(<p class="MsoNormal">\s*(&nbsp;)?\s*<\/p>\s*){3,}/gi, '<p class="MsoNormal">&nbsp;</p>');
  
  // Clean up Office junk
  content = content.replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '');
  content = content.replace(/<o:p>[\s\S]*?<\/o:p>/gi, '');
  content = content.replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, '');
  
  // Normalize whitespace between tags (but preserve pre/code)
  content = content.replace(/>\s{2,}</g, '> <');
  
  // Remove outlook-style comments that create weird spacing
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  return content.trim() || html;
}

/**
 * Strip HTML to plain text for previews
 */
export function stripHtmlToPlainText(html: string): string {
  if (!html) return '';
  
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const temp = parsed.body;
  
  // Replace br and p with newlines
  temp.querySelectorAll('br').forEach(br => {
    br.replaceWith('\n');
  });
  
  temp.querySelectorAll('p, div').forEach(block => {
    const text = block.textContent || '';
    block.replaceWith(text + '\n');
  });
  
  // Get text content and clean up
  let text = temp.textContent || '';
  
  // Normalize whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  
  return text.trim();
}

/**
 * Check if content is HTML or plain text
 */
export function isHtmlContent(content: string): boolean {
  if (!content) return false;
  
  // Check for common HTML tags
  const htmlPattern = /<(?:html|head|body|div|p|br|table|tr|td|span|a|img|ul|ol|li|h[1-6]|blockquote)\b/i;
  return htmlPattern.test(content);
}
