-- New clips are available to accepted parents with Film access, unless private.
-- Existing clips are unchanged here: a separate owner-scoped backfill is reviewed
-- before application so existing privacy choices are never silently overwritten.
ALTER TABLE public.clips ALTER COLUMN parent_shared SET DEFAULT true;
