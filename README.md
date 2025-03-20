# chat-app

### Backend

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


Testing (Based on local host presets)
```
npm install --save-dev jest supertest mongodb-memory-server socket.io-client
npm test
```
---
### Frontend

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



<br>
<br>
Claude 3.7 sonnet LLM tool was used to assist in development
