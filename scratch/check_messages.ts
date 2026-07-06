import { db } from "../server/db/client.ts";
import { sql } from "drizzle-orm";

async function main() {
  const userId = "1F1psyRtRNj2S53SfdGetCE0fLXyKbn5"; // Sara

  const rows = await db.execute(sql`
    SELECT
      u.id,
      u.name,
      u.email,
      u.image,
      lm.content   AS "lastMessage",
      lm.created_at AS "lastMessageAt",
      COALESCE(ur.unread, 0) AS unread
    FROM (
      SELECT DISTINCT
        CASE WHEN sender_id = ${userId} THEN receiver_id ELSE sender_id END AS partner_id
      FROM messages
      WHERE channel_type = 'direct'
        AND (sender_id = ${userId} OR receiver_id = ${userId})
    ) AS partners
    INNER JOIN "user" u ON u.id = partners.partner_id
    -- latest message in this conversation
    INNER JOIN LATERAL (
      SELECT content, created_at
      FROM messages
      WHERE channel_type = 'direct'
        AND (
          (sender_id = ${userId} AND receiver_id = partners.partner_id)
          OR (sender_id = partners.partner_id AND receiver_id = ${userId})
        )
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON true
    -- unread: messages sent TO current user that are unread
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS unread
      FROM messages
      WHERE channel_type = 'direct'
        AND sender_id = partners.partner_id
        AND receiver_id = ${userId}
        AND read_at IS NULL
    ) ur ON true
    ORDER BY lm.created_at DESC
  `);

  console.log("Conversations query returned:", rows.rows ?? rows);
}

main().catch(console.error);
