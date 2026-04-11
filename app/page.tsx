"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Shield, Activity, Brain, Lock, Zap, Network, Eye, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: Brain,
    title: "Physics-Informed Detection",
    description: "PINN models that understand physical laws to detect FDI attacks"
  },
  {
    icon: Shield,
    title: "Ransomware Pre-Detection",
    description: "cGAN + Transformer detects ransomware before encryption begins"
  },
  {
    icon: Zap,
    title: "TinyML Edge Detection",
    description: "Lightweight models for DER attack detection on edge devices"
  },
  {
    icon: Eye,
    title: "Physical Threat Monitoring",
    description: "YOLOv9 + LSTM fusion for physical sabotage detection"
  },
  {
    icon: Database,
    title: "Firmware Integrity",
    description: "Graph Mamba CFG fingerprinting for supply chain security"
  },
  {
    icon: Network,
    title: "DDoS Mitigation",
    description: "DRL adaptive traffic shaping for protocol-aware defense"
  },
  {
    icon: Activity,
    title: "Behavioral DNA",
    description: "Per-operator profiling for insider threat detection"
  },
  {
    icon: Lock,
    title: "Model Integrity",
    description: "Merkle logs + Krum + PGD for poisoning defense"
  }
]

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative rounded-full bg-primary/10 p-4">
                <Shield className="h-12 w-12 text-primary" />
                <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-green-500" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl text-balance">
              OT/ICS Cybersecurity Platform
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground text-pretty">
              Production-grade ML/DL threat detection for industrial control systems. 
              Protect critical infrastructure across energy, transport, banking, and manufacturing sectors.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-4">
              <Button size="lg" onClick={() => router.push("/dashboard")}>
                Open Dashboard
              </Button>
              <Button variant="outline" size="lg" onClick={() => router.push("/auth/login")}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">8</div>
              <div className="mt-1 text-sm text-muted-foreground">ML Detection Models</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">6</div>
              <div className="mt-1 text-sm text-muted-foreground">Data Source Connectors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">&lt;100ms</div>
              <div className="mt-1 text-sm text-muted-foreground">Detection Latency</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">95%+</div>
              <div className="mt-1 text-sm text-muted-foreground">Detection Accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Advanced Threat Detection
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Eight specialized ML models protecting against the most sophisticated OT/ICS attacks
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="group transition-all hover:shadow-md hover:border-primary/50">
                <CardHeader className="pb-2">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Protocols */}
      <section className="border-t bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Industrial Protocol Support
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Connect to any OT data source with built-in protocol support
            </p>
          </div>
          <div className="mx-auto mt-12 flex flex-wrap items-center justify-center gap-4">
            {["Modbus TCP/RTU", "OPC-UA", "DNP3", "MQTT", "Kafka", "REST API", "CSV Import"].map((protocol) => (
              <div
                key={protocol}
                className="rounded-full border bg-background px-4 py-2 text-sm font-medium text-foreground"
              >
                {protocol}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl rounded-2xl bg-primary p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold text-primary-foreground sm:text-3xl">
              Ready to secure your infrastructure?
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              Get started with real-time threat detection in minutes
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-8"
              onClick={() => router.push("/dashboard")}
            >
              Launch Dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground lg:px-8">
          OT/ICS Cybersecurity Platform - Production ML/DL Threat Detection
        </div>
      </footer>
    </div>
  )
}
