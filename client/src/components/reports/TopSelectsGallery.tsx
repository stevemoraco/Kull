import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, ZoomIn } from 'lucide-react';
import type { TopSelect } from '@/lib/reports';
import { ReportLightbox } from './ReportLightbox';

interface TopSelectsGalleryProps {
  topSelects: TopSelect[];
}

export function TopSelectsGallery({ topSelects }: TopSelectsGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  const colorLabelColors: Record<string, string> = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-400',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            Top Selects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topSelects.map((select, index) => (
              <div
                key={index}
                className="relative group cursor-pointer rounded-lg overflow-hidden aspect-[4/3] bg-gray-100"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={select.url}
                  alt={select.filename}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  loading="lazy"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-2">
                  <Badge className="bg-black/70 text-white gap-1">
                    {select.rating}
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  </Badge>
                  {select.colorLabel && (
                    <Badge
                      className={`${colorLabelColors[select.colorLabel]} text-white border-none`}
                    >
                      {select.colorLabel}
                    </Badge>
                  )}
                </div>

                {/* Filename */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="text-white text-xs truncate">
                    {select.filename}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ReportLightbox
        images={topSelects}
        initialIndex={selectedIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
