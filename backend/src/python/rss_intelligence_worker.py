import json
import re
import sys
import traceback
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from xml.etree import ElementTree as ET

import requests

USER_AGENT = "Geo-Sentinel/1.0 (+RSS intelligence worker)"
REQUEST_TIMEOUT = 12
MAX_RESULTS = 40
MIN_RELEVANCE_SCORE = 0.42
MAX_SELECTED_FEEDS = 12
MAX_REJECTION_SAMPLES = 12

SOURCE_CATALOG = [
    {
        "id": "reuters",
        "source": "Reuters",
        "urls": ["https://feeds.reuters.com/reuters/worldNews"],
        "mediaType": "news-article",
        "country": "United Kingdom",
        "region": "Europe",
        "tier": "top",
        "focus": "international",
        "coverage": ["global", "europe", "north-america", "middle-east", "asia"],
        "categories": ["politics", "economy", "conflict", "diplomacy", "markets"],
        "weight": 1.0,
        "reliabilityScore": 0.95,
    },
    {
        "id": "bbc",
        "source": "BBC",
        "urls": ["http://feeds.bbci.co.uk/news/world/rss.xml"],
        "mediaType": "news-article",
        "country": "United Kingdom",
        "region": "Europe",
        "tier": "top",
        "focus": "international",
        "coverage": ["global", "europe", "asia", "middle-east", "africa"],
        "categories": ["politics", "conflict", "diplomacy", "society"],
        "weight": 0.98,
        "reliabilityScore": 0.93,
    },
    {
        "id": "cnn",
        "source": "CNN",
        "urls": ["http://rss.cnn.com/rss/edition_world.rss"],
        "mediaType": "news-article",
        "country": "United States",
        "region": "North America",
        "tier": "top",
        "focus": "international",
        "coverage": ["global", "north-america", "middle-east", "asia", "europe"],
        "categories": ["politics", "conflict", "diplomacy", "security"],
        "weight": 0.92,
        "reliabilityScore": 0.90,
    },
    {
        "id": "al-jazeera",
        "source": "Al Jazeera",
        "urls": ["https://www.aljazeera.com/xml/rss/all.xml"],
        "mediaType": "news-article",
        "country": "Qatar",
        "region": "Middle East",
        "tier": "top",
        "focus": "international",
        "coverage": ["global", "middle-east", "asia", "africa"],
        "categories": ["politics", "conflict", "diplomacy", "humanitarian"],
        "weight": 0.96,
        "reliabilityScore": 0.91,
    },
    {
        "id": "dw",
        "source": "DW",
        "urls": ["https://rss.dw.com/xml/rss-en-world"],
        "mediaType": "news-article",
        "country": "Germany",
        "region": "Europe",
        "tier": "top",
        "focus": "international",
        "coverage": ["global", "europe", "asia", "middle-east"],
        "categories": ["politics", "economy", "conflict", "diplomacy"],
        "weight": 0.90,
        "reliabilityScore": 0.91,
    },
    {
        "id": "france24",
        "source": "France 24",
        "urls": ["https://www.france24.com/en/rss"],
        "mediaType": "news-article",
        "country": "France",
        "region": "Europe",
        "tier": "top",
        "focus": "international",
        "coverage": ["global", "europe", "africa", "middle-east"],
        "categories": ["politics", "conflict", "diplomacy"],
        "weight": 0.90,
        "reliabilityScore": 0.90,
    },
    {
        "id": "guardian",
        "source": "The Guardian",
        "urls": ["https://www.theguardian.com/world/rss"],
        "mediaType": "news-article",
        "country": "United Kingdom",
        "region": "Europe",
        "tier": "top",
        "focus": "international",
        "coverage": ["global", "europe", "middle-east", "asia", "north-america"],
        "categories": ["politics", "conflict", "climate", "economy"],
        "weight": 0.88,
        "reliabilityScore": 0.90,
    },
    {
        "id": "euronews",
        "source": "Euronews",
        "urls": ["https://www.euronews.com/rss?level=theme&name=news"],
        "mediaType": "news-article",
        "country": "France",
        "region": "Europe",
        "tier": "high",
        "focus": "international",
        "coverage": ["global", "europe"],
        "categories": ["politics", "economy", "conflict"],
        "weight": 0.78,
        "reliabilityScore": 0.86,
    },
    {
        "id": "ndtv",
        "source": "NDTV",
        "urls": ["https://feeds.feedburner.com/ndtvnews-top-stories"],
        "mediaType": "news-article",
        "country": "India",
        "region": "Asia",
        "tier": "top",
        "focus": "national",
        "coverage": ["india", "asia"],
        "categories": ["politics", "economy", "security", "diplomacy"],
        "weight": 0.88,
        "reliabilityScore": 0.88,
    },
    {
        "id": "times-of-india",
        "source": "Times of India",
        "urls": ["https://timesofindia.indiatimes.com/rssfeedstopstories.cms"],
        "mediaType": "news-article",
        "country": "India",
        "region": "Asia",
        "tier": "top",
        "focus": "national",
        "coverage": ["india", "asia"],
        "categories": ["politics", "economy", "security"],
        "weight": 0.82,
        "reliabilityScore": 0.84,
    },
    {
        "id": "the-hindu",
        "source": "The Hindu",
        "urls": [
            "https://www.thehindu.com/news/national/feeder/default.rss",
            "https://www.thehindu.com/news/international/feeder/default.rss",
        ],
        "mediaType": "news-article",
        "country": "India",
        "region": "Asia",
        "tier": "top",
        "focus": "national",
        "coverage": ["india", "asia"],
        "categories": ["politics", "economy", "diplomacy"],
        "weight": 0.84,
        "reliabilityScore": 0.89,
    },
    {
        "id": "scmp",
        "source": "SCMP",
        "urls": ["https://www.scmp.com/rss/91/feed"],
        "mediaType": "news-article",
        "country": "Hong Kong",
        "region": "Asia",
        "tier": "top",
        "focus": "regional",
        "coverage": ["asia", "china", "hong-kong", "taiwan"],
        "categories": ["politics", "economy", "security", "diplomacy"],
        "weight": 0.78,
        "reliabilityScore": 0.88,
    },
    {
        "id": "channel-news-asia",
        "source": "CNA",
        "urls": ["https://www.channelnewsasia.com/rssfeeds/8395986"],
        "mediaType": "news-article",
        "country": "Singapore",
        "region": "Asia",
        "tier": "high",
        "focus": "regional",
        "coverage": ["asia", "singapore", "china", "taiwan"],
        "categories": ["politics", "economy", "security"],
        "weight": 0.76,
        "reliabilityScore": 0.87,
    },
    {
        "id": "nikkei",
        "source": "Nikkei Asia",
        "urls": ["https://asia.nikkei.com/rss/feed/nar"],
        "mediaType": "news-article",
        "country": "Japan",
        "region": "Asia",
        "tier": "top",
        "focus": "regional",
        "coverage": ["asia", "japan", "china", "taiwan"],
        "categories": ["economy", "markets", "technology", "security"],
        "weight": 0.80,
        "reliabilityScore": 0.89,
    },
    {
        "id": "arab-news",
        "source": "Arab News",
        "urls": ["https://www.arabnews.com/rss.xml"],
        "mediaType": "news-article",
        "country": "Saudi Arabia",
        "region": "Middle East",
        "tier": "high",
        "focus": "regional",
        "coverage": ["middle-east", "saudi-arabia", "iran", "israel"],
        "categories": ["politics", "conflict", "energy", "diplomacy"],
        "weight": 0.76,
        "reliabilityScore": 0.84,
    },
    {
        "id": "times-of-israel",
        "source": "Times of Israel",
        "urls": ["https://www.timesofisrael.com/feed/"],
        "mediaType": "news-article",
        "country": "Israel",
        "region": "Middle East",
        "tier": "high",
        "focus": "national",
        "coverage": ["middle-east", "israel", "iran"],
        "categories": ["politics", "conflict", "security", "diplomacy"],
        "weight": 0.78,
        "reliabilityScore": 0.84,
    },
    {
        "id": "ap-news",
        "source": "Associated Press",
        "urls": ["https://apnews.com/hub/world-news?output=rss"],
        "mediaType": "news-article",
        "country": "United States",
        "region": "North America",
        "tier": "top",
        "focus": "international",
        "coverage": ["global", "north-america", "europe", "asia", "middle-east"],
        "categories": ["politics", "conflict", "economy", "diplomacy"],
        "weight": 0.92,
        "reliabilityScore": 0.94,
    },
]

