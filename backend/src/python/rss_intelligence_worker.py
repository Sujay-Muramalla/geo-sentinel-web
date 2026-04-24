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
MIN_RELEVANCE_SCORE = 0.32

RSS_FEEDS = [
    {"source": "Reuters", "url": "https://feeds.reuters.com/reuters/worldNews", "mediaType": "news-article", "country": "United Kingdom", "region": "Global", "tier": "top", "weight": 1.0},
    {"source": "BBC", "url": "http://feeds.bbci.co.uk/news/world/rss.xml", "mediaType": "news-article", "country": "United Kingdom", "region": "Europe", "tier": "top", "weight": 0.98},
    {"source": "CNN", "url": "http://rss.cnn.com/rss/edition_world.rss", "mediaType": "news-article", "country": "United States", "region": "North America", "tier": "top", "weight": 0.92},
    {"source": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml", "mediaType": "news-article", "country": "Qatar", "region": "Middle East", "tier": "top", "weight": 0.96},
    {"source": "DW", "url": "https://rss.dw.com/xml/rss-en-world", "mediaType": "news-article", "country": "Germany", "region": "Europe", "tier": "top", "weight": 0.9},
    {"source": "France 24", "url": "https://www.france24.com/en/rss", "mediaType": "news-article", "country": "France", "region": "Europe", "tier": "top", "weight": 0.9},

    {"source": "The Guardian", "url": "https://www.theguardian.com/world/rss", "mediaType": "news-article", "country": "United Kingdom", "region": "Europe", "tier": "standard", "weight": 0.82},
    {"source": "Euronews", "url": "https://www.euronews.com/rss?level=theme&name=news", "mediaType": "news-article", "country": "Europe", "region": "Europe", "tier": "standard", "weight": 0.78},

    {"source": "SCMP", "url": "https://www.scmp.com/rss/91/feed", "mediaType": "news-article", "country": "Hong Kong", "region": "Asia", "tier": "standard", "weight": 0.78},
    {"source": "CNA", "url": "https://www.channelnewsasia.com/rssfeeds/8395986", "mediaType": "news-article", "country": "Singapore", "region": "Asia", "tier": "standard", "weight": 0.76},
    {"source": "Nikkei Asia", "url": "https://asia.nikkei.com/rss/feed/nar", "mediaType": "news-article", "country": "Japan", "region": "Asia", "tier": "standard", "weight": 0.8},
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
    "pakistan": "Asia",
    "india": "Asia",
    "china": "Asia",
    "taiwan": "Asia",
    "japan": "Asia",
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
    "australia": "Oceania",
    "ghana": "Africa",
    "kenya": "Africa",
}


def normalize_text(value):
    return str(value or "").strip()


def clean_html(value):
    text = unescape(normalize_text(value))
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


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


def query_terms(query):
    tokens = list(dict.fromkeys(tokenize(query)))
    strong_tokens = [token for token in tokens if token not in WEAK_CONTEXT_TERMS]
    weak_tokens = [token for token in tokens if token in WEAK_CONTEXT_TERMS]

    return tokens, strong_tokens, weak_tokens


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


def geo_score(query, feed):
    inferred_regions = infer_query_regions(query)

    if not inferred_regions:
        return 0.7

    source_region = normalize_text(feed.get("region"))
    source_country = normalize_text(feed.get("country")).lower()
    query_l = normalize_text(query).lower()

    if source_country and source_country in query_l:
        return 1.0

    if source_region in inferred_regions:
        return 0.92

    if source_region == "Global":
        return 0.78

    return 0.48


def source_score(feed):
    try:
        return max(0.3, min(1.0, float(feed.get("weight", 0.7))))
    except Exception:
        return 0.7


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


def parse_feed(feed, query):
    xml = fetch_feed(feed)
    root = ET.fromstring(xml)
    items = []

    for item in root.findall(".//item"):
        title = clean_html(item.findtext("title"))
        summary = clean_html(item.findtext("description"))
        url = normalize_text(item.findtext("link"))
        published = parse_date(item.findtext("pubDate"))

        if not title or not url:
            continue

        text = f"{title} {summary}"
        passed_gate, gate = strict_match_gate(query, text)

        if not passed_gate:
            continue

        q_score, relevance = relevance_score(query, title, summary)

        if q_score < MIN_RELEVANCE_SCORE:
            continue

        sent, sent_score = sentiment(text)
        r_score = recency_score(published)
        g_score = geo_score(query, feed)
        s_score = source_score(feed)

        score = final_score(q_score, g_score, r_score, s_score, sent_score)

        items.append({
            "title": title,
            "summary": summary,
            "url": url,
            "source": feed["source"],
            "sourceCountry": feed.get("country", ""),
            "sourceRegion": feed.get("region", ""),
            "sourceTier": feed.get("tier", "standard"),
            "sourceWeight": feed.get("weight", 0.7),
            "publishedAt": published,
            "sentiment": sent,
            "sentimentScore": sent_score,
            "mediaType": feed.get("mediaType", "news-article"),
            "queryMatchScore": q_score,
            "relevanceBreakdown": relevance,
            "strictMatchGate": gate,
            "geoAlignmentScore": round(g_score, 4),
            "recencyScore": round(r_score, 4),
            "sourceQualityScore": round(s_score, 4),
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

        key = url or title_key
        if not key or key in seen:
            continue

        seen.add(key)
        deduped.append(item)

    return deduped


def main():
    payload = json.loads(sys.stdin.read() or "{}")
    query = normalize_text(payload.get("query") or payload.get("selectedTrend") or "")

    all_items = []
    feed_errors = []

    for feed in RSS_FEEDS:
        try:
            all_items.extend(parse_feed(feed, query))
        except Exception as exc:
            feed_errors.append({
                "source": feed.get("source"),
                "error": str(exc)
            })

    deduped = dedupe_items(all_items)
    ranked = sorted(deduped, key=lambda item: item.get("finalScore", 0), reverse=True)

    print(json.dumps({
        "mode": "live",
        "query": query,
        "resultCount": len(ranked[:MAX_RESULTS]),
        "retrievedCount": len(all_items),
        "dedupedCount": len(deduped),
        "feedErrors": feed_errors[:5],
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