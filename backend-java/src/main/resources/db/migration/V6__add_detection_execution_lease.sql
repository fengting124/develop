alter table detection_task add column execution_token varchar(64);
alter table detection_task add column execution_lease_until timestamp with time zone;
alter table detection_task add column execution_attempt_count integer not null default 0;

create index idx_detection_task_execution_lease
    on detection_task(status, execution_lease_until);