POSITIVE_WORDS = {
    "success", "peace", "growth", "agreement", "win", "stable", "progress",
    "improve", "strong", "support", "cooperation", "benefit", "recover",
    "deal", "ceasefire", "diplomacy", "resolution"
}

NEGATIVE_WORDS = {
    "war", "conflict", "attack", "strike", "sanction", "sanctions", "crisis",
    "protest", "collapse", "threat", "violence", "kill", "killed", "dead",
    "injured", "tension", "tensions", "retaliation", "escalation", "missile",
    "drone", "invasion", "bombing", "hostage", "military", "nuclear"
}

STOP_WORDS = {
    "the", "and", "for", "with", "from", "that", "this", "into", "over",
    "after", "before", "about", "what", "when", "where", "which", "while",
    "their", "they", "them", "will", "would", "could", "should", "news",
    "latest", "update", "updates", "report", "reports", "article", "articles",
    "analysis", "breaking"
}

WEAK_CONTEXT_TERMS = {
    "war", "conflict", "crisis", "tension", "tensions", "escalation",
    "disruption", "disruptions", "attack", "attacks", "strike", "strikes",
    "sanction", "sanctions", "pressure", "risk", "risks", "threat", "threats"
}

COUNTRY_REGION_HINTS = {
    "iran": "Middle East",
    "israel": "Middle East",
    "uae": "Middle East",
    "united arab emirates": "Middle East",
    "qatar": "Middle East",
    "kuwait": "Middle East",
    "syria": "Middle East",
    "turkey": "Middle East",
    "saudi arabia": "Middle East",
    "pakistan": "Asia",
    "india": "Asia",
    "china": "Asia",
    "taiwan": "Asia",
    "japan": "Asia",
    "singapore": "Asia",
    "hong kong": "Asia",
    "russia": "Europe",
    "ukraine": "Europe",
    "norway": "Europe",
    "sweden": "Europe",
    "germany": "Europe",
    "france": "Europe",
    "uk": "Europe",
    "united kingdom": "Europe",
    "usa": "North America",
    "us": "North America",
    "united states": "North America",
    "canada": "North America",
    "australia": "Oceania",
    "ghana": "Africa",
    "kenya": "Africa",
}

