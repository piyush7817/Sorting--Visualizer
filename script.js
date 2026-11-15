'use strict';

const $ = (id) => document.getElementById(id);
const sizeSlider = $('size-slider');
const speedSlider = $('speed-slider');
const sizeValue = $('size-value');
const speedValue = $('speed-value');
const indexRow = $('index-row');
const valueRow = $('value-row');
const customArrayInput = $('custom-array');
const pauseBtn = $('pause');
const statusMessage = $('status-message');

let values = [];
let originalValues = [];
let comparisons = 0;
let moves = 0;
let isPaused = false;
let isSorting = false;
let runId = 0;
let customMode = false;
let sortAscending = true;

const algorithms = {
  bubble: {
    description: 'Bubble Sort compares adjacent values and swaps them when they are out of order. It is stable and useful for learning, though it is slow on large arrays.',
    time: 'O(n²)', space: 'O(1)',
    code: ['for each unsorted position', '  compare adjacent values', '  swap if left value is larger', 'mark the last value sorted']
  },
  selection: {
    description: 'Selection Sort scans the unsorted portion for its smallest value, then moves that value to the next sorted position.',
    time: 'O(n²)', space: 'O(1)',
    code: ['for each unsorted position', '  find the smallest remaining value', '  swap it into the next position', 'mark the position sorted']
  },
  insertion: {
    description: 'Insertion Sort grows a sorted section from left to right by shifting larger values and inserting each new value in its place.',
    time: 'O(n²)', space: 'O(1)',
    code: ['for each value after the first', '  save the value as key', '  shift larger values one place right', '  insert key into the open position']
  },
  merge: {
    description: 'Merge Sort recursively divides the array into halves, then merges the sorted halves. It runs in O(n log n) time and uses extra memory.',
    time: 'O(n log n)', space: 'O(n)',
    code: ['split array into halves', 'sort each half recursively', 'merge halves in ascending order', 'write merged values back']
  },
  quick: {
    description: 'Quick Sort partitions around a pivot and recursively sorts each side. Its average time is O(n log n); a poor pivot can make it O(n²).',
    time: 'O(n log n) average, O(n²) worst', space: 'O(log n) average',
    code: ['choose last value as pivot', 'move smaller values before pivot', 'place pivot in final position', 'sort left and right partitions']
  },
  heap: {
    description: 'Heap Sort builds a max heap, then repeatedly moves the largest remaining value to the end of the array.',
    time: 'O(n log n)', space: 'O(1)',
    code: ['build a max heap', 'swap root with last heap value', 'shrink heap and restore heap property', 'repeat until sorted']
  },
  jump: {
    description: 'Jump Sort is presented here as a gap-based insertion demonstration. It sorts groups of values at decreasing gaps and finishes with gap 1, ensuring the full array is sorted. It is a course-specific variant related to Shell Sort.',
    time: 'O(n²) worst case', space: 'O(1)',
    code: ['start with a large gap', 'compare values that far apart', 'shift values within each gap group', 'reduce gap; finish at gap 1']
  },
  count: {
    description: 'Counting Sort counts each integer in the input range, then writes values back in order. This implementation accepts negative values and limits the key range to protect browser memory.',
    time: 'O(n + k)', space: 'O(k)',
    code: ['find minimum and maximum', 'count each value using an offset', 'visit counts from low to high', 'write each value back']
  }
};

function updateStats() {
  $('comparisons').textContent = comparisons;
  $('swaps').textContent = moves;
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', isError);
}

function renderAlgoCode(algo, line = -1) {
  const code = algorithms[algo]?.code || [];
  const panel = $('algo-code');
  panel.replaceChildren(...code.map((text, index) => {
    const row = document.createElement('span');
    row.className = `code-line${index === line ? ' highlight' : ''}`;
    row.textContent = text;
    return row;
  }));
}

function updateAlgorithmInfo() {
  const key = $('algo-select').value;
  const info = algorithms[key];
  $('algorithm-name').textContent = $('algo-select').selectedOptions[0].textContent;
  $('algo-description').textContent = info.description;
  $('time').textContent = info.time;
  $('space').textContent = info.space;
  renderAlgoCode(key);
}

