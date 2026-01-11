# Funktionale Anforderungen - SquadratsNavigator

## Anforderung 1: KML-Datei laden

| **Anforderung:** | KML-Datei Import |
|-----------------|------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Der SquadratsNavigator + **muss** + dem Benutzer die Möglichkeit bieten + über eine Dateiauswahl eine KML-Datei mit Polygon-Geometrien + zu laden. |
| | **Erklärung:** Der SquadratsNavigator (**Zielsystem**) **muss** (**höhe Priorität**) dem Benutzer die Möglichkeit bieten (**Systemaktivität = Benutzerinteraktion**) über eine Dateiauswahl (**Ergänzung**) eine KML-Datei mit Polygon-Geometrien (**Objekt & Objektergänzungen**) zu laden (**Funktionalität**). |

---

## Anforderung 2: Übersquadrat-Identifikation

| **Anforderung:** | Übersquadrat automatisch erkennen |
|-----------------|-----------------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Der KML-Prozessor + **muss** + - + aus den geladenen Polygonen das Übersquadrat (größtes Polygon oder benannt "ubersquadrat") + identifizieren, **wenn** eine KML-Datei geladen wurde. |
| | **Erklärung:** Der KML-Prozessor (**Zielsystem**) **muss** (**höhe Priorität**) - (**selbständige Systemaktivität**) aus den geladenen Polygonen (**Ergänzung**) das Übersquadrat (größtes Polygon oder benannt "ubersquadrat") (**Objekt & Objektergänzungen**) identifizieren (**Funktionalität**), **wenn** eine KML-Datei geladen wurde (**zeitliche Bedingung**). |

---

## Anforderung 3: Grid-Parameter berechnen

| **Anforderung:** | Grid-System Kalkulation |
|-----------------|------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Der KML-Prozessor + **muss** + - + basierend auf dem Übersquadrat und dessen "size"-Attribut die Grid-Parameter (LAT_STEP, LON_STEP, originLat, originLon) + berechnen. |
| | **Erklärung:** Der KML-Prozessor (**Zielsystem**) **muss** (**höhe Priorität**) - (**selbständige Systemaktivität**) basierend auf dem Übersquadrat und dessen "size"-Attribut (**Ergänzung**) die Grid-Parameter (LAT_STEP, LON_STEP, originLat, originLon) (**Objekt & Objektergänzungen**) berechnen (**Funktionalität**). |

---

## Anforderung 4: Besuchte Quadrate erkennen

| **Anforderung:** | Visited-Set Generierung |
|-----------------|------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Der KML-Prozessor + **muss** + - + mittels Point-in-Polygon-Algorithmus mit Unterstützung für Polygon-Löcher alle besuchten Grid-Koordinaten in einem visitedSet + speichern. |
| | **Erklärung:** Der KML-Prozessor (**Zielsystem**) **muss** (**höhe Priorität**) - (**selbständige Systemaktivität**) mittels Point-in-Polygon-Algorithmus mit Unterstützung für Polygon-Löcher (**Ergänzung**) alle besuchten Grid-Koordinaten in einem visitedSet (**Objekt & Objektergänzungen**) speichern (**Funktionalität**). |

---

## Anforderung 5: Quadrat-Optimierung

| **Anforderung:** | Strategische Quadrat-Empfehlung |
|-----------------|--------------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Der Optimizer + **muss** + dem Benutzer die Möglichkeit bieten + über einen 5-Phasen-Algorithmus (Edge-Analyse, Hole-Detection, Kandidatensammlung, strategisches Scoring, Routen-Optimierung) eine Liste empfohlener neuer Quadrate + zu generieren, **wenn** ein Übersquadrat geladen ist. |
| | **Erklärung:** Der Optimizer (**Zielsystem**) **muss** (**höhe Priorität**) dem Benutzer die Möglichkeit bieten (**Systemaktivität = Benutzerinteraktion**) über einen 5-Phasen-Algorithmus (**Ergänzung**) eine Liste empfohlener neuer Quadrate (**Objekt & Objektergänzungen**) zu generieren (**Funktionalität**), **wenn** ein Übersquadrat geladen ist (**zeitliche Bedingung**). |

---

## Anforderung 6: Richtungsfilter