REGION_KEYS = {
    "world": "global",
    "global": "global",
    "asia": "asia",
    "europe": "europe",
    "middle east": "middle-east",
    "middle-east": "middle-east",
    "north america": "north-america",
    "north-america": "north-america",
    "africa": "africa",
    "oceania": "oceania",
}

COUNTRY_KEYS = {
    "india": "india",
    "china": "china",
    "taiwan": "taiwan",
    "japan": "japan",
    "singapore": "singapore",
    "hong kong": "hong-kong",
    "israel": "israel",
    "iran": "iran",
    "saudi arabia": "saudi-arabia",
    "united kingdom": "united-kingdom",
    "uk": "united-kingdom",
    "germany": "germany",
    "france": "france",
    "united states": "united-states",
    "usa": "united-states",
    "us": "united-states",
    "canada": "canada",
}

QUERY_EXPANSION_RULES = [
    {
        "triggers": ["south china sea"],
        "expansions": [
            "south china sea dispute",
            "china philippines maritime dispute",
            "spratly islands dispute",
            "scarborough shoal",
            "philippines china coast guard",
            "taiwan strait naval activity",
        ],
    },
    {
        "triggers": ["taiwan semiconductor", "semiconductor disruption", "taiwan chip", "tsmc"],
        "expansions": [
            "taiwan semiconductor supply chain",
            "tsmc geopolitical risk",
            "china taiwan chip supply",
            "taiwan strait technology security",
            "semiconductor export controls",
        ],
    },
    {
        "triggers": ["taiwan"],
        "expansions": [
            "taiwan strait",
            "china taiwan tensions",
            "taiwan defence",
            "taiwan election security",
        ],
    },
    {
        "triggers": ["israel iran", "iran israel"],
        "expansions": [
            "israel iran tensions",
            "iran israel conflict",
            "middle east escalation",
            "iran nuclear diplomacy",
            "israel security cabinet",
        ],
    },
    {
        "triggers": ["india pakistan", "pakistan india"],
        "expansions": [
            "india pakistan tensions",
            "kashmir conflict",
            "line of control",
            "india pakistan border security",
            "south asia nuclear rivals",
        ],
    },
    {
        "triggers": ["ukraine russia", "russia ukraine"],
        "expansions": [
            "russia ukraine war",
            "ukraine battlefield",
            "russian strikes ukraine",
            "ukraine peace talks",
            "nato ukraine support",
        ],
    },
    {
        "triggers": ["red sea"],
        "expansions": [
            "red sea shipping disruption",
            "houthis red sea attacks",
            "yemen maritime security",
            "suez shipping risk",
        ],
    },
]


def normalize_text(value):
    return str(value or "").strip()


def normalize_key(value):
    return re.sub(r"[^a-z0-9]+", "-", normalize_text(value).lower()).strip("-")


def clean_html(value):
    text = unescape(normalize_text(value))
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def extract_thumbnail(item):
    media_namespaces = [
        "{http://search.yahoo.com/mrss/}",
        "{http://purl.org/rss/1.0/modules/content/}",
    ]

    for namespace in media_namespaces:
        for tag in ["content", "thumbnail"]:
            node = item.find(f".//{namespace}{tag}")
            if node is not None:
                url = normalize_text(node.attrib.get("url") or node.attrib.get("href"))
                if url:
                    return unescape(url)

    enclosure = item.find("enclosure")
    if enclosure is not None:
        enclosure_type = normalize_text(enclosure.attrib.get("type")).lower()
        enclosure_url = normalize_text(enclosure.attrib.get("url") or enclosure.attrib.get("href"))
        if enclosure_url and (not enclosure_type or enclosure_type.startswith("image/")):
            return unescape(enclosure_url)

    html_candidates = [
        item.findtext("description"),
        item.findtext("summary"),
        item.findtext("content"),
        item.findtext("{http://www.w3.org/2005/Atom}summary"),
        item.findtext("{http://www.w3.org/2005/Atom}content"),
        item.findtext("{http://purl.org/rss/1.0/modules/content/}encoded"),
    ]

    for html in html_candidates:
        match = re.search(
            r'<img[^>]+src=["\']([^"\']+)["\']',
            normalize_text(html),
            flags=re.IGNORECASE,
        )
        if match:
            return unescape(match.group(1))

    return None


def canonical_token(token):
    token = normalize_text(token).lower()

    if token.endswith("ies") and len(token) > 4:
        return token[:-3] + "y"

    if token.endswith("s") and len(token) > 4:
        return token[:-1]

    return token


