# Security Policy

## 🔒 Reporting a Vulnerability

> [!CAUTION]
> **Please do NOT report security vulnerabilities through public GitHub issues.**

We take the security of CertPrep.ai seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Email:** [security@certprep.ai](mailto:security@certprep.ai)

**Security.txt:** We publish a [security.txt](https://certprep.ai/.well-known/security.txt) file for automated discovery of our security policy and contact information.

**PGP Key:** Not currently provided; please contact us via email and request an encrypted channel if needed.

### What to Include

Please include as much of the following information as possible:

| Information | Description                                                                |
| ----------- | -------------------------------------------------------------------------- |
| Type        | Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)    |
| Location    | Full paths of source file(s) related to the issue                          |
| Steps       | Step-by-step instructions to reproduce                                     |
| Impact      | Potential impact of the vulnerability, including a CVSS score if possible. |
| Proof       | Proof-of-concept or exploit code (if possible)                             |

### Response Timeline

| Phase             | Timeline                              |
| ----------------- | ------------------------------------- |
| Initial Response  | Within 48 hours                       |
| Status Update     | Within 5 business days                |
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

| Measure            | Implementation                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Password Hashing   | Supabase (bcrypt)                                                                                                         |
| Session Management | Supabase Auth with secure cookies                                                                                         |
| Cookie Security    | `Secure`, `HttpOnly`, `SameSite=Lax` (protects against CSRF in most cases while allowing top-level navigations), `Path=/` |
| Row-Level Security | Enforced per-table with `auth.uid()` owner checks (see RLS policy checklist below)                                        |

### Data Protection

| Data Type        | Protection Method          |
| ---------------- | -------------------------- |
| In Transit       | TLS 1.3 encryption         |
| At Rest (Server) | Supabase encryption        |
| At Rest (Client) | IndexedDB (see note below) |

> [!NOTE]
> Local data in IndexedDB is not encrypted at rest. Use **Settings → Data Management → Reset** on shared devices to clear local quizzes/results.

### RLS Policy Checklist (Supabase)

For each user-owned table (e.g., `results`), ensure:

```sql
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
CREATE POLICY results_select_owner ON results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY results_insert_owner ON results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY results_update_owner ON results FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY results_delete_owner ON results FOR DELETE USING (auth.uid() = user_id);
```

> Verify equivalent owner-scoped policies exist for any additional user-data tables.

### Content Security

| Measure          | Implementation                                                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| XSS Prevention   | React's default escaping + `sanitizeHTML()` (uses **isomorphic-dompurify v2.33.0**; allows specific tags/attributes, including 'class' for styling) |
| CSRF Protection  | SameSite cookies + origin validation                                                                                                                |
| Input Validation | Server-side validation on all inputs                                                                                                                |

---

## 🔐 Supported Versions

We are committed to providing a secure and stable experience. Our version support policy is as follows:

| Version | Status         | Support Level | End of Life (EOL) Date    |
| ------- | -------------- | ------------- | ------------------------- |
| 2.x.x   | ✅ Current     | Full Support  | N/A (actively maintained) |
| 1.x.x   | ❌ Ended       | No Support    | Ended on 2024-12-31       |
| < 1.0   | ❌ End-of-Life | No Support    | Passed                    |

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
| ---------- | ------- | ---- |
| -          | -       | -    |

_This table will be updated as vulnerabilities are reported and fixed._