function renderArray(nextValues) {
  values = [...nextValues];
  originalValues = [...nextValues];
  indexRow.style.setProperty('--count', values.length);
  valueRow.style.setProperty('--count', values.length);
  const graphWidth = `${Math.max(100, values.length * 18)}px`;
  indexRow.style.minWidth = graphWidth;
  valueRow.style.minWidth = graphWidth;
  indexRow.replaceChildren();
  valueRow.replaceChildren();
  $('original-array-row').replaceChildren();
  values.forEach((value, index) => {
    const indexBox = document.createElement('div');
    indexBox.className = 'index-box';
    indexBox.textContent = index;
    indexRow.append(indexBox);

    const valueBox = document.createElement('div');
    valueBox.className = 'value-box';
    const valueLabel = document.createElement('span');
    valueLabel.className = 'bar-value';
    valueLabel.textContent = value;
    valueBox.append(valueLabel);
    valueBox.style.setProperty('--bar-height', `${barHeight(value, originalValues)}px`);
    valueRow.append(valueBox);

    const originalBox = document.createElement('div');
    originalBox.className = 'original-chip';
    originalBox.textContent = value;
    $('original-array-row').append(originalBox);
  });
  comparisons = 0;
  moves = 0;
  updateStats();
}

function barHeight(value, list) {
  const min = Math.min(...list);
  const max = Math.max(...list);
  return max === min ? 84 : Math.round(38 + ((value - min) / (max - min)) * 200);
}

function comesBefore(left, right) {
  return sortAscending ? left < right : left > right;
}

function hasHeapPriority(left, right) {
  return sortAscending ? left > right : left < right;
}

function createRandomArray(size) {
  return Array.from({ length: Number(size) }, () => Math.floor(Math.random() * 100));
}

function cancelRun(message = '') {
  runId++;
  isSorting = false;
  isPaused = false;
  pauseBtn.textContent = '⏸ Pause';
  if (message) showStatus(message);
}

