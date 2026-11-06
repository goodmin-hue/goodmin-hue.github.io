-- guestbook 테이블 생성 SQL
-- docs/feature-plan.md 기준. Supabase SQL Editor 에서 실행한다.
--
-- 안전 규칙:
--   - 기존 데이터를 지우는 명령(drop / delete / truncate)은 쓰지 않는다.
--   - 여러 번 실행해도 안전하도록 if not exists / 가드를 둔다.
--
-- 열: id, nickname(2~12자), message(1~100자), created_at(기본값 now())
-- 접근 제한: RLS 켜기. anon / authenticated 직접 접근 정책은 만들지 않는다.
--           (서버 함수가 secret 키로만 접근한다. secret 키는 RLS를 우회한다.)

-- 1) 테이블 생성 (없을 때만)
create table if not exists public.guestbook (
  id          bigint generated always as identity primary key,
  nickname    text        not null,
  message     text        not null,
  created_at  timestamptz not null default now(),

  -- DB 레벨 글자 수 제한 (브라우저·서버 검사와 동일 기준)
  constraint guestbook_nickname_len check (char_length(nickname) between 2 and 12),
  constraint guestbook_message_len  check (char_length(message)  between 1 and 100)
);

-- 2) 최근 순 조회가 빠르도록 인덱스 (없을 때만)
create index if not exists guestbook_created_at_idx
  on public.guestbook (created_at desc);

-- 3) RLS(행 수준 보안) 켜기
--    RLS를 켜고 정책을 만들지 않으면, anon·authenticated 키로는 행에 접근할 수 없다.
--    (= 브라우저에서 직접 읽기·쓰기 불가. 서버 함수의 secret 키만 접근 가능)
alter table public.guestbook enable row level security;

-- 4) anon / authenticated 용 정책은 "일부러 만들지 않는다."
--    따로 작성할 CREATE POLICY 문이 없다. 정책이 없으므로 직접 접근은 전부 차단된다.
