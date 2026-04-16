import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.sax.saxutils as saxutils
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional, Tuple

import feedparser

USER_AGENT = "Geo-Sentinel/1.0 (+RSS Intelligence Worker)"
DEFAULT_HL = "en-US"
DEFAULT_GL = "US"
DEFAULT_CEID = "US:en"
MAX_ARTICLES = 10

IGNORE_KEYWORDS = [
    "podcast",
    "bbc news app",
    "5 live",
    "sounds",
    "listen live"
]

PUBLISHER_FEEDS = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://feeds.reuters.com/Reuters/worldNews"
]


def read_stdin_payload() -> Dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def safe_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def build_google_news_rss_url(query: str, hl: str = DEFAULT_HL, gl: str = DEFAULT_GL, ceid: str = DEFAULT_CEID) -> str:
    encoded_query = urllib.parse.quote_plus(query)
    return f"https://news.google.com/rss/search?q={encoded_query}&hl={hl}&gl={gl}&ceid={ceid}"


def fetch_feed(url: str) -> feedparser.FeedParserDict:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=15) as response:
        content = response.read()
    return feedparser.parse(content)


def strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", safe_text(text))
    return re.sub(r"\s+", " ", text).strip()


def extract_summary(entry: Dict[str, Any]) -> str:
    summary = safe_text(entry.get("summary") or entry.get("description"))
    return strip_html(summary)


def extract_source(entry: Dict[str, Any]) -> str:
    source = entry.get("source")
    if isinstance(source, dict):
        return safe_text(source.get("title")) or "Unknown Source"
    return "Unknown Source"


def parse_published(entry: Dict[str, Any]) -> Tuple[str, float]:
    published_raw = safe_text(entry.get("published") or entry.get("updated"))
    if not published_raw:
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        return now_iso, time.time()

    try:
        dt = parsedate_to_datetime(published_raw)
        timestamp = dt.timestamp()
        iso_value = dt.isoformat()
        return iso_value, timestamp
    except Exception:
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        return now_iso, time.time()


def normalize_label(score: float) -> str:
    if score >= 0.35:
        return "positive"
    if score >= 0.08:
        return "slightly-positive"
    if score <= -0.35:
        return "negative"
    if score <= -0.08:
        return "slightly-negative"
    return "neutral"


POSITIVE_WORDS = {
    "progress", "agreement", "deal", "growth", "support", "stable", "success",
    "cooperation", "recover", "recovery", "calm", "improve", "improvement",
    "breakthrough", "win", "secure", "secured"
}

NEGATIVE_WORDS = {
    "war", "attack", "strike", "crisis", "sanction", "conflict", "tension",
    "collapse", "fear", "risk", "violent", "violence", "threat", "threatens",
    "escalation", "escalate", "missile", "dead", "killed", "injured",
    "instability", "panic", "dispute"
}


def score_sentiment(text: str) -> float:
    words = re.findall(r"\b[a-zA-Z\-]+\b", text.lower())
    if not words:
        return 0.0

    positive_hits = sum(1 for word in words if word in POSITIVE_WORDS)
    negative_hits = sum(1 for word in words if word in NEGATIVE_WORDS)

    raw_score = (positive_hits - negative_hits) / max(len(words), 8)
    bounded = max(min(raw_score * 6, 1.0), -1.0)
    return round(bounded, 3)


def compute_relevance_score(query: str, title: str, summary: str) -> int:
    query_terms = [term.lower() for term in re.findall(r"\w+", query) if len(term) > 2]
    if not query_terms:
        return 50

    haystack = f"{title} {summary}".lower()
    hits = sum(1 for term in query_terms if term in haystack)
    ratio = hits / len(query_terms)
    return int(round(min(max(ratio * 100, 25), 100)))


def compute_freshness_score(published_ts: float) -> int:
    age_hours = max((time.time() - published_ts) / 3600, 0)
    decay = math.exp(-age_hours / 48)
    return int(round(decay * 100))


def compute_signal_score(sentiment_score: float, relevance_score: int, freshness_score: int) -> int:
    intensity = abs(sentiment_score) * 100
    value = (0.45 * relevance_score) + (0.35 * freshness_score) + (0.20 * intensity)
    return int(round(min(value, 100)))


