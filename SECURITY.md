# Security Policy

## 🔒 Reporting a Vulnerability

> [!CAUTION]
> **Please do NOT report security vulnerabilities through public GitHub issues.**

We take the security of CertPrep.ai seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Email:** [security@certprep.ai](mailto:security@certprep.ai)

**PGP Key:** [Optional - link to PGP key for encrypted communication]

### What to Include

Please include as much of the following information as possible:

| Information | Description |
|-------------|-------------|
| Type | Type of vulnerability (e.g., XSS, SQL injection, authentication bypass) |
| Location | Full paths of source file(s) related to the issue |
| Steps | Step-by-step instructions to reproduce |
| Impact | Potential impact of the vulnerability |
| Proof | Proof-of-concept or exploit code (if possible) |

### Response Timeline

| Phase | Timeline |
|-------|----------|
| Initial Response | Within 48 hours |
| Status Update | Within 5 business days |
| Resolution Target | Within 30 days (complexity dependent) |

### Safe Harbor

We support safe harbor for security researchers who:

- ✅ Make a good faith effort to avoid privacy violations
- ✅ Avoid destruction of data or service interruption
- ✅ Do not access or modify data belonging to others
- ✅ Report findings promptly and give reasonable time for remediation
- ✅ Do not publicly disclose before agreed timeline

---

## 🛡️ Security Measures

### Authentication & Authorization

| Measure | Implementation |
|---------|----------------|
| Password Hashing | Supabase (bcrypt) |
| Session Management | Supabase Auth with secure cookies |
| Cookie Security | `Secure`, `HttpOnly`, `SameSite=Lax` |
| Row-Level Security | PostgreSQL RLS policies |

### Data Protection

| Data Type | Protection Method |
|-----------|-------------------|
| In Transit | TLS 1.3 encryption |
| At Rest (Server) | Supabase encryption |
| At Rest (Client) | IndexedDB (see note below) |

> [!NOTE]
> Local data in IndexedDB is not encrypted at rest. Users on shared devices should log out to clear local data.

### Content Security

| Measure | Implementation |
|---------|----------------|
| XSS Prevention | React's default escaping + `sanitizeHTML()` |
| CSRF Protection | SameSite cookies + origin validation |
| Input Validation | Server-side validation on all inputs |

---

## 🔐 Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x.x | ✅ Active support |
| 1.x.x | ⚠️ Security fixes only |
| < 1.0 | ❌ No longer supported |

---

## 📋 Security Checklist for Contributors

When contributing, please ensure:

- [ ] No secrets or credentials in code
- [ ] User input is validated and sanitized
- [ ] Sensitive data is not logged
- [ ] SQL queries use parameterized statements
- [ ] File uploads are validated (if applicable)
- [ ] Authentication checks are in place for protected routes
- [ ] Error messages don't reveal sensitive information

---

## 🔗 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/auth/auth-policies)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)

---

## 📜 Security Acknowledgments

We thank the following security researchers for responsible disclosure:

| Researcher | Finding | Date |
|------------|---------|------|
| - | - | - |

*This table will be updated as vulnerabilities are reported and fixed.*
