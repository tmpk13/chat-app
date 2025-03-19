# chat-app

## Backend

Install requirements 

<code>npm install axios react-router-dom socket.io-client</code>

Testing

<code>npm install --save-dev jest mongodb-memory-server supertest socket.io-client</code>

.env file required

<code>PORT=5000
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=http://localhost:3000</code>

Fill in mongodb uri and jwt secret based on your information
Set port and localhost to what you want to use 

## Frontend

Install requirements 

<code>npm install express mongoose socket.io jsonwebtoken bcryptjs cors dotenv http</code>

.env file required

<code>REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000</code>

Set port and localhost to what you want to use 