def tokenize(text):
    tokens = re.findall(r"[a-zA-Z][a-zA-Z\-]{2,}", normalize_text(text).lower())
    return [
        canonical_token(token)
        for token in tokens
        if canonical_token(token) not in STOP_WORDS
    ]


def parse_date(value):
    value = normalize_text(value)
    if not value:
        return ""

    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).isoformat()
    except Exception:
        return ""


def sentiment(text):
    words = tokenize(text)
    if not words:
        return "neutral", 0.0

    pos = sum(1 for word in words if word in POSITIVE_WORDS)
    neg = sum(1 for word in words if word in NEGATIVE_WORDS)

    score = (pos - neg) / max(1, pos + neg)

    if score > 0.1:
        return "positive", round(score, 4)

    if score < -0.1:
        return "negative", round(score, 4)

    return "neutral", round(score, 4)


def infer_query_regions(query):
    query_l = normalize_text(query).lower()
    regions = set()

    for country, region in COUNTRY_REGION_HINTS.items():
        if re.search(rf"\b{re.escape(country)}\b", query_l):
            regions.add(region)

    return regions


def infer_query_countries(query):
    query_l = normalize_text(query).lower()
    countries = set()

    for country in COUNTRY_REGION_HINTS.keys():
        if re.search(rf"\b{re.escape(country)}\b", query_l):
            countries.add(country)

    return countries


def query_terms(query):
    tokens = list(dict.fromkeys(tokenize(query)))
    strong_tokens = [token for token in tokens if token not in WEAK_CONTEXT_TERMS]
    weak_tokens = [token for token in tokens if token in WEAK_CONTEXT_TERMS]

    return tokens, strong_tokens, weak_tokens


def expand_query(query):
    query = normalize_text(query)
    query_l = query.lower()
    expanded = [query]

    query_countries = infer_query_countries(query)
    if len(query_countries) >= 2:
        countries = sorted(query_countries)
        expanded.append(f"{' '.join(countries)} tensions")
        expanded.append(f"{' '.join(countries)} conflict")
        expanded.append(f"{' '.join(countries)} diplomacy")
        expanded.append(f"{' '.join(countries)} security")

    for rule in QUERY_EXPANSION_RULES:
        if any(trigger in query_l for trigger in rule.get("triggers", [])):
            expanded.extend(rule.get("expansions", []))

    strong_tokens = [token for token in tokenize(query) if token not in WEAK_CONTEXT_TERMS]
    if len(strong_tokens) >= 2:
        expanded.append(" ".join(strong_tokens[:4]))

    cleaned = []
    seen = set()

    for item in expanded:
        item = normalize_text(item)
        key = item.lower()
        if item and key not in seen:
            seen.add(key)
            cleaned.append(item)

    return cleaned[:10]


def phrase_score(query, text):
    query_l = normalize_text(query).lower()
    text_l = normalize_text(text).lower()

    if not query_l:
        return 1.0

    if query_l in text_l:
        return 1.0

    tokens, _, _ = query_terms(query_l)
    if len(tokens) < 2:
        return 0.0

    phrase_hits = 0
    possible = 0

    for size in range(min(4, len(tokens)), 1, -1):
        for index in range(0, len(tokens) - size + 1):
            possible += 1
            phrase = " ".join(tokens[index:index + size])
            if phrase in text_l:
                phrase_hits += size

    return min(1.0, phrase_hits / max(1, possible * 2))


def proximity_score(query, text):
    text_l = normalize_text(text).lower()
    tokens, strong_tokens, _ = query_terms(query)

    terms_to_check = strong_tokens or tokens
    positions = []

    for token in terms_to_check:
        pos = text_l.find(token)
        if pos >= 0:
            positions.append(pos)

    if len(positions) < 2:
        return 0.0

    spread = max(positions) - min(positions)

    if spread <= 120:
        return 1.0

    if spread <= 260:
        return 0.55

    return 0.25


def strict_match_gate(query, text):
    tokens, strong_tokens, _ = query_terms(query)

    if not tokens:
        return True, {
            "matchedTokens": [],
            "matchedStrongTokens": [],
            "requiredStrongMatch": False,
            "reason": "empty-query"
        }

    text_tokens = set(tokenize(text))
    text_l = normalize_text(text).lower()

    matched_tokens = [
        token for token in tokens
        if token in text_tokens or re.search(rf"\b{re.escape(token)}\w*\b", text_l)
    ]

    matched_strong_tokens = [
        token for token in strong_tokens
        if token in text_tokens or re.search(rf"\b{re.escape(token)}\w*\b", text_l)
    ]

    has_phrase = phrase_score(query, text) >= 0.65
    has_proximity = proximity_score(query, text) >= 0.55

    if len(tokens) == 1:
        passed = len(matched_tokens) == 1
    elif strong_tokens:
        passed = (
            len(matched_strong_tokens) >= 1
            and len(set(matched_tokens)) >= min(2, len(set(tokens)))
        ) or has_phrase or has_proximity
    else:
        passed = len(set(matched_tokens)) >= min(2, len(set(tokens)))

    return passed, {
        "matchedTokens": matched_tokens,
        "matchedStrongTokens": matched_strong_tokens,
        "requiredStrongMatch": bool(strong_tokens),
        "reason": "passed" if passed else "failed-strict-gate"
    }


