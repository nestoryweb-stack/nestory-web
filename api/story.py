import json
from http.server import BaseHTTPRequestHandler

TOPICS = {
    "space": {
        "title": "הרפתקה בחלל",
        "template": "יום אחד, {child}, גילית דלת סודית לחללית קטנה מאחורי הספרייה. "
                    "בלחיצה אחת — שיגור! בדרך פגשת כוכב שמדבר רק בחידות..."
    },
    "ocean": {
        "title": "מסע בים",
        "template": "{child} ירד/ה לחוף ומצא/ה בקבוק עם מפה עתיקה. "
                    "המפה הובילה לאי קטן, ושם חיכתה קונכייה שמגשימה משאלות..."
    },
    "jungle": {
        "title": "ג׳ונגל מסתורי",
        "template": "בבוקר חמים, {child} נכנס/ה לשביל ירוק בג׳ונגל. "
                    "פתאום נשמע קול: 'רק אמיצים ממשיכים!' ואז הופיע קוף עם כובע..."
    },
}

def _send_json(h: BaseHTTPRequestHandler, status: int, payload: dict):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    h.send_response(status)
    h.send_header("Content-Type", "application/json; charset=utf-8")
    h.send_header("Content-Length", str(len(body)))
    h.end_headers()
    h.wfile.write(body)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
            data = json.loads(raw)

            child = (data.get("child") or "").strip()
            topic = (data.get("topic") or "").strip()

            if not child:
                return _send_json(self, 400, {"error": "חסר שם ילד/ה"})
            if topic not in TOPICS:
                return _send_json(self, 400, {"error": "נושא לא חוקי"})

            t = TOPICS[topic]
            story = t["template"].format(child=child)

            return _send_json(self, 200, {
                "topicTitle": t["title"],
                "story": story
            })
        except Exception as e:
            return _send_json(self, 500, {"error": "שגיאת שרת", "details": str(e)})

    def do_GET(self):
        return _send_json(self, 200, {
            "topics": [{"key": k, "title": v["title"]} for k, v in TOPICS.items()]
        })