async function delay(ms, id) {
  let remaining = Math.max(0, ms);
  while (remaining > 0) {
    if (id !== runId) return false;
    while (isPaused) {
      if (id !== runId) return false;
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    const slice = Math.min(remaining, 25);
    await new Promise(resolve => setTimeout(resolve, slice));
    remaining -= slice;
  }
  return id === runId;
}

function active(indices, on) {
  indices.forEach(index => valueRow.children[index]?.classList.toggle('active', on));
}

function sorted(index) {
  valueRow.children[index]?.classList.add('sorted');
}

async function compare(a, b, id, codeLine = 1) {
  active([a, b], true);
  comparisons++;
  updateStats();
  renderAlgoCode($('algo-select').value, codeLine);
  const ok = await delay(animationDelay(), id);
  active([a, b], false);
  return ok;
}

async function swap(a, b, id, codeLine = 2) {
  if (a === b) return true;
  valueRow.children[a]?.classList.add('swapping');
  valueRow.children[b]?.classList.add('swapping');
  renderAlgoCode($('algo-select').value, codeLine);
  if (!await delay(animationDelay(), id)) { valueRow.children[a]?.classList.remove('swapping'); valueRow.children[b]?.classList.remove('swapping'); return false; }
  [values[a], values[b]] = [values[b], values[a]];
  valueRow.children[a].querySelector('.bar-value').textContent = values[a];
  valueRow.children[b].querySelector('.bar-value').textContent = values[b];
  valueRow.children[a].style.setProperty('--bar-height', `${barHeight(values[a], originalValues)}px`);
  valueRow.children[b].style.setProperty('--bar-height', `${barHeight(values[b], originalValues)}px`);
  moves++;
  updateStats();
  valueRow.children[a]?.classList.remove('swapping');
  valueRow.children[b]?.classList.remove('swapping');
  return true;
}

async function write(index, value, id, codeLine = 2) {
  valueRow.children[index]?.classList.add('swapping');
  renderAlgoCode($('algo-select').value, codeLine);
  if (!await delay(animationDelay(), id)) { valueRow.children[index]?.classList.remove('swapping'); return false; }
  values[index] = value;
  valueRow.children[index].querySelector('.bar-value').textContent = value;
  valueRow.children[index].style.setProperty('--bar-height', `${barHeight(value, originalValues)}px`);
  moves++;
  updateStats();
  valueRow.children[index]?.classList.remove('swapping');
  return true;
}

function animationDelay() {
  return Number(speedSlider.value);
}

async function bubbleSort(id) {
  const n = values.length;
  for (let end = n - 1; end > 0; end--) {
    let changed = false;
    for (let j = 0; j < end; j++) {
      if (!await compare(j, j + 1, id)) return;
      if (comesBefore(values[j + 1], values[j])) {
        if (!await swap(j, j + 1, id)) return;
        changed = true;
      }
    }
    sorted(end);
    if (!changed) break;
  }
}

async function selectionSort(id) {
  for (let i = 0; i < values.length - 1; i++) {
    let min = i;
    for (let j = i + 1; j < values.length; j++) {
      if (!await compare(min, j, id)) return;
      if (comesBefore(values[j], values[min])) min = j;
    }
    if (!await swap(i, min, id)) return;
    sorted(i);
  }
}

async function insertionSort(id) {
  for (let i = 1; i < values.length; i++) {
    const key = values[i];
    let j = i - 1;
    while (j >= 0) {
      if (!await compare(j, j + 1, id, 2)) return;
      if (!comesBefore(key, values[j])) break;
      if (!await write(j + 1, values[j], id, 2)) return;
      j--;
    }
    if (!await write(j + 1, key, id, 3)) return;
  }
}

async function mergeSort(id) {
  async function mergeRange(left, right) {
    if (right - left < 2 || id !== runId) return id === runId;
    const mid = Math.floor((left + right) / 2);
    if (!await mergeRange(left, mid) || !await mergeRange(mid, right)) return false;
    const merged = [];
    let i = left, j = mid;
    while (i < mid && j < right) {
      if (!await compare(i, j, id, 1)) return false;
      if (comesBefore(values[i], values[j]) || values[i] === values[j]) merged.push(values[i++]);
      else merged.push(values[j++]);
    }
    while (i < mid) merged.push(values[i++]);
    while (j < right) merged.push(values[j++]);
    for (let k = 0; k < merged.length; k++) {
      if (!await write(left + k, merged[k], id, 3)) return false;
    }
    return true;
  }
  await mergeRange(0, values.length);
}

async function quickSort(id) {
  async function partition(low, high) {
    const pivot = values[high];
    let boundary = low;
    for (let j = low; j < high; j++) {
      if (!await compare(j, high, id, 1)) return null;
      if (comesBefore(values[j], pivot)) {
        if (!await swap(boundary, j, id, 2)) return null;
        boundary++;
      }
    }
    if (!await swap(boundary, high, id, 2)) return null;
    sorted(boundary);
    return boundary;
  }
  async function sort(low, high) {
    if (low >= high || id !== runId) return;
    const pivot = await partition(low, high);
    if (pivot === null) return;
    await sort(low, pivot - 1);
    await sort(pivot + 1, high);
  }
  await sort(0, values.length - 1);
}

async function heapSort(id) {
  async function siftDown(root, end) {
    let largest = root;
    const left = 2 * root + 1;
    const right = left + 1;
    if (left < end) {
      if (!await compare(largest, left, id, 2)) return false;
      if (hasHeapPriority(values[left], values[largest])) largest = left;
    }
    if (right < end) {
      if (!await compare(largest, right, id, 2)) return false;
      if (hasHeapPriority(values[right], values[largest])) largest = right;
    }
    if (largest !== root) {
      if (!await swap(root, largest, id, 2)) return false;
      return siftDown(largest, end);
    }
    return true;
  }
  for (let i = Math.floor(values.length / 2) - 1; i >= 0; i--) {
    if (!await siftDown(i, values.length)) return;
  }
  for (let end = values.length - 1; end > 0; end--) {
    if (!await swap(0, end, id, 1) || !await siftDown(0, end)) return;
    sorted(end);
  }
}

async function jumpSort(id) {
  for (let gap = Math.floor(values.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < values.length; i++) {
      const temp = values[i];
      let j = i;
      while (j >= gap) {
        if (!await compare(j - gap, j, id, 1)) return;
        if (!comesBefore(temp, values[j - gap])) break;
        if (!await write(j, values[j - gap], id, 2)) return;
        j -= gap;
      }
      if (j !== i && !await write(j, temp, id, 2)) return;
    }
  }
}

async function countSort(id) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min + 1;
  if (range > 2000) {
    throw new Error('Count Sort supports a maximum value range of 2,000. Choose a smaller range or another algorithm.');
  }
  const counts = new Array(range).fill(0);
  for (const value of values) counts[value - min]++;
  let index = 0;
  for (let offset = sortAscending ? 0 : range - 1; sortAscending ? offset < range : offset >= 0; offset += sortAscending ? 1 : -1) {
    while (counts[offset] > 0) {
      if (id !== runId) return;
      if (!await write(index, offset + min, id, 3)) return;
      counts[offset]--;
      index++;
    }
  }
}

