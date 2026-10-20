
import sqlite3
import json
from pathlib import Path

DB = Path("qfa.db")
OUT = Path("functions/_lib/lookup.js")
SITE = "https://qfa.alhudapk.com"
LOGO = f"{SITE}/assets/logo-full.png"

if not DB.exists():
    raise SystemExit("qfa.db not found in the project root.")

def image_url(value):
    value = (value or "").strip()
    if not value:
        return LOGO
    if value.startswith(("https://", "http://")):
        return value
    return f"{SITE}/{value.lstrip('/')}"

con = sqlite3.connect(
    f"file:{DB.resolve().as_posix()}?mode=ro", uri=True
)
con.row_factory = sqlite3.Row

series = {}
for r in con.execute("""
    SELECT series_code, series_en, series_ur,
           feature_image_4_4, feature_image_4_5,
           primary_lecturer
    FROM series
"""):
    code = r["series_code"]
    if not code:
        continue

    series[code] = {
        "title": r["series_en"] or r["series_ur"] or code,
        "image": image_url(
            r["feature_image_4_4"] or r["feature_image_4_5"]
        ),
        "lecturer": r["primary_lecturer"] or ""
    }

audio_series = {}
for r in con.execute("""
    SELECT audio_code, series_code
    FROM series_audio_map
    WHERE audio_code IS NOT NULL
      AND series_code IS NOT NULL
"""):
    audio_series.setdefault(r["audio_code"], r["series_code"])

audio = {}
for r in con.execute("""
    SELECT code, english_name, urdu_name
    FROM audio
"""):
    code = r["code"]
    if not code:
        continue

    series_code = audio_series.get(code)
    if not series_code:
        series_code = code.split("_U")[0]

    audio[code] = {
        "title": r["english_name"] or r["urdu_name"] or code,
        "seriesCode": series_code
    }

con.close()

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(
    "export default " + json.dumps(
        {"series": series, "audio": audio},
        ensure_ascii=False
    ) + ";\n",
    encoding="utf-8"
)

print("Generated:", OUT)
print("Series:", len(series))
print("Audio:", len(audio))
print("Series using logo:", sum(
    1 for item in series.values() if item["image"] == LOGO
))
print("Logo URL:", LOGO)
