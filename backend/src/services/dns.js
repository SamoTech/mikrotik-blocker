const dns = require('dns');
const { Resolver } = dns.promises;

const DNS_SERVERS = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
  .split(',')
  .map(s => s.trim());

/**
 * Resolve a single domain to all its A-record IPs.
 * Retries with fallback DNS server if first fails.
 * @param {string} domain
 * @returns {Promise<string[]>} list of IP addresses
 */
async function resolveDomain(domain) {
  const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
  const errors = [];

  for (const server of DNS_SERVERS) {
    try {
      const resolver = new Resolver();
      resolver.setServers([server]);
      const addresses = await resolver.resolve4(cleanDomain);
      return { domain: cleanDomain, ips: [...new Set(addresses)], error: null };
    } catch (err) {
      errors.push(`${server}: ${err.message}`);
    }
  }

  return { domain: cleanDomain, ips: [], error: errors.join(' | ') };
}

/**
 * Resolve multiple domains in parallel.
 * @param {string[]} domains
 * @returns {Promise<Array>}
 */
async function resolveMultiple(domains) {
  const results = await Promise.allSettled(domains.map(resolveDomain));
  return results.map(r => r.status === 'fulfilled' ? r.value : { domain: '', ips: [], error: r.reason?.message });
}

module.exports = { resolveDomain, resolveMultiple };
