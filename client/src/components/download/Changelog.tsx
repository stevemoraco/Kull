import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getChangelog, type ChangelogEntry } from "@/api/download";

export function Changelog() {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChangelog() {
      try {
        const data = await getChangelog();
        setChangelog(data);
      } catch (error) {
        console.error("Failed to load changelog:", error);
      } finally {
        setLoading(false);
      }
    }
    loadChangelog();
  }, []);

  if (loading) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading changelog...</p>
          </div>
        </div>
      </section>
    );
  }

  // Check if version was released within the last 30 days
  const isRecent = (dateString: string) => {
    const releaseDate = new Date(dateString);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return releaseDate > thirtyDaysAgo;
  };

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center text-foreground">
          Release Notes
        </h2>
        <p className="text-muted-foreground text-center mb-8 text-lg">
          See what's new in Kull AI
        </p>

        <Accordion type="single" collapsible defaultValue="item-0" className="space-y-4">
          {changelog.map((entry, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-card border border-card-border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-4 text-left w-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg text-card-foreground">
                        Version {entry.version}
                      </span>
                      {isRecent(entry.date) && (
                        <Badge variant="default" className="bg-primary text-primary-foreground">
                          New
                        </Badge>
                      )}
                      {index === 0 && (
                        <Badge variant="outline" className="border-primary text-primary">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(entry.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</span>
                      <span className="mx-2">•</span>
                      <span className="capitalize">{entry.platform === 'all' ? 'All Platforms' : entry.platform}</span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <ul className="space-y-3">
                  {entry.notes.map((note, noteIndex) => (
                    <li key={noteIndex} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground leading-relaxed">{note}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {changelog.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No release notes available.</p>
          </div>
        )}
      </div>
    </section>
  );
}
