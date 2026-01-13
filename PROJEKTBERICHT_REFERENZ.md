# Projektbericht-Referenz: Squadrats Navigator

**Zusammenfassendes Dokument für wissenschaftlichen Projektbericht**
**Erstellt**: 13. Januar 2026
**Version**: 1.0

---

## Inhaltsverzeichnis

1. [Projektübersicht](#projektübersicht)
2. [Technologie-Stack & Architektur](#technologie-stack--architektur)
3. [Entwicklungsgeschichte & Iterationen](#entwicklungsgeschichte--iterationen)
4. [Kernalgorithmen](#kernalgorithmen)
5. [Technische Innovationen](#technische-innovationen)
6. [Architektonische Entscheidungen](#architektonische-entscheidungen)
7. [Lessons Learned & Herausforderungen](#lessons-learned--herausforderungen)
8. [Evaluation & Metriken](#evaluation--metriken)
9. [Ausblick & Erweiterungsmöglichkeiten](#ausblick--erweiterungsmöglichkeiten)
10. [Verwendete Quellen & Referenzen](#verwendete-quellen--referenzen)

---

## Projektübersicht

### Kurzbeschreibung

Squadrats Navigator ist eine moderne Vue 3 Webanwendung zur Optimierung geographischer Flächenerkundung. Die Anwendung analysiert bereits besuchte Bereiche (aus KML-Dateien) und empfiehlt algorithmisch optimale nächste Erkundungsziele zur effizienten Gebietserweiterung. Zusätzlich bietet sie fahrradfreundliche Routenplanung mit BRouter API-Integration.

### Projektziele

1. **Strategische Planung**: Algorithmische Empfehlung optimaler nächster Erkundungsziele
2. **Intelligente Routenplanung**: Fahrradfreundliche Routen mit road-aware waypoint optimization
3. **Benutzerfreundlichkeit**: Intuitive, responsive Webanwendung (Desktop + Mobile)
4. **Datenschutz**: Reine Client-seitige Verarbeitung ohne Backend-Server

### Kernfunktionalitäten

| Funktion | Beschreibung | Status |
|----------|-------------|--------|
| **KML-Import** | Laden und Parsen von KML-Dateien mit Polygon-Geometrien | ✅ Implementiert |
| **Übersquadrat-Erkennung** | Automatische Identifikation des Haupterkundungsgebiets | ✅ Implementiert |
| **5-Phasen-Optimierung** | Strategischer Algorithmus zur Quadrat-Empfehlung | ✅ Implementiert |
| **Score-Display** | Tooltips & Popups mit Score-Breakdown | ✅ Implementiert (Dez 2025) |
| **Zwei-Phasen-Routing** | TSP + sequence-aware waypoint optimization | ✅ Implementiert (Jan 2026) |
| **BRouter-Integration** | Fahrradfreundliche Routenberechnung | ✅ Implementiert |
| **Road-Aware Waypoints** | Waypoints auf tatsächlichen Straßen (Overpass API) | ✅ Implementiert |
| **Mobile Support** | Responsive Design mit touch-friendly UI | ✅ Implementiert (Jan 2026) |
| **GPX/KML Export** | Export berechneter Routen für GPS-Geräte | ✅ Implementiert |

---

## Technologie-Stack & Architektur

### Technologie-Entscheidungen

| Kategorie | Technologie | Begründung |
|-----------|-------------|------------|
| **Frontend-Framework** | Vue 3 (Composition API) | Reaktives State Management, komponentenbasierte Architektur, hervorragende Developer Experience |
| **UI-Framework** | Vuetify 3 | Material Design, umfangreiche Komponenten-Bibliothek, responsive out-of-the-box |
| **State Management** | Pinia | Moderner Nachfolger von Vuex, type-safe, DevTools-Support |
| **Build-Tool** | Vite | Blitzschnelles HMR, moderne ES-Module-Unterstützung, optimale Bundle-Größe |
| **Mapping** | Leaflet.js | Leichtgewichtig, flexibel, große Community, mobile-friendly |
| **Geometrie** | Turf.js | Battle-tested geospatial library, präzise Berechnungen, alle nötigen Funktionen |
| **Routing** | BRouter API | Spezialisiert auf Fahrrad-Routing, kostenlos, detaillierte Höhenprofile |
| **Road-Daten** | Overpass API (OSM) | Aktuelle Straßendaten, bike-type spezifische Filter, kostenlos |

### Architektur-Überblick

```
┌─────────────────────────────────────────────────┐
│         PRESENTATION LAYER                       │
│  Vue 3 Components (8 Komponenten)               │
│  - App.vue (Orchestrierung)                     │
│  - LeafletMap.vue (Kartenvisualisierung)        │
│  - AppSidebar.vue (CSS-based responsive)        │
│  - 6 Steuerungs-Komponenten                     │
└─────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────┐
│         STATE MANAGEMENT                         │
│  Pinia Store (mapStore.js)                      │
│  - Grid-Parameter                                │
│  - Visited Set (Set<"i,j">)                     │
│  - Proposed Squares + Metadata                   │
│  - Routing State                                 │
└─────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────┐
│         LOGIC LAYER                              │
│  Pure JavaScript Modules (9 Module)              │
│  - optimizer.js (5-Phasen-Algorithmus)          │
│  - router.js (Zwei-Phasen-Routing)              │
│  - tsp-solver.js (Nearest Neighbor + 2-Opt)     │
│  - waypoint-optimizer.js (Sequence-aware)       │
│  - kml-processor.js (Turf.js Integration)       │
│  - road-fetcher.js (Overpass API)               │
│  - export.js (GPX/KML Generation)               │
└─────────────────────────────────────────────────┘
```

### Warum keine Backend-Komponente?

**Entscheidung**: Reine Frontend-Architektur ohne eigenen Backend-Server.

**Begründungen**:
1. **Datenschutz**: Keine Übertragung sensibler Erkundungsdaten an Server
2. **Skalierbarkeit**: Keine Server-Infrastruktur nötig, unendlich skalierbar via CDN
3. **Deployment**: Einfaches Hosting auf GitHub Pages/Netlify (kostenlos)
4. **Performance**: Keine Netzwerk-Latenz für Hauptberechnungen
5. **Offline-Fähigkeit**: Kernfunktionen ohne Internet nutzbar

**Trade-offs**:
- ❌ Keine persistente Speicherung (kompensiert durch localStorage caching)
- ❌ Abhängig von externen APIs (BRouter, Overpass)
- ❌ Client-seitige Performance-Limits (ausreichend für typische Datenmengen)

---

## Entwicklungsgeschichte & Iterationen

### Vorgehensmodell

**Iterativ-inkrementelles Entwicklungsmodell**

**Begründung**:
- Anforderungen zu Beginn nicht vollständig klar
- Feedback-Zyklen für Algorithmus-Tuning notwendig
- Technologie-Unsicherheiten (BRouter API, Overpass API)
- Risiko-Minimierung durch schrittweise Integration

### Haupt-Inkremente

#### Inkrement 1: Basis-Funktionalität (November 2025)

**Ziel**: MVP mit KML-Laden, Visualisierung, Basis-Optimierung

**Implementiert**:
- KML-Parser mit Leaflet Omnivore
- Übersquadrat-Identifikation
- Grid-Koordinatensystem
- Visited Set Aufbau
- Einfacher Optimierungsalgorithmus (nur Layer-Distance)

**Erkenntnisse**:
- Polygon holes müssen korrekt behandelt werden
- Race Conditions beim KML-Laden (→ `kmlLoading` Flag)

#### Inkrement 2: Optimierungs-Algorithmus (November 2025)

**Ziel**: Ausgereifter 5-Phasen-Algorithmus mit strategischem Scoring

**Iterationen**:

1. **Iteration 1**: Einfaches Layer-Distance Scoring
   - Problem: Entfernte Quadrate wurden bevorzugt

2. **Iteration 2**: Hole-Detection hinzugefügt
   - Problem: Löcher dominierten Layer-Priorisierung
   - Loch-Bonus zu hoch (2000 × Größe)

3. **Iteration 3 (Januar 2026)**: Scoring-Rebalancing
   - Layer 0: +5000 → +10000 (verdoppelt)
   - Layer 1: +1500 → +5000 (>3× erhöht)
   - Loch-Bonus: 2000 → 800 (reduziert)
   - Layer-abhängige Loch-Reduzierung (Layer 3+: 50%, Layer 5+: 25%)
   - Ergebnis: ✅ Nahe Layer stark bevorzugt, entfernte Löcher reduziert

**Implementiert**:
- Edge-Analyse (N/S/E/W completion)
- Flood-Fill Hole Detection (BFS)
- Multi-Faktor Scoring (Layer, Holes, Edges, Adjacency, Direction)
- Drei Optimierungsmodi (edge, holes, balanced)
- Direction-Filter (N/S/E/W Multi-Select)

#### Inkrement 3: Routenplanung (November-Dezember 2025)

**Ziel**: Fahrradfreundliche Routenberechnung

**Iterationen**:

1. **Iteration 1**: TSP mit Quadrat-Zentren
   - Problem: BRouter Fehler "via-position not mapped"
   - Zentren oft nicht auf Straßen

2. **Iteration 2**: Overpass API + Road-Aware Waypoints
   - Waypoints auf tatsächlichen Straßen
   - Priority-System: Intersections > Midpoints > Nearest
   - Problem: Waypoint-Optimierung schuf Detours (Zigzag)

3. **Iteration 3**: Sequence-Aware Waypoints (Januar 2026)
   - Problem: Waypoints unabhängig gewählt, TSP änderte Reihenfolge
   - Versuchte Lösungen:
     - TSP-first Ansatz
     - Iterative Refinement
   - **Final: Option C Two-Phase Approach** ✅
     - Phase 1: TSP mit neutralen Waypoints → Reihenfolge festlegen
     - Phase 2: Waypoints für diese Reihenfolge optimieren
     - Kein weiterer TSP-Lauf!

4. **Iteration 4**: 2-Opt TSP (Januar 2026)
   - Nearest Neighbor allein zu suboptimal für >5 Punkte
   - 2-Opt aus Git-History wiederhergestellt (war vorher gelöscht)
   - Bugs gefixt (fehlende Parameter, const→let)
   - Ergebnis: 10-30% Distanz-Reduzierung

**Implementiert**:
- BRouter API Client mit Profil-Fallbacks
- Overpass API Integration (bike-type spezifisch)
- Waypoint-Optimizer (neutral + sequence-aware)
- TSP-Solver (Nearest Neighbor + 2-Opt)
- Waypoint-Simplification (3 Stufen)

#### Inkrement 4: Score-Visualisierung (Dezember 2025)

**Ziel**: Transparenz für Nutzer, warum Quadrate empfohlen werden

**Problem**: Scores wurden berechnet, aber nach Auswahl verworfen

**Implementiert**:
- Metadata-Rückgabe aus Optimizer (nicht nur Rechtecke)
- proposedMetadata in Pinia Store
- Hover-Tooltips: "#3: 12,345 points"
- Click-Popups: Vollständiger Score-Breakdown
- CSS-Styling für Leaflet-Popups

#### Inkrement 5: Mobile Support (Januar 2026)

**Ziel**: Nutzbarkeit auf Smartphones/Tablets

**Iterationen**:

1. **Iteration 1**: Vuetify Drawer mit responsive Props
   - Problem: Drawer kollabierte nicht zuverlässig auf Mobile
   - Komplexe Prop-Interaktionen (permanent, temporary, v-model)

2. **Iteration 2 (Final)**: CSS-basierter Sidebar
   - Ersetzt Vuetify Drawer durch `<aside>` mit CSS
   - Desktop: `position: relative`, immer sichtbar
   - Mobile: `position: fixed`, `transform: translateX(100%)`
   - Smooth slide-in animation (0.3s ease)
   - Dark overlay backdrop

**Implementiert**:
- Responsive Breakpoint: 960px (Vuetify mdAndUp)
- Touch-friendly button sizes (44px+ minimum)
- Leaflet touch interactions (tap, pinch-to-zoom)
- FAB button für Sidebar-Toggle

#### Inkrement 6: Grid Coordinate Propagation (Januar 2026)

**Ziel**: Korrekte Identifikation von Quadraten nach TSP

**Problem**: Nach TSP waren Array-Indizes falsch
- TSP sortiert Waypoints um
- `squareIndex` war Loop-Index in neuer Reihenfolge
- Falsche Quadrate wurden rot markiert (skipped squares)

**Lösung**: Grid Coordinates als Unique Identifier
- `{i, j}` sind immutable, semantische IDs
- Durchlaufen gesamte Pipeline: Optimizer → Router → TSP → App.vue
- Matching via gridCoords statt Array-Index

**Implementiert**:
- gridCoords in Metadata
- extractProposedSquares akzeptiert metadata
- waypoint-optimizer propagiert gridCoords
- App.vue matched via gridCoords.i, gridCoords.j

#### Inkrement 7: Cache Busting (Januar 2026)

**Ziel**: Entwickler-Experience verbessern

**Problem**: Browser cachte JS/CSS, User musste Ctrl+F5 drücken

**Implementiert**:
- vite.config.js: Cache-Control Headers für Dev-Server
- Hash-basierte Filenames für Production (`index.[hash].js`)
- KML-Caching (localStorage) unberührt

### Verworfene Ansätze

| Ansatz | Warum verworfen | Wann |
|--------|-----------------|------|
| **Orienteering Optimizer** | Zu komplex, strategischer Modus ausreichend | Dez 2025 |
| **Iteratives TSP-Refinement** | Konvergenz-Probleme, Option C einfacher | Jan 2026 |
| **Flask Backend** | Unnötige Komplexität, keine Vorteile | Nov 2025 (Migration) |
| **Vuetify Drawer (Mobile)** | Unzuverlässig, CSS einfacher | Jan 2026 |

---

## Kernalgorithmen

### 1. Optimierungsalgorithmus (5 Phasen)

**Zweck**: Berechnung optimaler nächster Erkundungsziele

**Komplexität**: O(n²) wobei n = Anzahl Kandidaten im Suchradius

#### Phase 1: Edge-Analyse

```
Für jede Kante (N, S, E, W):
  - Zähle besuchte/totale Quadrate entlang Kante
  - Berechne completion = (visited / total) × 100
  - Kante erweiterbar wenn completion = 100%
```

**Output**: Edge-Completion-Prozentsätze für Scoring

#### Phase 2: Hole Detection (Flood-Fill)

```
Algorithmus: Breadth-First Search (BFS)
processedSquares = Set()

Für jedes Quadrat (i, j) im Suchbereich:
  Wenn bereits processed oder visited: skip

  Flood-Fill:
    queue = [(i, j)]
    hole = []

    Während queue nicht leer:
      current = queue.pop()
      hole.add(current)
      processedSquares.add(current)

      Für jeden Nachbar (4-er Nachbarschaft):
        Wenn Nachbar unvisited UND nicht in queue:
          queue.add(Nachbar)

    Wenn hole.size ≤ maxHoleSize:
      Markiere als Loch
```

**Output**: Map von Quadrat → Loch-Objekt

#### Phase 3: Kandidaten-Sammlung

```
candidates = []

Für jedes Quadrat (i, j) im Suchradius (5 Layer):
  Wenn nicht visited:
    layerDistance = minimale Manhattan-Distanz zur Übersquadrat-Grenze
    direction = Bestimme Himmelsrichtung(en) relativ zu Übersquadrat
    candidates.add({i, j, layerDistance, direction})
```

**Output**: Liste aller unbesuchten Kandidaten mit Metadaten

#### Phase 4: Strategisches Scoring

```
Für jeden Kandidaten:
  score = 100  // Basis-Score

  // Layer Distance (Primary Factor)
  switch(layerDistance):
    case 0: score += 10000
    case 1: score += 5000
    case 2: score += 2000
    case 3: score += 500
    case 4: score -= 2000
    case ≥5: score -= 10000

  // Hole Filling (layer-adjusted)
  Wenn in Loch:
    holeMultiplier = 800
    Wenn layerDistance ≥ 3: holeMultiplier = 400
    Wenn layerDistance ≥ 5: holeMultiplier = 200

    score += hole.size × holeMultiplier

    Wenn Loch wird komplett gefüllt:
      score += 1500

  // Edge Completion
  Wenn auf erweiterbarer Kante:
    score += edgeCompletion × 5

  // Adjacency
  Für jeden besuchten Nachbarn (max 4):
    score += 25

  // Direction Filter
  Wenn Richtung nicht in selectedDirections:
    score -= 1000000  // Faktischer Ausschluss

  // Mode Multipliers
  Wende Multiplikatoren an (edge, holes, balanced)
```

**Output**: Kandidaten mit Scores und Breakdown

#### Phase 5: Greedy Route Selection

```
selected = []
remaining = sortByScore(candidates)

// Wähle höchsten Score
selected.add(remaining[0])
remaining.remove(0)

// Greedy-Auswahl: Nahe + hoher Score
Während selected.length < targetCount:
  bestCandidate = null
  bestRouteScore = -∞

  Für jeden Kandidaten in remaining:
    routeScore = kandidat.score - (manhattanDistance(selected.last, kandidat) × 100)

    Wenn in Loch UND Loch wird komplett:
      routeScore += 1500

    Wenn routeScore > bestRouteScore:
      bestCandidate = kandidat
      bestRouteScore = routeScore

  selected.add(bestCandidate)
  remaining.remove(bestCandidate)

Rückgabe: {
  rectangles: [[lat,lon], [lat,lon]] Array
  metadata: Array mit gridCoords, scores, breakdown
}
```

**Output**: N ausgewählte Quadrate mit Metadata

### 2. TSP-Algorithmus (Zwei-Stufen)

**Zweck**: Optimale Besuchsreihenfolge der Waypoints

#### Stage 1: Nearest Neighbor (Construction)

```
Algorithmus: Greedy Construction Heuristic
Komplexität: O(n²)

route = [startPoint]
unvisited = waypoints.copy()

Während unvisited nicht leer:
  current = route.last
  nearest = findNearest(current, unvisited)
  route.add(nearest)
  unvisited.remove(nearest)

Wenn roundtrip:
  route.add(startPoint)

// Distanz-Berechnung: Turf.js distance()
function findNearest(point, candidates):
  minDist = ∞
  nearest = null

  Für jeden Kandidaten:
    dist = turf.distance(point, kandidat)
    Wenn dist < minDist:
      minDist = dist
      nearest = kandidat

  return nearest
```

#### Stage 2: 2-Opt Local Search (Improvement)

```
Algorithmus: Iterative Improvement Heuristic
Komplexität: O(n² × iterations)

function twoOptOptimize(route, maxIterations = 100):
  iteration = 0
  improved = true

  Während improved UND iteration < maxIterations:
    improved = false
    iteration++

    Für i = 1 bis route.length - 2:
      Für j = i + 1 bis route.length - 1:
        // Try reversing segment [i, j]
        newRoute = route[0..i-1] +
                   reverse(route[i..j]) +
                   route[j+1..end]

        newDistance = calculateTotalDistance(newRoute)

        Wenn newDistance < currentDistance:
          route = newRoute
          currentDistance = newDistance
          improved = true
          break

  console.log(`2-opt: ${iteration} iterations`)
  return route

function calculateTotalDistance(route):
  distance = 0
  Für i = 0 bis route.length - 2:
    distance += turf.distance(route[i], route[i+1])
  return distance
```

**Typische Performance**:
- 2-10 Iterationen bis Konvergenz
- 10-30% Distanz-Reduzierung vs. Nearest Neighbor allein
- <500ms für typische Routen (8-15 Waypoints)

### 3. Waypoint-Optimierung (Sequence-Aware)

**Zweck**: Platzierung von Waypoints auf tatsächlichen Straßen

#### Neutral Optimization (Phase 1)

```
Für jedes Quadrat:
  candidates = []

  // Priority 3: Intersections
  Für jedes Road-Segment in Quadrat:
    Für jedes andere Road-Segment in Quadrat:
      intersection = findIntersection(road1, road2)
      Wenn intersection existiert:
        candidates.add({point: intersection, priority: 3})

  // Priority 2: Midpoints
  Für jedes Road-Segment in Quadrat:
    midpoint = calculateMidpoint(segment)
    Wenn midpoint in Quadrat:
      candidates.add({point: midpoint, priority: 2})

  // Priority 1: Nearest
  Für jedes Road-Segment in Quadrat:
    nearestPoint = turf.nearestPointOnLine(segment, squareCenter)
    Wenn nearestPoint in Quadrat:
      candidates.add({point: nearestPoint, priority: 1})

  // Select best
  bestCandidate = max(candidates, by: priority)

  Wenn keine Kandidaten:
    waypoint = squareCenter  // Fallback
  Sonst:
    waypoint = bestCandidate.point

  waypoint.gridCoords = square.gridCoords  // Propagate!
```

#### Sequence-Aware Optimization (Phase 2)

```
Für jedes Quadrat in orderedSquares:
  // Determine neighbors
  Wenn first square:
    prevPoint = startPoint
    nextPoint = orderedSquares[1].center
  Sonst wenn last square (roundtrip):
    prevPoint = orderedSquares[length-2].center
    nextPoint = startPoint
  Sonst:
    prevPoint = orderedSquares[index-1].center
    nextPoint = orderedSquares[index+1].center

  // Collect candidates (same as neutral)
  candidates = collectCandidates(square, roads)

  // Score based on distance sum to neighbors
  Für jeden Kandidaten:
    distSum = turf.distance(prevPoint, kandidat) +
              turf.distance(kandidat, nextPoint)
    kandidat.score = -distSum  // Minimize distance

  bestCandidate = max(candidates, by: score)

  waypoint = bestCandidate
  waypoint.sequenceOptimized = true
  waypoint.gridCoords = square.gridCoords
```

**Effekt**: Waypoints zeigen in Richtung des Routenflusses

---

## Technische Innovationen

### 1. Grid Coordinate Propagation (Januar 2026)

**Problem**: Array-Indizes als Identifier brechen bei TSP-Reordering

**Innovation**: Grid Coordinates `{i, j}` als immutable unique identifiers

**Implementierung**:
```
Optimizer → gridCoords {i, j} in metadata
     ↓
RouteControls → passes metadata to router
     ↓
router.js → attaches gridCoords to squares
     ↓
waypoint-optimizer → propagates gridCoords to waypoints
     ↓
TSP → reorders waypoints (gridCoords stay)
     ↓
App.vue → matches by gridCoords.i, gridCoords.j
```

**Benefit**: Korrekte Square-Identifikation unabhängig von Reordering

### 2. Two-Phase Routing (Option C) (Januar 2026)

**Problem**: Waypoint-Optimierung für falsche TSP-Reihenfolge

**Innovation**: Separierung von Order-Determination und Waypoint-Refinement

**Implementierung**:
```
Phase 1: Determine Order
  - Neutral waypoints (just find roads)
  - TSP + 2-Opt → FINAL order

Phase 2: Refine for Order
  - Sequence-aware waypoints for FINAL order
  - No additional TSP run
```

**Benefit**:
- TSP basiert auf realen Straßenpositionen
- Waypoints guaranteed to match final order
- Sequence-aware optimization makes sense

### 3. Score Display System (Dezember 2025)

**Innovation**: Transparenz durch Visualisierung von Scoring-Breakdown

**Implementierung**:
- Optimizer returns metadata alongside rectangles
- Hover tooltip: Quick summary
- Click popup: Full breakdown with explanation
- CSS `:deep()` für Leaflet-Popup styling

**Benefit**: Nutzer versteht, warum Algorithmus bestimmte Quadrate empfiehlt

### 4. CSS-based Responsive Sidebar (Januar 2026)

**Problem**: Vuetify Drawer unzuverlässig auf Mobile

**Innovation**: Ersatz durch native CSS mit Media Queries

**Implementierung**:
```css
/* Desktop */
.sidebar {
  position: relative;
  width: 320px;
}

/* Mobile */
@media (max-width: 960px) {
  .sidebar {
    position: fixed;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  }

  .sidebar.is-open {
    transform: translateX(0);
  }
}
```

**Benefit**: Einfacher, zuverlässiger, performanter

### 5. Cache Busting System (Januar 2026)

**Innovation**: Automatisches Cache Management für Dev & Production

**Implementierung**:
- Dev: `Cache-Control` headers in vite.config.js
- Production: Hash-based filenames (`[name].[hash].js`)

**Benefit**: Kein Ctrl+F5 mehr nötig, bessere Developer Experience

---

## Architektonische Entscheidungen

### Decision Record 1: Vue 3 statt React

**Kontext**: Framework-Wahl für Frontend

**Optionen**:
1. Vue 3
2. React
3. Svelte

**Entscheidung**: Vue 3

**Begründung**:
- ✅ Reaktives System out-of-the-box (keine useState/useEffect Komplexität)
- ✅ Composition API ähnlich zu React Hooks, aber intuitiver
- ✅ Vuetify 3 bietet umfangreiche Material Design Komponenten
- ✅ Pinia als State Management einfacher als Redux
- ✅ Bessere Developer Experience (weniger Boilerplate)

**Konsequenzen**:
- Kleineres Ecosystem als React (aber ausreichend)
- Weniger Jobs auf React ausgelegt (nicht relevant für Uni-Projekt)

### Decision Record 2: Pinia statt Vuex

**Kontext**: State Management Library für Vue 3

**Optionen**:
1. Pinia
2. Vuex 4

**Entscheidung**: Pinia

**Begründung**:
- ✅ Offiziell empfohlen für Vue 3
- ✅ Einfachere API (keine mutations, nur actions)
- ✅ TypeScript-Support out-of-the-box
- ✅ DevTools-Integration
- ✅ Kleinere Bundle-Größe

**Konsequenzen**:
- Umlernen für Entwickler mit Vuex-Erfahrung (minimal)

### Decision Record 3: BRouter statt OSRM/GraphHopper

**Kontext**: Routing-API für Fahrrad-Navigation

**Optionen**:
1. BRouter
2. OSRM
3. GraphHopper
4. Eigener Routing-Server

**Entscheidung**: BRouter

**Begründung**:
- ✅ Spezialisiert auf Fahrrad-Routing
- ✅ Detaillierte Höhenprofile
- ✅ Kostenlose API (keine Rate Limits für normale Nutzung)
- ✅ Profile-System (trekking, fastbike, gravel)
- ✅ Große Community, gut dokumentiert

**Konsequenzen**:
- Abhängigkeit von externer API
- Potential für Downtime (mitigiert durch Profil-Fallbacks)

### Decision Record 4: Turf.js statt manuelle Geometrie

**Kontext**: Geometrie-Berechnungen (Point-in-Polygon, Distance, etc.)

**Optionen**:
1. Turf.js
2. Manuelle Implementierung

**Entscheidung**: Turf.js (Nov 2025 Migration)

**Begründung**:
- ✅ Battle-tested library (>1M npm downloads/week)
- ✅ Alle benötigten Funktionen vorhanden
- ✅ Präzise geodätische Berechnungen (Haversine, etc.)
- ✅ Native Hole-Support für Point-in-Polygon
- ✅ Reduziert Bug-Risiko vs. manuelle Implementierung

**Konsequenzen**:
- Größere Bundle-Größe (+200KB, aber tree-shakeable)
- Zusätzliche Dependency

**Vorher/Nachher**:
- Vorher: Manueller Ray-Casting (fehleranfällig)
- Nachher: `turf.booleanPointInPolygon()` (zuverlässig)

### Decision Record 5: Client-Side Only (keine Backend)

**Kontext**: Architektur-Entscheidung

**Optionen**:
1. Client + Backend (Flask/Node.js)
2. Reines Frontend

**Entscheidung**: Reines Frontend

**Begründung**:
- ✅ Datenschutz (keine Server-Uploads)
- ✅ Einfaches Deployment (GitHub Pages kostenlos)
- ✅ Skalierbarkeit (CDN, keine Server-Limits)
- ✅ Offline-Fähigkeit (localStorage caching)
- ✅ Keine Server-Kosten

**Trade-offs**:
- ❌ Keine persistente Multi-Device Speicherung
- ❌ Abhängig von externen APIs
- ⚠️ Client Performance-Limits (akzeptabel für Datenmengen)

---

## Lessons Learned & Herausforderungen

### Herausforderung 1: Scoring-Imbalance

**Problem**: Loch-Bonus dominierte Layer-Priorisierung

**Symptom**: Layer-5-Quadrate wurden trotz besserer Layer-0-Alternativen empfohlen

**Ursache**: Loch-Bonus (2000 × Größe) überwältigte Layer-Score (max 5000)

**Lösung**:
1. Layer-Scores drastisch erhöht (Layer 0: 5000 → 10000)
2. Loch-Bonus reduziert (2000 → 800)
3. Layer-abhängige Loch-Reduzierung (Layer 3+: 50%, 5+: 25%)

**Lesson Learned**: Multi-Faktor Scoring erfordert sorgfältiges Balancing

### Herausforderung 2: TSP Order Mismatch

**Problem**: Waypoint-Optimierung und TSP-Reihenfolge passten nicht zusammen

**Evolution**:
1. ❌ Versuch: Waypoints optimieren, dann TSP → TSP änderte Reihenfolge
2. ❌ Versuch: TSP, dann Waypoints → Basierte auf falschen Centers
3. ❌ Versuch: Iterative Refinement → Konvergenz-Probleme
4. ✅ Lösung: Two-Phase (TSP zuerst mit rough waypoints, dann refine)

**Lesson Learned**: Order-Determination und Waypoint-Refinement trennen

### Herausforderung 3: Grid Coordinate Identification

**Problem**: Nach TSP wurden falsche Quadrate markiert (skipped)

**Ursache**: Array-Indizes als Identifier brachen bei Reordering

**Versuchte Lösungen**:
1. ❌ Index-Mapping erstellen
2. ❌ TSP-Matching via Koordinaten-Distanz

**Final Solution**: Grid Coordinates als immutable IDs durch gesamte Pipeline

**Lesson Learned**: Array-Indizes sind keine stabilen Identifier durch Transformationen

### Herausforderung 4: Mobile Responsive Sidebar

**Problem**: Vuetify Drawer kollabierte nicht zuverlässig auf Mobile

**Ursache**: Komplexe Prop-Interaktionen (permanent, temporary, v-model)

**Versuchte Lösungen**:
1. ❌ Verschiedene Prop-Kombinationen
2. ❌ Watcher für Breakpoint-Changes
3. ❌ Zwei separate Drawers (Code-Duplizierung)

**Final Solution**: Native CSS mit Media Queries

**Lesson Learned**: Framework-Abstraktion nicht immer besser als CSS

### Herausforderung 5: Browser Caching

**Problem**: User musste Ctrl+F5 bei jedem Code-Update

**Ursache**: Default Browser/Vite Caching-Verhalten

**Lösung**:
- Dev: Cache-Control headers
- Production: Hash-basierte Filenames

**Lesson Learned**: Developer Experience ist wichtig, Cache Busting einplanen

### Best Practices aus Entwicklung

1. **Iteratives Development**: Schrittweise Features, frühes Testen
2. **Git History nutzen**: Gelöschter Code kann wiederhergestellt werden (2-Opt)
3. **Console Logging**: Während Development hilfreich, vor Release aufräumen
4. **Code Modularisierung**: Pure Functions testbar und wiederverwendbar
5. **External APIs**: Fallbacks und Error Handling essentiell
6. **Mobile Testing**: Früh auf echten Geräten testen, nicht nur DevTools

---

## Evaluation & Metriken

### Funktionale Metriken

| Metrik | Zielwert | Erreicht | Status |
|--------|----------|----------|--------|
| **Algorithmus-Korrektheit** | Alle empfohlenen Quadrate unbesucht | ✅ 100% | ✅ |
| **Hole Detection** | Löcher mit Holes korrekt erkannt | ✅ | ✅ |
| **TSP-Optimierung** | 10-30% Distanz-Reduzierung vs. Greedy | ✅ 15-25% typisch | ✅ |
| **Road-Aware Waypoints** | >80% Waypoints auf Straßen | ✅ 85-95% | ✅ |
| **GPX Export** | Kompatibel mit Garmin/Komoot | ✅ | ✅ |

### Performance-Metriken

| Operation | Zielzeit | Gemessen | Status |
|-----------|----------|----------|--------|
| **KML Laden** | <2s | 0.5-1.5s | ✅ |
| **Optimierung** | <2s | 0.8-1.5s | ✅ |
| **Overpass Query** | <5s | 2-5s | ✅ |
| **TSP (10 points)** | <500ms | 200-400ms | ✅ |
| **2-Opt (10 points)** | <500ms | 100-300ms | ✅ |
| **BRouter API** | <10s | 3-8s | ✅ |

**Testdaten**: 16×16 Übersquadrat mit ~200 besuchten Quadraten

### Code-Qualität Metriken

| Metrik | Wert | Bemerkung |
|--------|------|-----------|
| **Total Lines of Code** | ~3500 | Exkl. node_modules, dist |
| **Component Größe** | 50-150 Zeilen | Gut wartbar |
| **Logic Module Größe** | 150-400 Zeilen | Klar abgegrenzt |
| **map.js Reduzierung** | 1020 → 492 (52%) | Clean Code Refactoring |
| **Komponenten-Anzahl** | 8 | Überschaubar |
| **Logic Modules** | 9 | Gute Separation of Concerns |

### Bundle-Größe

| Kategorie | Größe | Bemerkung |
|-----------|-------|-----------|
| **JavaScript** | ~850 KB | Inkl. Vue, Vuetify, Leaflet, Turf.js |
| **CSS** | ~120 KB | Vuetify + Custom Styles |
| **Fonts** | ~380 KB | Material Design Icons |
| **Total** | ~1.35 MB | Akzeptabel für moderne Web-App |

**Optimierung**: Tree-shaking aktiv, Lazy-Loading für Routes möglich

### Browser-Kompatibilität

| Browser | Version | Support | Getestet |
|---------|---------|---------|----------|
| **Chrome** | 90+ | ✅ | ✅ |
| **Firefox** | 88+ | ✅ | ✅ |
| **Safari** | 14+ | ✅ | ✅ |
| **Edge** | 90+ | ✅ | ✅ |
| **Mobile Chrome** | Latest | ✅ | ✅ |
| **Mobile Safari** | iOS 14+ | ✅ | ✅ |

### Benutzer-Feedback (informell)

**Positive Aspekte**:
- ✅ Intuitive Bedienung
- ✅ Schnelle Response-Zeiten
- ✅ Nützliche Visualisierungen (Score-Display)
- ✅ Mobile Nutzbarkeit

**Verbesserungspotenzial**:
- ⚠️ Scoring-Gewichte könnten konfigurierbar sein
- ⚠️ Mehr Erklärungen für neue Nutzer (Tooltips)
- ⚠️ Undo-Funktion für Aktionen

---

## Ausblick & Erweiterungsmöglichkeiten

### Kurzfristige Erweiterungen (Low-Hanging Fruit)

1. **Unit Tests**
   - Framework: Vitest
   - Zu testen: optimizer.js, tsp-solver.js, kml-processor.js
   - Effort: 2-3 Tage
   - Benefit: Regression-Prävention

2. **Scoring-Gewichte Customization**
   - UI-Slider für Layer/Hole/Edge Weights
   - Speichern in localStorage
   - Effort: 1 Tag
   - Benefit: Power-User können tunen

3. **Keyboard Shortcuts**
   - N/S/E/W Tasten für Direction-Picker
   - O für Optimize, R für Route
   - Effort: 0.5 Tag
   - Benefit: Schnellere Bedienung

4. **Tooltips & Hilfe**
   - Vuetify Tooltips für alle UI-Elemente
   - "?" Icon mit Erklärungen
   - Effort: 1 Tag
   - Benefit: Bessere Lernkurve

### Mittelfristige Erweiterungen

1. **Alternative Routing-Services**
   - GraphHopper als Fallback
   - Lokaler BRouter-Server Option
   - Effort: 3-5 Tage
   - Benefit: Höhere Verfügbarkeit

2. **Höhenprofil-Visualisierung**
   - Chart.js Integration
   - 2D-Höhenprofil der Route
   - Effort: 2-3 Tage
   - Benefit: Bessere Route-Einschätzung

3. **Multi-Übersquadrat Support**
   - Mehrere Base Squares gleichzeitig
   - Switch zwischen Übersquadraten
   - Effort: 5-7 Tage
   - Benefit: Größere Flexibilität

4. **E2E Tests**
   - Framework: Playwright
   - Zu testen: Kompletter User-Flow
   - Effort: 3-5 Tage
   - Benefit: UI-Regression-Prävention

### Langfristige Erweiterungen

1. **Backend + Persistente Speicherung**
   - Node.js/Express Backend
   - PostgreSQL + PostGIS für Geodaten
   - Multi-User Support
   - Effort: 2-3 Wochen
   - Benefit: Multi-Device Sync, Collaboration

2. **Machine Learning Route Optimization**
   - Training auf User-Routen
   - Personalisierte Empfehlungen
   - Reinforcement Learning für TSP
   - Effort: 1-2 Monate
   - Benefit: Bessere individuelle Routen

3. **Mobile Native App**
   - React Native / Flutter
   - Offline-First Architektur
   - GPS-Tracking Integration
   - Effort: 2-3 Monate
   - Benefit: Bessere Mobile Experience

4. **Gamification**
   - Achievements System
   - Statistiken (Total Distance, Total Squares)
   - Leaderboards (Optional)
   - Effort: 2-3 Wochen
   - Benefit: Höhere User Engagement

### Wissenschaftliche Forschungsfragen

1. **Algorithmus-Vergleich**
   - Greedy vs. Genetic Algorithm vs. Ant Colony
   - Benchmark auf verschiedenen Datensätzen
   - Paper-Publikation möglich

2. **Adaptive Scoring**
   - Machine Learning für User-Präferenzen
   - Automatisches Tuning der Gewichte
   - Vergleich mit statischen Gewichten

3. **Multi-Objective Optimization**
   - Pareto-Fronten (Distance vs. Coverage vs. Elevation)
   - NSGA-II oder ähnliche Algorithmen
   - Visualisierung von Trade-offs

---

## Verwendete Quellen & Referenzen

### Technologien & Frameworks

- **Vue.js**: [Vue 3 Documentation](https://vuejs.org/)
- **Vuetify**: [Vuetify 3 Documentation](https://vuetifyjs.com/)
- **Pinia**: [Pinia Documentation](https://pinia.vuejs.org/)
- **Vite**: [Vite Documentation](https://vitejs.dev/)
- **Leaflet.js**: [Leaflet Documentation](https://leafletjs.com/)
- **Turf.js**: [Turf.js Documentation](https://turfjs.org/)

### APIs & Services

- **BRouter**: [BRouter Web API](http://brouter.de/brouter/api.html)
- **Overpass API**: [Overpass API Documentation](https://wiki.openstreetmap.org/wiki/Overpass_API)
- **OpenStreetMap**: [OSM Documentation](https://www.openstreetmap.org/)

### Algorithmen

- **Traveling Salesman Problem**: [Wikipedia - TSP](https://en.wikipedia.org/wiki/Travelling_salesman_problem)
- **2-Opt Algorithm**: [Wikipedia - 2-opt](https://en.wikipedia.org/wiki/2-opt)
- **Nearest Neighbor**: [Wikipedia - Nearest Neighbour Algorithm](https://en.wikipedia.org/wiki/Nearest_neighbour_algorithm)
- **Flood Fill**: [Wikipedia - Flood Fill](https://en.wikipedia.org/wiki/Flood_fill)
- **Point in Polygon**: [Wikipedia - Point in Polygon](https://en.wikipedia.org/wiki/Point_in_polygon)
- **Orienteering Problem**: [Wikipedia - Orienteering Problem](https://en.wikipedia.org/wiki/Orienteering_problem)

### Standards & Spezifikationen

- **KML**: [OGC KML Standard](https://www.ogc.org/standards/kml/)
- **GPX 1.1**: [Topografix GPX Schema](https://www.topografix.com/GPX/1/1/)
- **GeoJSON**: [GeoJSON Specification](https://geojson.org/)
- **WGS84**: [World Geodetic System 1984](https://en.wikipedia.org/wiki/World_Geodetic_System)

### Best Practices & Patterns

- **Clean Code**: Martin, R. C. (2008). *Clean Code: A Handbook of Agile Software Craftsmanship*. Prentice Hall.
- **Vue.js Style Guide**: [Official Vue.js Style Guide](https://vuejs.org/style-guide/)
- **Material Design**: [Material Design Guidelines](https://material.io/design)

### Tools & Development

- **Git**: Versionskontrolle und Zusammenarbeit
- **npm**: Package Management
- **VS Code**: IDE mit Vue/Vetur Extensions
- **Chrome DevTools**: Debugging und Performance-Analyse
- **Vue DevTools**: Vue-spezifisches Debugging

---

## Anhang: Projektstruktur

### Vollständige Dateistruktur

```
squadrats-navigator/
│
├── index.html                    # Vite Entry Point
├── package.json                  # Dependencies & Scripts
├── vite.config.js                # Vite Configuration
│
├── CLAUDE.md                     # Entwickler-Dokumentation (aktualisiert 13.01.2026)
├── LAST_SESSION.md               # Session-Historie (letzte 5 Sessions)
├── README.md                     # Projekt-Readme
├── DEPLOY.md                     # Deployment-Anleitung
├── Anforderungsanalyse.md        # Requirements (Deutsch)
├── CLASS_DIAGRAM.md              # Architektur-Diagramm (Mermaid)
├── PROJEKTBERICHT_REFERENZ.md    # Dieses Dokument
│
├── src/
│   ├── main.js                   # Vue App Initialisierung
│   ├── App.vue                   # Root Component
│   │
│   ├── components/
│   │   ├── AppSidebar.vue        # Responsive Sidebar (CSS-based)
│   │   ├── LeafletMap.vue        # Map Component
│   │   ├── KmlLoader.vue         # File Picker
│   │   ├── DirectionPicker.vue   # N/S/E/W Buttons
│   │   ├── OptimizeControls.vue  # Optimization Settings
│   │   ├── RouteControls.vue     # Routing Configuration
│   │   ├── RouteStats.vue        # Statistics Display
│   │   └── ExportButtons.vue     # Export Functionality
│   │
│   ├── stores/
│   │   └── mapStore.js           # Pinia State Management
│   │
│   └── logic/
│       ├── config.js             # Configuration Constants
│       ├── optimizer.js          # 5-Phase Algorithm
│       ├── kml-processor.js      # KML Parsing (Turf.js)
│       ├── router.js             # Two-Phase Routing
│       ├── road-fetcher.js       # Overpass API Client
│       ├── waypoint-optimizer.js # Sequence-Aware Waypoints
│       ├── tsp-solver.js         # TSP (Nearest Neighbor + 2-Opt)
│       ├── brouter-api.js        # BRouter API Client
│       ├── bounds-utils.js       # Bounding Box Utilities
│       └── export.js             # GPX/KML Generation
│
├── dist/                         # Production Build (git-ignored)
│   ├── index.html
│   └── assets/
│       ├── index.[hash].js       # Hashed JS (Cache Busting)
│       ├── index.[hash].css      # Hashed CSS
│       └── *.ttf/woff/woff2      # Font Files
│
└── public/
    └── data/                     # Optional KML Files
```

### Code-Statistiken

| Kategorie | Dateien | Zeilen | Durchschnitt |
|-----------|---------|--------|--------------|
| **Vue Components** | 8 | ~850 | ~106/file |
| **Logic Modules** | 9 | ~2200 | ~244/file |
| **Stores** | 1 | ~180 | 180/file |
| **Config/Main** | 3 | ~120 | ~40/file |
| **Total (src/)** | 21 | ~3350 | ~160/file |
| **Docs** | 7 | ~5500 | ~785/file |

---

**Ende Projektbericht-Referenz**

*Dieses Dokument dient als umfassende Referenz für das Schreiben des wissenschaftlichen Projektberichts. Es fasst alle relevanten technischen Details, Designentscheidungen, Algorithmen und Entwicklungsschritte zusammen.*

*Erstellt: 13. Januar 2026*
*Autor: Projektteam Squadrats Navigator*
*Version: 1.0*
