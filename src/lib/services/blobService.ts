import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extract the public_id from a Cloudinary URL.
 * URL format: https://res.cloudinary.com/{cloud}/raw/upload/v{version}/{public_id}.pdf
 * @param url - The full Cloudinary URL
 * @returns The public_id without file extension
 */
function extractPublicId(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    // Find the index after 'upload' and version number
    const uploadIndex = pathParts.findIndex((part) => part === "upload");
    if (uploadIndex === -1) {
      throw new Error("Invalid Cloudinary URL format");
    }
    // Skip 'upload' and version (v123456...), get the rest as public_id
    const publicIdParts = pathParts.slice(uploadIndex + 2);
    const publicIdWithExt = publicIdParts.join("/");
    // Remove the .pdf extension
    return publicIdWithExt.replace(/\.pdf$/, "");
  } catch (error) {
    console.error("Error extracting public_id from URL:", error);
    throw new Error("Failed to extract public_id from Cloudinary URL");
  }
}

/**
 * Convert a Buffer to a readable stream for Cloudinary upload.
 * @param buffer - The buffer to convert
 * @returns A readable stream
 */
function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

/**
 * Service for managing PDF files in Cloudinary storage.
 * Handles upload, retrieval, and deletion of compiled PDF resumes.
 */
export const blobService = {
  /**
   * Upload a PDF file to Cloudinary storage.
   * @param resumeId - The resume ID to associate with the PDF
   * @param userId - The user ID for path organization
   * @param pdfBuffer - The PDF file as a Buffer
   * @returns The Cloudinary URL and file size
   */
  async uploadPdf(
    resumeId: string,
    userId: string,
    pdfBuffer: Buffer
  ): Promise<{ url: string; size: number }> {
    const publicId = `resumes/${userId}/${resumeId}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: "raw",
          overwrite: true,
          format: "pdf",
        },
        (error, result) => {
          if (error) {
            console.error("Error uploading PDF to Cloudinary:", error);
            reject(new Error("Failed to upload PDF to Cloudinary"));
            return;
          }
          if (!result) {
            reject(new Error("No result from Cloudinary upload"));
            return;
          }
          resolve({
            url: result.secure_url,
            size: result.bytes,
          });
        }
      );

      bufferToStream(pdfBuffer).pipe(uploadStream);
    });
  },

  /**
   * Delete a PDF file from Cloudinary storage.
   * @param cloudinaryUrl - The full Cloudinary URL to delete
   * @returns True if deletion was successful
   */
  async deletePdf(cloudinaryUrl: string): Promise<boolean> {
    try {
      const publicId = extractPublicId(cloudinaryUrl);
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "raw",
      });
      return result.result === "ok";
    } catch (error) {
      console.error("Error deleting PDF from Cloudinary:", error);
      return false;
    }
  },

  /**
   * Check if a PDF exists in Cloudinary storage and get its metadata.
   * @param cloudinaryUrl - The full Cloudinary URL to check
   * @returns The file metadata if it exists, null otherwise
   */
  async getPdfMetadata(cloudinaryUrl: string): Promise<{
    url: string;
    size: number;
    uploadedAt: Date;
  } | null> {
    try {
      const publicId = extractPublicId(cloudinaryUrl);
      const result = await cloudinary.api.resource(publicId, {
        resource_type: "raw",
      });
      return {
        url: result.secure_url,
        size: result.bytes,
        uploadedAt: new Date(result.created_at),
      };
    } catch {
      return null;
    }
  },

  /**
   * Generate a unique path for a resume PDF.
   * @param resumeId - The resume ID
   * @param userId - The user ID
   * @returns The public_id path
   */
  generatePath(resumeId: string, userId: string): string {
    return `resumes/${userId}/${resumeId}`;
  },
};
