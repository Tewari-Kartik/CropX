import pool from './pool.js';

export async function initDb() {
  try {
    console.log('🔄 Checking database schema and seed data...');

    // 1. Create tables if not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS regions (
        region_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        village_name VARCHAR(100) NOT NULL,
        district VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS farmers (
        farmer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(150) NOT NULL,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        preferred_language VARCHAR(10) DEFAULT 'en',
        region_id UUID REFERENCES regions(region_id) ON DELETE SET NULL,
        land_size_acres NUMERIC(6, 2) DEFAULT 2.5,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crops (
        crop_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        farmer_id UUID REFERENCES farmers(farmer_id) ON DELETE CASCADE,
        crop_name VARCHAR(100) NOT NULL,
        sowing_date DATE NOT NULL,
        irrigation_type VARCHAR(50) DEFAULT 'rainfed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS loans (
        loan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        farmer_id UUID REFERENCES farmers(farmer_id) ON DELETE CASCADE,
        amount NUMERIC(12, 2) NOT NULL,
        interest_rate NUMERIC(5, 2) DEFAULT 7.0,
        overdue_months INT DEFAULT 0,
        lender_type VARCHAR(50) DEFAULT 'bank',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS distress_scores (
        score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        farmer_id UUID REFERENCES farmers(farmer_id) ON DELETE CASCADE,
        risk_score NUMERIC(5, 2) NOT NULL,
        risk_band VARCHAR(20) NOT NULL,
        contributing_factors JSONB,
        computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS alerts (
        alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        farmer_id UUID REFERENCES farmers(farmer_id) ON DELETE CASCADE,
        score_id UUID REFERENCES distress_scores(score_id) ON DELETE SET NULL,
        alert_type VARCHAR(50) DEFAULT 'distress',
        channel VARCHAR(50) DEFAULT 'sms',
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS weather_data (
        weather_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        region_id UUID REFERENCES regions(region_id) ON DELETE CASCADE,
        record_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        temperature_c NUMERIC(5, 2),
        humidity_pct NUMERIC(5, 2),
        rainfall_mm NUMERIC(6, 2) DEFAULT 0,
        forecast_summary VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS market_prices (
        price_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        crop_id UUID REFERENCES crops(crop_id) ON DELETE CASCADE,
        mandi_name VARCHAR(100),
        price_date DATE DEFAULT CURRENT_DATE,
        price_per_quintal NUMERIC(10, 2),
        trend VARCHAR(20) DEFAULT 'stable'
      );
    `);

    // 2. Check if farmers table has rows; if empty, seed demo farmers with distress scores
    const countRes = await pool.query('SELECT COUNT(*) FROM farmers');
    const count = parseInt(countRes.rows[0].count, 10);

    if (count === 0) {
      console.log('🌱 Seeding initial high-risk farmers and distress scores...');

      const demoSeeds = [
        {
          name: 'Sunita Devi',
          phone: '+919876543211',
          lang: 'hi',
          village: 'Dumdum',
          district: 'North 24 Parganas',
          state: 'West Bengal',
          acres: 2.2,
          crop: 'Rice (Paddy)',
          sowingDaysAgo: 65,
          score: 92.1,
          band: 'critical',
          alertStatus: 'pending',
          alertType: 'distress',
        },
        {
          name: 'Priya Sharma',
          phone: '+919876543213',
          lang: 'hi',
          village: 'Barrackpore',
          district: 'North 24 Parganas',
          state: 'West Bengal',
          acres: 1.8,
          crop: 'Wheat',
          sowingDaysAgo: 45,
          score: 88.7,
          band: 'critical',
          alertStatus: 'acknowledged',
          alertType: 'distress',
        },
        {
          name: 'Ramesh Kumar',
          phone: '+919876543210',
          lang: 'en',
          village: 'Barrackpore',
          district: 'North 24 Parganas',
          state: 'West Bengal',
          acres: 3.5,
          crop: 'Rice (Basmati)',
          sowingDaysAgo: 70,
          score: 78.4,
          band: 'high',
          alertStatus: 'pending',
          alertType: 'distress',
        },
        {
          name: 'Vikram Yadav',
          phone: '+919876543214',
          lang: 'hi',
          village: 'Habra',
          district: 'North 24 Parganas',
          state: 'West Bengal',
          acres: 4.0,
          crop: 'Tomato',
          sowingDaysAgo: 30,
          score: 71.0,
          band: 'high',
          alertStatus: 'pending',
          alertType: 'market',
        },
        {
          name: 'Manoj Singh',
          phone: '+919876543212',
          lang: 'hi',
          village: 'Kalyani',
          district: 'Nadia',
          state: 'West Bengal',
          acres: 2.8,
          crop: 'Wheat',
          sowingDaysAgo: 50,
          score: 65.2,
          band: 'high',
          alertStatus: 'sent',
          alertType: 'weather',
        },
        {
          name: 'Lakshmi Bai',
          phone: '+919876543215',
          lang: 'hi',
          village: 'Kalyani',
          district: 'Nadia',
          state: 'West Bengal',
          acres: 1.5,
          crop: 'Onion',
          sowingDaysAgo: 40,
          score: 55.3,
          band: 'medium',
          alertStatus: 'sent',
          alertType: 'weather',
        },
      ];

      for (const s of demoSeeds) {
        // Insert Region
        const regRes = await pool.query(
          `INSERT INTO regions (village_name, district, state)
           VALUES ($1, $2, $3)
           RETURNING region_id`,
          [s.village, s.district, s.state]
        );
        const regionId = regRes.rows[0].region_id;

        // Insert Farmer
        const farRes = await pool.query(
          `INSERT INTO farmers (full_name, phone_number, preferred_language, region_id, land_size_acres)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING farmer_id`,
          [s.name, s.phone, s.lang, regionId, s.acres]
        );
        const farmerId = farRes.rows[0].farmer_id;

        // Insert Crop
        const sowingDate = new Date();
        sowingDate.setDate(sowingDate.getDate() - s.sowingDaysAgo);
        await pool.query(
          `INSERT INTO crops (farmer_id, crop_name, sowing_date, irrigation_type)
           VALUES ($1, $2, $3, 'rainfed')`,
          [farmerId, s.crop, sowingDate.toISOString().split('T')[0]]
        );

        // Insert Distress Score
        const scoreRes = await pool.query(
          `INSERT INTO distress_scores (farmer_id, risk_score, risk_band, contributing_factors)
           VALUES ($1, $2, $3, $4)
           RETURNING score_id`,
          [
            farmerId,
            s.score,
            s.band,
            JSON.stringify([
              'Rainfall deficit > 40%',
              'Market price crash vs MSP',
              'High debt-to-income ratio',
            ]),
          ]
        );
        const scoreId = scoreRes.rows[0].score_id;

        // Insert Alert
        await pool.query(
          `INSERT INTO alerts (farmer_id, score_id, alert_type, channel, status)
           VALUES ($1, $2, $3, 'sms', $4)`,
          [farmerId, scoreId, s.alertType, s.alertStatus]
        );
      }
      console.log('✅ Seeding completed: 6 high-risk demo farmers inserted.');
    }
  } catch (err) {
    console.warn('⚠️  Database initialization warning:', err.message);
  }
}
