import fs from 'fs';
import JSZip from 'jszip';
import type { BookChapter } from '../src/types';

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…');
}

function htmlToPlainText(html: string): { title: string; content: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  const cleaned = bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote|section)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const normalized = decodeHtmlEntities(cleaned)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    title: decodeHtmlEntities(rawTitle).trim(),
    content: normalized,
  };
}

export async function parseEpubChapters(filePath: string): Promise<BookChapter[]> {
  try {
    const buffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buffer);

    const htmlEntries = Object.keys(zip.files)
      .filter((name) => {
        const lower = name.toLowerCase();
        return (
          !zip.files[name].dir &&
          (lower.endsWith('.xhtml') || lower.endsWith('.html') || lower.endsWith('.htm')) &&
          !lower.includes('nav.') &&
          !lower.includes('toc.')
        );
      })
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const chapters: BookChapter[] = [];
    for (let i = 0; i < htmlEntries.length; i++) {
      const entryName = htmlEntries[i];
      const raw = await zip.files[entryName].async('string');
      const { title, content } = htmlToPlainText(raw);
      if (content.length >= 20) {
        chapters.push({
          id: `epub-bab-${i + 1}`,
          title: title || `Bagian ${chapters.length + 1}`,
          content,
        });
      }
    }

    return chapters;
  } catch {
    return [];
  }
}
