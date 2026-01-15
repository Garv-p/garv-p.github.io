// scripts/fetchGoodreads.ts
import Parser from "rss-parser";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type GoodreadsBook = {
  guid?: string;
  pubDate?: string;

  title: string;
  link: string;

  id?: string;

  bookImageUrl?: string;
  bookSmallImageUrl?: string;
  bookMediumImageUrl?: string;
  bookLargeImageUrl?: string;

  bookDescription?: string;

  authorName?: string;
  isbn?: string;

  userName?: string;
  userRating?: string;
  userReadAt?: string;
  userDateAdded?: string;
  userDateCreated?: string;
  userShelves?: string;
  userReview?: string;

  averageRating?: string;
  bookPublished?: string;

  content?: string;
};

// Feed-wide fields can be typed too; keeping it flexible:
type FeedMeta = Record<string, unknown>;

const parser = new Parser<FeedMeta, GoodreadsBook>({
  customFields: {
    item: [
      "guid",
      "title",
      "link",
      "pubDate",
      ["book_id", "id"],
      ["book_image_url", "bookImageUrl"],
      ["book_small_image_url", "bookSmallImageUrl"],
      ["book_medium_image_url", "bookMediumImageUrl"],
      ["book_large_image_url", "bookLargeImageUrl"],
      ["book_description", "bookDescription"],
      ["author_name", "authorName"],
      ["isbn", "isbn"],
      ["user_name", "userName"],
      ["user_rating", "userRating"],
      ["user_read_at", "userReadAt"],
      ["user_date_added", "userDateAdded"],
      ["user_date_created", "userDateCreated"],
      ["user_shelves", "userShelves"],
      ["user_review", "userReview"],
      ["average_rating", "averageRating"],
      ["book_published", "bookPublished"],
    ],
  },
});

// Put this in env so you don't hardcode it in git
//const GOODREADS_RSS_FEED_URL = process.env.GOODREADS_RSS_FEED_URL ?? "";
const GOODREADS_RSS_FEED_URL = "https://www.goodreads.com/review/list_rss/170958487?key=EdEBFx-EW3j9rYQ6boOt4px1AaKK3a3KHUGSxmSzg56BKw-K&shelf=read"
// Write into Hugo's data directory (adjust to your repo)
const OUT_FILE ="data/goodreads.books.json";

function stripHtml(s: string): string {
  return s.replace(/<[^>]*(>|$)/g, "");
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\n/g, " ").replace(/\s\s+/g, " ").trim();
}

function prettifyBook(book: GoodreadsBook): GoodreadsBook {
  const next: GoodreadsBook = { ...book };

  if (next.content) next.content = normalizeWhitespace(next.content);

  if (next.bookDescription) {
    next.bookDescription = normalizeWhitespace(stripHtml(next.bookDescription))
      .replace(/^[\"“]+|[\"”]+$/g, "") // trim quotes
      .replace(/\.([a-zA-Z0-9])/g, ". $1"); // space after periods
  }

  return next;
}

export async function fetchGoodreadsBooks(): Promise<GoodreadsBook[]> {
  if (!GOODREADS_RSS_FEED_URL) {
    console.log("📚 No Goodreads RSS feed found (set GOODREADS_RSS_FEED_URL).");
    return [];
  }

  const data = await parser.parseURL(GOODREADS_RSS_FEED_URL);
  const items = (data.items ?? []).map(prettifyBook);

  // Ensure output directory exists
  mkdirSync(dirname(OUT_FILE), { recursive: true });

  // Write pretty JSON so diffs are readable
  writeFileSync(OUT_FILE, JSON.stringify(items, null, 2), "utf8");
  console.log(`✅ Wrote ${items.length} books to ${OUT_FILE}`);

  return items;
}

// Allow running directly: `node --loader ts-node/esm scripts/fetchGoodreads.ts`
if (require.main === module) {
  fetchGoodreadsBooks().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Error fetching Goodreads RSS feed: ${msg}`);
    process.exit(1);
  });
}