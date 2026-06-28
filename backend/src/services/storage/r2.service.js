import {S3Client ,PutObjectCommand} from "@aws-sdk/client-s3"

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

export const uploadToR2= async (file , companyId, documentType )=>{
    const extension = file.originalname.split('.').pop();
    const filename = `companies/${companyId}/${documentType}-${Date.now()}.${extension}`;

    await r2Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,    // your bucket name
        Key: filename,                          // path inside bucket
        Body: file.buffer,                      // the actual file bytes
        ContentType: file.mimetype,             // tell R2 what type it is
    }));

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${filename}`;
    return publicUrl;

} 

