# chat-app

## Backend

From backend directory run with

<code>node server.js
</code>

.env file if desired

```
PORT=5000
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=http://localhost:3000
```

Fill in mongodb uri and jwt secret based on your information
Set port and localhost to what you want to use 

## Frontend

From frontend directory run with

```
npm install
npm run dev
```

.env file if desired

```
VITE_APP_API_URL=http://localhost:5000
VITE_APP_SOCKET_URL=http://localhost:5000
```

Set port and localhost to what you want to use 