def expanded_strict_match_gate(query_variants, text):
    best_failed_gate = None
    fallback_query = query_variants[0] if query_variants else ""

    for query_variant in query_variants:
        passed, gate = strict_match_gate(query_variant, text)
        gate["queryVariant"] = query_variant

        if passed:
            return True, gate

        if best_failed_gate is None or len(gate.get("matchedTokens", [])) > len(best_failed_gate.get("matchedTokens", [])):
            best_failed_gate = gate

    return False, best_failed_gate or {
        "matchedTokens": [],
        "matchedStrongTokens": [],
        "requiredStrongMatch": False,
        "reason": "failed-expanded-strict-gate",
        "queryVariant": fallback_query
    }


def relevance_score(query, title, summary):
    text = f"{title} {summary}"
    tokens, strong_tokens, _ = query_terms(query)

    if not tokens:
        return 1.0, {
            "tokenOverlap": 1.0,
            "strongTokenOverlap": 1.0,
            "phraseScore": 1.0,
            "proximityScore": 0.0,
            "titleBoost": 0.0
        }

    text_tokens = set(tokenize(text))
    title_l = normalize_text(title).lower()
    text_l = normalize_text(text).lower()

    matched_tokens = [
        token for token in tokens
        if token in text_tokens or re.search(rf"\b{re.escape(token)}\w*\b", text_l)
    ]

    matched_strong_tokens = [
        token for token in strong_tokens
        if token in text_tokens or re.search(rf"\b{re.escape(token)}\w*\b", text_l)
    ]

    token_overlap = len(set(matched_tokens)) / max(1, len(set(tokens)))
    strong_overlap = len(set(matched_strong_tokens)) / max(1, len(set(strong_tokens))) if strong_tokens else token_overlap
    p_score = phrase_score(query, text)
    prox_score = proximity_score(query, text)

    title_hits = sum(
        1 for token in set(tokens)
        if re.search(rf"\b{re.escape(token)}\w*\b", title_l)
    )
    title_boost = title_hits / max(1, len(set(tokens)))

    score = (
        token_overlap * 0.34
        + strong_overlap * 0.32
        + p_score * 0.16
        + title_boost * 0.12
        + prox_score * 0.06
    )

    return round(min(1.0, score), 4), {
        "tokenOverlap": round(token_overlap, 4),
        "strongTokenOverlap": round(strong_overlap, 4),
        "phraseScore": round(p_score, 4),
        "proximityScore": round(prox_score, 4),
        "titleBoost": round(title_boost, 4),
        "matchedTokens": matched_tokens,
        "matchedStrongTokens": matched_strong_tokens
    }


def best_relevance_score(query_variants, title, summary):
    best_query = query_variants[0] if query_variants else ""
    best_score = 0.0
    best_breakdown = {}

    for query_variant in query_variants:
        score, breakdown = relevance_score(query_variant, title, summary)
        if score > best_score:
            best_query = query_variant
            best_score = score
            best_breakdown = breakdown

    best_breakdown["queryVariant"] = best_query
    best_breakdown["expandedQueryUsed"] = best_query != (query_variants[0] if query_variants else best_query)

    return best_score, best_breakdown, best_query


def recency_score(published):
    try:
        dt = datetime.fromisoformat(normalize_text(published).replace("Z", "+00:00"))
        age = (datetime.now(timezone.utc) - dt).total_seconds() / 3600

        if age <= 6:
            return 1.0
        if age <= 24:
            return 0.82
        if age <= 72:
            return 0.58
        if age <= 168:
            return 0.35
        return 0.18
    except Exception:
        return 0.25


def source_score(feed):
    weight = 0.7
    reliability = 0.85

    try:
        weight = float(feed.get("weight", 0.7))
    except Exception:
        weight = 0.7

    try:
        reliability = float(feed.get("reliabilityScore", 0.85))
    except Exception:
        reliability = 0.85

    return round(max(0.3, min(1.0, (weight * 0.72) + (reliability * 0.28))), 4)


def source_quality_label(score):
    if score >= 0.9:
        return "elite"
    if score >= 0.8:
        return "high"
    if score >= 0.68:
        return "standard"
    return "limited"


def selected_region_keys(payload):
    selected = set()
    regions = payload.get("regions") if isinstance(payload.get("regions"), list) else []

    for region in regions:
        key = REGION_KEYS.get(normalize_text(region).lower(), normalize_key(region))
        if key:
            selected.add(key)

    if not selected:
        selected.add("global")

    return selected


def selected_country_keys(payload, query):
    selected = set()
    countries = payload.get("countries") if isinstance(payload.get("countries"), list) else []

    for country in countries:
        raw = normalize_text(country).lower()
        selected.add(COUNTRY_KEYS.get(raw, normalize_key(raw)))

    for country in infer_query_countries(query):
        selected.add(COUNTRY_KEYS.get(country, normalize_key(country)))

    return {item for item in selected if item}


