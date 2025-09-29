"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, User, Plus, CheckCircle, Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Utilidades Leaflet vía CDN
function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if ((window as any).L) return resolve((window as any).L);

    const cssId = "leaflet-css-cdn";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const jsId = "leaflet-js-cdn";
    if (document.getElementById(jsId)) {
      const check = () => {
        if ((window as any).L) resolve((window as any).L);
        else setTimeout(check, 100);
      };
      check();
      return;
    }

    const script = document.createElement("script");
    script.id = jsId;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve((window as any).L);
    script.onerror = () => reject(new Error("No se pudo cargar Leaflet"));
    document.body.appendChild(script);
  });
}

async function geocode(query: string) {
  if (!query.trim()) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "es" } });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data || data.length === 0) return null;
  const p = data[0];
  return { lat: Number(p.lat), lon: Number(p.lon), label: p.display_name };
}

async function fetchRoute(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const base = "https://router.project-osrm.org/route/v1/driving";
  const url = `${base}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const json = await res.json();
  const route = json.routes?.[0];
  if (!route) throw new Error("No route");
  const coords: [number, number][] = route.geometry.coordinates; // [lon, lat]
  const distance = route.distance; // meters
  const duration = route.duration; // seconds
  return { coords, distance, duration };
}

interface Visit {
  id: string;
  clientName: string;
  clientAddress: string;
  scheduledDate: string;
  scheduledTime: string;
  status: "pending" | "completed" | "cancelled";
  notes?: string;
  type: "maintenance" | "consultation" | "installation" | "follow-up";
}

export default function VisitsTracker() {
  const [visits, setVisits] = useState<Visit[]>([
    {
      id: "1",
      clientName: "María González",
      clientAddress: "Av. Principal 123, Centro",
      scheduledDate: "2025-01-15",
      scheduledTime: "09:00",
      status: "pending",
      notes: "Revisión de sistema de seguridad",
      type: "maintenance",
    },
    {
      id: "2",
      clientName: "Carlos Rodríguez",
      clientAddress: "Calle 45 #67-89, Norte",
      scheduledDate: "2025-01-15",
      scheduledTime: "11:30",
      status: "pending",
      notes: "Consulta inicial para nuevo proyecto",
      type: "consultation",
    },
    {
      id: "3",
      clientName: "Ana Martínez",
      clientAddress: "Carrera 12 #34-56, Sur",
      scheduledDate: "2025-01-15",
      scheduledTime: "14:00",
      status: "completed",
      notes: "Instalación completada exitosamente",
      type: "installation",
    },
    {
      id: "4",
      clientName: "Luis Pérez",
      clientAddress: "Av. Libertador 789, Este",
      scheduledDate: "2025-01-16",
      scheduledTime: "10:00",
      status: "pending",
      notes: "Seguimiento post-instalación",
      type: "follow-up",
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [newVisit, setNewVisit] = useState({
    clientName: "",
    clientAddress: "",
    scheduledDate: "",
    scheduledTime: "",
    notes: "",
    type: "consultation" as Visit["type"],
  });

  const today = new Date().toISOString().split("T")[0];
  const todayVisits = visits.filter((visit) => visit.scheduledDate === today);
  const pendingTodayVisits = todayVisits.filter((visit) => visit.status === "pending");

  // --- Estado y refs del mapa ---
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeLayerRef = useRef<any | null>(null);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [summary, setSummary] = useState<{ distanceKm: string; durationMin: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusColor = (status: Visit["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getTypeColor = (type: Visit["type"]) => {
    switch (type) {
      case "maintenance":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "consultation":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "installation":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "follow-up":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const handleAddVisit = () => {
    const visit: Visit = {
      id: Date.now().toString(),
      ...newVisit,
      status: "pending",
    };
    setVisits([...visits, visit]);
    setNewVisit({
      clientName: "",
      clientAddress: "",
      scheduledDate: "",
      scheduledTime: "",
      notes: "",
      type: "consultation",
    });
    setShowForm(false);
  };

  const toggleVisitStatus = (id: string) => {
    setVisits(
      visits.map((visit) =>
        visit.id === id ? { ...visit, status: visit.status === "pending" ? "completed" : "pending" } : visit,
      ),
    );
  };

  const stats = {
    total: visits.length,
    pending: visits.filter((v) => v.status === "pending").length,
    completed: visits.filter((v) => v.status === "completed").length,
    todayPending: pendingTodayVisits.length,
  };

  // Inicializa el mapa Leaflet una vez
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled) return;
        if (!mapContainerRef.current) return;
        const map = L.map(mapContainerRef.current).setView([40.4168, -3.7038], 12);
        mapRef.current = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error iniciando el mapa");
      }
    })();
    return () => {
      cancelled = true;
      try { mapRef.current?.remove(); } catch {}
      mapRef.current = null;
    };
  }, []);

  function clearRouteAndMarkers() {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;
    for (const m of markersRef.current) {
      try { mapRef.current.removeLayer(m); } catch {}
    }
    markersRef.current = [];
    if (routeLayerRef.current) {
      try { mapRef.current.removeLayer(routeLayerRef.current); } catch {}
      routeLayerRef.current = null;
    }
  }

  async function planRoute() {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const a = await geocode(origin);
      const b = await geocode(destination);
      if (!a || !b) throw new Error("No se pudo geocodificar origen/destino");
      const L = await loadLeaflet();
      if (!mapRef.current) throw new Error("Mapa no inicializado");

      clearRouteAndMarkers();

      const startMarker = L.marker([a.lat, a.lon]).addTo(mapRef.current).bindPopup("Origen");
      const endMarker = L.marker([b.lat, b.lon]).addTo(mapRef.current).bindPopup("Destino");
      markersRef.current = [startMarker, endMarker];

      const route = await fetchRoute({ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon });
      const latlngs = route.coords.map(([lon, lat]) => [lat, lon]);
      const poly = L.polyline(latlngs, { color: "#2563eb", weight: 5 }).addTo(mapRef.current);
      routeLayerRef.current = poly;
      mapRef.current.fitBounds(poly.getBounds(), { padding: [30, 30] });

      const distanceKm = (route.distance / 1000).toFixed(2);
      const durationMin = (route.duration / 60).toFixed(0);
      setSummary({ distanceKm, durationMin });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error planificando ruta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mapa</h1>
            <p className="text-muted-foreground mt-1">Seguimiento de visitas y agenda</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Visita
          </Button>
        </div>

        {showForm && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Programar Nueva Visita</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="clientName">Nombre del Cliente</Label>
                  <Input
                    id="clientName"
                    value={newVisit.clientName}
                    onChange={(e) => setNewVisit({ ...newVisit, clientName: e.target.value })}
                    placeholder="Ingresa el nombre del cliente"
                  />
                </div>
                <div>
                  <Label htmlFor="clientAddress">Dirección</Label>
                  <Input
                    id="clientAddress"
                    value={newVisit.clientAddress}
                    onChange={(e) => setNewVisit({ ...newVisit, clientAddress: e.target.value })}
                    placeholder="Dirección del cliente"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scheduledDate">Fecha</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={newVisit.scheduledDate}
                      onChange={(e) => setNewVisit({ ...newVisit, scheduledDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="scheduledTime">Hora</Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={newVisit.scheduledTime}
                      onChange={(e) => setNewVisit({ ...newVisit, scheduledTime: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="type">Tipo de Visita</Label>
                  <Select value={newVisit.type} onValueChange={(value: Visit["type"]) => setNewVisit({ ...newVisit, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consulta</SelectItem>
                      <SelectItem value="maintenance">Mantenimiento</SelectItem>
                      <SelectItem value="installation">Instalación</SelectItem>
                      <SelectItem value="follow-up">Seguimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={newVisit.notes}
                    onChange={(e) => setNewVisit({ ...newVisit, notes: e.target.value })}
                    placeholder="Notas adicionales sobre la visita"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddVisit} className="flex-1">Programar Visita</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card border-border p-4">
            <div className="pb-2 text-sm font-medium text-muted-foreground">Total Visitas</div>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </Card>
          <Card className="bg-card border-border p-4">
            <div className="pb-2 text-sm font-medium text-muted-foreground">Pendientes</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
          </Card>
          <Card className="bg-card border-border p-4">
            <div className="pb-2 text-sm font-medium text-muted-foreground">Completadas</div>
            <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
          </Card>
          <Card className="bg-card border-border p-4">
            <div className="pb-2 text-sm font-medium text-muted-foreground">Hoy Pendientes</div>
            <div className="text-2xl font-bold text-primary">{stats.todayPending}</div>
          </Card>
        </div>

        {/* Today's Visits Highlight */}
        <Card className="bg-card border-border p-4">
          <div className="flex items-center gap-2 text-foreground text-lg font-semibold mb-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Visitas de Hoy - {new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          {pendingTodayVisits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <p>¡Excelente! No tienes visitas pendientes para hoy.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTodayVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Clock className="w-4 h-4" />
                      <span className="font-mono text-sm">{visit.scheduledTime}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{visit.clientName}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {visit.clientAddress}
                      </p>
                      {visit.notes && <p className="text-sm text-muted-foreground mt-1">{visit.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(visit.type)}>
                      {visit.type === "maintenance" && "Mantenimiento"}
                      {visit.type === "consultation" && "Consulta"}
                      {visit.type === "installation" && "Instalación"}
                      {visit.type === "follow-up" && "Seguimiento"}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => toggleVisitStatus(visit.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Completar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* All Visits */}
        <Card className="bg-card border-border p-4">
          <div className="text-foreground text-lg font-semibold mb-2">Todas las Visitas</div>
          <div className="space-y-4">
            {visits.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(visit.scheduledDate).toLocaleDateString("es-ES", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{visit.scheduledTime}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {visit.clientName}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {visit.clientAddress}
                    </p>
                    {visit.notes && <p className="text-sm text-muted-foreground mt-1">{visit.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getTypeColor(visit.type)}>
                    {visit.type === "maintenance" && "Mantenimiento"}
                    {visit.type === "consultation" && "Consulta"}
                    {visit.type === "installation" && "Instalación"}
                    {visit.type === "follow-up" && "Seguimiento"}
                  </Badge>
                  <Badge className={getStatusColor(visit.status)}>
                    {visit.status === "pending" && "Pendiente"}
                    {visit.status === "completed" && "Completada"}
                    {visit.status === "cancelled" && "Cancelada"}
                  </Badge>
                  {visit.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleVisitStatus(visit.id)}
                      className="border-green-500/30 text-green-400 hover:bg-green-500/20"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Marcar Completada
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Planificador de rutas */}
        <Card className="bg-card border-border p-4 space-y-4">
          <div className="text-foreground text-lg font-semibold">Planificador de rutas</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="origin">Origen</Label>
              <Input id="origin" placeholder="Ej: Gran Vía, Madrid" value={origin} onChange={(e) => setOrigin(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="destination">Destino</Label>
              <Input id="destination" placeholder="Ej: Plaza Mayor, Madrid" value={destination} onChange={(e) => setDestination(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={planRoute} disabled={loading}>
              {loading ? "Calculando..." : "Planificar ruta"}
            </Button>
            <Button variant="ghost" onClick={() => { clearRouteAndMarkers(); setSummary(null); setError(null); }}>
              Limpiar
            </Button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {summary && (
            <div className="text-sm text-[var(--muted-foreground)]">
              Distancia: <span className="font-medium">{summary.distanceKm} km</span> · Tiempo estimado: <span className="font-medium">{summary.durationMin} min</span>
            </div>
          )}
        </Card>

        <Card className="bg-card border-border p-2">
          <div ref={mapContainerRef} style={{ height: 500, width: "100%", borderRadius: 8 }} />
        </Card>
      </div>
    </div>
  );
}
