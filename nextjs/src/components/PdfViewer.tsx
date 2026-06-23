'use client'

import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader } from './ModernLoader';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  previewUrl: string;
}

export default function PdfViewer({ previewUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width - 32;
        if (w > 0) setPageWidth(w);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full h-[400px] sm:h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg flex flex-col overflow-hidden">
      <div ref={containerRef} className="flex-1 flex items-start justify-center overflow-auto p-2">
        <Document
          file={previewUrl}
          onLoadSuccess={({ numPages: pages }) => setNumPages(pages)}
          loading={<Loader size="lg" />}
          error={
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span>Failed to load PDF preview</span>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            width={pageWidth}
            className="shadow-sm"
          />
        </Document>
      </div>
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2 border-t border-border bg-muted/30 flex-shrink-0">
          <button
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors flex items-center gap-1 text-xs font-medium text-muted-foreground"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {pageNumber} / {numPages}
          </span>
          <button
            onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors flex items-center gap-1 text-xs font-medium text-muted-foreground"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
