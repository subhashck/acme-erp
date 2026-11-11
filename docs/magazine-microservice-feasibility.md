# Magazine extraction decision

The feasibility review was accepted on 16 October 2026 with a fresh-start boundary: existing ERP issues are discarded, with no data or URL migration.

The implementation now lives in `services/magazine/`. See [the service operating and deployment guide](magazine-service.md) for the current architecture, authentication contract, local setup, production overlay, purge command and verification.

ERP retains shared Hospital Settings, assessment controls, the promotion preference, a bounded public-feed adapter and identity-only bridge. The standalone service owns the editor and all Tiptap dependencies, issues, media, branding, numbering and public rendering. It has its own PostgreSQL database/role and dedicated MinIO bucket/user.

The local ERP Magazine records have been purged. Production VPS deployment and production purging are separate steps documented in the guide; no production infrastructure was accessed.
