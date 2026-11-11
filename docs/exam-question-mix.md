# Exam question mix

HR and Admin can open **Assessments → Question Bank → Exam Settings** and configure:

- Basic, Medium and Advanced difficulty percentages (whole numbers from 0 to 100, totaling 100%).
- The share of questions tagged for the candidate's department (0 to 100%).

Defaults are 50% basic, 35% medium, 15% advanced, and 50% department-specific. The form previews rounded counts for the configured exam size. Department coverage overlaps difficulty: a department question still contributes to its difficulty quota.

New attempts use the saved configuration. Existing attempts retain their selected questions, timers and passing threshold. Settings changes are authorized by the existing HR/Admin API guard.

All configuration reads and updates use the earliest active configuration by ID, including databases with duplicate active rows from older setup runs. Setup creates a default only when no active configuration exists; it does not reset saved ratios.

Difficulty counts use largest-remainder rounding; the department count rounds to the nearest whole question. The selector satisfies both targets when the bank permits. When stock is insufficient, it preserves difficulty targets first, fills exhausted difficulty buckets from available questions, and chooses the closest feasible department count. It prefers hospital-wide questions for the nondepartment share, then other specialties if necessary. Questions are never repeated within an exam; if the entire active bank is too small, the exam contains only available unique questions.

Department matching uses the existing case-insensitive tag/name substring convention. Empty departments never match. Empty tags and All/Hospital-wide tags are general; a question is not classified as general merely because its domain is HIC, MOM or another core domain.

Run `pnpm assessments:migrate-question-mix` to add the four configuration columns to an existing database without reseeding content. Fresh assessment setup also applies this idempotent migration. API changes require a running process that has loaded the updated source.
