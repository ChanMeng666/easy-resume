import { put, del, head } from "@vercel/blob";

/**
 * Service for managing PDF files in Vercel Blob storage.
 * Handles upload, retrieval, and deletion of compiled PDF resumes.
 */
export const blobService = {
  /**
   * Upload a PDF file to Vercel Blob storage.
   * @param resumeId - The resume ID to associate with the PDF
   * @param userId - The user ID for path organization
   * @param pdfBuffer - The PDF file as a Buffer
   * @returns The blob URL and metadata
   */
  async uploadPdf(
    resumeId: string,
    userId: string,
    pdfBuffer: Buffer
  ): Promise<{ url: string; size: number }> {
    const pathname = `resumes/${userId}/${resumeId}.pdf`;

    const blob = await put(pathname, pdfBuffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      size: pdfBuffer.length,
    };
  },

  /**
   * Delete a PDF file from Vercel Blob storage.
   * @param blobUrl - The full blob URL to delete
   * @returns True if deletion was successful
   */
  async deletePdf(blobUrl: string): Promise<boolean> {
    try {
      await del(blobUrl);
      return true;
    } catch (error) {
      console.error("Error deleting PDF from blob storage:", error);
      return false;
    }
  },

  /**
   * Check if a PDF exists in Vercel Blob storage.
   * @param blobUrl - The full blob URL to check
   * @returns The blob metadata if it exists, null otherwise
   */
  async getPdfMetadata(blobUrl: string): Promise<{
    url: string;
    size: number;
    uploadedAt: Date;
  } | null> {
    try {
      const metadata = await head(blobUrl);
      return {
        url: metadata.url,
        size: metadata.size,
        uploadedAt: metadata.uploadedAt,
      };
    } catch {
      return null;
    }
  },

  /**
   * Generate a unique blob path for a resume PDF.
   * @param resumeId - The resume ID
   * @param userId - The user ID
   * @returns The blob path
   */
  generatePath(resumeId: string, userId: string): string {
    return `resumes/${userId}/${resumeId}.pdf`;
  },
};
