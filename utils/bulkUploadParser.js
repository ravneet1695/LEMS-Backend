const mammoth = require('mammoth');
const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');

/**
 * Parse Word document (.docx) to extract questions
 */
exports.parseWordDocument = async (buffer) => {
    try {
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value;
        const questionBlocks = text.split(/\n\s*\n/).filter(block => block.trim());

        const questions = questionBlocks.map((block) => {
            const lines = block.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length === 0) return null;

            const questionText = lines[0];
            const options = [];
            let marks = 1;
            let difficulty = 'medium';

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (/^[A-D][\)\.]\\s*/.test(line)) {
                    const text = line.replace(/^[A-D][\)\.]\\s*/, '');
                    const isCorrect = line.toLowerCase().includes('*') || line.toLowerCase().includes('(correct)');
                    options.push({
                        text: text.replace(/\*/g, '').replace(/\(correct\)/gi, '').trim(),
                        isCorrect,
                        order: options.length
                    });
                }
                if (line.toLowerCase().includes('marks:')) {
                    marks = parseInt(line.match(/\d+/)?.[0]) || 1;
                }
                if (line.toLowerCase().includes('difficulty:')) {
                    const diff = line.toLowerCase();
                    if (diff.includes('easy')) difficulty = 'easy';
                    else if (diff.includes('hard')) difficulty = 'hard';
                }
            }

            return {
                questionText,
                type: options.length > 0 ? 'mcq_single' : 'short_answer',
                options: options.length > 0 ? options : undefined,
                marks,
                difficulty,
                hierarchy: { grade: 'General', subject: 'General', topic: 'General' }
            };
        }).filter(q => q !== null);

        return questions;
    } catch (error) {
        throw new Error(`Error parsing Word document: ${error.message}`);
    }
};

/**
 * Parse Excel file (.xlsx) to extract questions
 */
exports.parseExcelFile = (buffer) => {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const questions = data.map(row => {
            const question = {
                questionText: row.Question || row.question || row.QuestionText,
                type: (row.Type || row.type || 'mcq_single').toLowerCase().replace(/\s+/g, '_'),
                marks: parseInt(row.Marks || row.marks) || 1,
                difficulty: (row.Difficulty || row.difficulty || 'medium').toLowerCase(),
                explanation: row.Explanation || row.explanation,
                hierarchy: {
                    grade: row.Grade || row.grade || 'General',
                    subject: row.Subject || row.subject || 'General',
                    topic: row.Topic || row.topic || 'General',
                    subtopic: row.Subtopic || row.subtopic
                }
            };

            if (question.type.includes('mcq')) {
                const optionsText = row.Options || row.options || '';
                const correctAnswer = row.CorrectAnswer || row.correctAnswer || row['Correct Answer'];
                if (optionsText) {
                    const optionsList = optionsText.split(/[;|]/).map(o => o.trim()).filter(o => o);
                    question.options = optionsList.map((text, index) => ({
                        text,
                        isCorrect: text === correctAnswer || text.includes(correctAnswer),
                        order: index
                    }));
                }
            } else if (question.type === 'true_false') {
                question.correctAnswer = (row.CorrectAnswer || row.correctAnswer || 'true').toLowerCase() === 'true';
            } else {
                question.correctAnswer = row.CorrectAnswer || row.correctAnswer;
            }

            if (row.Tags || row.tags) {
                question.tags = (row.Tags || row.tags).split(',').map(t => t.trim());
            }

            return question;
        });

        return questions;
    } catch (error) {
        throw new Error(`Error parsing Excel file: ${error.message}`);
    }
};

/**
 * Parse PDF file to extract questions using pdf-parse
 */
