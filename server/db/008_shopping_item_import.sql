-- HomeBase shopping list import from links.
-- Run after 007_chore_fixed_schedule.sql in the Supabase SQL Editor.
-- Run this BEFORE deploying the server version that imports from links.

-- A product photo found when the item was imported
alter table public.shopping_items
  add column if not exists image_url text
    check (image_url is null or (char_length(image_url) <= 2000 and image_url ~* '^https://'));

-- Which product an imported item is ('ikea:10401484', or the product page address),
-- so importing it again adds to its quantity instead of making a duplicate
alter table public.shopping_items
  add column if not exists source_key text
    check (source_key is null or char_length(source_key) <= 500);

create index if not exists ix_shopping_items_list_source
  on public.shopping_items (list_id, source_key)
  where deleted_at_utc is null and source_key is not null;
