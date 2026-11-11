import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";

export const staticPagesApp = new Hono<AuthEnv>();

const commonCss = `
  :root {
    --bg-primary: #0f172a;
    --bg-card: #1e293b;
    --bg-card-hover: #334155;
    --text-primary: #f8fafc;
    --text-muted: #94a3b8;
    --accent: #0d9488;
    --accent-hover: #0f766e;
    --accent-light: #14b8a6;
    --border: #334155;
    --border-light: #475569;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: #0b1120;
    color: var(--text-primary);
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  a {
    color: var(--accent-light);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  a:hover {
    color: #5eead4;
    text-decoration: underline;
  }
  header {
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .nav-container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 700;
    font-size: 1.25rem;
    color: #fff;
    text-decoration: none;
  }
  .brand-badge {
    background: linear-gradient(135deg, #0d9488, #0284c7);
    color: white;
    font-size: 0.75rem;
    font-weight: 800;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    letter-spacing: 0.05em;
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, #0d9488, #0f766e);
    color: white;
    font-weight: 600;
    padding: 0.5rem 1.25rem;
    border-radius: 8px;
    border: 1px solid #14b8a6;
    text-decoration: none !important;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .btn-primary:hover {
    background: linear-gradient(135deg, #14b8a6, #0d9488);
    transform: translateY(-1px);
    color: white;
  }
  .btn-outline {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: transparent;
    color: var(--text-primary);
    font-weight: 600;
    padding: 0.5rem 1.25rem;
    border-radius: 8px;
    border: 1px solid var(--border-light);
    text-decoration: none !important;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .btn-outline:hover {
    background: var(--bg-card);
    border-color: var(--text-muted);
  }
  main {
    flex: 1;
    max-width: 1100px;
    margin: 0 auto;
    padding: 3rem 1.5rem;
    width: 100%;
  }
  .article-container {
    max-width: 840px;
    margin: 0 auto;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 2.5rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  }
  h1 {
    font-size: 2.25rem;
    font-weight: 800;
    color: #fff;
    margin-bottom: 0.5rem;
    line-height: 1.2;
  }
  h2 {
    font-size: 1.4rem;
    font-weight: 700;
    color: #e2e8f0;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--border);
  }
  h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--accent-light);
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
  }
  p, ul, ol {
    margin-bottom: 1rem;
    color: #cbd5e1;
  }
  ul, ol {
    padding-left: 1.5rem;
  }
  li {
    margin-bottom: 0.4rem;
  }
  .callout-box {
    background: rgba(13, 148, 136, 0.1);
    border-left: 4px solid var(--accent);
    padding: 1.25rem 1.5rem;
    border-radius: 0 8px 8px 0;
    margin: 1.5rem 0;
  }
  .callout-box p {
    margin-bottom: 0;
    color: #e2e8f0;
  }
  .meta-tagline {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 2rem;
  }
  footer {
    background: #090d16;
    border-top: 1px solid var(--border);
    padding: 2.5rem 1.5rem;
    margin-top: auto;
    font-size: 0.875rem;
    color: var(--text-muted);
  }
  .footer-container {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
  }
  .footer-links {
    display: flex;
    gap: 1.25rem;
    align-items: center;
    flex-wrap: wrap;
  }
  @media (max-width: 768px) {
    .nav-container, .footer-container {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    .article-container {
      padding: 1.5rem;
    }
    h1 {
      font-size: 1.75rem;
    }
  }
`;

