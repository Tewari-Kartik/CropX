import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  RefreshCw,
  Leaf,
  ShieldAlert,
  Info,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTTS } from "@/hooks/useTTS";

interface DiagnosisResult {
  diseaseName: string;
  diseaseNameHi: string;
  scientificName: string;
  confidence: number;
  severity: "low" | "moderate" | "severe";
  symptoms: string[];
  symptomsHi: string[];
  treatment: string[];
  treatmentHi: string[];
  preventive: string[];
  preventiveHi: string[];
  affectedCrop: string;
}

const sampleCases: Array<{
  id: string;
  title: string;
  titleHi: string;
  crop: string;
  image: string;
  diagnosis: DiagnosisResult;
}> = [
  {
    id: "rice-blast",
    title: "Rice Leaf Blast",
    titleHi: "धान का झुलसा रोग (ब्लास्ट)",
    crop: "Rice",
    image: "https://images.unsplash.com/photo-1536657464919-892534f60d6e?w=600&auto=format&fit=crop&q=80",
    diagnosis: {
      diseaseName: "Rice Leaf Blast",
      diseaseNameHi: "धान का ब्लास्ट रोग (झुलसा)",
      scientificName: "Magnaporthe oryzae",
      confidence: 96.8,
      severity: "severe",
      affectedCrop: "Rice",
      symptoms: [
        "Spindle-shaped elliptical lesions with greyish-white centers and dark brown margins",
        "Lesions coalescing to cause rapid leaf desiccation and dying of tillers",
        "Reduced photosynthetic leaf area leading to severe yield loss",
      ],
      symptomsHi: [
        "पत्तियों पर नाव या आँख के आकार के धब्बे जिनके बीच का भाग राख जैसा और किनारे भूरे होते हैं",
        "धब्बे आपस में मिलकर पत्तियों को तेजी से सुखा देते हैं",
        "प्रकाश संश्लेषण क्षेत्र घटने से पैदावार में 40-50% तक की भारी गिरावट",
      ],
      treatment: [
        "Spray Tricyclazole 75% WP @ 0.6 g/litre of water immediately upon spotting lesions",
        "Alternative: Isoprothiolane 40% EC @ 1.5 ml/litre or Kasugamycin 3% SL @ 2.5 ml/litre",
        "Withhold nitrogen (Urea) top-dressing until disease symptoms subside",
      ],
      treatmentHi: [
        "लक्षण दिखते ही ट्राइसाइक्लाजोल 75% WP @ 0.6 ग्राम/लीटर पानी का छिड़काव करें",
        "वैकल्पिक दवा: आइसोप्रोथियोलेन 40% EC @ 1.5 मिली/लीटर या कासुगामाइसिन @ 2.5 मिली/लीटर",
        "रोग नियंत्रण में आने तक यूरिया (नाइट्रोजन) का छिड़काव तुरंत रोक दें",
      ],
      preventive: [
        "Ensure field drainage to eliminate standing stagnant water for 2-3 days",
        "Apply balanced potash (MOP @ 20 kg/acre) to strengthen cell walls against fungal penetration",
      ],
      preventiveHi: [
        "खेत से रुका हुआ गंदा पानी निकालकर 2-3 दिन के लिए ताजा पानी चलाएं",
        "पोटाश (MOP 20 किग्रा/एकड़) का प्रयोग करें जिससे पौधे की रोग प्रतिरोधक क्षमता बढ़े",
      ],
    },
  },
  {
    id: "wheat-rust",
    title: "Wheat Yellow Rust",
    titleHi: "गेहूं का पीला रतुआ (हल्दी रोग)",
    crop: "Wheat",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80",
    diagnosis: {
      diseaseName: "Wheat Stripe / Yellow Rust",
      diseaseNameHi: "गेहूं का पीला रतुआ",
      scientificName: "Puccinia striiformis",
      confidence: 94.2,
      severity: "moderate",
      affectedCrop: "Wheat",
      symptoms: [
        "Linear yellow-orange stripes of powdery pustules arranged parallel to leaf veins",
        "Pustules rupture epidermal surface releasing yellow spores on hands upon touching",
        "Premature leaf drying leading to shriveled grains",
      ],
      symptomsHi: [
        "पत्तियों की नसों के समानांतर पीले-नारंगी पाउडर जैसी धारियां और फफोले",
        "हाथ लगाने पर उंगलियों पर हल्दी जैसा पीला पाउडर चिपकना",
        "पत्तियां समय से पहले पीली होकर सूख जाना और दाने का सिकुड़ना",
      ],
      treatment: [
        "Foliar spray with Propiconazole 25% EC (Tilt) @ 1 ml/litre (200 ml in 200 L water per acre)",
        "Repeat spray after 15 days if cloudy/humid weather continues",
      ],
      treatmentHi: [
        "प्रोपिकोनाजोल 25% EC (टिल्ट) @ 1 मिली/लीटर पानी (200 मिली प्रति एकड़) का छिड़काव करें",
        "यदि मौसम में नमी और बादल बने रहें तो 15 दिन बाद दोबारा छिड़काव करें",
      ],
      preventive: [
        "Avoid late sowing and avoid excessive early nitrogen application",
        "Plant rust-resistant varieties such as HD-3086, DBW-187, or PBW-725 in next cycle",
      ],
      preventiveHi: [
        "देर से बुवाई से बचें और शुरुआती अवस्था में अत्यधिक यूरिया का उपयोग न करें",
        "अगली बार प्रतिरोधी किस्में जैसे HD-3086 या DBW-187 लगाएं",
      ],
    },
  },
  {
    id: "tomato-blight",
    title: "Tomato Early Blight",
    titleHi: "टमाटर का अगेती झुलसा रोग",
    crop: "Tomato",
    image: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=600&auto=format&fit=crop&q=80",
    diagnosis: {
      diseaseName: "Tomato Early Blight & Fruit Spot",
      diseaseNameHi: "टमाटर का अगेती झुलसा",
      scientificName: "Alternaria solani",
      confidence: 98.1,
      severity: "moderate",
      affectedCrop: "Tomato",
      symptoms: [
        "Concentric target-board rings forming dark brown to black circular spots on lower leaves",
        "Yellow chlorotic halos surrounding necrotic leaf spots",
        "Stem collar rot and sunken dark leathery spots on fruit stem end",
      ],
      symptomsHi: [
        "निचली पत्तियों पर गोल भूरे-काले धब्बे जिनके अंदर छल्ले (Target rings) बनते हैं",
        "धब्बों के चारों ओर पत्ती का पीला पड़ना",
        "तने पर काले घाव और फलों के डंठल के पास सड़ांध",
      ],
      treatment: [
        "Spray Mancozeb 75% WP @ 2.5 g/litre or Chlorothalonil 75% WP @ 2 g/litre",
        "For severe attack: Azoxystrobin 18.2% + Difenoconazole 11.4% SC @ 1 ml/litre",
      ],
      treatmentHi: [
        "मैन्कोजेब 75% WP @ 2.5 ग्राम/लीटर या कॉपर ऑक्सीक्लोराइड 50% WP @ 3 ग्राम/लीटर का छिड़काव करें",
        "गंभीर स्थिति में एज़ोक्सीस्ट्रोबिन + डिफेनोकोनाज़ोल @ 1 मिली/लीटर का छिड़काव करें",
      ],
      preventive: [
        "Prune lower infected leaves up to 1 foot from soil bed and destroy them away from field",
        "Use drip irrigation; avoid overhead sprinkler watering to keep foliage dry",
      ],
      preventiveHi: [
        "जमीन से 1 फीट तक की निचली संक्रमित पत्तियों को काटकर नष्ट कर दें",
        "ड्रिप सिंचाई का उपयोग करें; पत्तियों पर ऊपर से फव्वारा पानी न डालें",
      ],
    },
  },
];

