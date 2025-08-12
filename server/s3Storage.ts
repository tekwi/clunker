
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export class S3StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET) {
      throw new Error("AWS credentials and bucket name are required. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET environment variables.");
    }

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    this.bucketName = process.env.AWS_S3_BUCKET;
  }

  async getUploadUrl(contentType: string = "image/jpeg"): Promise<{ uploadUrl: string; photoUrl: string }> {
    const key = `uploads/${randomUUID()}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 }); // 15 minutes
    const photoUrl = `https://${this.bucketName}.s3.amazonaws.com/${key}`;

    return { uploadUrl, photoUrl };
  }

  async getDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // 1 hour
  }

  extractKeyFromUrl(url: string): string {
    // Extract key from S3 URL
    const urlPattern = new RegExp(`https://${this.bucketName}\\.s3\\.amazonaws\\.com/(.+)`);
    const match = url.match(urlPattern);
    return match ? match[1] : url;
  }

  normalizePhotoPath(rawPath: string): string {
    // For S3, we'll store the full S3 URL
    return rawPath;
  }
}

export const s3Storage = new S3StorageService();
