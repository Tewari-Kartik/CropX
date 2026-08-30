"""
CropX Advisory Engine — Text Generator
Template-based advisory text generation with multi-language support.

Each template is a parameterized string keyed by (action, language).
The generator concatenates all applicable fragments into a coherent advisory.
"""

from __future__ import annotations

import logging

from app.config import DEFAULT_LANGUAGE

logger = logging.getLogger("advisory-engine.text_gen")


# ── Templates ─────────────────────────────────────────────────────────────────
# Key: (action, lang) → template string with {param} placeholders.
# Every action MUST have at least an "en" and "hi" template.

TEMPLATES: dict[tuple[str, str], str] = {
    # ── Weather ───────────────────────────────────────────────────────────────
    # Skip irrigation due to rain
    ("skip_irrigation", "en"): (
        "Delay irrigation for {crop_name} by 2 days due to expected rainfall "
        "({rainfall_mm} mm around {rain_date}). Soil moisture should be adequate."
    ),
    ("skip_irrigation", "hi"): (
        "{rain_date} के आसपास अपेक्षित बारिश ({rainfall_mm} मिमी) के कारण "
        "{crop_name} की सिंचाई 2 दिन के लिए टालें। मिट्टी की नमी पर्याप्त रहेगी।"
    ),

    # Heat stress
    ("heat_stress", "en"): (
        "High temperature alert ({temperature_c}°C detected). Apply mulch around "
        "{crop_name} to retain soil moisture. Consider shade nets if available. "
        "Irrigate during early morning or late evening to reduce evaporation."
    ),
    ("heat_stress", "hi"): (
        "उच्च तापमान चेतावनी ({temperature_c}°C)। {crop_name} के चारों ओर मल्च "
        "बिछाएं। छाया जाल का उपयोग करें। वाष्पीकरण कम करने के लिए सुबह जल्दी "
        "या शाम को सिंचाई करें।"
    ),

    # Frost risk
    ("frost_risk", "en"): (
        "Frost risk detected — temperature may drop to {temperature_c}°C. Cover "
        "{crop_name} with protective sheets or straw mulch. Avoid irrigation "
        "in the evening to prevent ice formation on leaves."
    ),
    ("frost_risk", "hi"): (
        "पाला पड़ने का खतरा — तापमान {temperature_c}°C तक गिर सकता है। "
        "{crop_name} को सुरक्षात्मक शीट या पुआल से ढकें। शाम को सिंचाई से बचें।"
    ),

    # Drought
    ("drought", "en"): (
        "Drought conditions detected — total rainfall is only {total_rainfall_mm} mm. "
        "Increase irrigation frequency for {crop_name}. Consider supplemental "
        "watering if using {irrigation_type} irrigation."
    ),
    ("drought", "hi"): (
        "सूखे की स्थिति — कुल बारिश केवल {total_rainfall_mm} मिमी। "
        "{crop_name} के लिए सिंचाई बढ़ाएं। {irrigation_type} सिंचाई में "
        "अतिरिक्त पानी पर विचार करें।"
    ),

    # High humidity
    ("high_humidity", "en"): (
        "Humidity is very high ({humidity_pct}%). Watch for fungal infections "
        "on {crop_name}. Spray Mancozeb 2.5g/litre preventively. "
        "Ensure proper spacing for air circulation."
    ),
    ("high_humidity", "hi"): (
        "नमी बहुत अधिक है ({humidity_pct}%)। {crop_name} पर फफूंद संक्रमण "
        "की निगरानी करें। मैन्कोज़ेब 2.5 ग्राम/लीटर का रोकथाम छिड़काव करें। "
        "हवा के संचार के लिए उचित दूरी बनाए रखें।"
    ),

    # ── Crop stage ────────────────────────────────────────────────────────────
    ("seedling_care", "en"): (
        "{crop_name} is in seedling stage. Ensure adequate moisture but avoid "
        "waterlogging. Apply starter fertilizer (DAP 25 kg/acre). Watch for "
        "damping-off disease and cutworm damage."
    ),
    ("seedling_care", "hi"): (
        "{crop_name} अंकुर अवस्था में है। पर्याप्त नमी सुनिश्चित करें लेकिन "
        "जलभराव से बचें। DAP 25 किग्रा/एकड़ डालें। आर्द्रगलन रोग और "
        "कटवर्म की निगरानी करें।"
    ),

    ("vegetative_nutrition", "en"): (
        "{crop_name} is in vegetative growth phase. Apply urea at 50 kg/acre "
        "for nitrogen boost. Monitor for leaf-eating pests. Maintain consistent "
        "soil moisture for optimal growth."
    ),
    ("vegetative_nutrition", "hi"): (
        "{crop_name} वानस्पतिक वृद्धि चरण में है। नाइट्रोजन के लिए यूरिया "
        "50 किग्रा/एकड़ डालें। पत्ती खाने वाले कीटों की निगरानी करें। "
        "अच्छी वृद्धि के लिए मिट्टी की नमी बनाए रखें।"
    ),

    ("flowering_care", "en"): (
        "{crop_name} is in flowering stage — critical for yield. Apply "
        "potassium-based fertilizer (MOP 25 kg/acre). Avoid excess nitrogen. "
        "Do not spray harsh pesticides — use bio-agents if pest pressure is high."
    ),
    ("flowering_care", "hi"): (
        "{crop_name} फूल आने की अवस्था में है — उपज के लिए महत्वपूर्ण। "
        "पोटाश उर्वरक (MOP 25 किग्रा/एकड़) डालें। अधिक नाइट्रोजन से बचें। "
        "कठोर कीटनाशकों का छिड़काव न करें — जैव-एजेंट का उपयोग करें।"
    ),

    ("harvest_readiness", "en"): (
        "{crop_name} is approaching harvest stage. Check grain moisture content "
        "before harvesting (ideal: 14-16%). Arrange storage and transport. "
        "Stop all irrigation 7-10 days before expected harvest date."
    ),
    ("harvest_readiness", "hi"): (
        "{crop_name} कटाई के चरण में है। कटाई से पहले अनाज की नमी जांचें "
        "(आदर्श: 14-16%)। भंडारण और परिवहन की व्यवस्था करें। अपेक्षित "
        "कटाई तिथि से 7-10 दिन पहले सिंचाई बंद करें।"
    ),

    # ── Market ────────────────────────────────────────────────────────────────
    ("price_falling", "en"): (
        "Market prices for {crop_name} are declining (₹{price} per quintal at "
        "{mandi_name}). Consider holding your produce in storage for 2-3 weeks "
        "or explore alternative mandis for better prices."
    ),
    ("price_falling", "hi"): (
        "{crop_name} के बाजार भाव गिर रहे हैं ({mandi_name} में ₹{price} "
        "प्रति क्विंटल)। 2-3 सप्ताह भंडारण में रखने पर विचार करें या बेहतर "
        "भाव के लिए अन्य मंडियों की जांच करें।"
    ),

    ("price_rising", "en"): (
        "Good news — market prices for {crop_name} are trending upward "
        "(₹{price}/quintal at {mandi_name}). Consider selling soon to "
        "capitalise on favorable rates."
    ),
    ("price_rising", "hi"): (
        "अच्छी खबर — {crop_name} के बाजार भाव बढ़ रहे हैं ({mandi_name} में "
        "₹{price}/क्विंटल)। अनुकूल दरों का लाभ उठाने के लिए जल्द बेचने पर "
        "विचार करें।"
    ),

    # ── Irrigation ────────────────────────────────────────────────────────────
    ("rainfed_supplement", "en"): (
        "{crop_name} relies on rainfed irrigation but no rain is expected. "
        "Arrange supplemental watering during the {growth_stage} stage to "
        "prevent crop stress."
    ),
    ("rainfed_supplement", "hi"): (
        "{crop_name} वर्षा आधारित सिंचाई पर निर्भर है लेकिन बारिश की "
        "संभावना नहीं है। {growth_stage} अवस्था में अतिरिक्त पानी की "
        "व्यवस्था करें।"
    ),

    ("irrigated_skip", "en"): (
        "Rain is expected — skip scheduled irrigation for {crop_name} for "
        "the next {days} days. Monitor soil moisture before resuming."
    ),
    ("irrigated_skip", "hi"): (
        "बारिश की संभावना है — अगले {days} दिनों के लिए {crop_name} की "
        "निर्धारित सिंचाई रोकें। फिर से शुरू करने से पहले मिट्टी की नमी जांचें।"
    ),

    ("irrigated_increase", "en"): (
        "High temperatures detected. Increase irrigation frequency for "
        "{crop_name}. Water in early morning to minimise evaporation losses."
    ),
    ("irrigated_increase", "hi"): (
        "उच्च तापमान का पता चला। {crop_name} के लिए सिंचाई बढ़ाएं। "
        "वाष्पीकरण कम करने के लिए सुबह जल्दी सिंचाई करें।"
    ),

    ("drip_reduce", "en"): (
        "Rain forecast — reduce drip irrigation flow for {crop_name} by 50% "
        "for the next {days} day(s) to avoid over-watering."
    ),
    ("drip_reduce", "hi"): (
        "बारिश का पूर्वानुमान — अगले {days} दिनों के लिए {crop_name} की "
        "ड्रिप सिंचाई 50% कम करें।"
    ),

    ("drip_increase", "en"): (
        "High heat detected. Increase drip irrigation duration for {crop_name} "
        "by 30 minutes per cycle. Check emitters for clogging."
    ),
    ("drip_increase", "hi"): (
        "अधिक गर्मी है। {crop_name} की ड्रिप सिंचाई प्रति चक्र 30 मिनट "
        "बढ़ाएं। एमिटर में रुकावट की जांच करें।"
    ),
}

