alter table evaluation_run
    add column attempt_count integer not null default 0;

alter table evaluation_run
    add column max_attempts integer not null default 3;