def region_to_key(region):
    return REGION_KEYS.get(normalize_text(region).lower(), normalize_key(region))


def feed_geo_selection_score(feed, payload, query):
    region_keys = selected_region_keys(payload)
    country_keys = selected_country_keys(payload, query)
    inferred_regions = {region_to_key(region) for region in infer_query_regions(query)}

    source_region_key = region_to_key(feed.get("region", ""))
    source_country_key = COUNTRY_KEYS.get(normalize_text(feed.get("country", "")).lower(), normalize_key(feed.get("country", "")))
    coverage = {normalize_key(item) for item in feed.get("coverage", [])}

    score = 0.0

    if "global" in coverage:
        score += 0.45

    if country_keys:
        if source_country_key in country_keys:
            score += 2.4
        if coverage.intersection(country_keys):
            score += 2.0

    active_regions = {item for item in region_keys.union(inferred_regions) if item and item != "global"}
    if active_regions:
        if source_region_key in active_regions:
            score += 1.5
        if coverage.intersection(active_regions):
            score += 1.2

    if "global" in region_keys:
        score += 0.65 if "global" in coverage else 0.25

    if feed.get("tier") == "top":
        score += 0.35
    elif feed.get("tier") == "high":
        score += 0.2

    try:
        score += float(feed.get("reliabilityScore", 0.85)) * 0.25
    except Exception:
        score += 0.2

    return round(score, 4)


def flatten_selected_feeds(selected_sources):
    feeds = []

    for source in selected_sources:
        for url in source.get("urls", []):
            feed = {
                **source,
                "url": url,
            }
            feeds.append(feed)

    return feeds


def select_sources(payload, query):
    scored = [
        {
            **source,
            "coverageSelectionScore": feed_geo_selection_score(source, payload, query),
        }
        for source in SOURCE_CATALOG
    ]

    selected = sorted(
        scored,
        key=lambda item: (
            item.get("coverageSelectionScore", 0),
            item.get("weight", 0),
            item.get("reliabilityScore", 0),
        ),
        reverse=True,
    )

    targeted = [source for source in selected if source.get("coverageSelectionScore", 0) >= 1.45]
    global_fallbacks = [
        source for source in selected
        if "global" in {normalize_key(item) for item in source.get("coverage", [])}
    ]

    merged = []
    seen = set()

    for source in targeted + global_fallbacks + selected:
        if source["id"] in seen:
            continue
        seen.add(source["id"])
        merged.append(source)

        if len(merged) >= MAX_SELECTED_FEEDS:
            break

    return merged


def geo_score(query, feed, payload=None):
    payload = payload or {}
    region_keys = selected_region_keys(payload)
    country_keys = selected_country_keys(payload, query)
    inferred_regions = {region_to_key(region) for region in infer_query_regions(query)}

    source_region_key = region_to_key(feed.get("region", ""))
    source_country_key = COUNTRY_KEYS.get(normalize_text(feed.get("country", "")).lower(), normalize_key(feed.get("country", "")))
    coverage = {normalize_key(item) for item in feed.get("coverage", [])}

    if country_keys:
        if source_country_key in country_keys:
            return 1.0
        if coverage.intersection(country_keys):
            return 0.94

    active_regions = {item for item in region_keys.union(inferred_regions) if item and item != "global"}
    if active_regions:
        if source_region_key in active_regions:
            return 0.92
        if coverage.intersection(active_regions):
            return 0.86
        if "global" in coverage:
            return 0.72
        return 0.46

    if "global" in region_keys or not region_keys:
        if "global" in coverage:
            return 0.82
        return 0.58

    return 0.55


def final_score(query_relevance, geo_alignment, recency, source_quality, sentiment_value):
    sentiment_strength = min(1.0, abs(float(sentiment_value or 0.0)))

    return round((
        query_relevance * 0.52
        + geo_alignment * 0.16
        + recency * 0.14
        + source_quality * 0.10
        + sentiment_strength * 0.08
    ) * 100, 2)


def fetch_feed(feed):
    response = requests.get(
        feed["url"],
        headers={"User-Agent": USER_AGENT},
        timeout=REQUEST_TIMEOUT
    )
    response.raise_for_status()
    return response.text


def find_atom_text(entry, names):
    for name in names:
        value = entry.findtext(name)
        if value:
            return value

        namespaced = entry.findtext(f"{{http://www.w3.org/2005/Atom}}{name}")
        if namespaced:
            return namespaced

    return ""


def find_atom_link(entry):
    link = entry.find("{http://www.w3.org/2005/Atom}link")
    if link is not None:
        return normalize_text(link.attrib.get("href"))

    link = entry.find("link")
    if link is not None:
        return normalize_text(link.attrib.get("href") or link.text)

    return ""


def extract_feed_items(root):
    rss_items = root.findall(".//item")
    if rss_items:
        return "rss", rss_items

    atom_items = root.findall(".//{http://www.w3.org/2005/Atom}entry")
    if atom_items:
        return "atom", atom_items

    plain_atom_items = root.findall(".//entry")
    if plain_atom_items:
        return "atom", plain_atom_items

    return "unknown", []