export function renderHomeHtml(): string {
  const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const verificationMeta = googleSiteVerification
    ? `<meta name="google-site-verification" content="${googleSiteVerification}" />`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ACME ERP — Acme Hospital & Acme College of Nursing Management System</title>
  <meta name="description" content="Integrated enterprise management system for Acme Hospital (https://acmefertilitycentre.com/) and Acme College of Nursing (https://acmecollegeofnursing.org/). Secure clinical operations, nursing academics, pharmacy, and HR management.">
  ${verificationMeta}
  <style>
    ${commonCss}
    .hero {
      text-align: center;
      padding: 4rem 1rem 3rem;
      max-width: 860px;
      margin: 0 auto;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(13, 148, 136, 0.15);
      border: 1px solid rgba(20, 184, 166, 0.3);
      color: #2dd4bf;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1.5rem;
    }
    .hero h1 {
      font-size: 3rem;
      font-weight: 900;
      letter-spacing: -0.02em;
      margin-bottom: 1.25rem;
      background: linear-gradient(to right, #ffffff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero p {
      font-size: 1.15rem;
      color: #94a3b8;
      line-height: 1.7;
      margin-bottom: 2.25rem;
    }
    .hero-cta {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 3.5rem;
    }
    .feature-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.75rem;
      transition: border-color 0.2s ease, transform 0.2s ease;
    }
    .feature-card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
    }
    .feature-card h3 {
      font-size: 1.2rem;
      color: #fff;
      margin-top: 0;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .feature-card p {
      font-size: 0.925rem;
      color: #94a3b8;
      margin-bottom: 0;
      line-height: 1.55;
    }
    .institution-card {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.8));
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.5rem;
      margin-top: 3.5rem;
      text-align: center;
    }
    .institution-card h2 {
      border-bottom: none;
      margin-top: 0;
      color: #fff;
    }
    .external-badge-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid var(--border-light);
      color: #5eead4;
      text-decoration: none !important;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .external-badge-link:hover {
      background: rgba(13, 148, 136, 0.2);
      border-color: var(--accent);
    }
  </style>
</head>
<body>
  <header>
    <div class="nav-container">
      <a href="/" class="brand">
        <span class="brand-badge">ACME</span>
        <span>ERP Platform</span>
      </a>
      <nav class="nav-links">
        <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer" class="external-badge-link">🏥 Acme Hospital &nearr;</a>
        <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer" class="external-badge-link">🎓 Acme College of Nursing &nearr;</a>
        <a href="/policy">Privacy Policy</a>
        <a href="/terms">Terms</a>
        <a href="/login" class="btn-primary">Staff Portal &rarr;</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="hero-badge">Enterprise Hospital & Academic System</div>
      <h1>Integrated Healthcare & Nursing College Management</h1>
      <p>
        ACME ERP is the unified digital operating system for 
        <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer" style="color: #5eead4; font-weight: 600; text-decoration: underline;">Acme Hospital</a> 
        and 
        <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer" style="color: #5eead4; font-weight: 600; text-decoration: underline;">Acme College of Nursing</a>. 
        Providing hospital administration, clinical care, nursing education management, pharmacy inventory, and statutory HR compliance under a secure, role-based platform.
      </p>
      <div class="hero-cta">
        <a href="/login" class="btn-primary">Sign In to Staff Portal &rarr;</a>
        <a href="/policy" class="btn-outline">Review Privacy Policy</a>
      </div>
    </section>

    <section class="features-grid">
      <article class="feature-card">
        <h3>🏥 Acme Hospital Clinical Operations</h3>
        <p>Comprehensive outpatient billing, clinical care, consultant fee sharing, daily closing reports, IPD tracking, and NABH-compliant documentation for <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer">Acme Hospital & Fertility Centre</a>.</p>
      </article>

      <article class="feature-card">
        <h3>🎓 Acme College of Nursing</h3>
        <p>Student academic directories, semester fee structures, installment tracking, scheduled fee dues, batch attendance, and curriculum tracking for <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer">Acme College of Nursing</a>.</p>
      </article>

      <article class="feature-card">
        <h3>💊 Pharmacy & Store Inventory</h3>
        <p>Real-time batch-level stock management across central stores and dispensary units, barcode POS sales, and audited stock movement ledgers.</p>
      </article>

      <article class="feature-card">
        <h3>👥 Staff, Roster & Payroll</h3>
        <p>Departmental shift scheduling, biometric machine integration, leave workflows, statutory EPF/ESI payroll calculations, and digital payslips.</p>
      </article>

      <article class="feature-card">
        <h3>📝 CBT & Skill Assessments</h3>
        <p>NABH-aligned theoretical computer-based examinations, clinical competency evaluations, and certified credential archives for nursing professionals.</p>
      </article>

      <article class="feature-card">
        <h3>🔒 Enterprise Security & SSO</h3>
        <p>Strict role-based access control, Google OAuth 2.0 Single Sign-On for authorized personnel, clinical workstation PIN access, and immutable audit logs.</p>
      </article>
    </section>

    <section class="institution-card">
      <h2>Institutional Governance & Authorized Use</h2>
      <p style="max-width: 680px; margin: 0.75rem auto 1.5rem; color: #94a3b8;">
        ACME ERP is a restricted-access institutional platform designed exclusively for authorized healthcare professionals, faculty, staff, and students of 
        <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer" style="color: #5eead4; font-weight: 600;">Acme Hospital</a> 
        and 
        <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer" style="color: #5eead4; font-weight: 600;">Acme College of Nursing</a>.
      </p>
      <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
        <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer" class="btn-outline">Visit Acme Hospital &nearr;</a>
        <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer" class="btn-outline">Visit Acme College of Nursing &nearr;</a>
        <a href="/login" class="btn-primary">Open Staff Portal</a>
      </div>
    </section>
  </main>

  <footer>
    <div class="footer-container">
      <div>
        <p>&copy; ${new Date().getFullYear()} Acme Hospital & Acme College of Nursing. All rights reserved.</p>
        <p style="font-size: 0.8rem; margin-top: 0.25rem;">
          Portal: <a href="https://my-acme.cloud/" style="color: inherit;">my-acme.cloud</a> &bull; 
          Hospital: <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer" style="color: inherit;">acmefertilitycentre.com</a> &bull; 
          College: <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer" style="color: inherit;">acmecollegeofnursing.org</a>
        </p>
      </div>
      <div class="footer-links">
        <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer">Hospital</a>
        <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer">College</a>
        <a href="/policy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="/login">Staff Login</a>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