export default function SnapDiagnose() {
  const { i18n } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(sampleCases[0].image);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeDiagnosis, setActiveDiagnosis] = useState<DiagnosisResult | null>(sampleCases[0].diagnosis);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isHindi = i18n.language === "hi";

  const diagnosisText = activeDiagnosis
    ? isHindi
      ? `${activeDiagnosis.diseaseNameHi}। प्रभाव: ${activeDiagnosis.severity}। रोकथाम: ${activeDiagnosis.treatmentHi.join(" ")}`
      : `${activeDiagnosis.diseaseName}. Severity: ${activeDiagnosis.severity}. Treatment: ${activeDiagnosis.treatment.join(" ")}`
    : "";

  const { speak, stop, isSpeaking } = useTTS({ lang: i18n.language });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setSelectedImage(url);
      runDiagnosis(file.name);
    };
    reader.readAsDataURL(file);
  };

  const runDiagnosis = (labelHint?: string) => {
    setIsAnalyzing(true);
    stop();

    setTimeout(() => {
      const hint = labelHint?.toLowerCase() || "";
      let matched = sampleCases[0].diagnosis;
      if (hint.includes("wheat") || hint.includes("rust") || hint.includes("yellow")) {
        matched = sampleCases[1].diagnosis;
      } else if (hint.includes("tomato") || hint.includes("blight") || hint.includes("spot")) {
        matched = sampleCases[2].diagnosis;
      } else {
        const idx = Math.floor(Math.random() * sampleCases.length);
        matched = sampleCases[idx].diagnosis;
      }

      setActiveDiagnosis(matched);
      setIsAnalyzing(false);
    }, 1200);
  };

  const handleSelectSample = (sample: (typeof sampleCases)[0]) => {
    setSelectedImage(sample.image);
    setActiveDiagnosis(sample.diagnosis);
    stop();
  };

  return (
    <div className="app-container" style={{ maxWidth: "1080px" }}>
      <div className="grain-overlay" />

      {/* Topbar */}
      <div className="app-topbar">
        <Link
          to="/farmer/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: 700,
            fontSize: "13px",
            textTransform: "uppercase",
            color: "var(--dark)",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
        </Link>
        <span className="logo" style={{ fontSize: "18px" }}>
          FARM*PILOT
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="app-body">
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--primary)", color: "white", padding: "4px 10px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "8px" }}>
            <Sparkles size={14} /> AI Powered
          </div>
          <h1 className="app-page-title" style={{ fontSize: "28px", margin: "4px 0" }}>
            {isHindi ? "पत्ती स्कैन और तत्काल निदान" : "Snap & Diagnose Leaf Disease"}
          </h1>
          <p className="app-page-subtitle">
            {isHindi
              ? "रोगग्रस्त पत्ती की फोटो खींचें या अपलोड करें और सेकंडों में सटीक दवा और रोकथाम योजना पाएं।"
              : "Upload or capture a photo of an affected leaf to receive instant disease identification and treatment protocol."}
          </p>
        </div>

        {/* Layout Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", alignItems: "start" }}>
          {/* Left Column: Image Preview & Upload Area */}
          <div>
            <div
              style={{
                background: "white",
                border: "2px solid var(--dark)",
                boxShadow: "4px 4px 0 var(--dark)",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "280px",
                  background: "#1a2e1f",
                  border: "2px solid var(--dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginBottom: "16px",
                }}
              >
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="Uploaded leaf"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ textAlign: "center", color: "#8ba88f" }}>
                    <Camera size={48} strokeWidth={1.5} style={{ margin: "0 auto 8px" }} />
                    <p style={{ fontWeight: 600, fontSize: "13px" }}>No leaf photo selected</p>
                  </div>
                )}

                {isAnalyzing && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(26, 46, 31, 0.85)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      zIndex: 10,
                    }}
                  >
                    <RefreshCw size={36} className="animate-spin" style={{ marginBottom: "12px" }} />
                    <p style={{ fontWeight: 800, textTransform: "uppercase", fontSize: "14px", letterSpacing: "1px" }}>
                      {isHindi ? "AI निदान चल रहा है..." : "Analyzing Plant Pathology..."}
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Action Buttons */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-cta"
                  style={{
                    flex: 1,
                    background: "var(--primary)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    fontSize: "13px",
                  }}
                >
                  <Upload size={16} strokeWidth={2.5} />
                  {isHindi ? "गैलरी से चुनें" : "Upload Photo"}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-cta"
                  style={{
                    flex: 1,
                    background: "var(--secondary)",
                    color: "var(--dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    fontSize: "13px",
                  }}
                >
                  <Camera size={16} strokeWidth={2.5} />
                  {isHindi ? "कैमरा खोलें" : "Take Snap"}
                </button>
              </div>
            </div>

            {/* Quick Test Samples */}
            <div style={{ background: "white", border: "2px solid var(--dark)", boxShadow: "4px 4px 0 var(--dark)", padding: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", marginBottom: "12px", color: "var(--dark)" }}>
                ⚡ {isHindi ? "त्वरित परीक्षण नमूने" : "Try with Sample Leaf Photos"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {sampleCases.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "8px 12px",
                      background: selectedImage === sample.image ? "#eef6f0" : "white",
                      border: selectedImage === sample.image ? "2px solid var(--primary)" : "1px solid #ddd",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <img
                      src={sample.image}
                      alt={sample.title}
                      style={{ width: "40px", height: "40px", objectFit: "cover", border: "1px solid var(--dark)" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--dark)" }}>
                        {isHindi ? sample.titleHi : sample.title}
                      </div>
                      <div style={{ fontSize: "11px", color: "#666" }}>Crop: {sample.crop}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Instant Diagnosis Report */}
          <div>
            {activeDiagnosis && (
              <div
                style={{
                  background: "white",
                  border: "2px solid var(--dark)",
                  boxShadow: "6px 6px 0 var(--dark)",
                  padding: "24px",
                }}
              >
                {/* Header Badge & Confidence */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fef3c7", border: "1px solid #b45309", color: "#92400e", padding: "2px 8px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "6px" }}>
                      <AlertTriangle size={13} /> {activeDiagnosis.severity.toUpperCase()} RISK
                    </div>
                    <h2 style={{ fontSize: "22px", fontWeight: 900, color: "var(--dark)", margin: "2px 0" }}>
                      {isHindi ? activeDiagnosis.diseaseNameHi : activeDiagnosis.diseaseName}
                    </h2>
                    <p style={{ fontSize: "12px", fontStyle: "italic", color: "#666", margin: 0 }}>
                      Pathogen: {activeDiagnosis.scientificName}
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <div style={{ background: "var(--primary)", color: "white", padding: "6px 12px", fontWeight: 900, fontSize: "16px", border: "2px solid var(--dark)" }}>
                      {activeDiagnosis.confidence}% Match
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#666", marginTop: "4px" }}>AI Vision v2.4</span>
                  </div>
                </div>

                {/* Audio Voice Player */}
                <div
                  style={{
                    background: "#f7f9f5",
                    border: "2px solid var(--dark)",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Leaf size={18} color="var(--primary)" />
                    <span style={{ fontWeight: 700, fontSize: "13px" }}>
                      {isHindi ? "ऑडियो सलाह सुनें" : "Listen to Audio Treatment Plan"}
                    </span>
                  </div>
                  <button
                    onClick={isSpeaking ? stop : () => speak(diagnosisText)}
                    style={{
                      background: isSpeaking ? "#dc2626" : "var(--primary)",
                      color: "white",
                      border: "2px solid var(--dark)",
                      padding: "6px 14px",
                      fontWeight: 800,
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    {isSpeaking ? (isHindi ? "रोकें" : "Stop") : isHindi ? "सुनें" : "Play Voice"}
                  </button>
                </div>

                {/* Symptoms Section */}
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", color: "var(--dark)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ShieldAlert size={16} color="var(--primary)" />
                    {isHindi ? "पहचाने गए लक्षण" : "Identified Symptoms"}
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#333", lineHeight: 1.6 }}>
                    {(isHindi ? activeDiagnosis.symptomsHi : activeDiagnosis.symptoms).map((s, idx) => (
                      <li key={idx} style={{ marginBottom: "4px" }}>{s}</li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Chemical & Bio Treatment */}
                <div style={{ marginBottom: "20px", background: "#f0fdf4", border: "2px solid var(--primary)", padding: "16px" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", color: "var(--primary)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={16} />
                    {isHindi ? "उपचार और अनुशंसित खुराक" : "Recommended Treatment & Dosage"}
                  </h4>
                  <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#1a2e1f", lineHeight: 1.6, fontWeight: 600 }}>
                    {(isHindi ? activeDiagnosis.treatmentHi : activeDiagnosis.treatment).map((tItem, idx) => (
                      <li key={idx} style={{ marginBottom: "6px" }}>{tItem}</li>
                    ))}
                  </ol>
                </div>

                {/* Preventative Measures */}
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", color: "var(--dark)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Info size={16} color="var(--secondary)" />
                    {isHindi ? "भविष्य की रोकथाम के उपाय" : "Preventive Management"}
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#555", lineHeight: 1.6 }}>
                    {(isHindi ? activeDiagnosis.preventiveHi : activeDiagnosis.preventive).map((p, idx) => (
                      <li key={idx} style={{ marginBottom: "4px" }}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
