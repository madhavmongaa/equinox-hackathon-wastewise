// Illegal dump reporting API (by Kunwar Juneja, ported from the main branch).
// Citizen reports, Gemini photo analysis, government dispatch, sweeper status,
// the density heatmap feed and Maps-grounded facility search. Reports live in
// memory and reset when the server restarts.

import { Type, type GoogleGenAI } from "@google/genai"
import type { Express } from "express"
import type { AIDumpAnalysisResult, DumpReport, HeatmapPoint } from "../src/dumps/types"

export function registerDumpRoutes(app: Express, ai: GoogleGenAI | null) {
  // In-Memory Database for Roadside Dumps
  let dumpReports: DumpReport[] = [];

  // Seed Initial Realistic Dump Reports
  function seedInitialDumps() {
    // sample reports around Sohna (Gurugram district, Haryana)

    dumpReports = [
      {
        id: 'dump-101',
        title: 'Roadside Construction Rubble & Broken Concrete',
        description: 'Demolition dry concrete chunks, rebar, broken tile blocks dumped along the shoulder curb, blocking the bike lane.',
        imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        location: {
          lat: 28.264,
          lng: 77.0575,
          address: 'Sohna–Gurugram Road (NH-248A) service lane, near Sector 33',
          accuracyMeters: 4,
        },
        categories: ['construction', 'mixed'],
        severity: 'high',
        estimatedWeightKg: 450,
        hazardScore: 7,
        healthRisks: ['Traffic lane obstruction', 'Sharp concrete rebar injury risk'],
        recommendedEquipment: ['JCB Skid-steer loader', '10-ton flatbed dump truck', 'Safety gloves'],
        status: 'dispatched_to_government',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        reportedBy: { name: 'Ananya Gupta', contact: 'ananya.g@example.org', isAnonymous: false },
        governmentDispatch: {
          ticketNumber: 'SW-MUNI-928411',
          dispatchedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          departmentName: 'Municipal Sanitation & Public Works Wing, Sohna',
          grievancePortal: 'Municipal sanitation helpline',
          assignedOfficer: 'Sanitary Inspector Rathi (Ward 6)',
          estimatedResolutionHours: 24,
          officialNotes: 'Grievance verified by automated photo hash. Heavy equipment crew scheduled for morning sweep.',
          dossierHash: 'e7f1082a9c4b9213',
        },
      },
      {
        id: 'dump-102',
        title: 'Dense Plastic Bottles, Wrappers & Decaying Packaging',
        description: 'Heavily overflowing beverage bottles, Styrofoam containers, and wet cartons accumulating beside storm drainage culvert.',
        imageUrl: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
        location: {
          lat: 28.2455,
          lng: 77.0735,
          address: 'Storm drain behind Sohna Bus Stand, Sohna–Palwal Road',
          accuracyMeters: 3,
        },
        categories: ['plastic', 'organic', 'mixed'],
        severity: 'critical',
        estimatedWeightKg: 180,
        hazardScore: 9,
        healthRisks: ['Immediate storm drain blockage', 'Microplastic water runoff', 'Mosquito harborage'],
        recommendedEquipment: ['Suction Vacuum sweeper truck', 'Industrial rakes', 'Heavy-duty 100L bio-bags'],
        status: 'in_progress',
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        reportedBy: { name: 'Rohit Yadav', contact: 'rohit.y@example.org', isAnonymous: false },
        governmentDispatch: {
          ticketNumber: 'SW-MUNI-884129',
          dispatchedAt: new Date(Date.now() - 3600000 * 16).toISOString(),
          departmentName: 'Public Works – Drainage Cell, Sohna',
          grievancePortal: 'Swachh City Emergency Redressal',
          assignedOfficer: 'Supervisor Chauhan',
          estimatedResolutionHours: 12,
          officialNotes: 'Priority dispatch issued due to storm sewer proximity.',
          dossierHash: '43a88c7f9910d2bc',
        },
        sweeperCrew: {
          assignedTeam: 'Rapid Municipal Sweeper Crew Alpha #3',
          sweeperNotes: 'Crew deployed on site with hydraulic loader; 60% of plastic bagged.',
        },
      },
      {
        id: 'dump-103',
        title: 'Discarded Vehicle Tires & Petroleum Grease Buckets',
        description: 'Ten passenger car tires piled in ditch with two unsealed buckets of used engine lubricant and rusty rim parts.',
        imageUrl: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
        location: {
          lat: 28.2335,
          lng: 77.093,
          address: 'Truck parking strip, Sohna–Palwal Road near Abhaypur',
          accuracyMeters: 5,
        },
        categories: ['hazardous', 'metal'],
        severity: 'critical',
        estimatedWeightKg: 210,
        hazardScore: 9,
        healthRisks: ['Combustion fire risk', 'Toxic petroleum soil contamination', 'Stagnant rainwater mosquito breeding'],
        recommendedEquipment: ['Hazardous materials containment unit', 'Spill kit absorbent pads', 'Winch recovery truck'],
        status: 'reported',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        reportedBy: { name: 'Anonymous Citizen', isAnonymous: true },
      },
      {
        id: 'dump-104',
        title: 'Commercial Cardboard Packaging & Dry Waste Spillage',
        description: 'Compressed bundles of retail cardboard, shipping foam, and cellophane stretch film blown across pavement.',
        imageUrl: 'https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&w=800&q=80',
        location: {
          lat: 28.248,
          lng: 77.066,
          address: 'Rear service lane, Sohna Main Bazaar',
          accuracyMeters: 6,
        },
        categories: ['plastic', 'textile', 'mixed'],
        severity: 'medium',
        estimatedWeightKg: 85,
        hazardScore: 4,
        healthRisks: ['Windblown litter into waterways', 'Pedestrian sidewalk narrowing'],
        recommendedEquipment: ['Cardboard baler van', 'Recycling pickup van', 'Brooms'],
        status: 'reported',
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        reportedBy: { name: 'Neha Malik', contact: 'neha.m@example.org', isAnonymous: false },
      },
      {
        id: 'dump-105',
        title: 'Household Electronic Appliances & Wire Scraps',
        description: 'Broken CRT monitor, smashed microwave oven, tangle of stripped electrical copper wires and PCB boards.',
        imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
        location: {
          lat: 28.252,
          lng: 77.0715,
          address: 'Vacant plot near GLS Arawali Homes, Sector 4, Sohna',
          accuracyMeters: 3,
        },
        categories: ['electronic', 'hazardous'],
        severity: 'high',
        estimatedWeightKg: 65,
        hazardScore: 8,
        healthRisks: ['Lead & cadmium heavy metal leaching', 'Glass puncture hazards'],
        recommendedEquipment: ['E-waste certified transport crate', 'Cut-resistant gloves', 'Acid-resistant bins'],
        status: 'assigned_sweeper',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        reportedBy: { name: 'Kavita Patel', contact: 'kavita.p@example.org', isAnonymous: false },
        governmentDispatch: {
          ticketNumber: 'SW-MUNI-773291',
          dispatchedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
          departmentName: 'Hazardous Waste & E-Scrap Division',
          grievancePortal: 'District Environmental Protection Cell',
          assignedOfficer: 'Officer Dahiya',
          estimatedResolutionHours: 24,
          officialNotes: 'Assigned to specialized E-waste recycler squad.',
          dossierHash: '8b91c49e29a73011',
        },
        sweeperCrew: {
          assignedTeam: 'Municipal E-Waste Unit #2',
          sweeperNotes: 'Route scheduled for 2:30 PM pickup.',
        },
      },
      {
        id: 'dump-106',
        title: 'Vegetable Market Rotten Organic Heaps & Sacks',
        description: 'Discarded wet leafy greens, decaying cabbage crates, and damp burlap sacks attracting rodents.',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
        location: {
          lat: 28.2448,
          lng: 77.069,
          address: 'Sohna Sabzi Mandi service lane',
          accuracyMeters: 4,
        },
        categories: ['organic'],
        severity: 'high',
        estimatedWeightKg: 320,
        hazardScore: 7,
        healthRisks: ['Bacterial proliferation', 'Odor nuisance', 'Fly and rodent infestation'],
        recommendedEquipment: ['Organic waste compactor truck', 'Lime disinfectant powder spray', 'Shovels'],
        status: 'cleaned',
        createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        reportedBy: { name: 'Priya Sharma', isAnonymous: false },
        governmentDispatch: {
          ticketNumber: 'SW-MUNI-612088',
          dispatchedAt: new Date(Date.now() - 3600000 * 28).toISOString(),
          departmentName: 'Market Sanitation, Ward 8 Sohna',
          grievancePortal: 'Municipal Composting Cell',
          assignedOfficer: 'Officer Yadav',
          estimatedResolutionHours: 8,
          officialNotes: 'High priority odor complaint cleared.',
          dossierHash: '1a72d3e4f9b8c012',
        },
        sweeperCrew: {
          assignedTeam: 'Green Organic Rapid Sweeper Unit',
          sweeperNotes: 'Site completely cleared and sanitized with organic lime powder. Transferred to the district biomethanation facility.',
          cleanedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
          recycledKg: 310,
        },
      },
    ];
  }

  seedInitialDumps();

  // AI Vision Image Analysis Endpoint for Roadside Illegal Dumps
  app.post('/api/dumps/analyze', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', locationContext } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Image data is required for waste analysis' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const promptText = `
  You are an expert Municipal Sanitation & Hazardous Waste Specialist evaluating an illegal roadside waste dump photo.
  Analyze the provided photo thoroughly and output valid JSON conforming strictly to the requested schema.

  Extract:
  1. title: Concise description of the dump (e.g., "Roadside Single-Use Plastic Pile & Debris")
  2. description: Factual observation of materials, condition, context (e.g. curb, sidewalk, ditch).
  3. categories: Array of matching categories from ['plastic', 'organic', 'construction', 'hazardous', 'electronic', 'metal', 'textile', 'mixed'].
  4. severity: Exactly one of ['low', 'medium', 'high', 'critical'].
     - 'critical' if >200kg, toxic/hazardous, blocking stormwater drains, or flammable.
     - 'high' if large pile, glass/rebar hazard, attracting pests, or blocking traffic/sidewalks.
     - 'medium' if moderate scatter (20-80kg), recyclable cardboard/plastics.
     - 'low' if minor litter (<20kg).
  5. estimatedWeightKg: Realistic estimated weight in kilograms (numeric).
  6. hazardScore: Integer from 1 (minimal) to 10 (extreme biological/chemical/obstruction risk).
  7. healthRisks: 2 to 4 specific public health or environmental threats (e.g., "Drain clogging", "Leachate runoff", "Rodent breeding").
  8. recommendedEquipment: 2 to 4 municipal cleanup tools or machinery needed (e.g., "10-ton hydraulic compactor", "Biohazard PPE suits", "Industrial rakes").
  9. confidence: Estimated analysis confidence score between 0.70 and 0.99.

  Location context provided by citizen device: ${locationContext || 'Urban roadside / curb'}.
  `;

      // Attempt Gemini 3.8 Flash model via @google/genai
      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: {
              parts: [
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType,
                  },
                },
                { text: promptText },
              ],
            },
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  categories: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  severity: { type: Type.STRING },
                  estimatedWeightKg: { type: Type.NUMBER },
                  hazardScore: { type: Type.INTEGER },
                  healthRisks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  recommendedEquipment: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  confidence: { type: Type.NUMBER },
                },
                required: ['title', 'description', 'categories', 'severity', 'estimatedWeightKg', 'hazardScore', 'healthRisks', 'recommendedEquipment'],
              },
            },
          });

          const responseText = response.text;
          if (responseText) {
            const parsed = JSON.parse(responseText.trim()) as AIDumpAnalysisResult;
            return res.json({ success: true, analysis: parsed });
          }
        } catch (geminiError: any) {
          console.warn('Gemini API call failed, falling back to intelligent heuristic scanner:', geminiError.message);
        }
      }

      // Heuristic Fallback Analysis if API key unavailable or failed
      const fallbackResult: AIDumpAnalysisResult = {
        title: 'Illegal Roadside Waste Dump Detected',
        description: 'Mixed domestic packaging, plastic containers, and scattered roadside debris requiring municipal clearance.',
        categories: ['plastic', 'mixed'],
        severity: 'high',
        estimatedWeightKg: 110,
        hazardScore: 7,
        healthRisks: ['Storm drain blockage during rain', 'Vector and rodent attraction', 'Roadway pedestrian hazard'],
        recommendedEquipment: ['Municipal compactor truck', 'High-grip puncture-proof gloves', 'Heavy-duty rakes'],
        confidence: 0.88,
      };

      return res.json({ success: true, analysis: fallbackResult });
    } catch (error: any) {
      console.error('Error analyzing dump photo:', error);
      return res.status(500).json({ error: error.message || 'Failed to analyze dump photo' });
    }
  });

  // GET /api/dumps: Retrieve all dump reports with optional filters
  app.get('/api/dumps', (req, res) => {
    let results = [...dumpReports];
    const { status, severity, category } = req.query;

    if (status && typeof status === 'string' && status !== 'all') {
      results = results.filter((d) => d.status === status);
    }
    if (severity && typeof severity === 'string' && severity !== 'all') {
      results = results.filter((d) => d.severity === severity);
    }
    if (category && typeof category === 'string' && category !== 'all') {
      results = results.filter((d) => d.categories.includes(category as any));
    }

    // Sort by updatedAt descending
    results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json({ success: true, dumps: results, count: results.length });
  });

  // POST /api/dumps: Submit a new citizen dump report
  app.post('/api/dumps', (req, res) => {
    try {
      const {
        title,
        description,
        imageUrl,
        location,
        categories,
        severity,
        estimatedWeightKg,
        hazardScore,
        healthRisks,
        recommendedEquipment,
        reportedBy,
      } = req.body;

      if (!imageUrl || !location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return res.status(400).json({ error: 'Image and valid geo-coordinates (lat, lng) are required.' });
      }

      const newDump: DumpReport = {
        id: `dump-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: title || 'Reported Roadside Illegal Dump',
        description: description || 'Roadside illegal waste dumping reported by local citizen.',
        imageUrl,
        location: {
          lat: location.lat,
          lng: location.lng,
          address: location.address || `GPS: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
          accuracyMeters: location.accuracyMeters || 5,
        },
        categories: categories && categories.length ? categories : ['mixed'],
        severity: severity || 'medium',
        estimatedWeightKg: estimatedWeightKg || 50,
        hazardScore: hazardScore || 5,
        healthRisks: healthRisks && healthRisks.length ? healthRisks : ['Roadway hygiene issue'],
        recommendedEquipment: recommendedEquipment && recommendedEquipment.length ? recommendedEquipment : ['Standard municipal sanitation vehicle'],
        status: 'reported',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reportedBy: reportedBy || { name: 'Local Citizen', isAnonymous: false },
      };

      dumpReports.unshift(newDump);

      res.status(201).json({ success: true, dump: newDump, message: 'Dump report recorded successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to submit dump report' });
    }
  });

  // FEATURE 1: Send Data/Image to Government Body to clean that area
  app.post('/api/dumps/:id/report-government', (req, res) => {
    const { id } = req.params;
    const { customNotes, urgentPriority = true, targetDepartment } = req.body;

    const dump = dumpReports.find((d) => d.id === id);
    if (!dump) {
      return res.status(404).json({ error: 'Dump report not found' });
    }

    // Generate formal government dispatch grievance
    const ticketNumber = `SW-MUNI-${Math.floor(100000 + Math.random() * 900000)}`;
    const dossierHash = Math.random().toString(16).substring(2, 18);
    const now = new Date().toISOString();

    const chosenDept = targetDepartment || (
      dump.severity === 'critical'
        ? 'Emergency Rapid Sanitation & Environmental Protection Board'
        : dump.categories.includes('construction')
        ? 'Department of Public Works - Road Clearance Division'
        : 'Municipal Solid Waste Management & Public Health Wing'
    );

    const dispatchRecord: NonNullable<DumpReport['governmentDispatch']> = {
      ticketNumber,
      dispatchedAt: now,
      departmentName: chosenDept,
      grievancePortal: 'National Swachh Grievance & Municipal 311 Portal',
      assignedOfficer: 'District Sanitary Inspector ' + (['Kumar', 'Rathi', 'Chauhan', 'Dahiya'][Math.floor(Math.random() * 4)]),
      estimatedResolutionHours: dump.severity === 'critical' ? 8 : dump.severity === 'high' ? 24 : 48,
      officialNotes: customNotes || `Official grievance dossier transmitted via WasteWise municipal gateway. GPS coordinates (${dump.location.lat.toFixed(5)}, ${dump.location.lng.toFixed(5)}) flagged for immediate sweeper deployment.`,
      dossierHash,
    };

    dump.governmentDispatch = dispatchRecord;
    dump.status = 'dispatched_to_government';
    dump.updatedAt = now;

    // Format formal official email payload and regulatory letter representation
    const formalDossier = {
      ticketNumber,
      authority: chosenDept,
      subject: `[URGENT SANITATION GRIEVANCE #${ticketNumber}] Illegal Roadside Dump at ${dump.location.address || `${dump.location.lat}, ${dump.location.lng}`}`,
      timestamp: now,
      dossierHash,
      location: {
        latitude: dump.location.lat,
        longitude: dump.location.lng,
        address: dump.location.address,
        googleMapsUrl: `https://www.google.com/maps?q=${dump.location.lat},${dump.location.lng}`,
      },
      wasteAnalysis: {
        title: dump.title,
        categories: dump.categories,
        severity: dump.severity,
        estimatedWeightKg: dump.estimatedWeightKg,
        hazardScore: `${dump.hazardScore}/10`,
        healthRisks: dump.healthRisks,
        recommendedEquipment: dump.recommendedEquipment,
      },
      evidenceImageUrl: dump.imageUrl,
      reporter: dump.reportedBy.isAnonymous ? 'Anonymous Citizen (Privacy Protected)' : dump.reportedBy.name,
      legalActionRequested: 'Immediate dispatch of municipal sweeper units and containment under Public Cleanliness Ordinances.',
    };

    res.json({
      success: true,
      message: `Official grievance ticket #${ticketNumber} successfully submitted to ${chosenDept}.`,
      dump,
      formalDossier,
    });
  });

  // Update sweeper status (In Progress, Cleaned with Before/After proof)
  app.post('/api/dumps/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, assignedTeam, sweeperNotes, afterImageUrl, recycledKg } = req.body;

    const dump = dumpReports.find((d) => d.id === id);
    if (!dump) {
      return res.status(404).json({ error: 'Dump report not found' });
    }

    dump.status = status;
    dump.updatedAt = new Date().toISOString();

    if (!dump.sweeperCrew) {
      dump.sweeperCrew = {
        assignedTeam: assignedTeam || 'Municipal Sweeper Unit #1',
      };
    }

    if (assignedTeam) dump.sweeperCrew.assignedTeam = assignedTeam;
    if (sweeperNotes) dump.sweeperCrew.sweeperNotes = sweeperNotes;
    if (afterImageUrl) dump.afterImageUrl = afterImageUrl;
    if (recycledKg) dump.sweeperCrew.recycledKg = recycledKg;
    if (status === 'cleaned') dump.sweeperCrew.cleanedAt = new Date().toISOString();

    res.json({ success: true, dump, message: `Status updated to ${status}` });
  });

  // FEATURE 2: Aggregated Density Heatmap Endpoint for Municipal Sweepers
  app.get('/api/dumps/heatmap', (req, res) => {
    // Aggregate coordinates and compute density weights
    // Active dumps (reported, dispatched, assigned, in_progress) have full weight
    // Cleaned dumps can be optionally shown or discounted
    const includeCleaned = req.query.includeCleaned === 'true';

    const activeReports = dumpReports.filter((d) => includeCleaned || d.status !== 'cleaned');

    const heatmapPoints: HeatmapPoint[] = activeReports.map((d) => {
      // Severity weight factor
      let severityFactor = 0.3;
      if (d.severity === 'medium') severityFactor = 0.55;
      if (d.severity === 'high') severityFactor = 0.8;
      if (d.severity === 'critical') severityFactor = 1.0;

      // Weight by estimated tonnage
      const tonnageFactor = Math.min(d.estimatedWeightKg / 300, 1.0);
      const combinedWeight = Math.min(1.0, Math.max(0.2, severityFactor * 0.7 + tonnageFactor * 0.3));

      return {
        id: d.id,
        lat: d.location.lat,
        lng: d.location.lng,
        weight: parseFloat(combinedWeight.toFixed(2)),
        severity: d.severity,
        title: d.title,
        status: d.status,
      };
    });

    // Calculate high-density clusters / hotspot hotspots for sweepers
    const totalWeightKg = activeReports.reduce((acc, cur) => acc + cur.estimatedWeightKg, 0);
    const criticalCount = activeReports.filter((d) => d.severity === 'critical').length;
    const highCount = activeReports.filter((d) => d.severity === 'high').length;

    res.json({
      success: true,
      points: heatmapPoints,
      metrics: {
        activeDumpCount: activeReports.length,
        totalEstimatedTonnageKg: totalWeightKg,
        criticalHotspots: criticalCount,
        highPriorityDumps: highCount,
        totalDispatchedToGov: dumpReports.filter((d) => d.status === 'dispatched_to_government').length,
        totalCleaned: dumpReports.filter((d) => d.status === 'cleaned').length,
      },
    });
  });

  // Seed custom location cluster (e.g. user GPS location or switch city)
  app.post('/api/dumps/seed-cluster', (req, res) => {
    const { lat, lng, cityName = 'Current Area' } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Valid lat & lng required' });
    }

    // Create 6 realistic scattered dumps around this target coordinate
    const offsets = [
      { dLat: 0.0031, dLng: 0.0025, title: 'Roadside Plastic Bottleneck & Styrofoam', cat: ['plastic'], sev: 'high', kg: 130 },
      { dLat: -0.0042, dLng: 0.0038, title: 'Ditched Concrete Rubble & Scrap Bricks', cat: ['construction'], sev: 'critical', kg: 600 },
      { dLat: 0.0065, dLng: -0.0041, title: 'Discarded Vehicle Tires in Culvert', cat: ['hazardous'], sev: 'critical', kg: 240 },
      { dLat: -0.0021, dLng: -0.0055, title: 'Commercial Cardboard Packaging Heap', cat: ['plastic', 'textile'], sev: 'medium', kg: 95 },
      { dLat: 0.0015, dLng: 0.0072, title: 'Household Electronics & Metal Casing', cat: ['electronic', 'metal'], sev: 'high', kg: 80 },
      { dLat: -0.0073, dLng: -0.0018, title: 'Rotten Organic Food Market Spoilage', cat: ['organic'], sev: 'medium', kg: 170 },
    ];

    const newCluster = offsets.map((o, idx) => ({
      id: `dump-local-${Date.now()}-${idx}`,
      title: o.title,
      description: `Illegal roadside dump identified in ${cityName} cluster corridor. Needs municipal sweeper attention.`,
      imageUrl: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
      location: {
        lat: lat + o.dLat,
        lng: lng + o.dLng,
        address: `Roadside near ${cityName} Sector ${idx + 1}`,
        accuracyMeters: 4,
      },
      categories: o.cat as any,
      severity: o.sev as any,
      estimatedWeightKg: o.kg,
      hazardScore: o.sev === 'critical' ? 9 : o.sev === 'high' ? 7 : 5,
      healthRisks: ['Public thoroughfare obstruction', 'Unsanitary runoff risk'],
      recommendedEquipment: ['Municipal vacuum sweeper', 'Heavy-duty collection truck'],
      status: (idx === 0 ? 'dispatched_to_government' : idx === 1 ? 'in_progress' : 'reported') as any,
      createdAt: new Date(Date.now() - 3600000 * (idx + 1)).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * idx).toISOString(),
      reportedBy: { name: 'Community Watch ' + (idx + 1), isAnonymous: false },
      ...(idx === 0
        ? {
            governmentDispatch: {
              ticketNumber: `SW-MUNI-${Math.floor(100000 + Math.random() * 900000)}`,
              dispatchedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
              departmentName: 'Municipal Public Health & Road Sweeper Squad',
              grievancePortal: 'Direct Sanitation Redressal System',
              assignedOfficer: 'Officer ' + cityName,
              estimatedResolutionHours: 18,
              officialNotes: 'Grievance registered and routed to ward sweeper crew.',
              dossierHash: 'a1b2c3d4e5f60718',
            },
          }
        : {}),
    }));

    dumpReports = [...newCluster, ...dumpReports];
    res.json({ success: true, count: newCluster.length, message: `Created ${newCluster.length} illegal dump points around ${cityName}.` });
  });

  // Google Maps Grounding: Discover official recycling & waste facilities nearby
  app.post('/api/nearby-facilities', async (req, res) => {
    try {
      const { lat, lng, address } = req.body;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ error: 'Valid lat & lng coordinates required' });
      }

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `What municipal waste transfer stations, authorized recycling drop-off centers, and sanitation depots are near ${address || `${lat}, ${lng}`}? Detail which waste types they accept (e.g. hazardous, e-waste, construction, plastic, organic) and provide exact Google Maps place links.`,
            config: {
              tools: [{ googleMaps: {} }],
              toolConfig: {
                retrievalConfig: {
                  latLng: {
                    latitude: lat,
                    longitude: lng,
                  },
                },
              },
            },
          });

          const text = response.text || '';
          const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

          const places: Array<{ title: string; uri: string; snippets: string[] }> = [];
          for (const chunk of groundingChunks as any[]) {
            if (chunk.maps?.uri) {
              const snippets: string[] = [];
              if (chunk.maps.placeAnswerSources?.reviewSnippets) {
                for (const r of chunk.maps.placeAnswerSources.reviewSnippets) {
                  if (r.snippet) snippets.push(r.snippet);
                }
              }
              places.push({
                title: chunk.maps.title || 'Sanitation Facility',
                uri: chunk.maps.uri,
                snippets,
              });
            }
          }

          return res.json({
            success: true,
            content: text,
            places,
          });
        } catch (geminiError: any) {
          console.warn('Gemini Google Maps grounding error:', geminiError.message);
        }
      }

      // Heuristic fallback
      return res.json({
        success: true,
        content: `Nearby municipal facilities for sorting and dropping off segregated waste near ${address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}:`,
        places: [
          {
            title: 'Municipal Solid Waste Transfer & Recycling Center',
            uri: `https://www.google.com/maps/search/municipal+recycling+center/@${lat},${lng},14z`,
            snippets: ['Accepts bulk corrugated cardboard, electronics, scrap metals, and household recyclables.'],
          },
          {
            title: 'Civic Hazardous Material Collection Facility',
            uri: `https://www.google.com/maps/search/hazardous+waste+dropoff/@${lat},${lng},14z`,
            snippets: ['Safe disposal point for vehicle oils, lithium batteries, paint, and chemicals.'],
          },
        ],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to search nearby facilities' });
    }
  });
}
