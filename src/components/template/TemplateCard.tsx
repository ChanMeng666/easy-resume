'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateMetadata } from '@/templates/types';

interface TemplateCardProps {
  metadata: TemplateMetadata;
}

/**
 * Template card component for displaying template preview and information
 */
export function TemplateCard({ metadata }: TemplateCardProps) {
  const pdfPath = `/template/${metadata.id}-preview.pdf`;

  const handleViewFullPreview = () => {
    window.open(pdfPath, '_blank');
  };

  return (
    <div className="group overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900">
      {/* Preview PDF */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-gray-800">
        <iframe
          src={`${pdfPath}#view=FitH`}
          className="h-full w-full pointer-events-none scale-100"
          title={`${metadata.name} Preview`}
        />

        {/* Overlay with View Full Preview button */}
        <div className="absolute inset-0 bg-black/0 transition-all group-hover:bg-black/40">
          <div className="flex h-full items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              onClick={handleViewFullPreview}
              variant="secondary"
              className="gap-2 shadow-lg"
            >
              <ExternalLink className="h-4 w-4" />
              View Full Preview
            </Button>
          </div>
        </div>

        {metadata.isPremium && (
          <div className="absolute right-2 top-2 rounded-full bg-yellow-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            Premium
          </div>
        )}
      </div>

      {/* Template Info */}
      <div className="p-4">
        <h3 className="mb-2 text-lg font-semibold">{metadata.name}</h3>
        <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
          {metadata.description}
        </p>

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-1">
          {metadata.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {metadata.isPremium ? (
            <Button className="flex-1" variant="outline" disabled>
              Coming Soon
            </Button>
          ) : (
            <>
              <Button
                onClick={handleViewFullPreview}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Preview
              </Button>
              <Link href={`/editor?template=${metadata.id}`} className="flex-1">
                <Button className="w-full">Use This Template</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