exports.parsePDFFile = async (buffer, metadata = {}) => {
    try {
        const data = await pdfParse(buffer);
        const text = data.text;
        const totalPages = data.numpages;

        // Check if PDF is image-based (scanned document with no extractable text)
        const textLength = text.trim().length;
        if (textLength < 50) {
            console.log('Detected image-based PDF, attempting OCR extraction...');

            // Try OCR extraction
            try {
                const { parseImagePDFFile } = require('./ocrPdfParser');
                const questions = await parseImagePDFFile(buffer, metadata);

                if (questions.length > 0) {
                    return questions;
                }

                throw new Error('OCR extraction completed but no questions were found.');
            } catch (ocrError) {
                throw new Error(
                    'This PDF appears to be image-based (scanned document). ' +
                    'OCR extraction is currently in beta and may not work perfectly. ' +
                    'For best results, please use a text-based PDF or convert your scanned PDF using professional OCR tools. ' +
                    'Alternatively, you can manually type the questions or use Word/Excel format. ' +
                    `OCR Error: ${ocrError.message}`
                );
            }
        }

        // Determine which pages to process (exclude answer pages)
        const questionPageStart = metadata.questionPageStart || 1;
        const questionPageEnd = metadata.questionPageEnd || totalPages;
        const answerPageStart = metadata.answerPageStart;
        const answerPageEnd = metadata.answerPageEnd;

        // Parse the extracted text
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        const questions = [];
        let currentQuestion = null;
        let currentQuestionText = '';
        let currentOptions = [];
        let optionsText = '';

        // Filter to detect answer sheet patterns
        const isAnswerLine = (line) => {
            // Common answer sheet patterns
            return /^(answer|answers|answer\s*key|solution|solutions):/i.test(line) ||
                /^(ans|ans\.):/i.test(line) ||
                /^\d+\.\s*[a-d]\)?\s*$/i.test(line); // Just "1. a)" format
        };

        let skipAnswerSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detect answer sheet section
            if (isAnswerLine(line)) {
                skipAnswerSection = true;
                continue;
            }

            // Skip if we're in answer section
            if (skipAnswerSection) {
                // Check if we're back to questions (new question number)
                if (/^\d+\./.test(line) && /[a-d]\)/.test(lines[i + 1] || '')) {
                    skipAnswerSection = false;
                } else {
                    continue;
                }
            }

            // Detect question (starts with number followed by period or space)
            if (/^\d+[\.\s]/.test(line)) {
                // Save previous question
                if (currentQuestion) {
                    // Parse any remaining options
                    if (optionsText) {
                        const parsedOptions = parseInlineOptions(optionsText);
                        currentOptions.push(...parsedOptions);
                    }

                    questions.push({
                        questionText: currentQuestionText,
                        type: currentOptions.length > 0 ? (metadata.questionType || 'mcq_single') : 'short_answer',
                        options: currentOptions.length > 0 ? currentOptions : undefined,
                        marks: 1,
                        difficulty: metadata.difficulty || 'medium',
                        hierarchy: {
                            grade: metadata.grade || 'General',
                            subject: metadata.subject || 'General',
                            topic: metadata.topic || 'General',
                            subtopic: metadata.subtopic
                        }
                    });
                }

                // Start new question
                currentQuestion = line;
                currentQuestionText = line.replace(/^\d+[\.\s]/, '').trim();
                currentOptions = [];
                optionsText = '';
            }
            // Check if line contains options (a), b), c), d) format)
            else if (currentQuestion && /[a-d]\)/.test(line.toLowerCase())) {
                optionsText += ' ' + line;
            }
            // Continue current question text
            else if (currentQuestion && !optionsText) {
                currentQuestionText += ' ' + line;
            }
        }

        // Add last question
        if (currentQuestion) {
            if (optionsText) {
                const parsedOptions = parseInlineOptions(optionsText);
                currentOptions.push(...parsedOptions);
            }

            questions.push({
                questionText: currentQuestionText,
                type: currentOptions.length > 0 ? (metadata.questionType || 'mcq_single') : 'short_answer',
                options: currentOptions.length > 0 ? currentOptions : undefined,
                marks: 1,
                difficulty: metadata.difficulty || 'medium',
                hierarchy: {
                    grade: metadata.grade || 'General',
                    subject: metadata.subject || 'General',
                    topic: metadata.topic || 'General',
                    subtopic: metadata.subtopic
                }
            });
        }

        return questions;
    } catch (error) {
        throw new Error(`Error parsing PDF file: ${error.message}`);
    }
};

/**
 * Helper function to parse inline options (a)optionb)optionc)optiond)option)
 */
function parseInlineOptions(text) {
    const options = [];

    // Normalize text
    text = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Split by option markers and process
    const parts = text.split(/([a-d]\))/i);

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();

        // Check if this is an option marker (a), b), c), d))
        if (/^[a-d]\)$/i.test(part) && i + 1 < parts.length) {
            const optionText = parts[i + 1].trim();

            if (optionText && optionText.length > 0) {
                options.push({
                    text: optionText,
                    isCorrect: false,
                    order: options.length
                });
            }
        }
    }

    return options;
}
