import React from 'react';
import PageShell from '../components/PageShell';

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy" icon="🔒">
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
        Last updated: March 2026
      </p>

      {[
        {
          title: '1. No Personal Data Collected',
          body: 'MikroTik Blocker does not collect, store, or process any personally identifiable information. There are no user accounts, logins, or sessions.'
        },
        {
          title: '2. Domain Inputs',
          body: 'Domains you enter are sent to our serverless API only to perform DNS resolution. They are not logged, stored, or shared. Each request is fully stateless.'
        },
        {
          title: '3. Third-party DNS Services',
          body: 'Resolution queries are forwarded to Google DNS (8.8.8.8), Cloudflare DNS (1.1.1.1), and Quad9 (9.9.9.9) via DNS-over-HTTPS. Their respective privacy policies apply.'
        },
        {
          title: '4. BGPView & ip-api.com',
          body: 'ASN prefix data is fetched from api.bgpview.io. Announced CIDR lookups use ip-api.com batch API. Only IP addresses are sent — no user data.'
        },
        {
          title: '5. Vercel Hosting',
          body: 'This site is hosted on Vercel. Vercel may collect standard server access logs (IP, user-agent, timestamp) as part of their infrastructure. See vercel.com/legal/privacy-policy.'
        },
        {
          title: '6. Cookies & Local Storage',
          body: 'No cookies are set. No data is written to localStorage or sessionStorage. The app is entirely in-memory per session.'
        },
        {
          title: '7. Contact',
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
                For any privacy concerns, contact us at{' '}
                <a href={`mailto:${section.email}`} style={{ color: 'var(--primary)' }}>{section.email}</a>.
              </>
            )}
          </p>
        </div>
      ))}
    </PageShell>
  );
}
