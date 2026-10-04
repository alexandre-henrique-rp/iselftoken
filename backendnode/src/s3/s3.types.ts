export type S3Bucket =
  | 'document'
  | 'image'
  | 'image-sm'
  | 'image-md'
  | 'video'
  | 'video-sm'
  | 'video-md'
  | 'video-lg'
  | 'comprovante';

export interface S3UploadResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
}

export interface S3DownloadResult {
  body: Buffer;
  contentType: string;
  size: number;
}
