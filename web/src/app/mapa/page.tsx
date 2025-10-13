"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, User, Plus, CheckCircle } from "lucide-react";
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
  const coords: [number, number][] = route.geometry.coordinates;
  const distance = route.distance;
  const duration = route.duration;
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

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeLayerRef = useRef<any | null>(null);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [summary, setSummary] = useState<{ distanceKm: string; durationMin: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = {
    total: visits.length,
    pending: visits.filter((v) => v.status === "pending").length,
    completed: visits.filter((v) => v.status === "completed").length,
    todayPending: pendingTodayVisits.length,
  };

  const getStatusColor = (status: Visit["status"]) => {
    switch (status) {
      case "pending": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
      case "completed": return "bg-green-500/20 text-green-700 dark:text-green-400";
      case "cancelled": return "bg-red-500/20 text-red-700 dark:text-red-400";
      default: return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
    }
  };

  const getTypeColor = (type: Visit["type"]) => {
    switch (type) {
      case "maintenance": return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
      case "consultation": return "bg-purple-500/20 text-purple-700 dark:text-purple-400";
      case "installation": return "bg-green-500/20 text-green-700 dark:text-green-400";
      case "follow-up": return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
      default: return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
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
    setVisits((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: v.status === "pending" ? "completed" : "pending" } as Visit : v))
    );
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const L = await loadLeaflet();
        if (!mounted || !mapContainerRef.current || mapRef.current) return;
        const m = L.map(mapContainerRef.current).setView([40.4168, -3.7038], 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(m);
        mapRef.current = m;
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  function clearRouteAndMarkers() {
    if (!mapRef.current) return;
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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header limpio */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">Visitas y Rutas</h1>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Visita
            </Button>
          </div>
          <p className="text-muted-foreground">Gestiona tus visitas a clientes y planifica rutas</p>
        </div>

        {/* Dialog */}
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

        {/* Stats compactas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
                <div className="text-xs text-muted-foreground">Pendientes</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
                <div className="text-xs text-muted-foreground">Completadas</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats.todayPending}</div>
                <div className="text-xs text-muted-foreground">Hoy</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Layout 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda: Visitas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Visitas de Hoy */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Visitas de Hoy</h3>
                <span className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                </span>
              </div>
              {pendingTodayVisits.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                  <p className="text-sm text-muted-foreground">No hay visitas pendientes para hoy</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingTodayVisits.map((visit) => (
                    <div key={visit.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <span className="font-mono text-sm font-medium min-w-[50px]">{visit.scheduledTime}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{visit.clientName}</h4>
                        <p className="text-xs text-muted-foreground truncate">{visit.clientAddress}</p>
                      </div>
                      <Button size="sm" onClick={() => toggleVisitStatus(visit.id)} variant="outline">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Todas las Visitas */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Todas las Visitas</h3>
                <Badge variant="outline">{visits.length} visitas</Badge>
              </div>
              <div className="space-y-2">
                {visits.map((visit) => (
                  <div
                    key={visit.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      visit.status === "completed" ? "opacity-60" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="text-center min-w-[60px]">
                      <div className="text-xs font-semibold">
                        {new Date(visit.scheduledDate).toLocaleDateString("es-ES", { month: "short", day: "numeric" })}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">{visit.scheduledTime}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{visit.clientName}</h4>
                      <p className="text-xs text-muted-foreground truncate">{visit.clientAddress}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getStatusColor(visit.status)}`}>
                        {visit.status === "pending" ? "Pendiente" : visit.status === "completed" ? "Completada" : "Cancelada"}
                      </Badge>
                      {visit.status === "pending" && (
                        <Button size="sm" onClick={() => toggleVisitStatus(visit.id)} variant="ghost">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Columna derecha: Mapa y Rutas */}
          <div className="space-y-6">
            {/* Planificador de rutas */}
            <Card className="p-5">
              <h3 className="text-lg font-semibold mb-4">Planificar Ruta</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="origin" className="text-sm">Origen</Label>
                  <Input
                    id="origin"
                    placeholder="Ej: Gran Vía, Madrid"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="destination" className="text-sm">Destino</Label>
                  <Input
                    id="destination"
                    placeholder="Ej: Plaza Mayor, Madrid"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={planRoute} disabled={loading || !origin || !destination} className="flex-1">
                    {loading ? "Calculando..." : "Planificar"}
                  </Button>
                  <Button variant="outline" onClick={() => { clearRouteAndMarkers(); setSummary(null); setError(null); }}>
                    Limpiar
                  </Button>
                </div>
                {error && <div className="text-sm text-red-600 p-2 rounded bg-red-50 dark:bg-red-950/20">{error}</div>}
                {summary && (
                  <div className="text-sm p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Distancia:</span>
                      <span className="font-semibold">{summary.distanceKm} km</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tiempo:</span>
                      <span className="font-semibold">{summary.durationMin} min</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Mapa */}
            <Card className="p-2">
              <div ref={mapContainerRef} style={{ height: 400, width: "100%", borderRadius: 8 }} className="bg-muted/20" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
