module.exports = {
    port: process.env.PORT || 5000,
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE || '7d',
    jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
    },
    upload: {
        maxFileSize: process.env.MAX_FILE_SIZE || 10485760, // 10MB
        uploadPath: process.env.UPLOAD_PATH || './uploads',
    },
};
