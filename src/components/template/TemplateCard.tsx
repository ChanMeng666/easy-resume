'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TemplateMetadata } from '@/templates/types';

interface TemplateCardProps {
  metadata: TemplateMetadata;
}

/**
 * Neobrutalism styled template card for displaying template preview and information.
 */
export function TemplateCard({ metadata }: TemplateCardProps) {
  const pdfPath = metadata.previewImage;

  const handleViewFullPreview = () => {
    window.open(pdfPath, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group overflow-hidden rounded-xl bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] transition-all duration-200 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
    >
      {/* Preview PDF */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
        <iframe
          src={`${pdfPath}#view=FitH`}
          className="h-full w-full pointer-events-none scale-100 transition-transform duration-500 group-hover:scale-105"
          title={`${metadata.name} Preview`}
        />

        {/* Overlay with View Full Preview button */}
        <div className="absolute inset-0 bg-black/0 transition-all group-hover:bg-black/20">
          <div className="flex h-full items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              onClick={handleViewFullPreview}
              variant="secondary"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Full Preview
            </Button>
          </div>
        </div>

        {metadata.isPremium && (
          <div className="absolute right-3 top-3">
            <Badge variant="warning" className="text-xs">
              Premium
            </Badge>
          </div>
        )}
      </div>

      {/* Template Info */}
      <div className="p-5 border-t-2 border-black">
        <h3 className="mb-2 text-lg font-black">{metadata.name}</h3>
        <p className="mb-4 text-sm text-muted-foreground font-medium line-clamp-2">
          {metadata.description}
        </p>

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-2">
          {metadata.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-gray-100 px-2 py-1 text-xs font-bold border border-black uppercase"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
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
    </motion.div>
  );
}