def parse_feed_item(item, feed_type):
    thumbnail = extract_thumbnail(item)

    if feed_type == "atom":
        title = clean_html(find_atom_text(item, ["title"]))
        summary = clean_html(find_atom_text(item, ["summary", "content"]))
        url = normalize_text(find_atom_link(item))
        published = parse_date(find_atom_text(item, ["published", "updated"]))
        return title, summary, url, published, thumbnail

    title = clean_html(item.findtext("title"))
    summary = clean_html(item.findtext("description"))
    url = normalize_text(item.findtext("link"))
    published = parse_date(item.findtext("pubDate"))

    return title, summary, url, published, thumbnail


def add_rejection_sample(samples, reason, feed, title, summary="", gate=None, relevance=None):
    if len(samples) >= MAX_REJECTION_SAMPLES:
        return

    samples.append({
        "reason": reason,
        "source": feed.get("source"),
        "sourceId": feed.get("id"),
        "sourceCountry": feed.get("country", ""),
        "sourceRegion": feed.get("region", ""),
        "title": normalize_text(title)[:180],
        "summary": normalize_text(summary)[:220],
        "strictMatchGate": gate or {},
        "relevanceBreakdown": relevance or {},
    })


def parse_feed(feed, query, payload, query_variants, diagnostics):
    xml = fetch_feed(feed)
    root = ET.fromstring(xml)
    feed_type, feed_items = extract_feed_items(root)
    items = []

    diagnostics["rawItemsSeen"] += len(feed_items)

    for item in feed_items:
        title, summary, url, published, thumbnail = parse_feed_item(item, feed_type)

        if not title or not url:
            diagnostics["rejectedMissingTitleOrUrl"] += 1
            continue

        text = f"{title} {summary}"
        passed_gate, gate = expanded_strict_match_gate(query_variants, text)

        if not passed_gate:
            diagnostics["rejectedByStrictGate"] += 1
            add_rejection_sample(
                diagnostics["rejectionSamples"],
                "failed-strict-gate",
                feed,
                title,
                summary,
                gate=gate
            )
            continue

        query_countries = infer_query_countries(query)
        if len(query_countries) >= 2:
            text_l = normalize_text(text).lower()
            matched_countries = [
                country for country in query_countries
                if re.search(rf"\b{re.escape(country)}\b", text_l)
            ]

            if len(matched_countries) < 2:
                diagnostics["rejectedByMultiCountryGate"] += 1
                add_rejection_sample(
                    diagnostics["rejectionSamples"],
                    "failed-multi-country-gate",
                    feed,
                    title,
                    summary,
                    gate={
                        **gate,
                        "queryCountries": sorted(query_countries),
                        "matchedCountries": matched_countries,
                    }
                )
                continue

        q_score, relevance, matched_query = best_relevance_score(query_variants, title, summary)

        if q_score < MIN_RELEVANCE_SCORE:
            diagnostics["rejectedByRelevanceThreshold"] += 1
            add_rejection_sample(
                diagnostics["rejectionSamples"],
                "below-relevance-threshold",
                feed,
                title,
                summary,
                gate=gate,
                relevance={
                    **relevance,
                    "score": q_score,
                    "threshold": MIN_RELEVANCE_SCORE,
                }
            )
            continue

        sent, sent_score = sentiment(text)
        r_score = recency_score(published)
        g_score = geo_score(query, feed, payload)
        s_score = source_score(feed)

        score = final_score(q_score, g_score, r_score, s_score, sent_score)
        diagnostics["acceptedItems"] += 1

        items.append({
            "title": title,
            "summary": summary,
            "url": url,
            "thumbnail": thumbnail,
            "source": feed["source"],
            "sourceId": feed.get("id", ""),
            "sourceCountry": feed.get("country", ""),
            "sourceRegion": feed.get("region", ""),
            "sourceTier": feed.get("tier", "standard"),
            "sourceWeight": feed.get("weight", 0.7),
            "sourceReliabilityScore": feed.get("reliabilityScore", 0.85),
            "sourceQuality": source_quality_label(s_score),
            "publicationFocus": feed.get("focus", "international"),
            "coverage": feed.get("coverage", []),
            "categories": feed.get("categories", []),
            "publishedAt": published,
            "sentiment": sent,
            "sentimentScore": sent_score,
            "mediaType": feed.get("mediaType", "news-article"),
            "queryMatchScore": q_score,
            "matchedQuery": matched_query,
            "expandedQueryUsed": matched_query != query,
            "relevanceBreakdown": relevance,
            "strictMatchGate": gate,
            "geoAlignmentScore": round(g_score, 4),
            "recencyScore": round(r_score, 4),
            "sourceQualityScore": round(s_score, 4),
            "coverageSelectionScore": feed.get("coverageSelectionScore", 0),
            "workerScore": round(score / 100, 4),
            "signalScore": score,
            "finalScore": score
        })

    return items


