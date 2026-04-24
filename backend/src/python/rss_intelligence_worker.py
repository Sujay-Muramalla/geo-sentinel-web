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
MIN_RELEVANCE_SCORE = 0.22

RSS_FEEDS = [
    {"source": "Reuters", "url": "https://feeds.reuters.com/reuters/worldNews", "mediaType": "news-article", "country": "UK", "region": "Global", "tier": "top", "weight": 1.0},
    {"source": "BBC", "url": "http://feeds.bbci.co.uk/news/world/rss.xml", "mediaType": "news-article", "country": "UK", "region": "Europe", "tier": "top", "weight": 0.98},
    {"source": "CNN", "url": "http://rss.cnn.com/rss/edition_world.rss", "mediaType": "news-article", "country": "US", "region": "North America", "tier": "top", "weight": 0.92},
    {"source": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml", "mediaType": "news-article", "country": "Qatar", "region": "Middle East", "tier": "top", "weight": 0.96},
    {"source": "DW", "url": "https://rss.dw.com/xml/rss-en-world", "mediaType": "news-article", "country": "Germany", "region": "Europe", "tier": "top", "weight": 0.9},
    {"source": "France 24", "url": "https://www.france24.com/en/rss", "mediaType": "news-article", "country": "France", "region": "Europe", "tier": "top", "weight": 0.9},

    {"source": "The Guardian", "url": "https://www.theguardian.com/world/rss", "mediaType": "news-article", "country": "UK", "region": "Europe", "tier": "standard", "weight": 0.82},
    {"source": "Euronews", "url": "https://www.euronews.com/rss?level=theme&name=news", "mediaType": "news-article", "country": "Europe", "region": "Europe", "tier": "standard", "weight": 0.78},

    {"source": "SCMP", "url": "https://www.scmp.com/rss/91/feed", "mediaType": "news-article", "country": "Hong Kong", "region": "Asia", "tier": "standard", "weight": 0.78},
    {"source": "CNA", "url": "https://www.channelnewsasia.com/rssfeeds/8395986", "mediaType": "news-article", "country": "Singapore", "region": "Asia", "tier": "standard", "weight": 0.76},
    {"source": "Nikkei Asia", "url": "https://asia.nikkei.com/rss/feed/nar", "mediaType": "news-article", "country": "Japan", "region": "Asia", "tier": "standard", "weight": 0.8},
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

STOP_WORDS = {
    "the", "and", "for", "with", "from", "that", "this", "into", "over", "after",
    "before", "about", "what", "when", "where", "which"
}

COUNTRY_REGION_HINTS = {
    "iran": "Middle East",
    "israel": "Middle East",
    "uae": "Middle East",
    "qatar": "Middle East",
    "kuwait": "Middle East",
    "syria": "Middle East",
    "turkey": "Middle East",
    "pakistan": "Asia",
    "china": "Asia",
    "taiwan": "Asia",
    "japan": "Asia",
    "russia": "Europe",
    "ukraine": "Europe",
    "germany": "Europe",
    "france": "Europe",
    "uk": "Europe",
    "usa": "North America"
}


def normalize_text(value):
    return str(value or "").strip()


def clean_html(value):
    text = unescape(normalize_text(value))
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokenize(text):
    return [
        t for t in re.findall(r"[a-zA-Z]{3,}", normalize_text(text).lower())
        if t not in STOP_WORDS
    ]


def parse_date(value):
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).isoformat()
    except:
        return ""


def sentiment(text):
    words = tokenize(text)
    pos = sum(1 for w in words if w in POSITIVE_WORDS)
    neg = sum(1 for w in words if w in NEGATIVE_WORDS)

    score = (pos - neg) / max(1, pos + neg)
    if score > 0.1:
        return "positive", score
    elif score < -0.1:
        return "negative", score
    return "neutral", score


def relevance_score(query, text):
    q_tokens = tokenize(query)
    t_text = normalize_text(text).lower()

    if not q_tokens:
        return 1.0

    match = sum(1 for t in q_tokens if t in t_text)
    return match / len(q_tokens)


def recency_score(published):
    try:
        dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
        age = (datetime.now(timezone.utc) - dt).total_seconds() / 3600
        if age < 6:
            return 1
        elif age < 24:
            return 0.8
        elif age < 72:
            return 0.5
        return 0.2
    except:
        return 0.2


def geo_score(query, region):
    for k, v in COUNTRY_REGION_HINTS.items():
        if k in query.lower():
            return 1 if v == region else 0.5
    return 0.7


def final_score(q, g, r, s):
    return (q * 0.5) + (g * 0.2) + (r * 0.2) + (abs(s) * 0.1)


def parse_feed(feed):
    xml = requests.get(feed["url"], timeout=REQUEST_TIMEOUT).text
    root = ET.fromstring(xml)
    items = []

    for i in root.findall(".//item"):
        title = clean_html(i.findtext("title"))
        desc = clean_html(i.findtext("description"))
        link = i.findtext("link")
        date = parse_date(i.findtext("pubDate"))

        sent, s_score = sentiment(title + " " + desc)
        q_score = relevance_score(sys_query, title + desc)

        if q_score < MIN_RELEVANCE_SCORE:
            continue

        r_score = recency_score(date)
        g_score = geo_score(sys_query, feed["region"])

        score = final_score(q_score, g_score, r_score, s_score)

        items.append({
            "title": title,
            "summary": desc,
            "url": link,
            "source": feed["source"],
            "publishedAt": date,
            "sentiment": sent,
            "sentimentScore": s_score,
            "finalScore": round(score * 100, 2)
        })

    return items


def main():
    payload = json.loads(sys.stdin.read() or "{}")
    global sys_query
    sys_query = normalize_text(payload.get("query") or "")

    all_items = []
    for f in RSS_FEEDS:
        try:
            all_items += parse_feed(f)
        except:
            continue

    all_items.sort(key=lambda x: x["finalScore"], reverse=True)

    print(json.dumps({
        "mode": "live",
        "results": all_items[:MAX_RESULTS]
    }, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}))