# ¶ Markovia — AI Text Generator

A statistical AI text generator built entirely from scratch — no neural network, no pretrained model, no external API. Paste any text, and Markovia learns a **Markov chain**: for every sequence of words, it remembers what word actually came next, how often, and uses that to generate new text in a similar style.

![Markovia preview](https://via.placeholder.com/900x500/17140F/E8A33D?text=Markovia+%E2%80%94+AI+Text+Generator)

## Features

- 🔗 **Real Markov chain, built from your text** — tokenizes any pasted corpus and builds an actual n-gram frequency table client-side
- 🎚️ **Adjustable context length (order)** — from 1 word of context up to 4, live-rebuildable
- 🎲 **Two generation modes** — *Creative* (weighted random sampling, proportional to real frequency) and *Predictable* (always the most common continuation)
- 📊 **"What the model is thinking"** — after generating, see the exact context used and every word that could have come next, each with its real probability shown as a bar
- 📋 **Copy generated text** with one click
- 💻 **100% client-side** — your pasted text never leaves the browser, no backend, no API key

## Tech Stack

- Vanilla JavaScript (no framework, no build step)
- A hand-written Markov chain implementation (`markov.js`) — tokenization, n-gram frequency modeling, and weighted-random sampling, all built from first principles
- Google Fonts: [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono), [Inter](https://fonts.google.com/specimen/Inter)

## Getting Started

```bash
git clone https://github.com/DarshMegh/markovia.git
cd markovia
open index.html   # or just double-click the file
```

No install, no dependencies — pure HTML/CSS/JS.

## Deploying to GitHub Pages (free hosting)

1. Push this repo to GitHub.
2. Go to **Settings → Pages** in your repo.
3. Under **Source**, select the `main` branch and `/ (root)` folder, then **Save**.
4. Your app goes live at `https://darshmegh.github.io/markovia/` within a minute or two.
5. Update the "Live Demo" link at the top of this README.

## How it works — and what to say about it in an interview

A Markov chain is one of the oldest ideas in statistical language modeling — it's the conceptual ancestor of the "predict the next token" approach that modern large language models still use, just without any learned weights or neural network underneath. It's pure counting:

1. **Tokenize** the input text into words.
2. **Build a frequency table**: for every sequence of *N* consecutive words (the "order"), record every word that ever followed it, and how many times.
3. **Generate** by picking a random starting context, then repeatedly looking up "what usually comes after this?" — either sampling randomly weighted by frequency (*Creative* mode) or always taking the top answer (*Predictable* mode) — and sliding the context window forward one word at a time.

Because the whole model is just a `Map` of contexts to next-word counts, there's nothing to train, no gradient descent, and no randomness in how the model is built — only in how it's sampled from. It's a genuinely useful way to explain, concretely, what "predicting the next token" means before jumping into how neural approaches (like this author's own [NeuroCanvas](https://github.com/DarshMegh/NeuroCanvas)) do the same job with learned weights instead of raw counts.

## Project Structure

```
markovia/
├── index.html      # layout: corpus input + controls + output + prediction panel
├── styles.css       # warm charcoal / amber "typewriter" theme
├── markov.js         # the Markov chain itself — tokenize, build, sample, generate
├── app.js            # UI wiring: corpus handling, model building, rendering
└── README.md
```

## Possible Extensions

- Character-level (instead of word-level) generation, for a different flavor of output
- Let the user click any word in the generated output to see what it could have become
- Support multiple corpora blended together
- Export the built model as JSON to reuse later without re-pasting the corpus

## License

MIT — free to use, modify, and share.

---

Built as a portfolio project demonstrating a classic, from-first-principles approach to language modeling — the statistical predecessor to today's neural language models.
