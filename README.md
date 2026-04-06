# Timebox

Personal daily scheduler built with React and Vite.

## Schedule Selection

The app now chooses the schedule type automatically from [public/schedule-config.json](/Users/alex.bates/Code/timebox/public/schedule-config.json).

Example:

```json
{
  "defaultType": "noStandup",
  "days": {
    "monday": "standup",
    "tuesday": "noStandup",
    "wednesday": "standup",
    "thursday": "noStandup",
    "friday": "standup",
    "saturday": "noStandup",
    "sunday": "noStandup"
  }
}
```

Allowed values are `standup` and `noStandup`. If a day is omitted or invalid, the app falls back to `defaultType`.

## Commands

- `npm run dev`
- `npm run build`
- `npm run lint`
