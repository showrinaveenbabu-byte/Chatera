const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const app = require('../app');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Message = require('../models/Message');

let server;
let baseUrl;
let socketServer;
let testUser1;
let testUser2;
let token1;
let token2;
let messageId;

describe('Production Readiness Full Test Suite', () => {
  before(async () => {
    // Connect to database
    await connectDB();

    // Start HTTP server with socket.io on an ephemeral port
    server = http.createServer(app);
    socketServer = new Server(server, { cors: { origin: '*' } });
    app.set('io', socketServer);

    // Socket.io handlers
    socketServer.on('connection', (socket) => {
      socket.on('register-user', (userId) => {
        socket.join(`user_${userId}`);
      });
      socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.emit('all-users', []);
      });
    });

    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`[Test Server] Running at ${baseUrl}`);
        resolve();
      });
    });

    // Cleanup previous test users if any
    await User.deleteMany({ username: { $in: ['test_alice_prod', 'test_bob_prod', 'test_duplicate_user'] } });
    await Message.deleteMany({});
  });

  after(async () => {
    // Cleanup test data
    await User.deleteMany({ username: { $in: ['test_alice_prod', 'test_bob_prod', 'test_duplicate_user'] } });
    await Message.deleteMany({});

    if (socketServer) {
      socketServer.close();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  });

  // 1. Database Connection & Caching
  test('1. Database Connection & Serverless Caching', async () => {
    assert.strictEqual(mongoose.connection.readyState, 1, 'MongoDB should be connected');
    const cachedConn = await connectDB();
    assert.strictEqual(cachedConn.connection.readyState, 1, 'Cached connection should be reused');
  });

  // 2. API Health Check
  test('2. API Health Check Endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.database, 'connected');
    assert.ok(typeof data.uptime === 'number');
  });

  // 3. User Registration
  test('3. User Registration (Success & Validations)', async () => {
    // Missing fields
    const resMissing = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'only_user' })
    });
    assert.strictEqual(resMissing.status, 400);

    // Register User 1 (Alice)
    const res1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_alice_prod',
        displayName: 'Alice Prod',
        email: 'alice.prod@example.com',
        phoneNumber: '+15550001',
        password: 'password123'
      })
    });
    assert.strictEqual(res1.status, 201);
    const data1 = await res1.json();
    assert.ok(data1.token, 'Should return JWT token');
    assert.strictEqual(data1.user.username, 'test_alice_prod');
    token1 = data1.token;
    testUser1 = data1.user;

    // Register User 2 (Bob)
    const res2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_bob_prod',
        displayName: 'Bob Prod',
        email: 'bob.prod@example.com',
        phoneNumber: '+15550002',
        password: 'password123'
      })
    });
    assert.strictEqual(res2.status, 201);
    const data2 = await res2.json();
    token2 = data2.token;
    testUser2 = data2.user;

    // Duplicate registration rejection
    const resDup = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_alice_prod',
        email: 'unique.email@example.com',
        phoneNumber: '+15559999',
        password: 'password123'
      })
    });
    assert.strictEqual(resDup.status, 400, 'Duplicate username should be rejected with 400');
  });

  // 4. User Login
  test('4. User Login (Success, Invalid Credentials, Missing Fields)', async () => {
    // Missing credentials
    const resEmpty = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(resEmpty.status, 400);

    // Wrong password
    const resWrong = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_alice_prod', password: 'wrongpassword' })
    });
    assert.strictEqual(resWrong.status, 400);

    // Successful login by username
    const resLoginUser = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test_alice_prod', password: 'password123' })
    });
    assert.strictEqual(resLoginUser.status, 200);
    const loginData = await resLoginUser.json();
    assert.ok(loginData.token);
    assert.strictEqual(loginData.user.username, 'test_alice_prod');

    // Successful login by email
    const resLoginEmail = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice.prod@example.com', password: 'password123' })
    });
    assert.strictEqual(resLoginEmail.status, 200);
  });

  // 5. Protected Routes & Authentication Verification
  test('5. Protected Routes & Token Verification', async () => {
    // No token
    const resNoAuth = await fetch(`${baseUrl}/api/users/profile`);
    assert.strictEqual(resNoAuth.status, 401);

    // Invalid token
    const resBadAuth = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { 'x-auth-token': 'invalid_token_string' }
    });
    assert.strictEqual(resBadAuth.status, 401);

    // Valid token via x-auth-token
    const resXToken = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { 'x-auth-token': token1 }
    });
    assert.strictEqual(resXToken.status, 200);
    const prof1 = await resXToken.json();
    assert.strictEqual(prof1.username, 'test_alice_prod');
    assert.strictEqual(prof1.password, undefined, 'Password must never be returned');

    // Valid token via Bearer header
    const resBearer = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    assert.strictEqual(resBearer.status, 200);
  });

  // 6. User Profile Update
  test('6. User Profile Update & Uniqueness Constraints', async () => {
    const updateRes = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token1
      },
      body: JSON.stringify({
        displayName: 'Alice In Wonderland',
        bio: 'Coding amazing real-time communication apps.',
        theme: 'light',
        status: 'away'
      })
    });
    assert.strictEqual(updateRes.status, 200);
    const updated = await updateRes.json();
    assert.strictEqual(updated.displayName, 'Alice In Wonderland');
    assert.strictEqual(updated.theme, 'light');
    assert.strictEqual(updated.status, 'away');

    // Attempting to rename username to Bob's username must fail with 400
    const conflictRes = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token1
      },
      body: JSON.stringify({ username: 'test_bob_prod' })
    });
    assert.strictEqual(conflictRes.status, 400);
  });

  // 7. User Search with Regex Escaping & Discover
  test('7. User Search (Regex Escaping & Discover)', async () => {
    // Normal search
    const searchRes = await fetch(`${baseUrl}/api/users/search?query=bob`, {
      headers: { 'x-auth-token': token1 }
    });
    assert.strictEqual(searchRes.status, 200);
    const searchList = await searchRes.json();
    assert.ok(searchList.some(u => u.username === 'test_bob_prod'));

    // Regex special characters search (must not throw or crash MongoDB)
    const regexSafeRes = await fetch(`${baseUrl}/api/users/search?query=${encodeURIComponent('(.*)+?{test}')}`, {
      headers: { 'x-auth-token': token1 }
    });
    assert.strictEqual(regexSafeRes.status, 200, 'Regex query must be escaped cleanly without 500 error');

    // Discover users
    const discoverRes = await fetch(`${baseUrl}/api/users/discover`, {
      headers: { 'x-auth-token': token1 }
    });
    assert.strictEqual(discoverRes.status, 200);
    const discoverList = await discoverRes.json();
    assert.ok(Array.isArray(discoverList));
    assert.ok(discoverList.some(u => u.username === 'test_bob_prod'));
    assert.ok(!discoverList.some(u => u.username === 'test_alice_prod'), 'Must exclude self');
  });

  // 8. Friend Requests & Friend Management
  test('8. Friend Requests (Send, Duplicate, Self, Accept, Decline, Remove)', async () => {
    // Cannot friend self
    const selfRes = await fetch(`${baseUrl}/api/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token1 },
      body: JSON.stringify({ userId: testUser1.id })
    });
    assert.strictEqual(selfRes.status, 400);

    // Send request from Alice to Bob
    const sendRes = await fetch(`${baseUrl}/api/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token1 },
      body: JSON.stringify({ userId: testUser2.id })
    });
    assert.strictEqual(sendRes.status, 200);

    // Duplicate request rejected
    const dupRes = await fetch(`${baseUrl}/api/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token1 },
      body: JSON.stringify({ userId: testUser2.id })
    });
    assert.strictEqual(dupRes.status, 400);

    // Bob views friends & incoming requests
    const bobFriendsRes = await fetch(`${baseUrl}/api/friends`, {
      headers: { 'x-auth-token': token2 }
    });
    assert.strictEqual(bobFriendsRes.status, 200);
    const bobFriendsData = await bobFriendsRes.json();
    assert.strictEqual(bobFriendsData.requests.length, 1);
    assert.strictEqual(bobFriendsData.requests[0].username, 'test_alice_prod');

    // Bob accepts friend request
    const acceptRes = await fetch(`${baseUrl}/api/friends/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token2 },
      body: JSON.stringify({ userId: testUser1.id })
    });
    assert.strictEqual(acceptRes.status, 200);

    // Bob now has Alice in friends list
    const bobFriendsAfter = await (await fetch(`${baseUrl}/api/friends`, { headers: { 'x-auth-token': token2 } })).json();
    assert.strictEqual(bobFriendsAfter.requests.length, 0);
    assert.ok(bobFriendsAfter.friends.some(f => f.username === 'test_alice_prod'));

    // Remove friend
    const removeRes = await fetch(`${baseUrl}/api/friends/${testUser1.id}`, {
      method: 'DELETE',
      headers: { 'x-auth-token': token2 }
    });
    assert.strictEqual(removeRes.status, 200);

    // Verify removal
    const bobFriendsFinal = await (await fetch(`${baseUrl}/api/friends`, { headers: { 'x-auth-token': token2 } })).json();
    assert.ok(!bobFriendsFinal.friends.some(f => f.username === 'test_alice_prod'));
  });

  // 9. Messaging & Communication
  test('9. Messaging (Send, Retrieve, Edit, Delete, Security)', async () => {
    // Send message from Alice to Bob via REST API
    const msgRes = await fetch(`${baseUrl}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token1 },
      body: JSON.stringify({
        receiver: testUser2.id,
        text: 'Hello Bob! This is Alice from Chatera.',
        type: 'text'
      })
    });
    assert.strictEqual(msgRes.status, 201);
    const sentMsg = await msgRes.json();
    assert.strictEqual(sentMsg.text, 'Hello Bob! This is Alice from Chatera.');
    messageId = sentMsg._id;

    // Retrieve messages between Alice and Bob
    const getRes = await fetch(`${baseUrl}/api/messages/${testUser2.id}`, {
      headers: { 'x-auth-token': token1 }
    });
    assert.strictEqual(getRes.status, 200);
    const history = await getRes.json();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0]._id, messageId);

    // Retrieve conversation list
    const convRes = await fetch(`${baseUrl}/api/messages/conversations`, {
      headers: { 'x-auth-token': token1 }
    });
    assert.strictEqual(convRes.status, 200);
    const convs = await convRes.json();
    assert.strictEqual(convs.length, 1);
    assert.strictEqual(convs[0].username, 'test_bob_prod');
    assert.strictEqual(convs[0].lastMessage, 'Hello Bob! This is Alice from Chatera.');

    // Edit message by Alice (Sender)
    const editRes = await fetch(`${baseUrl}/api/messages/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token1 },
      body: JSON.stringify({ text: 'Hello Bob! (Edited message)' })
    });
    assert.strictEqual(editRes.status, 200);
    const editedMsg = await editRes.json();
    assert.strictEqual(editedMsg.text, 'Hello Bob! (Edited message)');

    // Edit message by Bob (Unauthorized - not sender) must fail with 403
    const badEditRes = await fetch(`${baseUrl}/api/messages/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token2 },
      body: JSON.stringify({ text: 'Bob trying to tamper with Alice message' })
    });
    assert.strictEqual(badEditRes.status, 403);

    // Delete message by Bob (Unauthorized) must fail with 403
    const badDeleteRes = await fetch(`${baseUrl}/api/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'x-auth-token': token2 }
    });
    assert.strictEqual(badDeleteRes.status, 403);

    // Delete message by Alice (Authorized)
    const deleteRes = await fetch(`${baseUrl}/api/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'x-auth-token': token1 }
    });
    assert.strictEqual(deleteRes.status, 200);

    // History should now be empty
    const historyAfter = await (await fetch(`${baseUrl}/api/messages/${testUser2.id}`, { headers: { 'x-auth-token': token1 } })).json();
    assert.strictEqual(historyAfter.length, 0);
  });

  // 10. Support & Feedback
  test('10. Contact Support Endpoint', async () => {
    // Missing required fields
    const badSupport = await fetch(`${baseUrl}/api/support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Just a message' })
    });
    assert.strictEqual(badSupport.status, 400);

    // Valid submission
    const goodSupport = await fetch(`${baseUrl}/api/support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        email: 'alice@example.com',
        subject: 'Feedback',
        message: 'Loving the real-time calling and messaging features!'
      })
    });
    assert.strictEqual(goodSupport.status, 200);
    const supportData = await goodSupport.json();
    assert.strictEqual(supportData.success, true);
  });

  // 11. 404 Route & Error Handling
  test('11. 404 Error Handling for Undefined Routes', async () => {
    const res404 = await fetch(`${baseUrl}/api/non_existent_route_test`);
    assert.strictEqual(res404.status, 404);
    const data404 = await res404.json();
    assert.ok(data404.error);
  });

  // 12. Socket.io Client Connection & Events
  test('12. Real-Time Socket.io Connection & Room Join', async () => {
    const clientSocket = ioClient(baseUrl, {
      transports: ['websocket', 'polling'],
      forceNew: true
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket connection timed out')), 5000);

      clientSocket.on('connect', () => {
        clientSocket.emit('register-user', testUser1.id);
        clientSocket.emit('join-room', 'test-room-123', testUser1.id);
      });

      clientSocket.on('all-users', (users) => {
        clearTimeout(timeout);
        assert.ok(Array.isArray(users));
        clientSocket.disconnect();
        resolve();
      });
    });
  });
});
