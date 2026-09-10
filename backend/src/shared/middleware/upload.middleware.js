import { AppError } from '#shared/utils/AppError.js';
import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, //5mb max
    },
    fileFilter: (req, file, cb) => {
        console.log('File mimetype:', file.mimetype);
        const allowed = [
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/pdf',
            'application/pdf',
            'application/x-pdf',
            'application/octet-stream',
        ];

        const allowedExtensions = ['.pdf', '.jpg', 'jpeg', '.png'];
        const extension = '.' + file.originalname.split('.').pop().toLowerCase();

        if (allowed.includes(file.mimetype) && allowedExtensions.includes(extension)) {
            cb(null, true);
        } else {
            cb(new AppError('File type not allowed. Use JPG, PNG or PDF', 400));
        }
    },
});
