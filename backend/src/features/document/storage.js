/**
 * Where document files go. Real storage is R2; under NODE_ENV=test a stand-in keeps tests off the
 * real bucket (it writes nothing and hands back a fake URL).
 */
import crypto from 'node:crypto';
import { deleteDocumentFromR2, uploadToR2 } from '#shared/services/storage/r2.service.js';

const fake = {
    upload: async (file, companyId, documentType) =>
        `https://fake-storage.test/companies/${companyId}/${documentType}-${crypto.randomUUID()}`,
    remove: async () => {},
};

export const storage =
    process.env.NODE_ENV === 'test' ? fake : { upload: uploadToR2, remove: deleteDocumentFromR2 };
