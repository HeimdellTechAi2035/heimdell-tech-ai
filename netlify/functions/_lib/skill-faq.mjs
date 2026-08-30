import { searchFaqs, getOrganisation } from './knowledge.mjs';
import { randomUUID } from 'node:crypto';

function textOf(message) {
  return (message.parts || [])
    .filter((p) => 'text' in p)
    .map((p) => p.text)
    .join(' ');
}

export async function handleFaqSkill(message) {
  const query = textOf(message);
  const { matches, catalogueVersion } = await searchFaqs(query, 3);

  let textPart;
  let confidence;

  if (matches.length === 0) {
    const org = await getOrganisation();
    textPart =
      `I don't have a specific answer for that in Heimdell Tech Ai's knowledge catalogue. ` +
      `You can reach the team directly at ${org.email} or ${org.telephone}, or see the full site at ${org.website}.`;
    confidence = 'none';
  } else {
    textPart = matches.map((m) => m.answer).join('\n\n');
    confidence = matches[0].score >= 6 ? 'high' : 'medium';
  }

  return {
    message: {
      messageId: randomUUID(),
      contextId: message.contextId || randomUUID(),
      role: 'ROLE_AGENT',
      parts: [
        { text: textPart, mediaType: 'text/plain' },
        {
          data: {
            matches,
            confidence,
            answeredFrom: 'curated-knowledge-catalogue',
            catalogueVersion
          },
          mediaType: 'application/json'
        }
      ]
    }
  };
}
