import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const DEFAULT_REGION = 'auto';
const PUT_EXPIRATION_SECONDS = 60 * 10;
const GET_EXPIRATION_SECONDS = 60 * 10;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

type StorageClient = {
  bucket: string;
  client: S3Client;
};

let storageClient: StorageClient | null = null;

function getStorageClient(): StorageClient {
  if (storageClient) {
    return storageClient;
  }

  storageClient = {
    bucket: getEnv('S3_BUCKET'),
    client: new S3Client({
      endpoint: getEnv('S3_ENDPOINT'),
      region: process.env.S3_REGION ?? DEFAULT_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: getEnv('S3_ACCESS_KEY_ID'),
        secretAccessKey: getEnv('S3_SECRET_ACCESS_KEY')
      }
    })
  };

  return storageClient;
}

export async function createPresignedPutUrl(key: string, contentType: string, sizeBytes: number) {
  const { bucket, client } = getStorageClient();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: sizeBytes
  });

  return getSignedUrl(client, command, { expiresIn: PUT_EXPIRATION_SECONDS });
}

export async function createPresignedGetUrl(key: string) {
  const { bucket, client } = getStorageClient();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });

  return getSignedUrl(client, command, { expiresIn: GET_EXPIRATION_SECONDS });
}
