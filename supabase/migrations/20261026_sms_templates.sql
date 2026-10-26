-- Fixed SMS wording the admin writes once and reuses: the payment reminder
-- and the welcome message for newly registered students. {name}, {class},
-- {fee}, … are filled in per student when sending (src/notifications/templates.js).

create table public.sms_templates (
  key text primary key,          -- payment_reminder | welcome
  body text not null default '',
  auto_send boolean not null default false,  -- welcome: send when a student is added
  updated_at timestamptz not null default now()
);

alter table public.sms_templates enable row level security;
create policy "Admins manage SMS templates" on public.sms_templates
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.sms_templates (key, body, auto_send) values
  ('payment_reminder', 'އައްސަލާމު ޢަލައިކުމް. {name} ގެ {month} ގެ ފީ {fee} އަދި ނުދައްކާ އޮތީ. އެންމެ އަވަހަކަށް ދައްކަވައިދެއްވުން އެދެމެވެ. ޝުކުރިއްޔާ - އަފްލާޙް ޤުރްއާން ކްލާސް', false),
  ('welcome', 'އައްސަލާމު ޢަލައިކުމް. {name} އަފްލާޙް ޤުރްއާން ކްލާހަށް މަރުޙަބާ! ކްލާސް: {class}. ދުވަސް: {days}. ގަޑި: {time}. މުދައްރިސް: {teacher}. މަހުގެ ފީ: {fee}. ސްޓޫޑެންޓް އައިޑީ: {student_id}', true);

-- Each recipient can get their own wording (name, fee, …) instead of the
-- notification's shared body.
alter table public.notification_recipients add column body text;
