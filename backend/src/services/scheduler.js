const { resolveMultiple } = require('./dns');
const { generateScript } = require('./scriptGen');

// In-memory store for scheduled jobs
const jobs = new Map();

/**
 * Start a scheduled job that re-resolves domains every intervalHours
 * @param {string} jobId
 * @param {string[]} domains
 * @param {number} intervalHours
 * @param {object} scriptOptions
 * @param {function} onUpdate - callback(script, resolved)
 */
function startJob(jobId, domains, intervalHours, scriptOptions, onUpdate) {
  stopJob(jobId); // clear any existing job

  const intervalMs = intervalHours * 60 * 60 * 1000;

  const run = async () => {
    console.log(`[Scheduler] Running job ${jobId} for domains: ${domains.join(', ')}`);
    const resolved = await resolveMultiple(domains);
    const script = generateScript(resolved, scriptOptions);
    onUpdate(script, resolved);
  };

  run(); // run immediately
  const timer = setInterval(run, intervalMs);

  jobs.set(jobId, { timer, domains, intervalHours, scriptOptions });
  console.log(`[Scheduler] Job ${jobId} started — interval: ${intervalHours}h`);
  return jobId;
}

function stopJob(jobId) {
  if (jobs.has(jobId)) {
    clearInterval(jobs.get(jobId).timer);
    jobs.delete(jobId);
    console.log(`[Scheduler] Job ${jobId} stopped`);
  }
}

function listJobs() {
  return Array.from(jobs.entries()).map(([id, v]) => ({
    id,
    domains: v.domains,
    intervalHours: v.intervalHours,
  }));
}

module.exports = { startJob, stopJob, listJobs };
