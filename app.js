/* ===========================================================
   Markovia — app logic
   Wires up the corpus input, model building, generation, and
   the "what the model is thinking" prediction panel.
   =========================================================== */

(function () {
  'use strict';

  // Original sample text, written for this project — not sourced from
  // anywhere else — so there are no copyright concerns using it as a
  // built-in demo corpus.
  const SAMPLE_TEXT = `The old lighthouse keeper climbed the spiral stairs every evening,
counting each step out of habit rather than need. The sea below
was calm tonight, and the lighthouse keeper watched the last boats
return to the harbor before the fog rolled in. He had kept this
light burning for eleven years, and in that time he had learned
that the sea never behaves the same way twice. Some nights the
sea was calm and silver under the moon. Other nights the sea
threw itself against the rocks like it remembered every ship it
had ever lost. The lighthouse keeper did not mind the solitude.
He had his books, his old radio, and the steady rhythm of the
light sweeping across the water every eight seconds. Visitors
sometimes asked him if he got lonely out there, and he always
gave the same answer: the light needs someone who will not look
away, and he had decided a long time ago that this was work worth
doing quietly, without an audience, night after night after night.`;

  let currentModel = null;
  let currentOrder = 2;
  let currentMode = 'creative';
  let builtSignature = null; // tracks which (corpus, order) the current model was built from

  // -----------------------------------------------------------
  // Toast
  // -----------------------------------------------------------
  const toastEl = document.getElementById('toast');
  let toastTimeout = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  // -----------------------------------------------------------
  // Elements
  // -----------------------------------------------------------
  const corpusInput = document.getElementById('corpusInput');
  const tokenCountEl = document.getElementById('tokenCount');
  const orderSlider = document.getElementById('orderSlider');
  const orderValueEl = document.getElementById('orderValue');
  const orderHintEl = document.getElementById('orderHint');
  const lengthSlider = document.getElementById('lengthSlider');
  const lengthValueEl = document.getElementById('lengthValue');
  const buildBtn = document.getElementById('buildBtn');
  const generateBtn = document.getElementById('generateBtn');
  const modelStatus = document.getElementById('modelStatus');
  const outputBox = document.getElementById('outputBox');
  const predictionContext = document.getElementById('predictionContext');
  const predictionBars = document.getElementById('predictionBars');

  // -----------------------------------------------------------
  // Corpus input
  // -----------------------------------------------------------
  function updateTokenCount() {
    const count = tokenize(corpusInput.value).length;
    tokenCountEl.textContent = `${count} word${count === 1 ? '' : 's'}`;
    refreshBuildAvailability();
  }

  function refreshBuildAvailability() {
    const count = tokenize(corpusInput.value).length;
    const enoughTokens = count > currentOrder + 1;
    buildBtn.disabled = !enoughTokens;

    // if the corpus or order changed since the last successful build,
    // the existing model is stale — require a rebuild before generating
    const signature = corpusInput.value + '::' + currentOrder;
    if (signature !== builtSignature) {
      generateBtn.disabled = true;
    }
  }

  corpusInput.addEventListener('input', updateTokenCount);

  document.getElementById('loadSampleBtn').addEventListener('click', () => {
    corpusInput.value = SAMPLE_TEXT;
    updateTokenCount();
    showToast('Sample text loaded');
  });

  // -----------------------------------------------------------
  // Order slider
  // -----------------------------------------------------------
  orderSlider.addEventListener('input', () => {
    currentOrder = parseInt(orderSlider.value, 10);
    orderValueEl.textContent = currentOrder;
    orderHintEl.textContent = `Each word is predicted from the ${currentOrder} word${currentOrder === 1 ? '' : 's'} before it.`;
    refreshBuildAvailability();
  });

  // -----------------------------------------------------------
  // Mode chips
  // -----------------------------------------------------------
  const modeHints = {
    creative: 'Creative samples randomly, weighted by how often each word actually followed this context.',
    predictable: 'Predictable always picks whichever word followed this context most often in your text.'
  };

  document.querySelectorAll('.chip[data-mode]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-mode]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentMode = chip.dataset.mode;
      document.getElementById('modeHint').textContent = modeHints[currentMode];
    });
  });

  // -----------------------------------------------------------
  // Length slider
  // -----------------------------------------------------------
  lengthSlider.addEventListener('input', () => {
    lengthValueEl.textContent = lengthSlider.value;
  });

  // -----------------------------------------------------------
  // Build model
  // -----------------------------------------------------------
  buildBtn.addEventListener('click', () => {
    const tokens = tokenize(corpusInput.value);
    if (tokens.length <= currentOrder) {
      showToast('Not enough text for this context length — add more or lower the order.');
      return;
    }

    currentModel = buildModel(tokens, currentOrder);
    builtSignature = corpusInput.value + '::' + currentOrder;

    const distinctContexts = currentModel.size;
    modelStatus.textContent = `✓ Model built — ${tokens.length} words, ${distinctContexts} distinct context${distinctContexts === 1 ? '' : 's'}`;
    modelStatus.classList.add('ready');
    generateBtn.disabled = false;
    showToast('Model built from your corpus');
  });

  // -----------------------------------------------------------
  // Generate
  // -----------------------------------------------------------
  generateBtn.addEventListener('click', () => {
    if (!currentModel) return;

    const length = parseInt(lengthSlider.value, 10);
    const result = generate(currentModel, currentOrder, length, currentMode);

    if (result.tokens.length === 0) {
      outputBox.innerHTML = '<p class="output-placeholder">Could not generate text from this corpus — try adding more text.</p>';
      return;
    }

    outputBox.innerHTML = '';
    const p = document.createElement('p');
    p.style.margin = '0';
    p.textContent = result.tokens.join(' ');
    outputBox.appendChild(p);

    renderPrediction(result.contextsUsed[result.contextsUsed.length - 1]);
  });

  function renderPrediction(contextKey) {
    if (!contextKey) {
      predictionContext.textContent = '—';
      predictionBars.innerHTML = '';
      return;
    }

    const displayContext = contextKey.split(SEP).join(' ');
    predictionContext.textContent = `"${displayContext}"`;

    const distribution = getNextWordDistribution(currentModel, contextKey).slice(0, 6);
    predictionBars.innerHTML = '';

    if (distribution.length === 0) {
      predictionBars.innerHTML = '<p class="control-hint">This exact context only appeared at the very end of your text, so there is nothing recorded after it.</p>';
      return;
    }

    distribution.forEach(entry => {
      const pct = Math.round(entry.probability * 100);
      const row = document.createElement('div');
      row.className = 'prediction-row';
      row.innerHTML = `
        <span class="prediction-word">${escapeHTML(entry.word)}</span>
        <div class="prediction-bar-track"><div class="prediction-bar-fill" style="width:${pct}%"></div></div>
        <span class="prediction-pct">${pct}%</span>
      `;
      predictionBars.appendChild(row);
    });
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // -----------------------------------------------------------
  // Copy output
  // -----------------------------------------------------------
  document.getElementById('copyOutputBtn').addEventListener('click', () => {
    const text = outputBox.textContent.trim();
    if (!text || text.includes('will appear here')) {
      showToast('Nothing to copy yet');
      return;
    }
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard'));
  });

  // -----------------------------------------------------------
  // Init
  // -----------------------------------------------------------
  updateTokenCount();

})();
