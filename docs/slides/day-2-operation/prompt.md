

## context

Below are some processes of day two operations and monitorings for Salacia, An imaginary AI agent powered terminal OS.

## tasks

Create an infographic to describe the day two operations and monitoring processes below. 

## day 2 operations and monitoring processes

* App and agent errors in app insights trigger Azure Alert to send Teams alert
            § Cron job evaluate  agent traces, execution trajectory, tool calls in app insights  and trigger Azure Alert if evaluation fail, send Teams alert
            §  custom Grafana dashboards
                □ Trace evaluation error result
                □ Performance
Token usage 