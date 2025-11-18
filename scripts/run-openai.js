#!/usr/bin/env node
/*
Simple CLI to test OpenAI batch run endpoint.
Usage: node scripts/run-openai.js --model gpt-5 --prompt "Rate images" --baseDir "/path/to/folder" --image img1:url,img2:url
*/
const args = require('minimist')(process.argv.slice(2));
const fetch = require('node-fetch');

(async () => {
  const model = args.model || 'gpt-5';
  const prompt = args.prompt || 'Rate images 1-5 and return JSON ratings array.';
  const baseDir = args.baseDir;
  const report = Boolean(args.report);
  const imagePairs = String(args.image || '').split(',').filter(Boolean);
  const images = imagePairs.map((p) => {
    const [id, url] = p.split(':');
    return { id, url };
  });
  const body = { model, images, prompt, baseDir, report };
  const resp = await fetch('http://localhost:5000/api/kull/run/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  console.log(JSON.stringify(json, null, 2));
})();

