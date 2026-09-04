import { useQuery } from "@tanstack/react-query";
import { BookOpen, ExternalLink, Image as ImageIcon, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { cn } from "../utils/cn";

export interface PublishedIssue {
  id: number;
  issueNo: string;
  title: string;
  slug: string;
  coverImageUrl?: string | null;
  description?: string | null;
  issueMonth: number;
  issueYear: number;
  publishedAt: string | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function formatIssuePeriod(month: number, year: number) {
  const monthName = MONTH_NAMES[month - 1] || "";
  return monthName ? `${monthName} ${year}` : `${year}`;
}

export function usePublishedMagazineIssues() {
  return useQuery<PublishedIssue[]>({
    queryKey: ["public-magazine-issues"],
    queryFn: async () => {
      const res = await fetch("/api/public/magazine");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

interface PublishedMagazineSectionProps {
  variant?: "login" | "dashboard";
  limit?: number;
}

export function PublishedMagazineSection({
  variant = "dashboard",
  limit = 3,
}: PublishedMagazineSectionProps) {
  const { data: issues, isLoading } = usePublishedMagazineIssues();

  if (isLoading) {
    return null;
  }

  if (!issues || issues.length === 0) {
    return null;
  }

  const displayedIssues = issues.slice(0, limit);

  if (variant === "login") {
    return (
      <div className="w-full space-y-3 pt-2">
        <div className="flex items-center gap-2 px-1">
          <BookOpen className="text-teal-600 dark:text-teal-400" size={16} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Latest Hospital Magazines
          </h3>
        </div>
        <div className="space-y-2">
          {displayedIssues.map((issue) => (
            <div
              key={issue.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/60 backdrop-blur-sm hover:bg-card hover:border-teal-500/40 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {issue.coverImageUrl ? (
                  <img
                    src={issue.coverImageUrl}
                    alt={issue.title}
                    className="size-10 rounded-lg object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="size-10 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40 flex items-center justify-center shrink-0">
                    <BookOpen size={18} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {issue.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Issue #{issue.issueNo} • {formatIssuePeriod(issue.issueMonth, issue.issueYear)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`/magazine/view/${issue.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-colors"
                >
                  Read <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Dashboard variant
  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border/50 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="text-teal-600 dark:text-teal-400" size={18} />
            Hospital Magazine & Publications
          </CardTitle>
          <CardDescription>
            Explore recent digital publications, medical research articles, and photo journals.
          </CardDescription>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-650 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/30 px-2.5 py-0.5 rounded-full w-fit">
          <Sparkles size={11} /> Digital Editions
        </span>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {displayedIssues.map((issue) => (
            <div
              key={issue.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-teal-500/40 transition-all p-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  {issue.coverImageUrl ? (
                    <img
                      src={issue.coverImageUrl}
                      alt={issue.title}
                      className="w-16 h-20 rounded-lg object-cover border border-border shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-teal-500/10 to-indigo-500/10 border border-teal-200/50 dark:border-teal-800/40 text-teal-600 dark:text-teal-400 flex flex-col items-center justify-center shrink-0 gap-1">
                      <BookOpen size={20} />
                      <span className="text-[9px] font-bold uppercase">#{issue.issueNo}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="inline-block text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                      Issue #{issue.issueNo}
                    </span>
                    <h4 className="text-sm font-bold text-foreground mt-0.5 leading-snug line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {issue.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatIssuePeriod(issue.issueMonth, issue.issueYear)}
                    </p>
                  </div>
                </div>

                {issue.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {issue.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 mt-2 border-t border-border/50">
                <a
                  href={`/magazine/view/${issue.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-colors text-center"
                >
                  <BookOpen size={13} /> Read Issue <ExternalLink size={11} />
                </a>
                <a
                  href={`/magazine/view/${issue.slug}/gallery`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors"
                  title="View Photo Gallery"
                >
                  <ImageIcon size={13} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
