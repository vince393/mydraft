export function stripHtml(html: string): string {
  let text = html;
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/tr>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = text.replace(/&nbsp;/gi, " ");
  text = text.replace(/&amp;/gi, "&");
  text = text.replace(/&lt;/gi, "<");
  text = text.replace(/&gt;/gi, ">");
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]+/g, " ");
  return text.trim();
}

export function stripEmailNoise(body: string): string {
  const isHtml = /<[a-z][\s\S]*>/i.test(body);
  let text = isHtml ? stripHtml(body) : body;

  text = text.replace(/^On .{10,80} wrote:\s*$/gm, "");

  text = text.replace(
    /^-{2,}\s*(?:Original Message|Forwarded message)\s*-{2,}[\s\S]*$/im,
    "",
  );

  text = text.replace(
    /^From:\s+.+\nSent:\s+.+\nTo:\s+.+(?:\nCc:\s+.+)?(?:\nSubject:\s+.+)?[\s\S]*$/im,
    "",
  );

  text = text.replace(
    /^From:\s+.+\nDate:\s+.+\nSubject:\s+.+\nTo:\s+.+[\s\S]*$/im,
    "",
  );

  const lines = text.split("\n");
  const cleaned: string[] = [];
  let quoteCount = 0;
  for (const line of lines) {
    if (/^>/.test(line.trim())) {
      quoteCount++;
      if (quoteCount <= 2) {
        cleaned.push(line);
      }
    } else {
      quoteCount = 0;
      cleaned.push(line);
    }
  }
  text = cleaned.join("\n");

  const sigPatterns = [
    /^--\s*$/m,
    /^_{3,}\s*$/m,
    /^-{3,}\s*$/m,
    /^Sent from my (?:iPhone|iPad|Android|Samsung|Galaxy|Pixel).*/im,
    /^Get Outlook for .*/im,
    /^Sent from (?:Mail|Yahoo|AOL) .*/im,
    /^Envoyé depuis .*/im,
    /^Enviado desde .*/im,
  ];

  for (const pattern of sigPatterns) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      const before = text.slice(0, match.index).trim();
      if (before.length > 50) {
        text = before;
        break;
      }
    }
  }

  const disclaimerPatterns = [
    /^(?:CONFIDENTIALITY|DISCLAIMER|LEGAL)\s*(?:NOTICE|WARNING)?[\s\S]{0,500}$/im,
    /^This (?:email|message|communication) (?:and any attachments?|is confidential)[\s\S]{0,500}$/im,
    /^(?:The information contained|If you (?:are not|have received) the intended recipient)[\s\S]{0,500}$/im,
  ];

  for (const pattern of disclaimerPatterns) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      const before = text.slice(0, match.index).trim();
      if (before.length > 50) {
        text = before;
      }
    }
  }

  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}
