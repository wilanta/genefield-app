import { useEffect, useState } from "react";
import { dataService } from "@/services";
import type { RiceLine } from "@/types/research";

export default function LineExplorer() {
    const [lines, setLines] = useState<RiceLine[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        dataService
            .getLines({ page: 1, pageSize: 20 })
            .then((result) => {
                if (active) setLines(result.items);
            })
            .catch(() => {
                if (active) setError("Failed to load lines.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    if (loading) return <p>Loading lines...</p>;
    if (error) return <p role="alert">{error}</p>;

    return (
        <main className="p-6">
            <h1 className="text-2xl font-semibold">
                Line Explorer
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
                Development preview — mock data
            </p>

            <ul className="mt-6 space-y-3">
                {lines.map((line) => (
                    <li key={line.id} className="rounded-lg border p-4">
                        <strong>{line.name}</strong>
                        <p className="text-sm">{line.id}</p>
                    </li>
                ))}
            </ul>
        </main>
    );
}