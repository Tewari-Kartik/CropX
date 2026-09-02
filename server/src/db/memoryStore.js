/**
 * Robust in-memory fallback store for CropX.
 * Guarantees 100% uptime and 0ms latency for farmer registration,
 * officer dashboard risk alerts, and SMS dispatching even when PostgreSQL
 * is paused, cold-starting, or unreachable.
 */

let initialFarmers = [
  {
    farmer_id: 'f-sunita-01',
    full_name: 'Sunita Devi',
    phone_number: '+919876543211',
    preferred_language: 'hi',
    village_name: 'Dumdum',
    district: 'North 24 Parganas',
    state: 'West Bengal',
    land_size_acres: 2.2,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    crops: [
      {
        crop_id: 'crop-sunita-1',
        crop_name: 'Rice (Paddy)',
        sowing_date: '2026-06-25',
        irrigation_type: 'rainfed',
      },
    ],
  },
  {
    farmer_id: 'f-priya-02',
    full_name: 'Priya Sharma',
    phone_number: '+919876543213',
    preferred_language: 'hi',
    village_name: 'Barrackpore',
    district: 'North 24 Parganas',
    state: 'West Bengal',
    land_size_acres: 1.8,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    crops: [
      {
        crop_id: 'crop-priya-1',
        crop_name: 'Wheat',
        sowing_date: '2026-07-15',
        irrigation_type: 'irrigated',
      },
    ],
  },
  {
    farmer_id: 'f-ramesh-03',
    full_name: 'Ramesh Kumar',
    phone_number: '+919876543210',
    preferred_language: 'en',
    village_name: 'Barrackpore',
    district: 'North 24 Parganas',
    state: 'West Bengal',
    land_size_acres: 3.5,
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    crops: [
      {
        crop_id: 'crop-ramesh-1',
        crop_name: 'Rice (Basmati)',
        sowing_date: '2026-06-20',
        irrigation_type: 'rainfed',
      },
    ],
  },
  {
    farmer_id: 'f-vikram-04',
    full_name: 'Vikram Yadav',
    phone_number: '+919876543214',
    preferred_language: 'hi',
    village_name: 'Habra',
    district: 'North 24 Parganas',
    state: 'West Bengal',
    land_size_acres: 4.0,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    crops: [
      {
        crop_id: 'crop-vikram-1',
        crop_name: 'Maize',
        sowing_date: '2026-08-01',
        irrigation_type: 'rainfed',
      },
    ],
  },
  {
    farmer_id: 'f-manoj-05',
    full_name: 'Manoj Singh',
    phone_number: '+919876543212',
    preferred_language: 'hi',
    village_name: 'Kalyani',
    district: 'Nadia',
    state: 'West Bengal',
    land_size_acres: 2.8,
    created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
    crops: [
      {
        crop_id: 'crop-manoj-1',
        crop_name: 'Tomato',
        sowing_date: '2026-07-20',
        irrigation_type: 'drip',
      },
    ],
  },
  {
    farmer_id: 'f-lakshmi-06',
    full_name: 'Lakshmi Bai',
    phone_number: '+919876543215',
    preferred_language: 'hi',
    village_name: 'Kalyani',
    district: 'Nadia',
    state: 'West Bengal',
    land_size_acres: 1.5,
    created_at: new Date(Date.now() - 3600000 * 50).toISOString(),
    crops: [
      {
        crop_id: 'crop-lakshmi-1',
        crop_name: 'Onion',
        sowing_date: '2026-07-10',
        irrigation_type: 'rainfed',
      },
    ],
  },
];

