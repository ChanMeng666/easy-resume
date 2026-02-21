import { v2 as cloudinary } from "cloudinary";

/**
 * Configure Cloudinary per-request for Workers compatibility.
 */
function getCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

/**
 * Extract the public_id from a Cloudinary URL.
 * URL format: https://res.cloudinary.com/{cloud}/raw/upload/v{version}/{public_id}.pdf
 */
function extractPublicId(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const uploadIndex = pathParts.findIndex((part) => part === "upload");
    if (uploadIndex === -1) {
      throw new Error("Invalid Cloudinary URL format");
    }
    const publicIdParts = pathParts.slice(uploadIndex + 2);
    const publicIdWithExt = publicIdParts.join("/");
    return publicIdWithExt.replace(/\.pdf$/, "");
  } catch (error) {
    console.error("Error extracting public_id from URL:", error);
    throw new Error("Failed to extract public_id from Cloudinary URL");
  }
}

/**
 * Service for managing PDF files in Cloudinary storage.
 * Uses base64 data URI upload instead of Node.js streams for Workers compatibility.
 */
export const blobService = {
  /**
   * Upload a PDF file to Cloudinary storage.
   */
  async uploadPdf(
    resumeId: string,
    userId: string,
    pdfBuffer: Buffer
  ): Promise<{ url: string; size: number }> {
    const cld = getCloudinary();
    const publicId = `resumes/${userId}/${resumeId}`;

    const base64 = pdfBuffer.toString("base64");
    const dataUri = `data:application/pdf;base64,${base64}`;

    const result = await cld.uploader.upload(dataUri, {
      public_id: publicId,
      resource_type: "raw",
      overwrite: true,
      format: "pdf",
    });

    return {
      url: result.secure_url,
      size: result.bytes,
    };
  },

  /**
   * Delete a PDF file from Cloudinary storage.
   */
  async deletePdf(cloudinaryUrl: string): Promise<boolean> {
    try {
      const cld = getCloudinary();
      const publicId = extractPublicId(cloudinaryUrl);
      const result = await cld.uploader.destroy(publicId, {
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
   */
  async getPdfMetadata(cloudinaryUrl: string): Promise<{
    url: string;
    size: number;
    uploadedAt: Date;
  } | null> {
    try {
      const cld = getCloudinary();
      const publicId = extractPublicId(cloudinaryUrl);
      const result = await cld.api.resource(publicId, {
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
   */
  generatePath(resumeId: string, userId: string): string {
    return `resumes/${userId}/${resumeId}`;
  },
};
