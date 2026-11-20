import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const requestOptions = () => ({ abortSignal: AbortSignal.timeout(15_000) });

function configureStorage() {
  const {
    MINIO_ENDPOINT: endpoint,
    MINIO_BUCKET: bucket,
    MINIO_ACCESS_KEY: accessKey,
    MINIO_SECRET_KEY: secretKey,
    MINIO_REGION: region = 'us-east-1',
  } = process.env;

  if (!endpoint && !bucket && !accessKey && !secretKey) return undefined;
  if (!endpoint || !bucket || !accessKey || !secretKey) {
    throw new Error('Configura MINIO_ENDPOINT, MINIO_BUCKET, MINIO_ACCESS_KEY y MINIO_SECRET_KEY');
  }

  const url = URL.parse(endpoint);
  if (!url || !['https:', 'http:'].includes(url.protocol) || url.pathname !== '/' ||
      url.search || url.hash || url.username || url.password) {
    throw new Error('MINIO_ENDPOINT debe ser la URL base de la API S3');
  }

  const client = new S3Client({
    endpoint: url.origin,
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
    maxAttempts: 2,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  return {
    async upload(key: string, content: Buffer, mimeType: string) {
      const result = await client.send(new PutObjectCommand({
        Bucket: bucket, Key: key, Body: content, ContentType: mimeType,
      }), requestOptions());
      return { versionId: result.VersionId };
    },
    async download(key: string) {
      const result = await client.send(new GetObjectCommand({
        Bucket: bucket, Key: key,
      }), requestOptions());
      if (!result.Body) throw new Error('La respuesta de MinIO no contiene el adjunto');
      return Buffer.from(await result.Body.transformToByteArray());
    },
    remove(key: string, versionId?: string | null) {
      return client.send(new DeleteObjectCommand({
        Bucket: bucket, Key: key, VersionId: versionId ?? undefined,
      }), requestOptions());
    },
  };
}

export const invoiceAttachmentStorage = configureStorage();