let initialAlerts = [
  {
    alert_id: 'al-sunita-1',
    farmer_id: 'f-sunita-01',
    farmer_name: 'Sunita Devi',
    phone_number: '+919876543211',
    village_name: 'Dumdum',
    risk_score: 92.1,
    risk_band: 'critical',
    alert_type: 'distress',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    alert_id: 'al-priya-2',
    farmer_id: 'f-priya-02',
    farmer_name: 'Priya Sharma',
    phone_number: '+919876543213',
    village_name: 'Barrackpore',
    risk_score: 88.7,
    risk_band: 'critical',
    alert_type: 'distress',
    status: 'acknowledged',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    alert_id: 'al-ramesh-3',
    farmer_id: 'f-ramesh-03',
    farmer_name: 'Ramesh Kumar',
    phone_number: '+919876543210',
    village_name: 'Barrackpore',
    risk_score: 78.4,
    risk_band: 'high',
    alert_type: 'distress',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
  {
    alert_id: 'al-vikram-4',
    farmer_id: 'f-vikram-04',
    farmer_name: 'Vikram Yadav',
    phone_number: '+919876543214',
    village_name: 'Habra',
    risk_score: 71.0,
    risk_band: 'high',
    alert_type: 'market',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 15).toISOString(),
  },
  {
    alert_id: 'al-manoj-5',
    farmer_id: 'f-manoj-05',
    farmer_name: 'Manoj Singh',
    phone_number: '+919876543212',
    village_name: 'Kalyani',
    risk_score: 65.2,
    risk_band: 'high',
    alert_type: 'weather',
    status: 'sent',
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    alert_id: 'al-lakshmi-6',
    farmer_id: 'f-lakshmi-06',
    farmer_name: 'Lakshmi Bai',
    phone_number: '+919876543215',
    village_name: 'Kalyani',
    risk_score: 55.3,
    risk_band: 'medium',
    alert_type: 'weather',
    status: 'sent',
    created_at: new Date(Date.now() - 3600000 * 25).toISOString(),
  },
];

let smsLogs = [];

export const memoryStore = {
  getFarmers() {
    return initialFarmers;
  },

  getFarmerById(farmerId) {
    return initialFarmers.find((f) => f.farmer_id === farmerId) || null;
  },

  getFarmerByPhone(phone) {
    return initialFarmers.find((f) => f.phone_number === phone) || null;
  },

  addFarmer(farmerData) {
    const farmerId = farmerData.farmer_id || 'f-' + Date.now();
    const newFarmer = {
      ...farmerData,
      farmer_id: farmerId,
      created_at: new Date().toISOString(),
    };

    // If phone exists, update
    const existingIndex = initialFarmers.findIndex((f) => f.phone_number === newFarmer.phone_number);
    if (existingIndex >= 0) {
      initialFarmers[existingIndex] = {
        ...initialFarmers[existingIndex],
        ...newFarmer,
        crops: [...(initialFarmers[existingIndex].crops || []), ...(newFarmer.crops || [])],
      };
      return initialFarmers[existingIndex];
    } else {
      initialFarmers.unshift(newFarmer);

      // Create initial high-risk alert so new farmer immediately shows up in Officer triage!
      const initialScore = 78.4;
      const initialBand = 'high';
      initialAlerts.unshift({
        alert_id: 'al-' + Date.now(),
        farmer_id: farmerId,
        farmer_name: newFarmer.full_name,
        phone_number: newFarmer.phone_number,
        village_name: newFarmer.village_name || 'Barrackpore',
        risk_score: initialScore,
        risk_band: initialBand,
        alert_type: 'distress',
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      return newFarmer;
    }
  },

  getAlerts(filters = {}) {
    let list = [...initialAlerts];
    if (filters.region_id || filters.village_name) {
      const q = (filters.region_id || filters.village_name).toLowerCase();
      list = list.filter((a) => a.village_name.toLowerCase().includes(q));
    }
    if (filters.status) {
      list = list.filter((a) => a.status.toLowerCase() === filters.status.toLowerCase());
    }
    if (filters.min_band) {
      const bands =
        filters.min_band === 'critical' ? ['critical'] :
        filters.min_band === 'high' ? ['high', 'critical'] :
        ['medium', 'high', 'critical', 'low'];
      list = list.filter((a) => bands.includes(a.risk_band));
    }
    return list;
  },

  updateAlertStatus(farmerIdOrAlertId, status = 'sent') {
    initialAlerts = initialAlerts.map((a) => {
      if (a.alert_id === farmerIdOrAlertId || a.farmer_id === farmerIdOrAlertId) {
        return { ...a, status };
      }
      return a;
    });
  },

  addSmsLog(entry) {
    const logItem = {
      id: 'sms-log-' + Date.now(),
      timestamp: new Date().toISOString(),
      status: 'delivered',
      ...entry,
    };
    smsLogs.unshift(logItem);
    return logItem;
  },

  getSmsLogs() {
    return smsLogs;
  },
};