| **Anforderung:** | Himmelsrichtungs-Selektion |
|-----------------|---------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Der SquadratsNavigator + **soll** + dem Benutzer die Möglichkeit bieten + über eine Multi-Select-Schaltfläche die Himmelsrichtungen (N, S, E, W) für die Optimierung + zu filtern. |
| | **Erklärung:** Der SquadratsNavigator (**Zielsystem**) **soll** (**mittlere Priorität**) dem Benutzer die Möglichkeit bieten (**Systemaktivität = Benutzerinteraktion**) über eine Multi-Select-Schaltfläche (**Ergänzung**) die Himmelsrichtungen (N, S, E, W) für die Optimierung (**Objekt & Objektergänzungen**) zu filtern (**Funktionalität**). |

---

## Anforderung 7: Straßendaten abrufen

| **Anforderung:** | OSM Straßendaten-Integration |
|-----------------|------------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Der Road-Fetcher + **muss** + **fähig sein** + über die Overpass API basierend auf dem gewählten Fahrradtyp (trekking, gravel, fastbike) OpenStreetMap-Straßendaten innerhalb der Quadrat-Grenzen + abzurufen. |
| | **Erklärung:** Der Road-Fetcher (**Zielsystem**) **muss** (**höhe Priorität**) **fähig sein** (**Systemaktivität = Schnittstellenanforderung**) über die Overpass API basierend auf dem gewählten Fahrradtyp (**Ergänzung**) OpenStreetMap-Straßendaten innerhalb der Quadrat-Grenzen (**Objekt & Objektergänzungen**) abzurufen (**Funktionalität**). |

---

## Anforderung 8: Fahrradroute berechnen

| **Anforderung:** | BRouter-Integration für Routenplanung |
|-----------------|---------------------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Der Router + **muss** + dem Benutzer die Möglichkeit bieten + über die BRouter-API mit straßenbasierten Wegpunkten eine optimierte Fahrradroute zwischen den empfohlenen Quadraten + zu berechnen, **falls** mindestens ein Startpunkt ausgewählt ist. |
| | **Erklärung:** Der Router (**Zielsystem**) **muss** (**höhe Priorität**) dem Benutzer die Möglichkeit bieten (**Systemaktivität = Benutzerinteraktion**) über die BRouter-API mit straßenbasierten Wegpunkten (**Ergänzung**) eine optimierte Fahrradroute zwischen den empfohlenen Quadraten (**Objekt & Objektergänzungen**) zu berechnen (**Funktionalität**), **falls** mindestens ein Startpunkt ausgewählt ist (**logische Bedingung**). |

---

## Anforderung 9: Wegpunkt-Optimierung

| **Anforderung:** | Intelligente Wegpunkt-Platzierung |
|-----------------|-----------------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Der Waypoint-Optimizer + **muss** + - + basierend auf Straßenkreuzungen, Straßenmittelpunkten oder nächsten Straßenpunkten Wegpunkte auf tatsächlichen Straßen innerhalb jedes Quadrats + platzieren. |
| | **Erklärung:** Der Waypoint-Optimizer (**Zielsystem**) **muss** (**höhe Priorität**) - (**selbständige Systemaktivität**) basierend auf Straßenkreuzungen, Straßenmittelpunkten oder nächsten Straßenpunkten (**Ergänzung**) Wegpunkte auf tatsächlichen Straßen innerhalb jedes Quadrats (**Objekt & Objektergänzungen**) platzieren (**Funktionalität**). |

---

## Anforderung 10: GPX-Export

| **Anforderung:** | Routenexport für GPS-Geräte |
|-----------------|----------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Der Export-Manager + **muss** + dem Benutzer die Möglichkeit bieten + im GPX-Format die berechnete Route mit allen Wegpunkten für GPS-Geräte (Garmin, Fahrradcomputer) + zu exportieren, **wenn** eine Route berechnet wurde. |
| | **Erklärung:** Der Export-Manager (**Zielsystem**) **muss** (**höhe Priorität**) dem Benutzer die Möglichkeit bieten (**Systemaktivität = Benutzerinteraktion**) im GPX-Format (**Ergänzung**) die berechnete Route mit allen Wegpunkten für GPS-Geräte (Garmin, Fahrradcomputer) (**Objekt & Objektergänzungen**) zu exportieren (**Funktionalität**), **wenn** eine Route berechnet wurde (**zeitliche Bedingung**). |

