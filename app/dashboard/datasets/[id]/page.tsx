"use client";

import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Database, 
  ShieldCheck, 
  FileSearch, 
  Clock, 
  Tag, 
  Info,
  Layers,
  HardDrive,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDataset } from "@/lib/hooks/use-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DatasetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { dataset, isLoading, isError } = useDataset(id as string);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError || !dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Database className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Dataset Not Found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{dataset.attack_threat_type}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="font-mono text-xs">{dataset.id}</span>
            <span>•</span>
            <span>Primary Training Source</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          {/* Recommended Model */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardDescription className="flex items-center gap-2 text-primary font-medium">
                <ShieldCheck className="h-4 w-4" />
                Target Model Optimization
              </CardDescription>
              <CardTitle>{dataset.recommended_model}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This dataset is curated specifically to maximize the weights efficiency of {dataset.recommended_model} architectures.
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Compatibility Score</span>
                  <span className="font-bold text-primary">98%</span>
                </div>
                <Progress value={98} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* Dataset Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-orange-500" />
                Characteristics
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">Samples</p>
                <p className="text-lg font-bold tabular-nums">~1.5M</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">Class Bal.</p>
                <p className="text-lg font-bold text-green-500">Opt</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">Format</p>
                <p className="text-lg font-bold">Parquet</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">Quality</p>
                <p className="text-lg font-bold">SOTA</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dataset Schema Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Dataset Schema (Columns)
            </CardTitle>
            <CardDescription>Definitions for the raw features extracted during the ingestion pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[150px]">Feature Name</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataset.columns?.map((col: any) => (
                    <TableRow key={col.name}>
                      <TableCell className="font-mono text-xs font-semibold">{col.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">{col.type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{col.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Observable Data Sample Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Observable Data Sample
            </CardTitle>
            <CardDescription>Randomly sampled records from the training set (Anonymized).</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-xs">
            <Download className="h-3 w-3 mr-2" />
            Export Sample
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground">
                <TableRow>
                  {dataset.columns?.map((col: any) => (
                    <TableHead key={col.name}>{col.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataset.sample_data?.map((row: any, i: number) => (
                  <TableRow key={i}>
                    {dataset.columns?.map((col: any) => (
                      <TableCell key={col.name} className="font-mono text-[11px] py-2">
                        {typeof row[col.name] === 'boolean' ? (
                          <Badge variant={row[col.name] ? 'destructive' : 'secondary'} className="text-[9px] px-1 h-4">
                            {row[col.name].toString()}
                          </Badge>
                        ) : (
                          row[col.name]
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Repositories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-md">
              <HardDrive className="h-4 w-4 text-primary" />
            </div>
            Included Repositories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {dataset.datasets.map((ds: string) => (
              <div key={ds} className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                <Database className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">{ds}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
