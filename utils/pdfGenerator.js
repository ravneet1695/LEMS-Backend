const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.generateCertificate = async (certificateData) => {
    return new Promise((resolve, reject) => {
        try {
            const {
                userName,
                testTitle,
                score,
                percentage,
                grade,
                organizationName,
                organizationLogo,
                certificateNumber,
                issuedDate,
            } = certificateData;

            // Create a document
            const doc = new PDFDocument({
                size: 'A4',
                layout: 'landscape',
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
            });

            // File path
            const fileName = `certificate-${certificateNumber}.pdf`;
            const filePath = path.join(__dirname, '../uploads/certificates', fileName);

            // Ensure directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Pipe to file
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // Certificate design
            // Border
            doc
                .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
                .lineWidth(3)
                .strokeColor('#4A90E2')
                .stroke();

            doc
                .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
                .lineWidth(1)
                .strokeColor('#4A90E2')
                .stroke();

            // Title
            doc
                .fontSize(40)
                .fillColor('#4A90E2')
                .font('Helvetica-Bold')
                .text('CERTIFICATE OF ACHIEVEMENT', 0, 100, {
                    align: 'center',
                });

            // Subtitle
            doc
                .fontSize(16)
                .fillColor('#666')
                .font('Helvetica')
                .text('This is to certify that', 0, 180, {
                    align: 'center',
                });

            // User name
            doc
                .fontSize(32)
                .fillColor('#000')
                .font('Helvetica-Bold')
                .text(userName, 0, 220, {
                    align: 'center',
                });

            // Achievement text
            doc
                .fontSize(16)
                .fillColor('#666')
                .font('Helvetica')
                .text('has successfully completed the test', 0, 280, {
                    align: 'center',
                });

            // Test title
            doc
                .fontSize(24)
                .fillColor('#4A90E2')
                .font('Helvetica-Bold')
                .text(testTitle, 0, 320, {
                    align: 'center',
                });

            // Score details
            doc
                .fontSize(16)
                .fillColor('#000')
                .font('Helvetica')
                .text(`Score: ${score} | Percentage: ${percentage}% | Grade: ${grade}`, 0, 380, {
                    align: 'center',
                });

            // Organization name
            doc
                .fontSize(14)
                .fillColor('#666')
                .font('Helvetica-Oblique')
                .text(organizationName, 0, 440, {
                    align: 'center',
                });

            // Certificate number and date
            doc
                .fontSize(10)
                .fillColor('#999')
                .font('Helvetica')
                .text(`Certificate No: ${certificateNumber}`, 50, doc.page.height - 80);

            doc
                .fontSize(10)
                .fillColor('#999')
                .text(`Issued on: ${new Date(issuedDate).toLocaleDateString()}`, doc.page.width - 200, doc.page.height - 80);

            // Finalize PDF
            doc.end();

            stream.on('finish', () => {
                resolve(`/uploads/certificates/${fileName}`);
            });

            stream.on('error', (error) => {
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    });
};