export function renderPolicyHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — ACME ERP (my-acme.cloud)</title>
  <meta name="description" content="Privacy Policy for ACME ERP healthcare and college management system for Acme Hospital (https://acmefertilitycentre.com/) and Acme College of Nursing (https://acmecollegeofnursing.org/). Explains data collection, Google OAuth user data usage, and data protection compliance.">
  <style>
    ${commonCss}
  </style>
</head>
<body>
  <header>
    <div class="nav-container">
      <a href="/" class="brand">
        <span class="brand-badge">ACME</span>
        <span>ERP Platform</span>
      </a>
      <nav class="nav-links">
        <a href="/">Home</a>
        <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer">Acme Hospital &nearr;</a>
        <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer">Acme College of Nursing &nearr;</a>
        <a href="/terms">Terms of Service</a>
        <a href="/login" class="btn-primary">Staff Portal &rarr;</a>
      </nav>
    </div>
  </header>

  <main>
    <article class="article-container">
      <h1>Privacy Policy</h1>
      <p class="meta-tagline">Last Updated & Effective: November 10, 2026 &bull; Applies to: <strong>https://my-acme.cloud/</strong></p>

      <section>
        <h2>1. Overview & Scope</h2>
        <p>
          This Privacy Policy details how <strong>ACME ERP</strong> ("the Application", "we", "us", or "our"), operated for 
          <strong>Acme Hospital</strong> (<a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer">https://acmefertilitycentre.com/</a>) and 
          <strong>Acme College of Nursing</strong> (<a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer">https://acmecollegeofnursing.org/</a>), 
          collects, processes, stores, and safeguards information obtained through the web application hosted at <strong>https://my-acme.cloud/</strong>.
        </p>
        <p>
          ACME ERP is an internal healthcare information and academic management platform dedicated to patient care coordination, 
          nursing education management, departmental rosters, inventory, and staff administration. We are committed to transparency 
          and protecting the privacy of our patients, students, clinicians, and staff.
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <p>We collect information strictly necessary to provide authentication, access control, and operational functionality:</p>
        
        <h3>A. Google User Data (OAuth 2.0 Authentication)</h3>
        <p>
          When authorized staff members choose to sign in or link their Google Account to ACME ERP using Google OAuth 2.0 Single Sign-On (SSO), 
          we request read access to basic identity scopes:
        </p>
        <ul>
          <li><strong>Email Address:</strong> Used as your unique organizational identifier to match with your registered staff profile.</li>
          <li><strong>Basic Profile (Name & Google User ID):</strong> Used to confirm your identity and display your name on work logs and reports.</li>
          <li><strong>Profile Picture:</strong> Optionally displayed on your authenticated employee/staff badge in the ERP header.</li>
        </ul>

        <h3>B. Institutional Staff & Student Records</h3>
        <p>
          Information registered by human resources and academic administration: employee identification codes, assigned hospital department, 
          designation, shift schedules, biometric attendance punches, statutory payroll configurations, and course enrollment records at Acme College of Nursing.
        </p>

        <h3>C. Operational, Clinical & System Audit Logs</h3>
        <p>
          To maintain regulatory healthcare standards (NABH) and cybersecurity compliance, our servers automatically log technical metadata 
          including IP addresses, browser user-agents, timestamps of critical data modifications, and secure HTTP-only session tokens.
        </p>
      </section>

      <section>
        <h2>3. How We Use Collected Information</h2>
        <p>Information collected by ACME ERP is used exclusively for legitimate institutional operations:</p>
        <ul>
          <li><strong>Identity Verification:</strong> Authenticating clinicians, faculty, administrative officers, and management approvers.</li>
          <li><strong>Role-Based Access Control (RBAC):</strong> Enforcing granular security boundaries (e.g., restricting financial closings, salary structures, or student ledgers to authorized personnel).</li>
          <li><strong>Healthcare & Academic Records:</strong> Managing patient appointments, outpatient billing, medication dispensing, student admissions, and fee collections for Acme Hospital and Acme College of Nursing.</li>
          <li><strong>Regulatory Audit Trails:</strong> Complying with Indian healthcare record requirements and nursing council accreditation audits.</li>
        </ul>
      </section>

      <section>
        <h2>4. Google API Services User Data Policy & Limited Use Disclosure</h2>
        <div class="callout-box">
          <p>
            <strong>Mandatory Google API Compliance:</strong><br>
            ACME ERP's use and transfer to any other app of information received from Google APIs will adhere to the 
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, 
            including the Limited Use requirements.
          </p>
        </div>
        <p>In strict accordance with Google Limited Use requirements:</p>
        <ul>
          <li><strong>No Commercial Advertising:</strong> We do NOT use, transfer, or disclose Google user data to serve advertisements, build consumer profiles, or support interest-based advertising of any kind.</li>
          <li><strong>No Sale of Data:</strong> We NEVER sell, license, rent, or trade Google user data, personal profiles, or healthcare records to third-party data brokers, marketers, or advertisers.</li>
          <li><strong>No Generalized AI Model Training:</strong> Google user data is NEVER used to train, retrain, fine-tune, or develop generalized artificial intelligence (AI) or machine learning (ML) models.</li>
          <li><strong>Restricted Human Access:</strong> No human is permitted to read user data obtained from Google APIs unless:
            <ol>
              <li>The user has provided affirmative explicit consent for specific technical support troubleshooting;</li>
              <li>It is strictly necessary for cybersecurity incident response; or</li>
              <li>It is required to comply with applicable law or a legally binding government request.</li>
            </ol>
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Data Sharing & Third-Party Disclosure</h2>
        <p>
          We do not share, sell, or disclose personal data or Google account information to external commercial parties. 
          Information is shared only with:
        </p>
        <ul>
          <li><strong>Hosting & Database Infrastructure:</strong> Trusted cloud and database servers hosting ACME ERP under strict confidentiality agreements and encryption protocols.</li>
          <li><strong>Legal & Regulatory Authorities:</strong> Only when strictly required by applicable Indian statutory law, court subpoenas, or medical/academic regulatory directives.</li>
        </ul>
      </section>

      <section>
        <h2>6. Data Security & Storage Safeguards</h2>
        <p>We employ enterprise-grade security protections to protect data against unauthorized access, loss, or disclosure:</p>
        <ul>
          <li><strong>Encryption in Transit:</strong> All communications between your browser and our servers are encrypted using modern Transport Layer Security (TLS 1.2 / TLS 1.3 with HTTPS).</li>
          <li><strong>Encryption at Rest:</strong> Sensitive institutional and personnel records are stored in secured, firewalled PostgreSQL databases with encrypted volume storage.</li>
          <li><strong>Session Security:</strong> Authentication credentials and tokens are secured in HTTP-only, SameSite-protected cookies that cannot be accessed by client-side scripts.</li>
          <li><strong>Granular Role Restrictions:</strong> Department-isolated permissions prevent unauthorized staff from viewing unassigned records.</li>
        </ul>
      </section>

      <section>
        <h2>7. Data Retention & Account Deletion / Unlinking</h2>
        <p>
          <strong>Unlinking Google Account:</strong> Staff members can decouple their Google account from ACME ERP at any time by navigating 
          to their personal <em>Settings &rarr; Security</em> inside the ERP and clicking "Disconnect Google account", or by revoking access 
          in their Google Account settings at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">https://myaccount.google.com/permissions</a>.
        </p>
        <p>
          <strong>Account & Data Deletion Requests:</strong> Former staff members, students, or authorized representatives may request 
          the deactivation of their ERP account and deletion of non-statutory records by writing to our designated privacy contact at 
          <a href="mailto:privacy@my-acme.cloud">privacy@my-acme.cloud</a>. Regulatory healthcare and financial transaction records 
          are retained in accordance with statutory medical records preservation laws.
        </p>
      </section>

      <section>
        <h2>8. Institutional Contacts</h2>
        <p>If you have any questions, feedback, or data privacy requests concerning this policy, please contact our administrative team:</p>
        <div style="background: rgba(15, 23, 42, 0.6); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border); font-size: 0.95rem;">
          <p style="margin-bottom: 0.35rem;"><strong>Acme Hospital & Acme College of Nursing</strong></p>
          <p style="margin-bottom: 0.35rem;">🏥 Hospital Portal: <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer">https://acmefertilitycentre.com/</a></p>
          <p style="margin-bottom: 0.35rem;">🎓 Nursing College Portal: <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer">https://acmecollegeofnursing.org/</a></p>
          <p style="margin-bottom: 0.35rem;">🌐 ERP System: <a href="https://my-acme.cloud/">https://my-acme.cloud/</a></p>
          <p style="margin-bottom: 0.35rem;">Information Technology & Data Governance Division &bull; Imphal, Manipur, India</p>
          <p style="margin-bottom: 0;">Privacy & Compliance Email: <a href="mailto:privacy@my-acme.cloud">privacy@my-acme.cloud</a></p>
        </div>
      </section>
    </article>
  </main>

  <footer>
    <div class="footer-container">
      <div>
        <p>&copy; ${new Date().getFullYear()} Acme Hospital & Acme College of Nursing. All rights reserved.</p>
        <p style="font-size: 0.8rem; margin-top: 0.25rem;">
          Hospital: <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer" style="color: inherit;">acmefertilitycentre.com</a> &bull; 
          College: <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer" style="color: inherit;">acmecollegeofnursing.org</a>
        </p>
      </div>
      <div class="footer-links">
        <a href="/">Home</a>
        <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer">Acme Hospital</a>
        <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer">Acme College of Nursing</a>
        <a href="/policy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="/login">Staff Login</a>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

export function renderTermsHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service — ACME ERP (my-acme.cloud)</title>
  <meta name="description" content="Terms of Service governing authorized access to ACME ERP hospital and nursing college management application.">
  <style>
    ${commonCss}
  </style>
</head>
<body>
  <header>
    <div class="nav-container">
      <a href="/" class="brand">
        <span class="brand-badge">ACME</span>
        <span>ERP Platform</span>
      </a>
      <nav class="nav-links">
        <a href="/">Home</a>
        <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer">Acme Hospital &nearr;</a>
        <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer">Acme College of Nursing &nearr;</a>
        <a href="/policy">Privacy Policy</a>
        <a href="/login" class="btn-primary">Staff Portal &rarr;</a>
      </nav>
    </div>
  </header>

  <main>
    <article class="article-container">
      <h1>Terms of Service</h1>
      <p class="meta-tagline">Last Updated & Effective: November 10, 2026 &bull; Host: <strong>https://my-acme.cloud/</strong></p>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using the <strong>ACME ERP</strong> web application at <strong>https://my-acme.cloud/</strong> ("the Service"), 
          you agree to be bound by these Terms of Service. If you do not agree to these terms, you are not authorized to access or use the application.
        </p>
      </section>

      <section>
        <h2>2. Authorized Users & Institutional Purpose</h2>
        <p>
          ACME ERP is provided exclusively for authorized clinical staff, faculty, administrative personnel, and registered students of 
          <strong>Acme Hospital</strong> (<a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer">https://acmefertilitycentre.com/</a>) and 
          <strong>Acme College of Nursing</strong> (<a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer">https://acmecollegeofnursing.org/</a>). 
          Accounts are non-transferable.
        </p>
      </section>

      <section>
        <h2>3. Confidentiality & Patient Data Protection</h2>
        <p>
          Users handling patient medical records, diagnostic tests, or student files must strictly observe hospital confidentiality policies, 
          NABH standards, and statutory medical privacy guidelines. Sharing, photographing, exporting, or disclosing confidential patient or 
          institutional data without authorization is strictly prohibited.
        </p>
      </section>

      <section>
        <h2>4. Account Security & Authentication</h2>
        <p>
          You are responsible for maintaining the confidentiality of your credentials, including your password, workstation PIN, and any linked 
          Google Account used for Single Sign-On (SSO). You must immediately notify system administrators of any suspected unauthorized access.
        </p>
      </section>

      <section>
        <h2>5. Termination of Access</h2>
        <p>
          Access privileges are tied to current employment, active clinical appointment, or academic enrollment. Acme Hospital and Acme College of Nursing 
          reserve the right to revoke or suspend system access upon termination of employment, academic suspension, or violation of security protocols.
        </p>
      </section>

      <section>
        <h2>6. Institutional Contacts</h2>
        <p>
          Inquiries regarding system administration and terms of service may be directed to:
          <br>
          <strong>Acme Hospital & Acme College of Nursing Administration</strong><br>
          🏥 Hospital Website: <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer">https://acmefertilitycentre.com/</a><br>
          🎓 Nursing College Website: <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer">https://acmecollegeofnursing.org/</a><br>
          Official Administration Email: <a href="mailto:admin@my-acme.cloud">admin@my-acme.cloud</a>
        </p>
      </section>
    </article>
  </main>

  <footer>
    <div class="footer-container">
      <div>
        <p>&copy; ${new Date().getFullYear()} Acme Hospital & Acme College of Nursing. All rights reserved.</p>
        <p style="font-size: 0.8rem; margin-top: 0.25rem;">
          Hospital: <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer" style="color: inherit;">acmefertilitycentre.com</a> &bull; 
          College: <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer" style="color: inherit;">acmecollegeofnursing.org</a>
        </p>
      </div>
      <div class="footer-links">
        <a href="/">Home</a>
        <a href="https://acmefertilitycentre.com/" target="_blank" rel="noopener noreferrer">Acme Hospital</a>
        <a href="https://acmecollegeofnursing.org/" target="_blank" rel="noopener noreferrer">Acme College of Nursing</a>
        <a href="/policy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="/login">Staff Login</a>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

// Route handlers for static HTML pages
staticPagesApp.get("/policy", (c) => {
  c.header("Content-Type", "text/html; charset=UTF-8");
  return c.html(renderPolicyHtml());
});

staticPagesApp.get("/privacy", (c) => {
  c.header("Content-Type", "text/html; charset=UTF-8");
  return c.html(renderPolicyHtml());
});

staticPagesApp.get("/terms", (c) => {
  c.header("Content-Type", "text/html; charset=UTF-8");
  return c.html(renderTermsHtml());
});

staticPagesApp.get("/terms-of-service", (c) => {
  c.header("Content-Type", "text/html; charset=UTF-8");
  return c.html(renderTermsHtml());
});

// Google Search Console file verification helper:
// Handles any google<hash>.html verification file request dynamically
staticPagesApp.get("/:file{google[0-9a-fA-F]+\\.html}", (c) => {
  const file = c.req.param("file");
  c.header("Content-Type", "text/html; charset=UTF-8");
  return c.text(`google-site-verification: ${file}`);
});