def dedupe_items(items):
    seen = set()
    deduped = []

    for item in items:
        url = normalize_text(item.get("url"))
        title_key = re.sub(
            r"[^a-z0-9]+",
            " ",
            normalize_text(item.get("title")).lower()
        ).strip()

        key = url or f"{item.get('source', '')}:{title_key}"
        if not key or key in seen:
            continue

        seen.add(key)
        deduped.append(item)

    return deduped


def build_no_result_explanation(query, diagnostics, selected_sources):
    if diagnostics["rawItemsSeen"] == 0:
        primary_reason = "No RSS items were retrieved from the selected sources."
    elif diagnostics["rejectedByStrictGate"] > 0 and diagnostics["acceptedItems"] == 0:
        primary_reason = "RSS items were retrieved, but none passed the strict geopolitical relevance gate."
    elif diagnostics["rejectedByMultiCountryGate"] > 0 and diagnostics["acceptedItems"] == 0:
        primary_reason = "Some articles matched loosely, but not enough entities from the multi-country scenario were present."
    elif diagnostics["rejectedByRelevanceThreshold"] > 0 and diagnostics["acceptedItems"] == 0:
        primary_reason = "Some articles matched weakly, but their relevance scores stayed below the acceptance threshold."
    else:
        primary_reason = "No qualified matches survived the current source, relevance, and ranking filters."

    return {
        "status": "no-qualified-matches",
        "message": primary_reason,
        "query": query,
        "selectedSourceCount": len(selected_sources),
        "rawItemsSeen": diagnostics["rawItemsSeen"],
        "acceptedItems": diagnostics["acceptedItems"],
        "rejectedByStrictGate": diagnostics["rejectedByStrictGate"],
        "rejectedByMultiCountryGate": diagnostics["rejectedByMultiCountryGate"],
        "rejectedByRelevanceThreshold": diagnostics["rejectedByRelevanceThreshold"],
        "suggestions": [
            "Try a broader geopolitical phrase.",
            "Use country names directly, for example 'Israel Iran tensions'.",
            "Try a known regional phrase such as 'South China Sea dispute' or 'Taiwan Strait'.",
            "The topic may be real but not present in the currently selected RSS feeds."
        ],
    }


def main():
    payload = json.loads(sys.stdin.read() or "{}")
    query = normalize_text(payload.get("query") or payload.get("selectedTrend") or "")
    query_variants = expand_query(query)

    selected_sources = select_sources(payload, query)
    selected_feeds = flatten_selected_feeds(selected_sources)

    all_items = []
    feed_errors = []
    diagnostics = {
        "rawItemsSeen": 0,
        "acceptedItems": 0,
        "rejectedMissingTitleOrUrl": 0,
        "rejectedByStrictGate": 0,
        "rejectedByMultiCountryGate": 0,
        "rejectedByRelevanceThreshold": 0,
        "rejectionSamples": [],
    }

    for feed in selected_feeds:
        try:
            all_items.extend(parse_feed(feed, query, payload, query_variants, diagnostics))
        except Exception as exc:
            feed_errors.append({
                "source": feed.get("source"),
                "sourceId": feed.get("id"),
                "url": feed.get("url"),
                "error": str(exc)
            })

    deduped = dedupe_items(all_items)
    ranked = sorted(deduped, key=lambda item: item.get("finalScore", 0), reverse=True)
    result_count = len(ranked[:MAX_RESULTS])
    no_result_explanation = None

    if result_count == 0:
        no_result_explanation = build_no_result_explanation(query, diagnostics, selected_sources)

    print(json.dumps({
        "mode": "live",
        "query": query,
        "expandedQueries": query_variants,
        "resultCount": result_count,
        "retrievedCount": len(all_items),
        "dedupedCount": len(deduped),
        "rawItemsSeen": diagnostics["rawItemsSeen"],
        "filteredOutCount": max(0, diagnostics["rawItemsSeen"] - diagnostics["acceptedItems"]),
        "diagnostics": {
            "acceptedItems": diagnostics["acceptedItems"],
            "rejectedMissingTitleOrUrl": diagnostics["rejectedMissingTitleOrUrl"],
            "rejectedByStrictGate": diagnostics["rejectedByStrictGate"],
            "rejectedByMultiCountryGate": diagnostics["rejectedByMultiCountryGate"],
            "rejectedByRelevanceThreshold": diagnostics["rejectedByRelevanceThreshold"],
            "rejectionSamples": diagnostics["rejectionSamples"],
        },
        "noResultExplanation": no_result_explanation,
        "selectedSources": [
            {
                "id": source.get("id"),
                "name": source.get("source"),
                "country": source.get("country"),
                "region": source.get("region"),
                "tier": source.get("tier", "standard"),
                "weight": source.get("weight", 0.7),
                "reliabilityScore": source.get("reliabilityScore", 0.85),
                "sourceQualityScore": source_score(source),
                "sourceQuality": source_quality_label(source_score(source)),
                "coverageSelectionScore": source.get("coverageSelectionScore"),
            }
            for source in selected_sources
        ],
        "feedErrors": feed_errors[:8],
        "results": ranked[:MAX_RESULTS]
    }, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({
            "mode": "error",
            "error": str(exc),
            "trace": traceback.format_exc()
        }, ensure_ascii=False))