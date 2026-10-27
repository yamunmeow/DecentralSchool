-- Games teachers send in for the Wall of Fame. The game itself is gzipped JSON; it goes when the
-- teacher withdraws it or deletes their account (on delete cascade).
create table "submission" (
  "id" text not null primary key,
  "userId" text not null references "user" ("id") on delete cascade,
  "kind" text not null check ("kind" in ('quick', 'lab')),
  "title" text not null,
  -- A quick game's template, shown as its tag.
  "tag" text not null default '',
  "emoji" text not null default '',
  "tint" text not null default '',
  -- A Game Lab game's picture, as a data: URL.
  "thumb" text not null default '',
  "blurb" text not null,
  "credit" text not null,
  "school" text not null default '',
  "note" text not null default '',
  "game" blob not null,
  "size" integer not null,
  "status" text not null default 'waiting' check ("status" in ('waiting', 'featured', 'declined')),
  "reply" text not null default '',
  "createdAt" integer not null,
  "reviewedAt" integer
);

create index "submission_status_idx" on "submission" ("status", "reviewedAt");

create index "submission_userId_idx" on "submission" ("userId");