const sorters = { bubble: bubbleSort, selection: selectionSort, insertion: insertionSort, merge: mergeSort, quick: quickSort, heap: heapSort, jump: jumpSort, count: countSort };

function parseCustomArray() {
  const raw = customArrayInput.value.trim();
  if (!raw) throw new Error('Enter at least two whole numbers separated by commas.');
  const parts = raw.split(',').map(part => part.trim());
  if (parts.some(part => !/^-?\d+$/.test(part))) throw new Error('Use whole numbers separated by commas, with no empty values.');
  const parsed = parts.map(Number);
  if (parsed.length < 2) throw new Error('Enter at least two values.');
  if (parsed.length > 100) throw new Error('The maximum custom array size is 100 values.');
  if (parsed.some(value => !Number.isSafeInteger(value) || Math.abs(value) > 1000000)) throw new Error('Values must be whole numbers between -1,000,000 and 1,000,000.');
  return parsed;
}

$('use-custom').addEventListener('click', () => {
  try {
    cancelRun();
    customMode = true;
    renderArray(parseCustomArray());
    showStatus('Custom array loaded.');
  } catch (error) { showStatus(error.message, true); }
});

$('generate').addEventListener('click', () => {
  cancelRun();
  customMode = false;
  renderArray(createRandomArray(sizeSlider.value));
  showStatus('New random array generated.');
});

$('reset').addEventListener('click', () => {
  cancelRun('Sort stopped and array restored.');
  renderArray(originalValues);
});

pauseBtn.addEventListener('click', () => {
  if (!isSorting) return;
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
  showStatus(isPaused ? 'Sorting paused.' : 'Sorting resumed.');
});

sizeSlider.addEventListener('input', () => {
  sizeValue.textContent = sizeSlider.value;
  if (!customMode && !isSorting) renderArray(createRandomArray(sizeSlider.value));
});

speedSlider.addEventListener('input', () => {
  speedValue.textContent = `${speedSlider.value}ms`;
});

$('algo-select').addEventListener('change', updateAlgorithmInfo);
$('show-values').addEventListener('change', event => {
  valueRow.classList.toggle('hide-values', !event.target.checked);
});
document.querySelectorAll('input[name="sort-order"]').forEach(input => {
  input.addEventListener('change', event => { sortAscending = event.target.value === 'asc'; });
});

$('start').addEventListener('click', async () => {
  if (isSorting) return;
  if (values.length < 2) { showStatus('Load at least two values before sorting.', true); return; }
  const id = runId;
  isSorting = true;
  isPaused = false;
  pauseBtn.textContent = '⏸ Pause';
  comparisons = 0;
  moves = 0;
  updateStats();
  valueRow.querySelectorAll('.sorted').forEach(box => box.classList.remove('sorted'));
  showStatus('Sorting in progress.');
  try {
    await sorters[$('algo-select').value](id);
    if (id === runId) {
      values.forEach((_, index) => sorted(index));
      showStatus('Sorting complete.');
    }
  } catch (error) {
    if (id === runId) showStatus(error.message || 'Sorting could not be completed.', true);
  } finally {
    if (id === runId) {
      isSorting = false;
      isPaused = false;
      pauseBtn.textContent = '⏸ Pause';
    }
  }
});

window.addEventListener('DOMContentLoaded', () => {
  sizeValue.textContent = sizeSlider.value;
  speedValue.textContent = `${speedSlider.value}ms`;
  renderArray(createRandomArray(sizeSlider.value));
  updateAlgorithmInfo();
});


