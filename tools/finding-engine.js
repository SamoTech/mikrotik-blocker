'use strict';

/**
 * Shared finding contract for RouterOS analysis engines.
 *
 * Findings are advisory data. This module normalizes shape, provenance,
 * ordering, and summary behavior without deciding whether a change is safe
 * to apply. State-changing behavior belongs to Change Set/remediation layers.
 */

const SEVERITIES = ['informational', 'low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'review', 'resolved', 'suppressed'];

function createFinding(input = {}) {
  const id = String(input.id || input.check_id || input.rule_id || '').trim();
  if (!id) throw new TypeError('Finding id is required');

  return normalizeFinding({
    id,
    check_id: input.check_id || id,
    rule_id: input.rule_id || input.check_id || id,
    kind: input.kind || 'routeros.configuration',
    severity: input.severity || 'informational',
    confidence: input.confidence || 'medium',
    title: input.title || id,
    evidence: input.evidence || '',
    resource_refs: Array.isArray(input.resource_refs) ? input.resource_refs : [],
    provenance: input.provenance || null,
    remediation: input.remediation || null,
    status: input.status || 'open',
    routeros: input.routeros || null,
    engine: input.engine || null,
    fix: input.fix || '',
  });
}

function normalizeFinding(finding = {}) {
  const normalized = {
    ...finding,
    id: String(finding.id || finding.check_id || finding.rule_id || '').trim(),
    check_id: String(finding.check_id || finding.id || '').trim(),
    rule_id: String(finding.rule_id || finding.check_id || finding.id || '').trim(),
    kind: finding.kind || 'routeros.configuration',
    severity: SEVERITIES.includes(finding.severity) ? finding.severity : 'informational',
    confidence: ['high', 'medium', 'low'].includes(finding.confidence) ? finding.confidence : 'medium',
    title: String(finding.title || finding.id || 'Untitled finding'),
    evidence: typeof finding.evidence === 'string' ? finding.evidence : String(finding.evidence || ''),
    resource_refs: Array.isArray(finding.resource_refs) ? finding.resource_refs : [],
    provenance: finding.provenance || null,
    remediation: finding.remediation || null,
    status: STATUSES.includes(finding.status) ? finding.status : 'open',
    routeros: finding.routeros || null,
    engine: finding.engine || null,
    fix: typeof finding.fix === 'string' ? finding.fix : String(finding.fix || ''),
  };

  if (!normalized.id) throw new TypeError('Finding id is required');
  return normalized;
}

function attachProvenance(finding, knowledge) {
  const normalized = normalizeFinding(finding);
  if (!knowledge) return normalized;
  return {
    ...normalized,
    provenance: {
      knowledge_id: knowledge.id,
      source: knowledge.source,
      confidence: knowledge.confidence || normalized.confidence,
      remediation: knowledge.remediation || null,
    },
  };
}

function sortFindings(findings = []) {
  const rank = { critical: 5, high: 4, medium: 3, low: 2, informational: 1 };
  return findings.map(normalizeFinding).sort((a, b) =>
    (rank[b.severity] - rank[a.severity]) || a.id.localeCompare(b.id)
  );
}

function summarizeFindings(findings = []) {
  const normalized = findings.map(normalizeFinding);
  return {
    findings: normalized.length,
    critical: normalized.filter(f => f.severity === 'critical').length,
    high: normalized.filter(f => f.severity === 'high').length,
    medium: normalized.filter(f => f.severity === 'medium').length,
    low: normalized.filter(f => f.severity === 'low').length,
    informational: normalized.filter(f => f.severity === 'informational').length,
  };
}

function validateFinding(finding) {
  try {
    const f = normalizeFinding(finding);
    if (!SEVERITIES.includes(f.severity)) return { valid: false, errors: ['Invalid severity'] };
    if (!f.title || !f.evidence) return { valid: false, errors: ['title and evidence are required'] };
    if (!Array.isArray(f.resource_refs)) return { valid: false, errors: ['resource_refs must be an array'] };
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
}

module.exports = {
  SEVERITIES,
  STATUSES,
  createFinding,
  normalizeFinding,
  attachProvenance,
  sortFindings,
  summarizeFindings,
  validateFinding,
};
