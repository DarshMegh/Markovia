/* ===========================================================
   Markovia — Markov chain text generator core
   A from-scratch statistical language model: tokenizes a corpus,
   builds an n-gram transition table, and generates new text by
   sampling from it. No neural network, no external AI — this is
   the same core idea (predict the next token from context) using
   plain frequency statistics instead of learned weights.
   =========================================================== */

const SEP = '\u0001'; // unlikely-to-collide separator for context keys

function tokenize(text) {
  return String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Builds an order-N Markov model from a token list.
 * Returns a Map: contextKey -> Map(nextToken -> count)
 */
function buildModel(tokens, order) {
  const model = new Map();
  if (tokens.length <= order) return model;

  for (let i = 0; i <= tokens.length - order - 1; i++) {
    const context = tokens.slice(i, i + order).join(SEP);
    const next = tokens[i + order];

    if (!model.has(context)) model.set(context, new Map());
    const nextMap = model.get(context);
    nextMap.set(next, (nextMap.get(next) || 0) + 1);
  }

  return model;
}

/**
 * Returns the possible next words for a given context, sorted by
 * probability descending: [{ word, count, probability }, ...]
 */
function getNextWordDistribution(model, context) {
  const nextMap = model.get(context);
  if (!nextMap) return [];

  const total = Array.from(nextMap.values()).reduce((a, b) => a + b, 0);
  return Array.from(nextMap.entries())
    .map(([word, count]) => ({ word, count, probability: count / total }))
    .sort((a, b) => b.count - a.count);
}

function pickWeightedRandom(distribution) {
  const r = Math.random();
  let cumulative = 0;
  for (const entry of distribution) {
    cumulative += entry.probability;
    if (r <= cumulative) return entry.word;
  }
  return distribution[distribution.length - 1].word;
}

function pickMostLikely(distribution) {
  // distribution is already sorted descending by count; ties broken by
  // picking randomly among all entries sharing the top count
  const topCount = distribution[0].count;
  const tied = distribution.filter(d => d.count === topCount);
  return tied[Math.floor(Math.random() * tied.length)].word;
}

/**
 * Generates `length` new tokens starting from a random known context.
 * mode: 'creative' (weighted random sampling) or 'predictable' (always
 * the most frequent continuation, breaking ties randomly).
 * Returns { tokens, contextsUsed } where contextsUsed logs the context
 * key used at each generation step (useful for showing "what the model
 * was looking at" in the UI).
 */
function generate(model, order, length, mode) {
  const contexts = Array.from(model.keys());
  if (contexts.length === 0) return { tokens: [], contextsUsed: [] };

  let contextKey = contexts[Math.floor(Math.random() * contexts.length)];
  const generatedTokens = contextKey.split(SEP);
  const contextsUsed = [contextKey];

  for (let i = 0; i < length; i++) {
    const distribution = getNextWordDistribution(model, contextKey);

    let nextWord;
    if (distribution.length === 0) {
      // dead end — jump to a fresh random known context to keep going
      contextKey = contexts[Math.floor(Math.random() * contexts.length)];
      const freshTokens = contextKey.split(SEP);
      generatedTokens.push(...freshTokens);
      contextsUsed.push(contextKey);
      continue;
    }

    nextWord = mode === 'predictable' ? pickMostLikely(distribution) : pickWeightedRandom(distribution);
    generatedTokens.push(nextWord);

    const nextContextTokens = generatedTokens.slice(-order);
    contextKey = nextContextTokens.join(SEP);
    contextsUsed.push(contextKey);
  }

  return { tokens: generatedTokens, contextsUsed };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tokenize, buildModel, getNextWordDistribution, generate, SEP };
}
