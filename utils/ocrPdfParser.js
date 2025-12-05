const Tesseract = require('tesseract.js');
const { fromPath } = require('pdf2pic');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Extract text from image-based PDF using OCR
 */
async function extractTextFromImagePDF(buffer) {
    const tempDir = path.join(os.tmpdir(), `pdf-ocr-${Date.now()}`);
    const pdfPath = path.join(tempDir, 'input.pdf');

    try {
        console.log('Starting OCR extraction from image-based PDF...');

        // Create temp directory
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Save PDF to temp file
        fs.writeFileSync(pdfPath, buffer);

        // Convert PDF pages to images
        const options = {
            density: 300,           // Higher DPI for better OCR accuracy
            saveFilename: 'page',
            savePath: tempDir,
            format: 'png',
            width: 2000,
            height: 2000
        };

        const convert = fromPath(pdfPath, options);

        // Get page count (try converting first page to check)
        let pageNum = 1;
        let fullText = '';

        while (true) {
            try {
                console.log(`Processing page ${pageNum}...`);

                // Convert page to image
                const pageResult = await convert(pageNum, { responseType: 'image' });

                if (!pageResult || !pageResult.path) {
                    break; // No more pages
                }

                // Perform OCR on the image
                const { data: { text } } = await Tesseract.recognize(
                    pageResult.path,
                    'eng',
                    {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                            }
                        }
                    }
                );

                fullText += text + '\n\n';
                pageNum++;

            } catch (error) {
                // No more pages or error
                if (pageNum === 1) {
                    throw error; // First page failed
                }
                break;
            }
        }

        console.log(`OCR completed. Extracted ${fullText.length} characters from ${pageNum - 1} pages.`);

        return fullText;

    } catch (error) {
        throw new Error(`OCR extraction failed: ${error.message}`);
    } finally {
        // Cleanup temp files
        try {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError.message);
        }
    }
}

/**
 * Parse image-based PDF file using OCR
 */
async function parseImagePDFFile(buffer, metadata = {}) {
    try {
        console.log('Starting OCR-based PDF parsing...');

        // Extract text using OCR
        const text = await extractTextFromImagePDF(buffer);

        if (!text || text.trim().length < 10) {
            throw new Error('OCR extraction completed but no readable text was found.');
        }

        // Parse the extracted text using the same logic as text-based PDFs
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        const questions = [];
        let currentQuestion = null;
        let currentQuestionText = '';
        let currentOptions = [];
        let optionsText = '';

        // Filter to detect answer sheet patterns
        const isAnswerLine = (line) => {
            return /^(answer|answers|answer\s*key|solution|solutions):/i.test(line) ||
                /^(ans|ans\.):/i.test(line) ||
                /^\d+\.\s*[a-d]\)?\s*$/i.test(line);
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
                if (/^\d+[\.\s]/.test(line) && /[a-d]\)/.test(lines[i + 1] || '')) {
                    skipAnswerSection = false;
                } else {
                    continue;
                }
            }

            // Detect question (starts with number followed by period or space)
            if (/^\d+[\.\s]/.test(line)) {
                // Save previous question
                if (currentQuestion) {
                    if (optionsText) {
                        const parsedOptions = parseInlineOptions(optionsText);
                        currentOptions.push(...parsedOptions);
                    }

                    questions.push({
                        questionText: currentQuestionText,
                        type: currentOptions.length > 0 ? (metadata.questionType || 'mcq_single') : 'short_answer',
                        options: currentOptions.length > 0 ? currentOptions : undefined,
                        marks: metadata.marks || 1,
                        difficulty: metadata.difficulty || 'medium',
                        hierarchy: {
                            grade: metadata.grade || 'General',
                            subject: metadata.subject || 'General',
                            topic: metadata.topic || 'General',
                            subtopic: metadata.subtopic
                        },
                        tags: metadata.tags || []
                    });
                }

                // Start new question
                currentQuestion = line;
                currentQuestionText = line.replace(/^\d+[\.\s]/, '').trim();
                currentOptions = [];
                optionsText = '';
            }
            // Check if line contains options
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
                marks: metadata.marks || 1,
                difficulty: metadata.difficulty || 'medium',
                hierarchy: {
                    grade: metadata.grade || 'General',
                    subject: metadata.subject || 'General',
                    topic: metadata.topic || 'General',
                    subtopic: metadata.subtopic
                },
                tags: metadata.tags || []
            });
        }

        console.log(`OCR parsing completed. Extracted ${questions.length} questions.`);

        return questions;
    } catch (error) {
        throw new Error(`Error parsing image-based PDF: ${error.message}`);
    }
}

/**
 * Helper function to parse inline options
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

module.exports = {
    parseImagePDFFile,
    extractTextFromImagePDF
};