def compute_final_score(signal_score: int, relevance_score: int, freshness_score: int) -> int:
    value = (0.50 * signal_score) + (0.30 * relevance_score) + (0.20 * freshness_score)
    return int(round(min(value, 100)))


def infer_region_and_country(payload: Dict[str, Any]) -> Tuple[str, str]:
    countries = payload.get("countries") or []
    regions = payload.get("regions") or []

    country = countries[0] if countries else "Multiple"
    region = regions[0].title() if regions else "Global"

    if region.lower() == "world":
        region = "Global"

    return region, country


def should_ignore(title: str, summary: str) -> bool:
    text = f"{title} {summary}".lower()
    return any(keyword in text for keyword in IGNORE_KEYWORDS)


def dedupe_articles(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    unique = []

    for article in articles:
        key = (
            safe_text(article.get("url")).lower(),
            safe_text(article.get("title")).lower()
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(article)

    return unique


def normalize_entry(entry: Dict[str, Any], query: str, payload: Dict[str, Any], source_type: str) -> Optional[Dict[str, Any]]:
    title = saxutils.unescape(safe_text(entry.get("title")))
    summary = extract_summary(entry)
    url = safe_text(entry.get("link"))
    source = extract_source(entry)
    published_at, published_ts = parse_published(entry)
    region, country = infer_region_and_country(payload)

    if not title or not url:
        return None

    if should_ignore(title, summary):
        return None

    sentiment_text = f"{title}. {summary}"
    sentiment_score = score_sentiment(sentiment_text)
    sentiment_label = normalize_label(sentiment_score)
    relevance_score = compute_relevance_score(query, title, summary)
    freshness_score = compute_freshness_score(published_ts)
    signal_score = compute_signal_score(sentiment_score, relevance_score, freshness_score)
    final_score = compute_final_score(signal_score, relevance_score, freshness_score)

    return {
        "id": f"{source_type}-{abs(hash(url))}",
        "title": title,
        "source": source,
        "sourceType": source_type,
        "publishedAt": published_at,
        "summary": summary[:280],
        "url": url,
        "sentimentLabel": sentiment_label,
        "sentimentScore": sentiment_score,
        "signalScore": signal_score,
        "relevanceScore": relevance_score,
        "freshnessScore": freshness_score,
        "finalScore": final_score,
        "region": region,
        "country": country,
        "topic": query
    }


def fetch_articles_from_google_news(query: str, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    url = build_google_news_rss_url(query)
    parsed = fetch_feed(url)
    articles: List[Dict[str, Any]] = []

    for entry in parsed.entries:
        normalized = normalize_entry(entry, query, payload, "google-news-rss")
        if normalized:
            articles.append(normalized)

    return articles


def fetch_articles_from_publishers(query: str, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    collected: List[Dict[str, Any]] = []
    query_terms = [term.lower() for term in re.findall(r"\w+", query) if len(term) > 2]

    for feed_url in PUBLISHER_FEEDS:
        try:
            parsed = fetch_feed(feed_url)
            for entry in parsed.entries:
                title = safe_text(entry.get("title"))
                summary = extract_summary(entry)
                haystack = f"{title} {summary}".lower()

                if query_terms and not any(term in haystack for term in query_terms):
                    continue

                normalized = normalize_entry(entry, query, payload, "publisher-rss")
                if normalized:
                    collected.append(normalized)
        except Exception:
            continue

    return collected


def main() -> None:
    payload = read_stdin_payload()
    query = safe_text(payload.get("query"))

    if not query:
        print(json.dumps({
            "success": True,
            "mode": "empty",
            "source": "none",
            "articles": []
        }))
        return

    try:
        google_articles = fetch_articles_from_google_news(query, payload)
        publisher_articles = fetch_articles_from_publishers(query, payload)

        merged = dedupe_articles(google_articles + publisher_articles)
        merged.sort(key=lambda item: item.get("finalScore", 0), reverse=True)
        merged = merged[:MAX_ARTICLES]

        print(json.dumps({
            "success": True,
            "mode": "live",
            "source": "rss-live",
            "articles": merged
        }))
    except Exception as exc:
        print(json.dumps({
            "success": False,
            "mode": "error",
            "source": "rss-live",
            "articles": [],
            "error": str(exc)
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()