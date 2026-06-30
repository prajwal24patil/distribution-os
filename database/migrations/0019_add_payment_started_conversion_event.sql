alter table conversion_events
  drop constraint if exists conversion_events_event_type_check;

alter table conversion_events
  add constraint conversion_events_event_type_check
  check (
    event_type in (
      'click',
      'signup',
      'resume_upload',
      'free_score_generated',
      'payment_started',
      'paid_report',
      'referral_share',
      'revenue'
    )
  );
