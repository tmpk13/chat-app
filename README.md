# chat-app

## Backend

Install requirements 

<code>npm install axios react-router-dom socket.io-client
</code>

Testing

<code>npm install --save-dev jest mongodb-memory-server supertest socket.io-client
</code>

.env file required

```
PORT=5000
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=http://localhost:3000
```

Fill in mongodb uri and jwt secret based on your information
Set port and localhost to what you want to use 

Run with

<code>node server.js
</code>

## Frontend

Install requirements 

<code>npm install
</code>

.env file required

```
VITE_APP_API_URL=http://localhost:5000
VITE_APP_SOCKET_URL=http://localhost:5000
```

Set port and localhost to what you want to use 

Run with

<code>npm run dev</code>
