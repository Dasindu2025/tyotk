import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function RecentEntries({ entries }: { entries: any[] }) {
  if (entries.length === 0) {
      return <div className="text-muted-foreground text-center py-4">No entries for today.</div>
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                   <span className="font-bold">{entry.projectCode}</span>
                   <span className="text-xs text-muted-foreground">{entry.startTime} - {entry.endTime}</span>
              </div>
              
              <div className="flex gap-2 mt-2 text-xs">
                 {entry.dayHours > 0 && <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">D: {entry.dayHours.toFixed(2)}h</Badge>}
                 {entry.eveningHours > 0 && <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400">E: {entry.eveningHours.toFixed(2)}h</Badge>}
                 {entry.nightHours > 0 && <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400">N: {entry.nightHours.toFixed(2)}h</Badge>}
              </div>
            </div>
            <StatusBadge status={entry.status} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
      PENDING: "bg-yellow-500 hover:bg-yellow-600",
      APPROVED: "bg-green-500 hover:bg-green-600",
      REJECTED: "bg-red-500 hover:bg-red-600",
    };
  
    return <Badge className={styles[status] || "bg-gray-500"}>{status}</Badge>;
  }
