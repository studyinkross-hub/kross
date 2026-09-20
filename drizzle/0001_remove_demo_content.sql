DELETE FROM `records`
WHERE `kind` = 'lessonActivity'
  AND json_extract(`payload`, '$.title') IN (
    '회화 · 듣고 따라 말하기',
    'Gọi món · nghe và nói',
    '단어 · 빈칸 채우기',
    'Từ vựng · điền từ',
    'ㅂ 불규칙 · 베트남어 → 한국어',
    'Bất quy tắc ㅂ · Việt → Hàn',
    'ㅂ 불규칙 · 한국어 → 베트남어',
    'Bất quy tắc ㅂ · Hàn → Việt'
  );
--> statement-breakpoint
DELETE FROM `records`
WHERE `kind` = 'checkpoint'
  AND `id` IN ('cp1', 'cp2', 'cp3');
--> statement-breakpoint
DELETE FROM `records`
WHERE `kind` = 'config'
  AND json_extract(`payload`, '$.videoUrl') = '/lesson-cafe.mp4';
