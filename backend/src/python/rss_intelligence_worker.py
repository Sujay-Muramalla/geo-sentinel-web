import json
import re
import sys
import traceback
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

import requests

USER_AGENT = "Geo-Sentinel/1.0 (+RSS intelligence worker)"
REQUEST_TIMEOUT = 12

RSS_FEEDS = [
    # Global / International
    {"source": "Reuters", "url": "https://feeds.reuters.com/reuters/worldNews", "mediaType": "news-article"},
    {"source": "BBC", "url": "http://feeds.bbci.co.uk/news/world/rss.xml", "mediaType": "news-article"},
    {"source": "CNN", "url": "http://rss.cnn.com/rss/edition_world.rss", "mediaType": "news-article"},
    {"source": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml", "mediaType": "news-article"},
    {"source": "DW", "url": "https://rss.dw.com/xml/rss-en-world", "mediaType": "news-article"},
    {"source": "France 24", "url": "https://www.france24.com/en/rss", "mediaType": "news-article"},

    # India
    {"source": "NDTV", "url": "https://feeds.feedburner.com/ndtvnews-top-stories", "mediaType": "news-article"},
    {"source": "Republic TV", "url": "https://www.republicworld.com/rss/feed.xml", "mediaType": "news-article"},
    {"source": "Times of India", "url": "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms", "mediaType": "news-article"},
    {"source": "The Hindu", "url": "https://www.thehindu.com/news/international/feeder/default.rss", "mediaType": "news-article"},

    # Europe
    {"source": "The Guardian", "url": "https://www.theguardian.com/world/rss", "mediaType": "news-article"},
    {"source": "Euronews", "url": "https://www.euronews.com/rss?level=theme&name=news", "mediaType": "news-article"},

    # Asia
    {"source": "SCMP", "url": "https://www.scmp.com/rss/91/feed", "mediaType": "news-article"},
    {"source": "CNA", "url": "https://www.channelnewsasia.com/rssfeeds/8395986", "mediaType": "news-article"},
    {"source": "Nikkei Asia", "url": "https://asia.nikkei.com/rss/feed/nar", "mediaType": "news-article"},
]

POSITIVE_WORDS = {
    "success", "peace", "growth", "agreement", "win", "stable", "progress",
    "improve", "strong", "support", "cooperation", "benefit", "recover"
}

NEGATIVE_WORDS = {
    "war", "conflict", "attack", "strike", "sanction", "crisis", "protest",
    "collapse", "threat", "violence", "kill", "killed", "dead", "injured",
    "tension", "tensions", "retaliation", "escalation"
}


def normalize_text(value):
    return str(value or "").strip()


def parse_iso_or_rfc_date(value):
    value = normalize_text(value)
    if not value:
        return ""

    try:
        dt = parsedate_to_datetime(value)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        pass

    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        return ""


def simple_sentiment(text):
    text = normalize_text(text).lower()
    if not text:
        return "neutral", 0.0

    words = re.findall(r"[a-zA-Z][a-zA-Z\-]+", text)
    if not words:
        return "neutral", 0.0

    positive_hits = sum(1 for word in words if word in POSITIVE_WORDS)
    negative_hits = sum(1 for word in words if word in NEGATIVE_WORDS)

    score = 0.0
    if positive_hits or negative_hits:
        score = (positive_hits - negative_hits) / max(1, positive_hits + negative_hits)

    if score > 0.12:
        label = "positive"
    elif score < -0.12:
        label = "negative"
    else:
        label = "neutral"

    return label, round(score, 4)


def fetch_feed(url):
    response = requests.get(
        url,
        headers={"User-Agent": USER_AGENT},
        timeout=REQUEST_TIMEOUT
    )
    response.raise_for_status()
    return response.text


def parse_rss(xml_text, source_name, media_type):
    items = []

    root = ET.fromstring(xml_text)

    for item in root.findall(".//item"):
        title = normalize_text(item.findtext("title"))
        link = normalize_text(item.findtext("link"))
        description = normalize_text(item.findtext("description"))
        pub_date = normalize_text(item.findtext("pubDate"))

        if not title or not link:
            continue

        sentiment_label, sentiment_score = simple_sentiment(f"{title} {description}")

        items.append({
            "title": title,
            "summary": description,
            "url": link,
            "source": source_name,
            "publishedAt": parse_iso_or_rfc_date(pub_date),
            "sentiment": sentiment_label,
            "sentimentScore": sentiment_score,
            "mediaType": media_type
        })

    return items


def term_match_score(query, text):
    query = normalize_text(query).lower()
    text = normalize_text(text).lower()

    if not query:
        return 1.0

    terms = [term for term in re.split(r"\s+", query) if len(term) > 2]
    if not terms:
        return 1.0

    matched = sum(1 for term in terms if term in text)
    return matched / max(1, len(terms))


def filter_by_query(items, query):
    if not normalize_text(query):
        return items

    results = []
    for item in items:
        haystack = f"{item.get('title', '')} {item.get('summary', '')}"
        score = term_match_score(query, haystack)
        if score > 0:
            item["queryMatchScore"] = round(score, 4)
            results.append(item)

    return results


def rank_items(items, query):
    ranked = []

    for item in items:
        query_score = item.get("queryMatchScore", 0.0)
        sentiment_score = abs(float(item.get("sentimentScore", 0.0)))

        recency_score = 0.1
        published_at = normalize_text(item.get("publishedAt"))
        if published_at:
            try:
                dt = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
                age_hours = max(0, (datetime.now(timezone.utc) - dt).total_seconds() / 3600)
                if age_hours <= 6:
                    recency_score = 1.0
                elif age_hours <= 24:
                    recency_score = 0.8
                elif age_hours <= 72:
                    recency_score = 0.55
                else:
                    recency_score = 0.25
            except Exception:
                pass

        score = (query_score * 2.5) + (recency_score * 1.2) + (sentiment_score * 0.2)
        item["workerScore"] = round(score, 4)
        ranked.append(item)

    ranked.sort(key=lambda x: x.get("workerScore", 0), reverse=True)
    return ranked[:40]


def main():
    raw_input = sys.stdin.read()
    payload = json.loads(raw_input or "{}")

    query = normalize_text(payload.get("query") or payload.get("selectedTrend") or "")
    results = []

    for feed in RSS_FEEDS:
        try:
            xml_text = fetch_feed(feed["url"])
            parsed_items = parse_rss(xml_text, feed["source"], feed["mediaType"])
            results.extend(parsed_items)
        except Exception:
            continue

    filtered = filter_by_query(results, query)
    ranked = rank_items(filtered, query)

    response = {
        "mode": "live",
        "results": ranked
    }

    sys.stdout.write(json.dumps(response, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        error_response = {
            "mode": "error",
            "error": str(exc),
            "trace": traceback.format_exc()
        }
        sys.stdout.write(json.dumps(error_response, ensure_ascii=False))