---

## Anforderung 11: Kartenvisualisierung

| **Anforderung:** | Interaktive Karten-Darstellung |
|-----------------|-------------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Die LeafletMap-Komponente + **muss** + dem Benutzer die Möglichkeit bieten + über eine interaktive Leaflet-Karte drei Layer (besuchte Quadrate in grün/blau, vorgeschlagene Quadrate in gold, berechnete Route in blau) + zu visualisieren. |
| | **Erklärung:** Die LeafletMap-Komponente (**Zielsystem**) **muss** (**höhe Priorität**) dem Benutzer die Möglichkeit bieten (**Systemaktivität = Benutzerinteraktion**) über eine interaktive Leaflet-Karte (**Ergänzung**) drei Layer (besuchte Quadrate in grün/blau, vorgeschlagene Quadrate in gold, berechnete Route in blau) (**Objekt & Objektergänzungen**) zu visualisieren (**Funktionalität**). |

---

## Anforderung 12: Startpunkt-Auswahl

| **Anforderung:** | Startposition festlegen |
|-----------------|------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Der SquadratsNavigator + **muss** + dem Benutzer die Möglichkeit bieten + über einen Karten-Klick oder die aktuelle GPS-Position einen Startpunkt für die Routenberechnung + auszuwählen. |
| | **Erklärung:** Der SquadratsNavigator (**Zielsystem**) **muss** (**höhe Priorität**) dem Benutzer die Möglichkeit bieten (**Systemaktivität = Benutzerinteraktion**) über einen Karten-Klick oder die aktuelle GPS-Position (**Ergänzung**) einen Startpunkt für die Routenberechnung (**Objekt & Objektergänzungen**) auszuwählen (**Funktionalität**). |

---

## Anforderung 13: KML-Caching

| **Anforderung:** | Lokale Dateispeicherung |
|-----------------|------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Der KML-Loader + **soll** + - + über IndexedDB geladene KML-Dateien im Browser-Speicher + zwischenspeichern. |
| | **Erklärung:** Der KML-Loader (**Zielsystem**) **soll** (**mittlere Priorität**) - (**selbständige Systemaktivität**) über IndexedDB (**Ergänzung**) geladene KML-Dateien im Browser-Speicher (**Objekt & Objektergänzungen**) zwischenspeichern (**Funktionalität**). |

---

## Anforderung 14: Routenstatistiken

| **Anforderung:** | Routen-Kennzahlen anzeigen |
|-----------------|----------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Die RouteStats-Komponente + **muss** + - + nach erfolgreicher Routenberechnung die Statistiken (Distanz in km, Höhenmeter, geschätzte Zeit) + anzuzeigen. |
| | **Erklärung:** Die RouteStats-Komponente (**Zielsystem**) **muss** (**höhe Priorität**) - (**selbständige Systemaktivität**) nach erfolgreicher Routenberechnung (**Ergänzung**) die Statistiken (Distanz in km, Höhenmeter, geschätzte Zeit) (**Objekt & Objektergänzungen**) anzuzeigen (**Funktionalität**). |

---

## Anforderung 15: Optimierungsmodus-Auswahl

| **Anforderung:** | Strategie-Konfiguration |
|-----------------|------------------------|
| **Beschreibung <Satzaufbau>** | *Zielsystem + Priorität + Systemaktivität + Ergänzungen + Funktionalität + Bedingungen* |
| | Der SquadratsNavigator + **soll** + dem Benutzer die Möglichkeit bieten + über eine Auswahlkomponente den Optimierungsmodus (edge, holes, balanced) für die Quadrat-Empfehlung + zu konfigurieren. |
| | **Erklärung:** Der SquadratsNavigator (**Zielsystem**) **soll** (**mittlere Priorität**) dem Benutzer die Möglichkeit bieten (**Systemaktivität = Benutzerinteraktion**) über eine Auswahlkomponente (**Ergänzung**) den Optimierungsmodus (edge, holes, balanced) für die Quadrat-Empfehlung (**Objekt & Objektergänzungen**) zu konfigurieren (**Funktionalität**). |

