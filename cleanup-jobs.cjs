const fs = require('fs');
const jobs = JSON.parse(fs.readFileSync('data/jobs.json', 'utf8'));

// Find unique URLs and keep only the best version of each
const uniqueJobs = {};
const seenUrls = {};

for (const [id, job] of Object.entries(jobs)) {
  // Skip 'Unknown' jobs
  if (job.url === 'Unknown (recovered from disk)') continue;

  const url = job.url;

  // If we haven't seen this URL, or this job is better (more pages/assets), keep it
  if (!seenUrls[url] || (job.pagesCloned + job.assetsCaptured) > (seenUrls[url].pagesCloned + seenUrls[url].assetsCaptured)) {
    seenUrls[url] = job;
  }
}

// Build final object from unique URLs
for (const [url, job] of Object.entries(seenUrls)) {
  uniqueJobs[job.id] = job;
}

console.log('Original jobs:', Object.keys(jobs).length);
console.log('Unique jobs:', Object.keys(uniqueJobs).length);
console.log('Removed duplicates:', Object.keys(jobs).length - Object.keys(uniqueJobs).length);

fs.writeFileSync('data/jobs.json', JSON.stringify(uniqueJobs, null, 2));
console.log('Done!');
