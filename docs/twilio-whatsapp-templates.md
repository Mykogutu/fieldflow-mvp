# FieldFlow Twilio WhatsApp Templates

Use these template names and bodies in Twilio Content Template Builder.

Language for all templates: `English`

## Existing Core Templates

### `job_assigned_worker`
Variables:
1. `worker_name`
2. `job_type`
3. `client_name`
4. `location`
5. `scheduled_time`

```text
Hello {{1}}. You have been assigned a new job.

Job: {{2}}
Client: {{3}}
Location: {{4}}
Scheduled: {{5}}

Reply ACCEPT to take this job or DECLINE if you are unavailable.
```

### `technician_assigned_client`
Variables:
1. `client_name`
2. `company_name`
3. `job_type`
4. `scheduled_time`
5. `technician_name`
6. `technician_phone`

```text
Hello {{1}}. {{2}} has assigned a technician to your job.

Service: {{3}}
Scheduled: {{4}}
Technician: {{5}}
Phone: {{6}}

Please keep your phone available in case the technician needs directions or arrival confirmation.
```

### `job_reassigned`
Variables:
1. `worker_name`
2. `job_type`
3. `client_name`
4. `location`
5. `scheduled_time`

```text
Hello {{1}}. A job has been reassigned to you.

Job: {{2}}
Client: {{3}}
Location: {{4}}
Scheduled: {{5}}

Reply ACCEPT to take this job or DECLINE if you are unavailable.
```

### `service_code_completion_request`
Variables:
1. `client_name`
2. `company_name`
3. `job_type`
4. `job_id`
5. `amount`
6. `service_code`

Category: `Utility`

```text
Hello {{1}}. {{2}} has marked your job as complete.

Job: {{3}}
Reference: {{4}}
Amount: {{5}}
Service code: {{6}}

Please share this service code only after confirming the work is complete.
```

### `job_verified_worker`
Variables:
1. `worker_name`
2. `job_type`
3. `client_name`
4. `job_id`

```text
Hello {{1}}. Your completed job has been verified.

Job: {{2}}
Client: {{3}}
Reference: {{4}}

Thank you.
```

### `invoice_ready_client`
Variables:
1. `client_name`
2. `invoice_number`
3. `amount`
4. `job_id`

```text
Hello {{1}}. Your invoice is ready.

Invoice: {{2}}
Amount: {{3}}
Reference: {{4}}

Reply if you need it resent.
```

### `quotation_ready_client`
Variables:
1. `client_name`
2. `quotation_number`
3. `job_type`
4. `amount`

```text
Hello {{1}}. Your quotation is ready.

Quotation: {{2}}
Service: {{3}}
Amount: {{4}}

Reply if you would like us to proceed.
```

### `daily_briefing_worker`
Variables:
1. `worker_name`
2. `job_count`
3. `first_job_type`
4. `first_client_name`
5. `first_location`
6. `first_scheduled_time`

```text
Good morning {{1}}.

You have {{2}} job(s) today.

First job:
{{3}}
{{4}}
{{5}}
{{6}}

Reply ACCEPT to confirm.
Text ARRIVED when you reach the client.
```

## New Templates For Timestamp And Client Feedback Flow

### `arrival_confirmation_request`
Variables:
1. `client_name`
2. `worker_name`
3. `company_name`
4. `location`

```text
Hello {{1}}. {{2}} has checked in for your visit from {{3}}.

Location: {{4}}

Reply YES if they have arrived, or NO if they have not arrived yet. You can include a short comment in the same reply.
```

Env variable:
`TWILIO_ARRIVAL_CONFIRMATION_REQUEST_TEMPLATE_SID`

### `postponement_notice_client`
Variables:
1. `company_name`
2. `job_type`
3. `reason`

```text
Appointment update from {{1}}.

Your {{2}} visit has been postponed.
Reason: {{3}}

Reply with any comment or question and we will follow up with a new schedule.
```

Env variable:
`TWILIO_POSTPONEMENT_NOTICE_TEMPLATE_SID`

### `review_request_client`
Variables:
1. `client_name`
2. `company_name`
3. `job_type`

```text
Hello {{1}}. Thank you for choosing {{2}} for your {{3}}.

We would love your feedback.
Reply with a short review or comment about the service you received.
```

Env variable:
`TWILIO_REVIEW_REQUEST_TEMPLATE_SID`

## New Vercel Environment Variables

Add these after Twilio approves the new templates:

```env
TWILIO_ARRIVAL_CONFIRMATION_REQUEST_TEMPLATE_SID=HX_REPLACE_ME
TWILIO_POSTPONEMENT_NOTICE_TEMPLATE_SID=HX_REPLACE_ME
TWILIO_REVIEW_REQUEST_TEMPLATE_SID=HX_REPLACE_ME
```