---

# Vorgehensmodell beim Squadrats-Navigator-Projekt

## Gewähltes Vorgehensmodell: Iterativ-Inkrementelles Entwicklungsmodell

Für die Entwicklung des Squadrats-Navigators wurde ein **iterativ-inkrementelles Vorgehensmodell** gewählt. Dieses Modell kombiniert die schrittweise Erweiterung der Funktionalität (inkrementell) mit der kontinuierlichen Verbesserung und Verfeinerung bestehender Komponenten (iterativ).

## Begründung der Modellwahl

Das iterativ-inkrementelle Modell erwies sich aus mehreren Gründen als optimal geeignet:

1. **Unklare Anforderungen zu Projektbeginn**: Die genauen technischen Anforderungen, insbesondere für Features wie Road-based Routing, waren initial nicht vollständig spezifiziert und entwickelten sich während der Implementierung.

2. **Frühes Nutzer-Feedback**: Durch funktionsfähige Inkremente konnte bereits früh mit realen KML-Daten getestet und Feedback eingeholt werden.

3. **Technologische Unsicherheiten**: Die Integration von APIs (BRouter, Overpass) und Bibliotheken (Turf.js, Leaflet) erforderte experimentelles Vorgehen und iterative Anpassungen.

4. **Risikominimierung**: Jedes Inkrement stellte eine eigenständig nutzbare Funktionseinheit dar, sodass das Projekt jederzeit in einem verwendbaren Zustand war.

## Inkremente und Iterationen

Die Entwicklung erfolgte in folgenden Hauptinkrementen:

### **Inkrement 1: Basis-Funktionalität (Core MVP)**
- **Ziel**: Laden und Visualisieren von KML-Daten
- **Implementierung**:
  - KML-Parser mit Leaflet Omnivore
  - Identifikation des Übersquadrats (größtes Polygon)
  - Berechnung des Grid-Systems basierend auf der "size"-Property
  - Visualisierung besuchter Quadrate auf Leaflet-Karte
- **Ergebnis**: Lauffähige Anwendung mit Basis-Kartendarstellung

**Iteration 1.1**: Verbesserung der Polygon-Erkennung
- Problem: Polygone mit Löchern wurden inkorrekt verarbeitet
- Lösung: Implementierung von `isPointInPolygonWithHoles()` mit Ray-Casting-Algorithmus für innere Ringe

**Iteration 1.2**: Integration von Turf.js
- Refactoring auf Turf.js-Bibliothek für robustere Geometrie-Operationen
- Ersetzung manueller Berechnungen durch `turf.area()`, `turf.bbox()`, `turf.booleanPointInPolygon()`

### **Inkrement 2: Optimierungs-Algorithmus**
- **Ziel**: Empfehlung neuer zu besuchender Quadrate
- **Implementierung**:
  - 5-Phasen-Algorithmus (Edge Analysis, Hole Detection, Candidate Collection, Strategic Scoring, Route Optimization)
  - Multi-Faktor-Scoring-System (Layer Distance, Hole Filling, Edge Completion, Adjacency)
  - Himmelsrichtungs-Filter (N/S/E/W)
- **Ergebnis**: Funktionsfähiger Optimizer mit strategischer Quadrat-Auswahl

**Iteration 2.1**: Einführung von Optimierungsmodi
- Erweiterung um Modi: `edge` (Expansion), `holes` (Lücken füllen), `balanced`
- Anpassbare Gewichtung der Scoring-Faktoren je nach Modus

**Iteration 2.2**: Max Hole Size Filter
- Problem: Algorithmus empfahl isolierte Einzelquadrate
- Lösung: Konfigurierbarer Filter für maximale Lochgröße (1-20 Quadrate)

**Iteration 2.3**: Scoring-Optimierung
- Mehrfache Anpassungen der Scoring-Gewichte basierend auf Testdaten
- Layer-abhängige Reduktion von Hole-Filling-Scores

