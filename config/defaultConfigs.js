// Default configuration definitions for organizations
// Each config has: value (default), dataType, description

module.exports = {
    general: {
        timezone: {
            value: 'UTC',
            dataType: 'string',
            description: 'Organization timezone for scheduling and reporting'
        },
        language: {
            value: 'en',
            dataType: 'string',
            description: 'Default language for the organization'
        },
        dateFormat: {
            value: 'YYYY-MM-DD',
            dataType: 'string',
            description: 'Date format used across the application'
        },
        timeFormat: {
            value: '24h',
            dataType: 'string',
            description: 'Time format (12h or 24h)'
        }
    },
    testing: {
        maxTestDuration: {
            value: 180,
            dataType: 'number',
            description: 'Maximum test duration in minutes'
        },
        allowRetakes: {
            value: true,
            dataType: 'boolean',
            description: 'Allow learners to retake tests'
        },
        maxRetakes: {
            value: 3,
            dataType: 'number',
            description: 'Maximum number of retake attempts allowed'
        },
        showResultsImmediately: {
            value: true,
            dataType: 'boolean',
            description: 'Show test results immediately after completion'
        },
        randomizeQuestions: {
            value: false,
            dataType: 'boolean',
            description: 'Randomize question order in tests'
        },
        passingScore: {
            value: 70,
            dataType: 'number',
            description: 'Default passing score percentage'
        }
    },
    notifications: {
        emailNotifications: {
            value: true,
            dataType: 'boolean',
            description: 'Enable email notifications'
        },
        testReminders: {
            value: true,
            dataType: 'boolean',
            description: 'Send test reminder notifications'
        },
        resultNotifications: {
            value: true,
            dataType: 'boolean',
            description: 'Send test result notifications'
        },
        reminderDaysBefore: {
            value: 1,
            dataType: 'number',
            description: 'Days before test to send reminder'
        }
    },
    branding: {
        primaryColor: {
            value: '#1976d2',
            dataType: 'string',
            description: 'Primary brand color (hex code)'
        },
        secondaryColor: {
            value: '#dc004e',
            dataType: 'string',
            description: 'Secondary brand color (hex code)'
        },
        accentColor: {
            value: '#ff9800',
            dataType: 'string',
            description: 'Accent color for highlights (hex code)'
        }
    }
};
