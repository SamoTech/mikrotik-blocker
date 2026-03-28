import React from 'react';
import PageShell from '../components/PageShell';

export default function TermsPage() {
  return (
    <PageShell title="Terms of Use" icon="📜">
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
        Last updated: March 2026
      </p>

      {[
        {
          title: '1. Acceptance',
          body: 'By using MikroTik Blocker you agree to these terms. If you disagree, please do not use the service.'
        },
        {
          title: '2. Description of Service',
          body: 'MikroTik Blocker is a free tool that resolves domain names into IP addresses and generates RouterOS firewall scripts. It is provided as-is with no uptime guarantee.'
        },
        {
          title: '3. Permitted Use',
          body: 'You may use this service to manage your own network infrastructure. You must not use it to facilitate illegal activity, bypass lawful access controls you do not own, or attack third-party systems.'
        },
        {
          title: '4. Prohibited Use',
          body: 'Automated scraping, excessive API requests, reverse engineering the service for malicious purposes, or using the output to harm or censor third parties without authorization is prohibited.'
        },
        {
          title: '5. No Warranty',
          body: 'The service is provided "AS IS" without warranty of any kind. IP addresses and CIDR ranges change frequently — always verify the generated scripts before applying them to production routers.'
        },
        {
          title: '6. Limitation of Liability',
          body: 'SamoTech and contributors are not liable for network disruptions, data loss, or misconfiguration caused by applying generated scripts. Always test in a controlled environment first.'
        },
        {
          title: '7. Open Source',
          body: 'The source code is available at github.com/SamoTech/mikrotik-blocker under the MIT License. Contributions are welcome via pull requests.'
        },
        {
          title: '8. Changes to Terms',
          body: 'We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.'
        },
        {
          title: '9. Contact',
          body: null,
          email: 'samo.hossam@gmail.com',
        },
      ].map(section => (
        <div key={section.title} style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text)' }}>
            {section.title}
          </h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.75, fontSize: '0.85rem', margin: 0 }}>
            {section.body}
            {section.email && (
              <>
                Contact us at{' '}
                <a href={`mailto:${section.email}`} style={{ color: 'var(--primary)' }}>{section.email}</a>.
              </>
            )}
          </p>
        </div>
      ))}
    </PageShell>
  );
}