### **Inkrement 3: Routen-Planung**
- **Ziel**: Fahrrad-Routen zwischen empfohlenen Quadraten berechnen
- **Implementierung**:
  - Integration BRouter API
  - TSP-Solver (Traveling Salesman Problem) für optimale Besuchsreihenfolge
  - Roundtrip-Option
  - Start-Punkt-Auswahl (Übersquadrat-Ecke oder GPS-Position)
- **Ergebnis**: Routenberechnung mit Distanz-, Höhenmeter- und Zeitangaben

**Iteration 3.1**: Road-aware Waypoint Optimization
- Problem: BRouter-Fehler "via-position not mapped" bei Wegpunkten im Gelände
- Lösung: Integration Overpass API zur Ermittlung tatsächlicher Straßen innerhalb der Quadrate
- Implementierung Waypoint-Optimizer mit Prioritätssystem (Intersections > Midpoints > Nearest)

**Iteration 3.2**: Fahrrad-Typen und Profile-Fallbacks
- Erweiterung um Fahrrad-Profile: `trekking`, `gravel`, `fastbike`
- Automatische Fallback-Chain bei BRouter-Fehlern
- Biketype-spezifische Overpass-Queries (z.B. Ausschluss unpaved für fastbike)

**Iteration 3.3**: Waypoint-Simplification
- Problem: BRouter-Limit von 50 Wegpunkten überschritten
- Lösung: Progressive Vereinfachung (0.5km → 1.0km → 1.5km Radius → Minimal)

### **Inkrement 4: Export-Funktionalität**
- **Ziel**: Routen für GPS-Geräte exportieren
- **Implementierung**:
  - GPX-Export (GPS Exchange Format)
  - KML-Export (Google Earth)
- **Ergebnis**: Kompatibilität mit Garmin, Wahoo, Google Earth

### **Inkrement 5: Architektur-Migration (Vue 3)**
- **Ziel**: Modernisierung der Technologie-Stack
- **Implementierung**:
  - Migration von Flask (Python Backend) zu reinem Frontend (Vue 3 + Vite)
  - Einführung Pinia State Management
  - Komponentisierung mit Vuetify 3
  - Modularisierung der Business Logic (src/logic/)
- **Ergebnis**: Wartbare, moderne Single-Page-Application ohne Backend-Abhängigkeit

**Iteration 5.1**: Refactoring map.js → kml-processor.js
- Trennung von KML-Processing und Map-Rendering
- Einführung klarer Modul-Grenzen

**Iteration 5.2**: Mobile Support
- Responsive Navbar mit Collapse-Funktion
- Touch-optimierte Kartenbedienung

## Phasen innerhalb jedes Inkrements

Jedes Inkrement durchlief folgende Phasen:

1. **Analyse**: Identifikation der Anforderungen und technischen Constraints
2. **Design**: Architektur-Planung (Komponenten, Datenflüsse, API-Integrationen)
3. **Implementierung**: Code-Entwicklung mit Vue 3, JavaScript ES6
4. **Manuelles Testing**: Tests mit realen KML-Daten verschiedener Größen und Komplexitäten
5. **Integration**: Einbindung in Haupt-Anwendung und Deployment
6. **Dokumentation**: Aktualisierung von CLAUDE.md und LAST_SESSION.md

## Vorteile des gewählten Vorgehensmodells

- **Flexibilität**: Anforderungen wie "Road-based Routing" konnten nachträglich ohne Architektur-Umbruch integriert werden
- **Risikominimierung**: Jedes Inkrement war eigenständig funktionsfähig und nutzbar
- **Kontinuierliches Testing**: Frühes Feedback durch Tests mit realen Geodaten
- **Technische Schulden-Management**: Refactorings (z.B. Turf.js-Migration) konnten in dedizierte Iterationen ausgelagert werden
- **Lernkurve**: Iteratives Vorgehen ermöglichte Einarbeitung in neue Technologien (Vue 3, Turf.js, Overpass API) während der Entwicklung

## Abweichungen von klassischen Modellen

Im Gegensatz zu strengen agilen Modellen (Scrum) wurden keine formalen Sprints, User Stories oder Daily Standups durchgeführt. Die Iterationen orientierten sich an technischen Meilensteinen und erkannten Problemen während des Developments. Dokumentiert wurde in Session-basierten Notizen (LAST_SESSION.md), die als informelles Backlog dienten.
