# Communication App (MERN + Socket.io + WebRTC)

This is a real-time communication platform featuring text messaging, direct chat, media sharing, and video calling.

## 🗄️ Database Setup (MongoDB)

The project uses **MongoDB** via Mongoose for high-performance messaging, room tracking, and user data.

### 1. Local MongoDB (Default)
Your local MongoDB Server is detected and running on port `27017`.
The backend connects using:
```env
MONGO_URI=mongodb://127.0.0.1:27017/communication_app
```

### 2. MongoDB Atlas (Cloud - Optional)
To host your database in the cloud:
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Get your connection string.
3. Update `server/.env`:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/communication_app?retryWrites=true&w=majority
   ```

---

## 🚀 Running the Application

### Start Backend Server
```bash
# From workspace root
npm run server

# Or directly in server folder:
cd server
npm start
# (Runs on http://localhost:5000)
```

### Start Frontend Client
```bash
# In a separate terminal from workspace root
npm run client

# Or directly in client folder:
cd client
npm run dev
# (Runs on http://localhost:5173)
```

---

## 📁 Project Structure
- `server/models/`: MongoDB Schemas (`User.js`, `Message.js`, `CallLog.js`)
- `server/controllers/`: Auth, user management, messages, and friend logic
- `server/server.js`: Express server & Socket.io WebRTC signaling
- `client/src/`: React frontend with chat, rooms, and video call interface
