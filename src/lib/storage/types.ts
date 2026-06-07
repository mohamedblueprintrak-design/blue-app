export interface StorageProvider {
  /** Upload a file and return its storage key/path */
  upload(key: string, data: Buffer, contentType: string): Promise<string>;
  /** Download a file by its storage key/path */
  download(key: string): Promise<Buffer>;
  /** Delete a file by its storage key/path */
  delete(key: string): Promise<void>;
  /** Get a signed URL for temporary access (mainly for S3) */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  /** Check if a file exists */
  exists(key: string): Promise<boolean>;
}
