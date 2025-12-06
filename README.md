# Learning Platform Backend

Backend API for the Online Learning, Quiz & Test Platform built with Node.js, Express, and MongoDB.

## Features

- JWT Authentication with role-based access control
- 6 user roles: Super Admin, Org Admin, Content Creator, Content Approver, Manager, Learner
- Comprehensive question bank supporting 11 question types
- Test creation and assignment system
- Real-time test taking with Socket.IO
- Results and analytics
- Certificate generation
- Email notifications
- File upload support

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
   - MongoDB URI
   - JWT Secret
   - Email credentials

4. Start MongoDB (if running locally):
```bash
mongod
```

5. Run the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout user

## Environment Variables

See `.env.example` for required environment variables.

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Socket.IO for real-time features
- Nodemailer for emails
- PDFKit for certificates
- Multer for file uploads

## License

ISC
