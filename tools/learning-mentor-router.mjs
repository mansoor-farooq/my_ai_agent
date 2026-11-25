#!/usr/bin/env node

const LEARNING_SIGNAL = /\b(?:samjhao|samjha(?:o|na)|deep\s*dive|learn(?:ing)?|seekhna|seekh(?:na|ni)|teach|mentor|guide|explain|why|kyun|concept|walk\s*me\s*through|step\s*by\s*step|what\s+is|how\s+does|research\s+karke)\b/i;
const DEEP_SIGNAL = /\b(?:deep\s*dive|detail(?:ed)?|advanced|course|roadmap|research|master|comprehensive|gehra(?:i)?|poora\s+samjhao)\b/i;
const STOP_WORDS = new Set('mujhe mujhy mein main is ke ka bare about the a an and or aur for to of par pe ki ko me se hai ho hain bata batao do you can please explain samjhao samjhana learn learning teach guide mentor deep dive detail detailed advanced course roadmap research karke kya kyun what how does does this topic topic'.split(/\s+/));

function tokens(value) {
  return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}+#.-]+/gu, ' ').split(/\s+/).filter((token) => token && !STOP_WORDS.has(token));
}

function extractTopic(request) {
  const text = String(request || '').trim();
  const marker = text.match(/\b(?:about|on|regarding|ke\s+bare\s+mein|kay\s+baray\s+mein|for)\b/i);
  if (marker) {
    const tail = text.slice((marker.index || 0) + marker[0].length).split(/\b(?:deep\s+dive|detail(?:ed)?|samjhao|batao|explain|research|seekhna|learn)\b/i)[0];
    const candidate = tokens(tail).slice(0, 5).join(' ');
    if (candidate) return candidate;
  }
  const cleaned = tokens(text);
  return cleaned.slice(0, 5).join(' ');
}

export function detectLearningIntent({ request = '', transcript = '', files = [] } = {}) {
  const corpus = `${request} ${transcript}`.trim();
  const matched = LEARNING_SIGNAL.test(corpus);
  const mode = DEEP_SIGNAL.test(corpus) ? 'deep' : 'fast';
  return { matched, mode: matched ? mode : 'none', topic: matched ? extractTopic(corpus) : '', signals: matched ? ['learning-intent'] : [], confidence: matched ? 0.92 : 0, files: [...files].map(String) };
}

export function planTeacherResearch({ request = '', evidence = [] } = {}) {
  const intent = detectLearningIntent({ request });
  const queryTerms = tokens(intent.topic || request).slice(0, 8);
  const hasTopicEvidence = Array.isArray(evidence) && evidence.some((item) => tokens(item?.title || item?.text || item?.claim || item).some((term) => queryTerms.includes(term)));
  return {
    status: hasTopicEvidence ? 'evidence-available' : 'research-required',
    topic: intent.topic,
    queryTerms,
    answerAllowed: hasTopicEvidence,
    researchQueries: queryTerms.length ? [queryTerms.join(' '), `${queryTerms.join(' ')} official documentation`] : [],
  };
}

export function enforceTopicScope({ requestedTopic = '', answerText = '', evidenceTerms = [] } = {}) {
  const requested = tokens(requestedTopic);
  const answer = tokens(answerText);
  const evidence = tokens(evidenceTerms);
  const overlap = requested.filter((term) => answer.includes(term) || evidence.includes(term));
  if (!requested.length || !overlap.length) return { ok: false, reason: 'topic-mismatch', answerAllowed: false, requestedTopic, overlap };
  return { ok: true, reason: 'topic-match', answerAllowed: true, requestedTopic, overlap };
}

