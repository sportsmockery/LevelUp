/**
 * SMProducer Fine-Tuning Script
 *
 * Usage:
 *   npx tsx scripts/smproducer/fine-tune.ts upload    — Upload training data
 *   npx tsx scripts/smproducer/fine-tune.ts train     — Start fine-tuning job
 *   npx tsx scripts/smproducer/fine-tune.ts status    — Check job status
 *   npx tsx scripts/smproducer/fine-tune.ts list      — List all fine-tuned models
 *
 * Training data goes in: scripts/smproducer/training-data.jsonl
 *
 * Each line must be a JSON object with this structure:
 * {"messages": [
 *   {"role": "system", "content": "You are SMProducer..."},
 *   {"role": "user", "content": "How should I structure a podcast episode?"},
 *   {"role": "assistant", "content": "Here's a proven structure..."}
 * ]}
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const TRAINING_FILE = path.join(__dirname, 'training-data.jsonl');
const BASE_MODEL = 'gpt-4o-mini-2024-07-18';
const SUFFIX = 'smproducer';

async function uploadTrainingData() {
  if (!fs.existsSync(TRAINING_FILE)) {
    console.error(`Training data not found at: ${TRAINING_FILE}`);
    console.error('Create a training-data.jsonl file with your examples.');
    process.exit(1);
  }

  const stats = fs.statSync(TRAINING_FILE);
  const lines = fs.readFileSync(TRAINING_FILE, 'utf-8').trim().split('\n');
  console.log(`Uploading ${lines.length} training examples (${(stats.size / 1024).toFixed(1)} KB)...`);

  // Validate each line is valid JSON with messages
  for (let i = 0; i < lines.length; i++) {
    try {
      const parsed = JSON.parse(lines[i]);
      if (!parsed.messages || !Array.isArray(parsed.messages)) {
        console.error(`Line ${i + 1}: missing "messages" array`);
        process.exit(1);
      }
    } catch {
      console.error(`Line ${i + 1}: invalid JSON`);
      process.exit(1);
    }
  }

  const file = await openai.files.create({
    file: fs.createReadStream(TRAINING_FILE),
    purpose: 'fine-tune',
  });

  console.log(`File uploaded: ${file.id}`);
  console.log(`Status: ${file.status}`);

  // Save file ID for training step
  const stateFile = path.join(__dirname, '.fine-tune-state.json');
  const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf-8')) : {};
  state.fileId = file.id;
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

  console.log(`\nNext step: npx tsx scripts/smproducer/fine-tune.ts train`);
}

async function startTraining() {
  const stateFile = path.join(__dirname, '.fine-tune-state.json');
  if (!fs.existsSync(stateFile)) {
    console.error('No uploaded file found. Run "upload" first.');
    process.exit(1);
  }

  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  if (!state.fileId) {
    console.error('No file ID found. Run "upload" first.');
    process.exit(1);
  }

  console.log(`Starting fine-tune job on ${BASE_MODEL} with file ${state.fileId}...`);

  const job = await openai.fineTuning.jobs.create({
    training_file: state.fileId,
    model: BASE_MODEL,
    suffix: SUFFIX,
  });

  state.jobId = job.id;
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

  console.log(`Job created: ${job.id}`);
  console.log(`Status: ${job.status}`);
  console.log(`\nCheck progress: npx tsx scripts/smproducer/fine-tune.ts status`);
}

async function checkStatus() {
  const stateFile = path.join(__dirname, '.fine-tune-state.json');
  if (!fs.existsSync(stateFile)) {
    console.error('No fine-tune state found. Run "upload" and "train" first.');
    process.exit(1);
  }

  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  if (!state.jobId) {
    console.error('No job ID found. Run "train" first.');
    process.exit(1);
  }

  const job = await openai.fineTuning.jobs.retrieve(state.jobId);

  console.log(`Job: ${job.id}`);
  console.log(`Status: ${job.status}`);
  console.log(`Model: ${job.model}`);

  if (job.fine_tuned_model) {
    console.log(`\nFine-tuned model ready: ${job.fine_tuned_model}`);
    console.log(`\nSet this in your Vercel environment:`);
    console.log(`  SMPRODUCER_MODEL=${job.fine_tuned_model}`);

    state.fineTunedModel = job.fine_tuned_model;
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  }

  if (job.error) {
    console.error(`Error: ${JSON.stringify(job.error)}`);
  }

  // Show recent events
  const events = await openai.fineTuning.jobs.listEvents(state.jobId, { limit: 5 });
  if (events.data.length > 0) {
    console.log(`\nRecent events:`);
    for (const event of events.data.reverse()) {
      console.log(`  [${event.created_at}] ${event.message}`);
    }
  }
}

async function listModels() {
  const jobs = await openai.fineTuning.jobs.list({ limit: 20 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smJobs = jobs.data.filter(j => (j as any).suffix === SUFFIX || j.fine_tuned_model?.includes(SUFFIX));

  if (smJobs.length === 0) {
    console.log('No SMProducer fine-tuned models found.');
    return;
  }

  console.log('SMProducer fine-tuning jobs:\n');
  for (const job of smJobs) {
    console.log(`  ${job.id} | ${job.status} | ${job.fine_tuned_model || '(pending)'}`);
  }
}

// CLI
const command = process.argv[2];
switch (command) {
  case 'upload':
    uploadTrainingData();
    break;
  case 'train':
    startTraining();
    break;
  case 'status':
    checkStatus();
    break;
  case 'list':
    listModels();
    break;
  default:
    console.log(`Usage: npx tsx scripts/smproducer/fine-tune.ts <command>

Commands:
  upload   Upload training data (scripts/smproducer/training-data.jsonl)
  train    Start fine-tuning job
  status   Check fine-tuning job status
  list     List all SMProducer fine-tuned models`);
}
