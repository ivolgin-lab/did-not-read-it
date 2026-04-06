-- Run this after drizzle-kit push to set up full-text search trigger
CREATE OR REPLACE FUNCTION post_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.body, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_search_vector_trigger ON post;
CREATE TRIGGER post_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, body ON post
  FOR EACH ROW
  EXECUTE FUNCTION post_search_vector_update();

-- Backfill existing posts
UPDATE post SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(body, '')), 'B');