# ── Fallback template for any unmatched action ────────────────────────────────
FALLBACK_TEMPLATES: dict[str, str] = {
    "en": "Advisory for {crop_name}: Please consult your local agricultural officer for specific guidance.",
    "hi": "{crop_name} के लिए सलाह: विशेष मार्गदर्शन के लिए अपने स्थानीय कृषि अधिकारी से संपर्क करें।",
}


def render_advisory(
    fragments: list[dict],
    lang: str = "en",
    crop_name: str = "your crop",
) -> str:
    """
    Render a list of advisory fragments into a single advisory text string.

    Parameters
    ----------
    fragments : list[dict]
        Each dict has keys: category, action, params.
    lang : str
        ISO 639-1 language code. Falls back to DEFAULT_LANGUAGE, then "en".
    crop_name : str
        Default crop name if not present in params.

    Returns
    -------
    str
        Combined advisory text with sentences separated by spaces.
    """
    if not fragments:
        # Default advisory when no rules triggered
        fallback = FALLBACK_TEMPLATES.get(lang, FALLBACK_TEMPLATES["en"])
        return fallback.format(crop_name=crop_name)

    effective_lang = lang if lang in ("en", "hi") else DEFAULT_LANGUAGE

    sentences: list[str] = []
    for frag in fragments:
        action = frag["action"]
        params = frag.get("params", {})

        # Ensure crop_name is always available
        if "crop_name" not in params:
            params["crop_name"] = crop_name

        template_key = (action, effective_lang)
        template = TEMPLATES.get(template_key)

        if template is None:
            # Try English fallback
            template = TEMPLATES.get((action, "en"))
        if template is None:
            # Last resort
            template = FALLBACK_TEMPLATES.get(effective_lang, FALLBACK_TEMPLATES["en"])

        try:
            rendered = template.format(**params)
        except KeyError as e:
            logger.warning("Missing template param %s for action=%s", e, action)
            rendered = template  # use un-interpolated template as-is

        sentences.append(rendered)

    return " ".join(sentences)
