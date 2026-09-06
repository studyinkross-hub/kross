# KROSS Campus

Interactive Korean learning prototype for KROSS Da Nang. Vietnamese-first learner UI, Korean translation, timed video checkpoints, vocabulary review and teacher feedback.

## Development

Use Node >=22.13 and pnpm. Run `pnpm install`, apply `drizzle/0000_volatile_maverick.sql` to the local D1 binding, then `pnpm dev`. Production: `pnpm build`. The generated Cloudflare Worker exports a default fetch handler. Sites manages the production D1 binding and migrations.

## Product boundary

This is an owner-private demo with one browser-isolated sample learner. The teacher role is a simulation, not authorization. A 30-day HttpOnly session cookie scopes durable D1 records. Real accounts, class permissions, video upload/transcoding and legacy vocabulary migration remain future work. Do not expose this demo as an actual multi-user LMS.

## Content

The original 60-second silent MP4 contains four Korean/Vietnamese instructional slides. Replace it with an HTTPS MP4/WebM direct URL in the teacher editor. Time input accepts seconds, MM:SS and HH:MM:SS, with up to 4 hours and 20 checkpoints. Existing checkpoint times can be moved. Edited checkpoints clear their previous answers; video replacement clears viewing progress and answers.

Vocabulary: cards, Korean typing quiz, weak words and 1/3/7/14-day scheduling. Korean speech synthesis is used only when a Korean voice exists. No AI grading is claimed.

The existing KROSS vocabulary app is linked at https://studyinkross-hub.github.io/kross/ . Its original source and production data have not been copied into this project.

## Validation

26 automated assertions: 22 API flow checks including session isolation, mutations, 1-hour timestamp handling and validation, plus 4 time-format assertions. Browser QA covers checkpoints, feedback revision loop, vocabulary, durable state, teacher timestamp creation/editing and 390px mobile layout. Real 1-hour footage was not supplied, so large-video playback performance remains untested.

