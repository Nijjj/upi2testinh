# UPI Assistant (Local)

Lightweight personal UPI helper that runs fully local in Termux.

## Run

```sh
npm install
node server.js
```

Open:

- `http://localhost:3000`

## API

- `POST /save` body: `{ "name": "...", "amount": 12.34, "upiId": "...", "ref": "..." }`
- `GET /history?days=7`
