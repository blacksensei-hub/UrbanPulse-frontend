// Splits a content_pages FAQ body into its intro text and {q, a} pairs by
// splitting on '## Question' headings — the inverse of how the FAQ seed
// content is authored. Keeps FAQ.jsx's existing accordion markup untouched.
export function parseFaqBody(markdown = '') {
  const text = markdown.trim();
  const headingRe = /^##\s+(.+)$/gm;
  const matches = [...text.matchAll(headingRe)];
  const introEnd = matches.length ? matches[0].index : text.length;
  const intro = text.slice(0, introEnd).trim();
  const faqs = matches.map((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    return { q: m[1].trim(), a: text.slice(start, end).trim() };
  });
  return { intro, faqs };
}
