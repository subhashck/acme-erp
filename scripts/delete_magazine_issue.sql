-- ============================================================================
-- ACME ERP: Delete a Particular Magazine Issue
-- ============================================================================
-- Database: PostgreSQL (schema: "magazine")
--
-- Description:
--   Safely deletes a specific magazine issue and its cascade dependencies.
--
-- Foreign Key Cascade Behavior in Schema:
--   - "magazine"."magazine_sections"    -> ON DELETE CASCADE (automatically deleted)
--   - "magazine"."magazine_issue_media" -> ON DELETE CASCADE (automatically deleted)
--   - "magazine"."magazine_media"       -> ON DELETE SET NULL (media records kept in library)
--
-- Execution Examples:
--   Windows PowerShell (Docker):
--     Get-Content scripts/delete_magazine_issue.sql | docker exec -i acme-erp-db psql -U postgres -d acme_erp
--
--   Linux VPS (Docker):
--     docker exec -i acme-erp-db psql -U postgres -d acme_erp < scripts/delete_magazine_issue.sql
--
--   Direct psql:
--     psql -U postgres -d acme_erp -f scripts/delete_magazine_issue.sql
-- ============================================================================

BEGIN;

DO $$
DECLARE
    -- >>> SET TARGET IDENTIFIER HERE <<<
    -- Provide ANY ONE of the following (set others to NULL):
    target_slug     TEXT := 'REPLACE_WITH_TARGET_SLUG';  -- e.g. 'pediatric-innovations-2026-10'
    target_issue_no TEXT := NULL;                       -- e.g. 'MAG/26-27/00001'
    target_id       INT  := NULL;                       -- e.g. 1

    -- Set to TRUE if you also want to delete media assets uploaded exclusively for this issue:
    delete_exclusive_media BOOLEAN := FALSE;

    -- Internal variables
    found_issue_id  INT;
    found_title     TEXT;
    found_slug      TEXT;
    found_issue_no  TEXT;
    sections_count  INT;
    media_links_cnt INT;
    exclusive_media INT;
    deleted_media   INT := 0;
BEGIN
    -- 1. Identify the issue
    SELECT id, title, slug, issue_no
    INTO found_issue_id, found_title, found_slug, found_issue_no
    FROM "magazine"."magazine_issues"
    WHERE (target_id IS NOT NULL AND id = target_id)
       OR (target_slug IS NOT NULL AND slug = target_slug)
       OR (target_issue_no IS NOT NULL AND issue_no = target_issue_no)
    LIMIT 1;

    IF found_issue_id IS NULL THEN
        RAISE EXCEPTION 'Magazine issue not found matching criteria (slug="%", issue_no="%", id="%" ). Transaction aborted.',
            target_slug, target_issue_no, target_id;
    END IF;

    -- 2. Gather diagnostics
    SELECT COUNT(*) INTO sections_count
    FROM "magazine"."magazine_sections"
    WHERE issue_id = found_issue_id;

    SELECT COUNT(*) INTO media_links_cnt
    FROM "magazine"."magazine_issue_media"
    WHERE issue_id = found_issue_id;

    SELECT COUNT(*) INTO exclusive_media
    FROM "magazine"."magazine_media" m
    WHERE (m.issue_id = found_issue_id)
      AND NOT EXISTS (
          SELECT 1 FROM "magazine"."magazine_issue_media" im
          WHERE im.media_id = m.id AND im.issue_id != found_issue_id
      );

    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Target Magazine Issue Identified:';
    RAISE NOTICE '  ID:                  %', found_issue_id;
    RAISE NOTICE '  Title:               %', found_title;
    RAISE NOTICE '  Issue No:            %', found_issue_no;
    RAISE NOTICE '  Slug:                %', found_slug;
    RAISE NOTICE 'Cascade Impact:';
    RAISE NOTICE '  Sections to remove:  %', sections_count;
    RAISE NOTICE '  Media link mappings: %', media_links_cnt;
    RAISE NOTICE '  Exclusive Media:     %', exclusive_media;
    RAISE NOTICE '====================================================';

    -- 3. Optionally clean up media assets exclusive to this issue
    IF delete_exclusive_media THEN
        DELETE FROM "magazine"."magazine_media" m
        WHERE (m.issue_id = found_issue_id)
          AND NOT EXISTS (
              SELECT 1 FROM "magazine"."magazine_issue_media" im
              WHERE im.media_id = m.id AND im.issue_id != found_issue_id
          );
        GET DIAGNOSTICS deleted_media = ROW_COUNT;
        RAISE NOTICE 'Deleted % exclusive media assets.', deleted_media;
    ELSE
        RAISE NOTICE 'Retaining media assets in media library (issue_id will be cleared to NULL).';
    END IF;

    -- 4. Delete the issue record
    -- Note: Foreign key constraints on "magazine_sections" and "magazine_issue_media"
    -- are defined as ON DELETE CASCADE and will be deleted automatically.
    DELETE FROM "magazine"."magazine_issues"
    WHERE id = found_issue_id;

    RAISE NOTICE 'Successfully deleted magazine issue ID % ("%").', found_issue_id, found_title;
END $$;

-- Verify deletion and commit
-- (Change COMMIT to ROLLBACK if performing a dry-run test)
COMMIT;
