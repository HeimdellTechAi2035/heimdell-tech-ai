import { searchKnowledge, getOrganisation } from './knowledge.mjs';
import { randomUUID } from 'node:crypto';

function textOf(message) {
  return (message.parts || [])
    .filter((p) => 'text' in p)
    .map((p) => p.text)
    .join(' ');
}

export async function handleFaqSkill(message) {
  const query = textOf(message).slice(0, 500);
  const { matches, catalogueVersion } = await searchKnowledge(query, 3);

  let textPart;
  let confidence;

  if (matches.length === 0) {
    const org = await getOrganisation();
    const reach = org.telephone ? `${org.email} or ${org.telephone}` : org.email;
    textPart =
      `I don't have a specific answer for that in Heimdell Tech Ai's knowledge catalogue. ` +
      `You can reach the team directly at ${reach}, or see the full site at ${org.website}.`;
    confidence = 'none';
  } else {
    const [best, ...rest] = matches;
    textPart = best.answer;
    if (rest.length) textPart += `\n\nRelated questions: ${rest.map((m) => m.question).join(' | ')}`;
    confidence = best.score >= 6 ? 'high' : best.score >= 3 ? 'medium' : 'low';
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
